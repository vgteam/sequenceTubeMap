/* eslint no-console: 'off' */
/* eslint strict:0 */
/* eslint no-param-reassign: 'off' */

"use strict";

import "./config-server.mjs";
import { config } from "./config-global.mjs";
import assert from "assert";
import { spawn } from "child_process";
import express from "express";
import bodyParser from "body-parser";
import multer from "multer";
import { v1 as uuid } from "uuid";
import fs from "fs-extra";
import path from "path";
import pathIsInside from "path-is-inside";
import rl from "readline";
import compression from "compression";
import { server as WebSocketServer } from "websocket";
import dotenv from "dotenv";
import dirname from "es-dirname";
import { readFileSync, writeFile } from "fs";
import {
  parseRegion,
  convertRegionToRangeRegion,
  stringifyRangeRegion,
  stringifyRegion,
  isValidURL,
  readsExist,
} from "./common.mjs";
import { Readable } from "stream";
import { finished } from "stream/promises";
import sanitize from "sanitize-filename";
import { createHash } from "node:crypto";
import cron from "node-cron";
import { RWLock, combine } from "readers-writer-lock";
import which from "which";

if (process.env.NODE_ENV !== "production") {
  // Load any .env file config
  dotenv.config();
}

/// Return the command string to execute to run vg.
/// Checks config.vgPath.
/// An entry of "" in config.vgPath means to check PATH.
function find_vg() {
  if (find_vg.found_vg !== null) {
    // Cache the answer and don't re-check all the time.
    // Nobody shoudl be deleting vg.
    return find_vg.found_vg;
  }
  for (let prefix of config.vgPath) {
    if (prefix === "") {
      // Empty string has special meaning of "use PATH".
      console.log("Check for vg on PATH");
      try {
        find_vg.found_vg = which.sync("vg");
        console.log("Found vg at:", find_vg.found_vg);
        return find_vg.found_vg;
      } catch (e) {
        // vg is not on PATH
        continue;
      }
    }
    if (prefix.length > 0 && prefix[prefix.length - 1] !== "/") {
      // Add trailing slash
      prefix = prefix + "/";
    }
    let vg_filename = prefix + "vg";
    console.log("Check for vg at:", vg_filename);
    if (fs.existsSync(vg_filename)) {
      if (!fs.statSync(vg_filename).isFile()) {
        // This is a directory or something, not a binary we can run.
        continue;
      }
      try {
        // Pretend we will execute it
        fs.accessSync(vg_filename, fs.constants.X_OK)
      } catch (e) {
        // Not executable
        continue;
      }
      // If we get here it is executable.
      find_vg.found_vg = vg_filename;
      console.log("Found vg at:", find_vg.found_vg);
      return find_vg.found_vg;
    }
  }
  // If we get here we don't see vg at all.
  throw new InternalServerError("The vg command was not found. Install vg to use the Sequence Tube Map: https://github.com/vgteam/vg?tab=readme-ov-file#installation");
}
find_vg.found_vg = null;


const MOUNTED_DATA_PATH = config.dataPath;
const INTERNAL_DATA_PATH = config.internalDataPath;
// THis is where we will store uploaded files
const UPLOAD_DATA_PATH = "uploads/";
// This is where we will store per-request generated files
const SCRATCH_DATA_PATH = "tmp/";
// This is where data downloaded from URLs is cached.
// This directory will be recursively removed!
const DOWNLOAD_DATA_PATH = config.tempDirPath;
const SERVER_PORT = process.env.SERVER_PORT || config.serverPort || 3000;
const SERVER_BIND_ADDRESS = config.serverBindAddress || undefined;

// This holds a collection of all the absolute path root directories that the
// server is allowed to access on behalf of users.
const ALLOWED_DATA_DIRECTORIES = [
  MOUNTED_DATA_PATH,
  INTERNAL_DATA_PATH,
  UPLOAD_DATA_PATH,
  SCRATCH_DATA_PATH,
  DOWNLOAD_DATA_PATH,
].map((p) => path.resolve(p));

const GRAPH_EXTENSIONS = [".xg", ".vg", ".pg", ".hg", ".gbz"];

const HAPLOTYPE_EXTENSIONS = [".gbwt", ".gbz"];

const fileTypes = {
  GRAPH: "graph",
  HAPLOTYPE: "haplotype",
  READ: "read",
  BED: "bed",
};

const lockMap = new Map();

const lockTypes = {
  READ_LOCK: "read_lock",
  WRITE_LOCK: "write_lock",
};

// In memory storage of fetched file eTags
// Used to check if the file has been updated and we need to fetch again
// Stores urls mapped to the eTag from the most recently recieved request
const ETagMap = new Map();

// Make sure that the scratch directory exists at startup, so multiple requests
// can't fight over its creation.
fs.mkdirSync(SCRATCH_DATA_PATH, { recursive: true });

if (typeof setImmediate === "undefined") {
  // On newer Jest/React tests, setImmediate is removed from the environment,
  // because browsers don't have it. See
  // <https://github.com/facebook/jest/pull/11222>.
  // We still get to use stuff like the Node filesystem APIs, but weirdly not
  // this builtin. To make Express work, we need to have the builtin. So we
  // put it back.
  // TODO: Work out a way to run end-to-end tests in the project, with the
  // frontend and backend both running, but without loading the backend into
  // a jsdom JS environment.
  // TODO: Resesign the frontend components so that network access and server
  // responses can be easily faked.
  const timers = require("timers");
  window.setImmediate = timers.setImmediate;
  window.clearImmediate = timers.clearImmediate;
}

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DATA_PATH);
  },
  filename: function (req, file, cb) {
    let ext = file.originalname.substring(
      file.originalname.lastIndexOf("."),
      file.originalname.length
    );
    // TODO: This can collide and can also be guessed by other users.
    cb(null, Date.now() + ext);
  },
});
var limits = {
  files: 1, // allow only 1 file per request
  fileSize: 1024 * 1024 * 5, // 5 MB (max file size)
};
var upload = multer({ storage, limits });

// deletes expired files given a directory, recursively calls itself for nested directories
// expired files are files not accessed for a certain amount of time
// TODO: find a more reliable way to detect file accessed time than stat.atime?
// atime requires correct environment configurations
function deleteExpiredFiles(directoryPath) {
  console.log("deleting expired files in ", directoryPath);
  const currentTime = new Date().getTime();

  if (!fs.existsSync(directoryPath)) {
    return;
  }

  const files = fs.readdirSync(directoryPath);

  files.forEach((file) => {
    const filePath = path.join(directoryPath, file);

    if (fs.statSync(filePath).isFile()) {
      // check to see if file needs to be deleted
      const lastAccessedTime = fs.statSync(filePath).atime;
      if (currentTime - lastAccessedTime >= config.fileExpirationTime) {
        if (file !== ".gitignore" && file !== "directory.lock") {
          fs.unlinkSync(filePath);
          console.log("Deleting file: ", filePath);
        }
      }
    } else if (fs.statSync(filePath).isDirectory()) {
      // call deleteExpiredFiles on the nested directory
      deleteExpiredFiles(filePath);

      // if the nested directory is empty after deleting expired files, remove it
      if (fs.readdirSync(filePath).length === 0) {
        fs.rmdirSync(filePath);
        console.log("Deleting directory: ", filePath);
      }
    }
  });
}

// takes in an async function, locks the direcotry for the duration of the function
async function lockDirectory(directoryPath, lockType, func) {
  console.log("Acquiring", lockType, "for", directoryPath);
  // look into lockMap to see if there is a lock assigned to the directory
  let lock = lockMap.get(directoryPath);
  // if there are no locks, create a new lock and store it in the lock directionary
  if (!lock) {
    lock = new RWLock();

    lockMap.set(directoryPath, lock);
  }

  if (lockType == lockTypes.READ_LOCK) {
    // lock is released when func returns
    return lock.read(func);
  } else if (lockType == lockTypes.WRITE_LOCK) {
    return lock.write(func);
  } else {
    console.log("Not a valid lock type:", lockType);
    return 1;
  }
}

// expects an array of directory paths, attemping to acquire all directory locks
// all uses of this function requires the array of directoryPaths to be in the same order
// e.g locking [DOWNLOAD_DATA_PATH, UPLOAD_DATA_PATH] should always lock DOWNLOAD_DATA_PATH first to prevent deadlock
async function lockDirectories(directoryPaths, lockType, func) {
  // input is unexpected
  if (!directoryPaths || directoryPaths.length === 0) {
    return;
  }

  // last lock to acquire, ready to proceed
  if (directoryPaths.length === 1) {
    return lockDirectory(directoryPaths[0], lockType, func);
  }

  // attempt to acquire a lock for the next directory, and call lockDirectories on the remaining directories
  const currDirectory = directoryPaths.pop();
  return lockDirectory(currDirectory, lockType, async function () {
    return lockDirectories(directoryPaths, lockType, func);
  });
}

// runs every hour
// deletes any files in the download directory past the set fileExpirationTime set in config
cron.schedule("0 * * * *", async () => {
  console.log("cron scheduled check");
  // attempt to acquire a write lock for each on the directory before attemping to delete files
  for (const dir of [DOWNLOAD_DATA_PATH, UPLOAD_DATA_PATH]) {
    try {
      await lockDirectory(dir, lockTypes.WRITE_LOCK, async function () {
        deleteExpiredFiles(dir);
      });
    } catch (e) {
      console.error("Error checking for expired files in " + dir + ":", e);
    }
  }
});

const app = express();

// Configure global server settings
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(
  bodyParser.urlencoded({
    // to support URL-encoded bodies
    extended: true,
  })
);
app.use(compression());

// Serve the frontend
app.use(express.static("./build"));

// Make another Express object to keep all the API calls on a sensible path
// that can be proxied around if needed.
const api = express();
app.use("/api/v0", api);

// Open up CORS.
// TODO: can we avoid this?
// required for local usage with the Docker container (access docker container from outside)
api.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Store files uploaded from trackFilePicker via multer
api.post("/trackFileSubmission", upload.single("trackFile"), (req, res) => {
  console.log("/trackFileSubmission");
  console.log(req.file);
  if (req.body.fileType === fileTypes["READ"]) {
    indexGamSorted(req, res);
  } else {
    res.json({ path: path.relative(".", req.file.path) });
  }
});

function indexGamSorted(req, res) {
  const prefix = req.file.path.substring(0, req.file.path.lastIndexOf("."));
  const sortedGamFile = fs.createWriteStream(prefix + ".sorted.gam", {
    encoding: "binary",
  });
  const vgIndexChild = spawn(find_vg(), [
    "gamsort",
    "-i",
    prefix + ".sorted.gam.gai",
    req.file.path,
  ]);

  vgIndexChild.stderr.on("data", (data) => {
    console.log(`err data: ${data}`);
  });

  vgIndexChild.stdout.on("data", function (data) {
    sortedGamFile.write(data);
  });

  vgIndexChild.on("close", () => {
    sortedGamFile.end();
    res.json({ path: path.relative(".", prefix + ".sorted.gam") });
  });
}

// Checks if a file has one of the extensions provided
function endsWithExtensions(file, extensions) {
  for (const extension of extensions) {
    if (file.endsWith(extension)) {
      return true;
    }
  }
  return false;
}

// INPUT: (track {files: }, string)
// OUTPUT: string
// returns the file name of the specified type in that track
// returns falsy value if file type is not found
function getFileFromType(track, type) {
  if (track.trackType === type) {
    return track.trackFile;
  }
  return "none";
}

// Given a collection of tracks (each of which may have a files array with
// items with a type and a name), generate the filenames for the first file of
// the given type for each track with such a file.
//
// This is a fancy ES6 generator.
function* eachFileOfType(tracks, type) {
  for (const key in tracks) {
    const file = getFileFromType(tracks[key], type);
    if (file && file !== "none") {
      yield file;
    }
  }
}

// Get the first files of the given type from all the given tracks.
function getFilesOfType(tracks, type) {
  let results = [];
  for (const file of eachFileOfType(tracks, type)) {
    results.push(file);
  }
  return results;
}

// Get the first file from the first track with a file of the given type, or
// undefined if no such track exists.
function getFirstFileOfType(tracks, type) {
  for (const file of eachFileOfType(tracks, type)) {
    return file;
  }
  return undefined;
}

// Returns an array of the first gam file of every track with a gam file
function getGams(tracks) {
  return getFilesOfType(tracks, fileTypes.READ);
}

// To bridge Express next(err) error handling and async function error
// handling, we have this adapter. It takes Express's next and an async
// function and calls next with any error raised when the async function is
// initially called *or* when its promise is awaited.
async function captureErrors(next, callback) {
  try {
    await callback();
  } catch (e) {
    next(e);
  }
}

api.post("/getChunkedData", (req, res, next) => {
  // We would like this to be an async function, but then Express error
  // handling doesn't work, because it doesn't detect returned promise
  // rejections until Express 5. We have to pass an error to next() or else
  // throw synchronously.
  captureErrors(next, async () => {
    // put readlock on necessary directories while processing chunked data
    return lockDirectories(
      [DOWNLOAD_DATA_PATH, UPLOAD_DATA_PATH],
      lockTypes.READ_LOCK,
      async function () {
        return getChunkedData(req, res, next);
      }
    );
  });
});


/*
graph = {
  node: [
    {
      sequence: "AGCT"
      id: "1"
    },
    {
      sequence: "AGCTAG"
      id: "2"
    }
  ],
  edge: [],
  path: []
}
removing sequence would result in
graph = {
  node: [
    {
      id: "1"
    },
    {
      id: "2"
    }
  ],
  edge: [],
  path: []
}
*/

// read a graph object and remove "sequence" fields in place
function removeNodeSequencesInPlace(graph){
  console.log("graph:", graph)
  if (!graph.node){
    return;
  }
  graph.node.forEach(function(node) {
    node.sequenceLength = node.sequence.length;
    delete node.sequence;
  })
}

// Handle a chunked data (tube map view) request. Returns a promise. On error,
// either the promise rejects *or* next() is called with an error, or both.
// TODO: This is a terrible mixed design for error handling; we need to either
// rewrite the flow of talking to vg in terms of async/await or abandon
// async/await altogether in order to get out of it.
async function getChunkedData(req, res, next) {
  console.time("request-duration");
  console.log("http POST getChunkedData received");
  console.log(`region = ${req.body.region}`);
  console.log(`tracks = ${JSON.stringify(req.body.tracks)}`);

  // This will have a conitg, start, end, or a contig, start, distance
  let parsedRegion;
  try {
    parsedRegion = parseRegion(req.body.region);
  } catch (e) {
    // Whatever went wrong in the parsing, it makes the request bad.
    throw new BadRequestError(
      "Wrong query: " + e.message + " See ? button above."
    );
  }

  // There's a chance this request was sent before the proper tracks were fetched
  // This can happen when the bed file is a url and track names need to be downloaded
  // Check if there are tracks specified by the bedFile
  if (req.body.bedFile && req.body.bedFile !== "none") {
    const chunk = await getChunkName(req.body.bedFile, parsedRegion);
    const fetchedTracks = await getChunkTracks(req.body.bedFile, chunk);

    // We're always replacing the given tracks if we were able to find tracks from the bed file
    if (fetchedTracks) {
      // Color Settings are retained from the initial request
      // if newly fetched tracks have matching file names
      // Store current colors and file names
      const fileToColor = new Map();
      for (const key of Object.keys(req.body.tracks)) {
        const track = req.body.tracks[key];
        fileToColor.set(track["trackFile"], track["trackColorSettings"]);
      }

      // Replace new track colors if there's a matching file name
      for (const track of fetchedTracks) {
        if (fileToColor.has(track["trackFile"])) {
          track["trackColorSettings"] = fileToColor.get(track["trackFile"]);
        }
      }

      // Convert fetchedTracks into an object format the server expects
      let fetchedTracksObject = fetchedTracks.reduce(
        (accumulator, obj, index) => {
          accumulator[index] = obj;
          return accumulator;
        },
        {}
      );

      console.log(
        "Using new fetched tracks",
        JSON.stringify(fetchedTracksObject)
      );
      req.body.tracks = fetchedTracksObject;
    }
  }

  // Assign each request a UUID. v1 UUIDs can be very similar for similar
  // timestamps on the same node, but are still guaranteed to be unique within
  // a given nodejs process.
  req.uuid = uuid();

  // Make a temp directory for vg output files for this request
  req.chunkDir = path.join(SCRATCH_DATA_PATH, `tmp-${req.uuid}`);
  fs.mkdirSync(req.chunkDir);
  // This request owns the directory, so clean it up when the request finishes.
  req.rmChunk = true;

  // We always have an graph file
  const graphFile = getFirstFileOfType(req.body.tracks, fileTypes.GRAPH);
  // We sometimes have a GBWT with haplotypes that override any in the graph file
  const gbwtFile = getFirstFileOfType(req.body.tracks, fileTypes.HAPLOTYPE);
  // We sometimes have a BED file with regions to look at
  const bedFile = req.body.bedFile;

  let gamFiles = getGams(req.body.tracks);

  console.log("graphFile ", graphFile);
  console.log("gbwtFile ", gbwtFile);
  console.log("bedFile ", bedFile);
  console.log("gamFiles ", gamFiles);

  req.withGam = true;
  if (!gamFiles || !gamFiles.length) {
    req.withGam = false;
    console.log("no gam index provided.");
  }

  req.withGbwt = true;
  if (!gbwtFile || gbwtFile === "none") {
    req.withGbwt = false;
    console.log("no gbwt file provided.");
  }

  req.withBed = true;
  if (!bedFile || bedFile === "none") {
    req.withBed = false;
    console.log("no BED file provided.");
  }
  // client is going to send simplify = true if they want to simplify view
  req.simplify = false;
  if (req.body.simplify) {
    if (readsExist(req.body.tracks)) {
      throw new BadRequestError("Simplify cannot be used on read tracks.");
    }
    req.simplify = true;
  }

  // client is going to send removeSequences = true if they don't want sequences of nodes to be displayed
  req.removeSequences = false;
  if (req.body.removeSequences) {
    req.removeSequences = true;
  }

  // check the bed file if this region has been pre-fetched
  let chunkPath = "";
  if (req.withBed) {
    // We need to parse the BED file we have been referred to so we can look up
    // the pre-parsed chunk.
    chunkPath = await getChunkPath(bedFile, parsedRegion);
  }

  // We only want to have one downstream callback chain out of here, and we
  // want to make sure it can only start after there's no possibility that we
  // concurrently reject.
  let sentResponse = false;

  // We always need a range-version of the region, to fill in req.region, to
  // generate the region part of the response with the range.
  let rangeRegion = convertRegionToRangeRegion(parsedRegion);

  if (chunkPath === "") {
    // call 'vg chunk' to generate graph
    let vgChunkParams = ["chunk"];
    // double-check that the file has a valid graph extension and is allowed
    if (!endsWithExtensions(graphFile, GRAPH_EXTENSIONS)) {
      throw new BadRequestError(
        "Graph file does not end in valid extension: " + graphFile
      );
    }
    if (!isAllowedPath(graphFile)) {
      throw new BadRequestError("Graph file path not allowed: " + graphFile);
    }
    // TODO: Use same variable for check and command line?

    // Maybe check using file types in the future

    // See if we need to ignore haplotypes in gbz graph file

    if (req.withGbwt) {
      //either push gbz with graph and haplotype or push seperate graph and gbwt file
      if (
        graphFile.endsWith(".gbz") &&
        gbwtFile.endsWith(".gbz") &&
        graphFile === gbwtFile
      ) {
        // use gbz haplotype
        vgChunkParams.push("-x", graphFile);
      } else if (!graphFile.endsWith(".gbz") && gbwtFile.endsWith(".gbz")) {
        throw new BadRequestError("Cannot use gbz as haplotype alone.");
      } else {
        // ignoring haplotype from graph file and using haplotype from gbwt file
        vgChunkParams.push("--no-embedded-haplotypes", "-x", graphFile);

        // double-check that the file is a .gbwt and allowed
        if (!endsWithExtensions(gbwtFile, HAPLOTYPE_EXTENSIONS)) {
          throw new BadRequestError(
            "GBWT file doesn't end in .gbwt or .gbz: " + gbwtFile
          );
        }
        if (!isAllowedPath(gbwtFile)) {
          throw new BadRequestError("GBWT file path not allowed: " + gbwtFile);
        }
        // Use a GBWT haplotype database
        vgChunkParams.push("--gbwt-name", gbwtFile);
      }
    } else {
      // push graph file
      if (graphFile.endsWith(".gbz")) {
        vgChunkParams.push("-x", graphFile, "--no-embedded-haplotypes");
      } else {
        vgChunkParams.push("-x", graphFile);
      }
    }

    // push all gam files
    let anyGam = false;
    let anyGaf = false;
    for (const gamFile of gamFiles) {
      if (!gamFile.endsWith(".gam") && !gamFile.endsWith(".gaf.gz")) {
        throw new BadRequestError("GAM/GAF file doesn't end in .gam or .gaf.gz: " + gamFile);
      }
      if (!isAllowedPath(gamFile)) {
        throw new BadRequestError("GAM/GAF file path not allowed: " + gamFile);
      }
      if (gamFile.endsWith(".gam")) {
        // Use a GAM index
        console.log("pushing gam file", gamFile);
        anyGam = true;
      }
      if (gamFile.endsWith(".gaf.gz")) {
        // Use a GAF with index
        console.log("pushing gaf file", gamFile);
        anyGaf = true;
      }
      vgChunkParams.push("-a", gamFile);
    }
    if (anyGam && anyGaf){
      throw new BadRequestError("Reads must be either GAM files or GAF files, not mix both.");
    }
    if (anyGaf){
      vgChunkParams.push("-F", "-g");
    }
    if (anyGam){
      vgChunkParams.push("-g");
    }

    // to seach by node ID use "node" for the sequence name, e.g. 'node:1-10'
    if (parsedRegion.contig === "node") {
      if (parsedRegion.distance !== undefined) {
        // Start and distance of node IDs, so send that idiomatically.
        vgChunkParams.push(
          "-r",
          parsedRegion.start,
          "-c",
          parsedRegion.distance
        );
      } else {
        // Start and end of node IDs
        vgChunkParams.push(
          "-r",
          "".concat(parsedRegion.start, ":", parsedRegion.end),
          "-c",
          20
        );
      }
    } else {
      // Ask for the whole region by start - end range.
      vgChunkParams.push("-c", "20", "-p", stringifyRangeRegion(rangeRegion));
    }
    vgChunkParams.push(
      "-T",
      "-b",
      `${req.chunkDir}/chunk`,
      "-E",
      `${req.chunkDir}/regions.tsv`
    );

    console.log(`vg ${vgChunkParams.join(" ")}`);

    console.time("vg chunk");
    const vgChunkCall = spawn(find_vg(), vgChunkParams);
    // vg simplify for gam files
    let vgSimplifyCall = null;
    if (req.simplify) {
      vgSimplifyCall = spawn(find_vg(), ["simplify", "-"]);
      console.log("Spawning vg simplify call");
    }

    const vgViewCall = spawn(find_vg(), ["view", "-j", "-"]);
    let graphAsString = "";
    req.error = Buffer.alloc(0);

    vgChunkCall.on("error", function (err) {
      console.log(
        "Error executing " +
          find_vg() + " " +
          vgChunkParams.join(" ") +
          ": " +
          err
      );
      if (!sentResponse) {
        sentResponse = true;
        return next(new VgExecutionError("vg chunk failed"));
      }
      return;
    });

    vgChunkCall.stderr.on("data", (data) => {
      console.log(`vg chunk err data: ${data}`);
      req.error += data;
    });

    vgChunkCall.stdout.on("data", function (data) {
      if (req.simplify) {
        vgSimplifyCall.stdin.write(data);
      } else {
        vgViewCall.stdin.write(data);
      }
    });

    vgChunkCall.on("close", (code) => {
      console.log(`vg chunk exited with code ${code}`);
      if (req.simplify) {
        vgSimplifyCall.stdin.end();
      } else {
        vgViewCall.stdin.end();
      }
      if (code !== 0) {
        console.log("Error from " + find_vg() + " " + vgChunkParams.join(" "));
        // Execution failed
        if (!sentResponse) {
          sentResponse = true;
          return next(new VgExecutionError("vg chunk failed"));
        }
      }
    });

    // vg simplify
    if (req.simplify) {
      vgSimplifyCall.on("error", function (err) {
        console.log(
          "Error executing " + find_vg() + " simplify " + "- " + ": " + err
        );
        if (!sentResponse) {
          sentResponse = true;
          return next(new VgExecutionError("vg simplify failed"));
        }
        return;
      });

      vgSimplifyCall.stderr.on("data", (data) => {
        console.log(`vg simplify err data: ${data}`);
        req.error += data;
      });

      vgSimplifyCall.stdout.on("data", function (data) {
        vgViewCall.stdin.write(data);
      });

      vgSimplifyCall.on("close", (code) => {
        console.log(`vg simplify exited with code ${code}`);
        vgViewCall.stdin.end();
        if (code !== 0) {
          console.log("Error from " + find_vg() + " " + "simplify - ");
          // Execution failed
          if (!sentResponse) {
            sentResponse = true;
            return next(new VgExecutionError("vg simplify failed"));
          }
        }
      });
    }

    // vg view
    vgViewCall.on("error", function (err) {
      console.log('Error executing "vg view": ' + err);
      if (!sentResponse) {
        sentResponse = true;
        return next(new VgExecutionError("vg view failed"));
      }
      return;
    });

    vgViewCall.stderr.on("data", (data) => {
      console.log(`vg view err data: ${data}`);
    });

    vgViewCall.stdout.on("data", function (data) {
      graphAsString += data.toString();
    });

    vgViewCall.on("close", (code) => {
      console.log(`vg view exited with code ${code}`);
      console.timeEnd("vg chunk");
      if (code !== 0) {
        // Execution failed
        if (!sentResponse) {
          sentResponse = true;
          return next(new VgExecutionError("vg view failed"));
        }
        return;
      }
      if (graphAsString === "") {
        if (!sentResponse) {
          sentResponse = true;
          return next(new VgExecutionError("vg view produced empty graph"));
        }
        return;
      }
      req.graph = JSON.parse(graphAsString);
      if (req.removeSequences){
        removeNodeSequencesInPlace(req.graph)
      } 
      req.region = [rangeRegion.start, rangeRegion.end];
      // vg chunk always puts the path we reference on first automatically
      if (!sentResponse) {
        sentResponse = true;
        processAnnotationFile(req, res, next);
      }
    });
  } else {
    // chunk has already been pre-fetched and is saved in chunkPath
    req.chunkDir = chunkPath;
    // We're using a shared directory for this request, so leave it in place
    // when the request finishes.
    req.rmChunk = false;
    let filename = `${req.chunkDir}/chunk.vg`;
    // vg simplify for bed files
    let vgSimplifyCall = null;
    let vgViewArguments = ["view", "-j"];
    if (req.simplify) {
      vgSimplifyCall = spawn(find_vg(), ["simplify", filename]);
      vgViewArguments.push("-");
      console.log("Spawning vg simplify call");
    } else {
      vgViewArguments.push(filename);
    }

    let vgViewCall = spawn(find_vg(), vgViewArguments);

    let graphAsString = "";
    req.error = Buffer.alloc(0);

    // vg simplify
    if (req.simplify) {
      vgSimplifyCall.on("error", function (err) {
        console.log(
          "Error executing " +
            find_vg() + " " +
            "simplify " +
            filename +
            ": " +
            err
        );
        if (!sentResponse) {
          sentResponse = true;
          return next(new VgExecutionError("vg simplify failed"));
        }
        return;
      });

      vgSimplifyCall.stderr.on("data", (data) => {
        console.log(`vg simplify err data: ${data}`);
        req.error += data;
      });

      vgSimplifyCall.stdout.on("data", function (data) {
        vgViewCall.stdin.write(data);
      });

      vgSimplifyCall.on("close", (code) => {
        console.log(`vg simplify exited with code ${code}`);
        vgViewCall.stdin.end();
        if (code !== 0) {
          console.log("Error from " + find_vg() + " simplify " + filename);
          // Execution failed
          if (!sentResponse) {
            sentResponse = true;
            return next(new VgExecutionError("vg simplify failed"));
          }
        }
      });
    }

    vgViewCall.on("error", function (err) {
      console.log('Error executing "vg view": ' + err);
      if (!sentResponse) {
        sentResponse = true;
        return next(new VgExecutionError("vg view failed"));
      }
      return;
    });

    vgViewCall.stderr.on("data", (data) => {
      console.log(`vg view err data: ${data}`);
    });

    vgViewCall.stdout.on("data", function (data) {
      graphAsString += data.toString();
    });

    vgViewCall.on("close", (code) => {
      console.log(`vg view exited with code ${code}`);
      if (code !== 0) {
        // Execution failed
        if (!sentResponse) {
          sentResponse = true;
          return next(new VgExecutionError("vg view failed"));
        }
        return;
      }
      if (graphAsString === "") {
        if (!sentResponse) {
          sentResponse = true;
          return next(
            new VgExecutionError("vg view produced empty graph failed")
          );
        }
        return;
      }
      req.graph = JSON.parse(graphAsString);
      if (req.removeSequences){
        removeNodeSequencesInPlace(req.graph)
      } 
      req.region = [rangeRegion.start, rangeRegion.end];

      // We might not have the path we are referencing on appearing first.
      if (parsedRegion.contig !== "node") {
        // Make sure that path 0 is the path we actually asked about
        let refPaths = [];
        let otherPaths = [];
        for (let path of req.graph.path) {
          if (path.name === parsedRegion.contig) {
            // This is the path we asked about, so it goes first
            refPaths.push(path);
          } else {
            // Then we put each other path
            otherPaths.push(path);
          }
        }
        req.graph.path = refPaths.concat(otherPaths);
      }

      if (!sentResponse) {
        sentResponse = true;
        processAnnotationFile(req, res, next);
      }
    });
  }
}

// We can throw this error to trigger our error handling code instead of
// Express's default. It covers input validation failures, and vaguely-expected
// server-side errors we want to report in a controlled way (because they could
// be caused by bad user input to vg).
class TubeMapError extends Error {
  constructor(message) {
    super(message);
  }
}

// We can throw this error to make Express respond with a bad request error
// message. We should throw it whenever we detect that user input is
// unacceptable.
class BadRequestError extends TubeMapError {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

// We can throw this error to make Express respond with an internal server
// error message
class InternalServerError extends TubeMapError {
  constructor(message) {
    super(message);
    this.status = 500;
  }
}

// We can throw this error to make Express respond with an internal server
// error message about vg.
class VgExecutionError extends InternalServerError {
  constructor(message) {
    super(message);
  }
}

// We can use this middleware to ensure that errors we synchronously throw or
// next(err) will be sent along to the user. It does *not* happen on API
// endpoint promise rejections until Express 5.
function returnErrorMiddleware(err, req, res, next) {
  // Clean up the temp directory for the request, if any
  cleanUpChunkIfOwned(req, res);

  // Because we take err, Express makes sure err is always set.
  if (res.headersSent) {
    // We can't send a nice message. Try the next middleware, if any.
    return next(err);
  }
  // We have an error we want to send back to the user.
  const result = { error: "" };
  if (!(err instanceof TubeMapError)) {
    // Unexpected error: we do not have a custom message for this error
    result.error += "Something about this request has caused a server error: ";
  }
  if (err.message) {
    // We have an error message to pass along.
    result.error += err.message;
  }
  if (req.error) {
    // We have an error data buffer from a vg call
    if (result.error) {
      // Separate from existing message
      result.error += ":\n";
    }
    result.error += req.error.toString("utf-8");
  }
  console.log("returning error: " + result.error);
  console.error(err);
  if (err.status) {
    // Error comes with a status
    res.status(err.status);
  } else {
    // We don't know what's wrong, so it's our fault.
    res.status(500);
  }
  res.json(result);
}

// Hook up the error handling middleware.
app.use(returnErrorMiddleware);

// Given a BED file local path or URL, and a relative URL from the BED file for
// a chunk data directory, get the local path at which the chunk data directory
// will be stored. That local path may not exist, and, if the BED is a URL, is
// guaranteed to be inside DOWNLOAD_DATA_PATH.
//
// The returned path is guaranteed to be an allowed path, under one of our
// allowed directories.
//
// The returned path is guaranteed not to have a trailing slash.
//
// This is the One True Place for getting a BED file chunk path.
function bedChunkLocalPath(bed, chunk) {
  if (isValidURL(bed)) {
    // Hash the BED URL and the chunk path together to a unique value
    // guaranteed not to contain slashes or '.'.
    const hashedBED = hashString(bed + chunk);
    // Use that as a directory under the download path. We know this is under
    // the download path and does not end in slash.
    return path.resolve(DOWNLOAD_DATA_PATH, hashedBED);
  } else {
    // This is a local BED file. Evaluate the path in the BED file relative to it.
    let destination = path.resolve(path.dirname(bed), chunk);

    if (destination.endsWith("/")) {
      // Drop any trailing slashes
      destination = destination.substring(0, destination.length - 1);
    }

    // That can go up by e.g. starting with / or involving .., so make sure we
    // are still pointing somewhere allowed.
    if (!isAllowedPath(destination)) {
      throw new BadRequestError("Path to chunk not allowed: " + destination);
    }

    return destination;
  }
}

// Gets the chunk name from a region specifed in a bedfile
// Returns an empty string if the region is not found within the bed file
async function getChunkName(bed, parsedRegion) {
  let chunk = "";
  let regionInfo = await getBedRegions(bed);

  for (let i = 0; i < regionInfo["desc"].length; i++) {
    let entryRegion = {
      contig: regionInfo["chr"][i],
      start: regionInfo["start"][i],
      end: regionInfo["end"][i],
    };
    if (stringifyRegion(entryRegion) === stringifyRegion(parsedRegion)) {
      // A BED entry is defined for this region exactly
      if (regionInfo["chunk"][i] !== "") {
        // And a chunk file is stored for it, so use that.
        chunk = regionInfo["chunk"][i];
        break;
      }
    }
  }

  return chunk;
}

// Gets the chunk path from a region specified in a bedfile, which may be a URL
// or an allowed local path.
//
// Also downloads the chunk data if the bed is an URL and it has not been
// downloaded yet.
//
// The returned path is either an allowed path, or an empty string if we are
// using a BED without a pre-generated chunk for the given region.
async function getChunkPath(bed, parsedRegion) {
  const chunk = await getChunkName(bed, parsedRegion);

  if (chunk === "") {
    // There is no pre-generated chunk for this region.
    return "";
  }

  // Work out where data for this chunk will be, locally
  let chunkPath = bedChunkLocalPath(bed, chunk);

  if (isValidURL(bed)) {
    // download the rest of the chunk
    await retrieveChunk(bed, chunk, true);
  }

  console.log("returning chunk path: ", chunkPath);

  // check that the 'chunk.vg' file exists in the chunk folder
  let chunk_file = path.resolve(chunkPath, "chunk.vg");
  // We already checked allowed-ness in making the chunk path.
  if (fs.existsSync(chunk_file)) {
    console.log(`found pre-fetched chunk at ${chunk_file}`);
  } else {
    // The chunk doesn't exist, but was supposed to.
    throw new BadRequestError(
      `Couldn't find pre-fetched chunk at ${chunk_file}`
    );
  }

  return chunkPath;
}

function processAnnotationFile(req, res, next) {
  try {
    // find annotation file
    console.time("processing annotation file");
    fs.readdirSync(req.chunkDir).forEach((file) => {
      if (file.endsWith("annotate.txt")) {
        req.annotationFile = req.chunkDir + "/" + file;
      }
    });

    if (
      !req.hasOwnProperty("annotationFile") ||
      typeof req.annotationFile === "undefined"
    ) {
      throw new VgExecutionError("annotation file not created");
    }
    console.log(`annotationFile: ${req.annotationFile}`);

    // read annotation file
    const lineReader = rl.createInterface({
      input: fs.createReadStream(req.annotationFile),
    });

    let i = 0;
    lineReader.on("line", (line) => {
      const arr = line.replace(/\s+/g, " ").split(" ");
      if (req.graph.path[i].name === arr[0]) {
        req.graph.path[i].freq = arr[1];
      } else {
        console.log("Mismatch");
      }
      i += 1;
    });

    lineReader.on("close", () => {
      console.timeEnd("processing annotation file");
      if (req.withGam === true) {
        processGamFiles(req, res, next);
      } else {
        processRegionFile(req, res, next);
      }
    });
  } catch (error) {
    // Send errors into Express's processing instead of off into Node's event
    // machinery.
    return next(error);
  }
}

function processGamFile(req, res, next, gamFile, gamFileNumber) {
  try {
    if (!isAllowedPath(gamFile)) {
      // This is probably under SCRATCH_DATA_PATH
      throw new BadRequestError("Path to GAM/GAF file not allowed: " + req.gamFile);
    }

    let vgViewParams = ["view", "-j", "-a"];
    let vgConvertParams = ["convert"];
    
    if (gamFile.endsWith(".gaf")) {
      // if input is GAF, vg convert will be piped into vg view
      vgViewParams.push("-");
      // vg convert needs the graph to convert GAF to GAM
      const graphFile = getFirstFileOfType(req.body.tracks, fileTypes.GRAPH);
      vgConvertParams.push("-F", gamFile, graphFile);
    }
    if (gamFile.endsWith(".gam")) {
      // if input is GAM, no need to convert input to vg view is the file
      vgViewParams.push(gamFile);
    }
    
    const vgViewChild = spawn(find_vg(), vgViewParams);

    if (gamFile.endsWith(".gaf")) {
      // if input was a GAF, run vg convert and pipe stdout to vg view
      const vgConvertChild = spawn(find_vg(), vgConvertParams);

      vgConvertChild.stdout.on("data", function (data) {
        vgViewChild.stdin.write(data);
      });
      
      vgConvertChild.stderr.on("data", (data) => {
        console.log(`vg convert err data: ${data}`);
        req.error += data;
      });

      vgConvertChild.on("close", (code) => {
        console.log(`vg convert exited with code ${code}`);
        vgViewChild.stdin.end();
        if (code !== 0) {
          console.log("Error from " + find_vg() + " " + vgConvertParams.join(" "));
          // Execution failed
          if (!sentResponse) {
            sentResponse = true;
            return next(new VgExecutionError("vg convert failed"));
          }
        }
      });
      
    } 
    
    vgViewChild.stderr.on("data", (data) => {
      console.log(`err data: ${data}`);
    });

    let gamJSON = "";
    vgViewChild.stdout.on("data", function (data) {
      gamJSON += data.toString();
    });

    vgViewChild.on("close", () => {
      const gamArr = gamJSON
        .split("\n")
        .filter(function (a) {
          return a !== "";
        })
        .map(function (a) {
          return JSON.parse(a);
        });
      // Organize the results by number
      req.gamResults[gamFileNumber] = gamArr;
      req.gamRemaining -= 1;
      if (req.gamRemaining == 0) {
        processRegionFile(req, res, next);
      }
    });
  } catch (error) {
    return next(error);
  }
}

function processGamFiles(req, res, next) {
  try {
    console.time("processing gam files");
    // Find gam/gaf files
    let gamFiles = [];
    fs.readdirSync(req.chunkDir).forEach((file) => {
      console.log(file);
      if (file.endsWith(".gam") || file.endsWith(".gaf")) {
        gamFiles.push(req.chunkDir + "/" + file);
      }
    });

    // Parse a GAM chunk name and get the GAM number from it
    // Names are like, with either .gam or .gaf suffixes:
    // */chunk_*.gam for 0
    // */chunk-1_*.gam for 1, 2, 3, etc.
    let gamNameToNumber = (gamName) => {
      const pattern = /.*\/chunk(-([0-9])+)?_.*\.ga[mf]/
      let matches = gamName.match(pattern)
      if (!matches) {
        throw new InternalServerError("Bad GAM/GAF name " + gamName) 
      }
      if (matches[2] !== undefined) {
        // We have a number
        return parseInt(matches[2]);
      }
      // If there's no number we are chunk 0
      return 0;
    };

    // Sort all the GAM files we found in order of their chunk number,
    // ascending. This will also be the order of the GAM files passed to chunk,
    // and so the order we got the tracks in, and thus the order we want the
    // results in.
    gamFiles.sort((a, b) => {
      return gamNameToNumber(a) - gamNameToNumber(b);
    });

    req.gamResults = [];
    req.gamRemaining = gamFiles.length;
    for (let i = 0; i < gamFiles.length; i++) {
      processGamFile(req, res, next, gamFiles[i], i);
    }
    console.timeEnd("processing gam files");
  } catch (error) {
    return next(error);
  }
}

// Function to do the step of reading the "region" file, a BED inside the chunk
// that records the path and start offset that were used to define the chunk.
//
// Calls out to the next step, cleanUpAndSendResult
function processRegionFile(req, res, next) {
  try {
    console.time("processing region file");
    const regionFile = `${req.chunkDir}/regions.tsv`;
    if (!isAllowedPath(regionFile)) {
      throw new BadRequestError(
        "Path to region file not allowed: " + regionFile
      );
    }

    const lineReader = rl.createInterface({
      input: fs.createReadStream(regionFile),
    });

    lineReader.on("line", (line) => {
      console.log("Region: " + line);
      const arr = line.replace(/\s+/g, " ").split(" ");
      req.graph.path.forEach((p) => {
        if (p.name === arr[0]) p.indexOfFirstBase = arr[1];
      });
    });

    lineReader.on("close", () => {
      console.timeEnd("processing region file");
      processNodeColorsFile(req, res, next);
    });
  } catch (error) {
    return next(error);
  }
}

function processNodeColorsFile(req, res, next) {
  try {
    console.time("processing node colors file");
    const nodeColorsFile = `${req.chunkDir}/nodeColors.tsv`;
    if (!isAllowedPath(nodeColorsFile)) {
      throw new BadRequestError(
        "Path to node colors file not allowed: " + nodeColorsFile
      );
    }

    req.coloredNodes = [];

    // check if file exists
    if (!fs.existsSync(nodeColorsFile)) {
      cleanUpAndSendResult(req, res, next);
      return;
    }

    const lineReader = rl.createInterface({
      input: fs.createReadStream(nodeColorsFile),
    });

    lineReader.on("line", (line) => {
      console.log("Node name: " + line);
      const nodeName = line.replace("\n", "");
      req.coloredNodes.push(nodeName);
    });

    lineReader.on("close", () => {
      console.timeEnd("processing node colors file");
      cleanUpAndSendResult(req, res, next);
    });
  } catch (error) {
    return next(error);
  }
}

// Cleanup function shared between success and error code paths.
// May throw.
// TODO: Use as a middleware?
function cleanUpChunkIfOwned(req, res) {
  if (req.rmChunk && req.chunkDir !== undefined) {
    // Don't clean up individual files in the directory manually; it's too
    // fiddly, and we could have gotten here because we generated those paths
    // and they were outside our acceptable directory tree.

    // Clean up the temp directory for the request recursively
    fs.remove(req.chunkDir);
  }
}

function cleanUpAndSendResult(req, res, next) {
  try {
    cleanUpChunkIfOwned(req, res);

    const result = {};
    // TODO: Any standard error output will make an error response.
    result.error = req.error.toString("utf-8");
    result.graph = req.graph;
    result.gam = req.withGam === true ? req.gamResults : [];
    result.region = req.region;
    result.coloredNodes = req.coloredNodes;
    res.json(result);
    console.timeEnd("request-duration");
  } catch (error) {
    return next(error);
  }
}

// Return true if the given path points to one of the ALLOWED_DATA_DIRECTORIES,
// or to something inside one of them, and false otherwise.
// Additionally, disallows upwards directory traversal and doubled delimiters.
function isAllowedPath(inputPath) {
  // Note that thing.param..xg is a perfectly good filename and contains ..; we
  // need to check for it as a path component.
  if (
    inputPath.includes("//") ||
    inputPath.includes("\\\\") ||
    inputPath.includes("/\\") ||
    inputPath.includes("\\/")
  ) {
    // Prohibit double delimiters (probably mostly from internal errors)
    return false;
  }
  // Split on delimeters
  let parts = inputPath.split(/[\/\\]/);
  for (let part of parts) {
    if (part === "..") {
      // One of the path components is a .., so disallow it.
      return false;
    }
  }

  // Now that we know the path doesn't go up, we can safely resolve it to an
  // absolute path.
  let resolvedPath = path.resolve(inputPath);

  for (let allowed of ALLOWED_DATA_DIRECTORIES) {
    // Go through all the allowed directories

    // See if it's in there. Note that .. is not processed by pathIsInside, and
    // it doesn't do any relative/absolute conversion.
    if (pathIsInside(resolvedPath, allowed)) {
      // This path is inside this allowed directory
      return true;
    }
  }
  // Otherwise the path wasn't in any of the allowed directories
  return false;
}

// Make sure that, at server startup, all the important directories are
// allowed. We don't want the config file to list one of these as having .. or
// something in it and break on every user request.
assert(
  isAllowedPath(MOUNTED_DATA_PATH),
  "Configured dataPath is not acceptable; does it contain .. or //?"
);
assert(
  isAllowedPath(INTERNAL_DATA_PATH),
  "Configured internalDataPath is not acceptable; does it contain .. or //?"
);
assert(
  isAllowedPath(UPLOAD_DATA_PATH),
  "Upload data path is not acceptable; does it contain .. or //?"
);
assert(
  isAllowedPath(SCRATCH_DATA_PATH),
  "Scratch path is not acceptable; does it contain .. or //?"
);

/**
 * Convert an absolute path to a path relative to the current directory, if it
 * would be an allowed path (i.e. not include ..). If not, pass threough the
 * original path.
 *
 * This is the path we should send to the client, to keep the server's base
 * directory out of the path unless it is needed.
 */
function toClientPath(absPath) {
  let relPath = path.relative('.', absPath);
  if (isAllowedPath(relPath)) {
    return relPath;
  } else {
    return absPath;
  }
}

/**
 * Run the given callback with the path to each file under the given directory,
 * recursively.
 *
 * Hides directories that look like pre-extracted chunk directories.
 */
function forEachFileUnder(directory, callback) {
  
  // Make a list of all the files in the directory
  let children = new Set();
  fs.readdirSync(directory).forEach((basename) => {
    children.add(basename);
  });

  if (directory !== MOUNTED_DATA_PATH && ((children.has("regions.tsv") && children.has("chunk.vg")) || children.has("chunk_contents.txt"))) {
    // This smells like a pre-extracted chunk directory, so skip it.
    return;
  }

  for (let basename of children) {
    // Go through all the files in the directory
    let absPath = path.resolve(directory, basename);
    let stat = fs.statSync(absPath, {throwIfNoEntry: false});
    if (stat) {
      // It actually exists
      if (stat.isDirectory()) {
        // Recurse
        forEachFileUnder(absPath, callback);
      } else if (stat.isFile()) {
        // Show the file
        callback(absPath);
      } else {
        console.log("Found file of unknown type:", absPath);
      }
    } else {
      console.log("File vanished:", absPath);
    }
  }
}

api.get("/getFilenames", (req, res) => {
  console.log("received request for filenames");
  const result = {
    files: [], // store a list of file object, excluding bed files, {  name: string; type: filetype;}
    bedFiles: [],
  };

  if (isAllowedPath(MOUNTED_DATA_PATH)) {
    // list files in folder
    forEachFileUnder(MOUNTED_DATA_PATH, (file) => {
      const clientPath = toClientPath(file);
      if (endsWithExtensions(file, GRAPH_EXTENSIONS)) {
        result.files.push({ trackFile: clientPath, trackType: "graph" });
      }
      if (endsWithExtensions(file, HAPLOTYPE_EXTENSIONS)) {
        result.files.push({ trackFile: clientPath, trackType: "haplotype" });
      }
      if (file.endsWith(".sorted.gam")) {
        result.files.push({ trackFile: clientPath, trackType: "read" });
      }
      if (file.endsWith(".gaf.gz")) {
        result.files.push({"trackFile": file, "trackType": "read"});
      }
      if (file.endsWith(".bed")) {
        result.bedFiles.push(clientPath);
      }
    });
  } else {
    // Somehow MOUNTED_DATA_PATH isn't one of our ALLOWED_DATA_DIRECTORIES (anymore?).
    // Perhaps the server administrator has put a .. in it.
    throw new InternalServerError(
      "MOUNTED_DATA_PATH not allowed. Server is misconfigured."
    );
  }

  console.log(result);
  res.json(result);
});

api.post("/getPathNames", (req, res, next) => {
  console.log("received request for pathNames");
  let sentResponse = false;
  const result = {
    pathNames: [],
  };

  // call 'vg paths' to get path name information
  const graphFile = req.body.graphFile;

  if (!isAllowedPath(graphFile)) {
    // Spit back the provided user data in the error, not the generated and
    // possibly absolute path full of cool facts about the server setup.
    throw new BadRequestError(
      "Path to Graph file not allowed: " + req.body.graphFile
    );
  }
  if (!endsWithExtensions(graphFile, GRAPH_EXTENSIONS)) {
    throw new BadRequestError(
      "Path to Graph file does not end in valid extension: " +
        req.body.graphFile
    );
  }

  const vgViewChild = spawn(find_vg(), ["paths", "-L", "-x", graphFile]);

  vgViewChild.stderr.on("data", (data) => {
    console.log(`err data: ${data}`);
  });

  let pathNames = "";
  vgViewChild.stdout.on("data", function (data) {
    pathNames += data.toString();
  });

  vgViewChild.on("error", function (err) {
    console.log('Error executing "vg view": ' + err);
    if (!sentResponse) {
      sentResponse = true;
      return next(new VgExecutionError("vg view failed"));
    }
    return;
  });

  vgViewChild.on("close", (code) => {
    if (code !== 0) {
      // Execution failed
      if (!sentResponse) {
        sentResponse = true;
        return next(new VgExecutionError("vg view failed"));
      }
      return;
    }
    result.pathNames = pathNames
      .split("\n")
      .filter(function (a) {
        // Eliminate empty names or underscore-prefixed internal names (like _alt paths)
        return a !== "" && !a.startsWith("_");
      })
      .sort();
    console.log(result);
    if (!sentResponse) {
      sentResponse = true;
      res.json(result);
    }
  });
});

// Given a string, return a filename-safe string that is a hash of that string.
// The hash is collision-resistant.
function hashString(str) {
  // We should have access to crypto.subtle, but that's asynchronous and that's
  // probably not worth it for a URL's worth of data. So use Node's crypto
  // library.
  // See <https://stackoverflow.com/a/75872519>
  return createHash("sha256").update(str).digest("hex");
}

// Given a URL and a filename, download the given URL to that filename. Assumes required directories exist.
const downloadFile = async (fileURL, destination) => {
  if (!isAllowedPath(destination)) {
    throw new BadRequestError(
      "Download destination path not allowed: " + destination
    );
  }

  const response = await fetchAndValidate(
    fileURL,
    config.maxFileSizeBytes,
    destination
  );

  // file has already been downloaded and has not been updated since last fetch
  if (!response) {
    console.log("File has already been downloaded at ", destination);
    return;
  }

  console.log("Save to:", destination);

  // overwrites file if it already exists
  const fileStream = fs.createWriteStream(destination, { flags: "w" });
  await finished(Readable.fromWeb(response.body).pipe(fileStream));
};

// url: url destination to fetch from
// maxBytes: maxBytes before aborting fetch
// existingLocation: the existing location of a file, to prevent duplicate fetches of a file already on disk
//                   leaving it empty will result in always fetching
const fetchAndValidate = async (url, maxBytes, existingLocation = null) => {
  let fetchHeader = {};
  // We don't want to fetch again if we have a copy on disk
  // Use a "If-None-Match" header to only fetch if our copy is outdated
  if (existingLocation && fs.existsSync(existingLocation)) {
    fetchHeader = {
      "If-None-Match": ETagMap.get(url) || "-1",
    };
  }
  let controller = timeoutController(config.fetchTimeout);
  const options = {
    method: "GET",
    credentials: "omit",
    cache: "default",
    signal: controller.signal,
    headers: fetchHeader,
  };

  console.log("Fetching URL:", url);
  let response = await fetch(url, options);

  // file exists on disk and file has not been updated since last fetch
  if (response.status === 304) {
    console.log("file not modified since last fetch");
    return 0;
  }

  // update our eTag for this url
  ETagMap.set(url, response.headers.get("ETag"));

  // check for unsuccessful response codes
  if (!response.ok) {
    throw new BadRequestError(
      `Fetch request for ${url} failed: ` + response.status
    );
  }

  // check for size specified in header
  const contentLength = response.headers.get("Content-Length");

  if (contentLength > maxBytes) {
    throw new Error(
      `Fetch request for ${url} failed: Content-Length exceeds maximum file size of ${maxBytes} bytes`
    );
  }

  // use a reader to make sure we're not reading past the max size allowed
  const reader = response.body.getReader();

  let bytesRead = 0;
  const dataRead = [];

  while (true) {
    let { done, value } = await reader.read();

    if (done) {
      break;
    }

    dataRead.push(value);
    bytesRead += new Blob([value]).size;

    if (bytesRead > maxBytes) {
      reader.cancel();
      throw new Error(
        `Fetch request for ${url} failed: received content exceeds maximum file size of ${maxBytes} bytes`
      );
    }
  }

  return new Response(new Blob(dataRead), { headers: response.headers });
};

// Download files for the specified relative chunk path, for the BED file at
// the given URL.
//
// includeContent only downloads the tracks.json file when set to false. If
// true, all files listed in chunk_contents.txt will be downloaded.
// includeContent is false when we select a region, we only need the track names
// includeContent is true when the go button is pressed and a getChunkedData request is called
const retrieveChunk = async (bedURL, chunk, includeContent) => {
  // path to the designated chunk in the temp directory
  const chunkDir = bedChunkLocalPath(bedURL, chunk);

  if (!fs.existsSync(chunkDir)) {
    fs.mkdirSync(chunkDir, { recursive: true });
  }

  // URL under which all the chunk files will exist. Make sure it ends in '/'
  // so we can look up the contents relative to it.
  let chunkURL = new URL(chunk, bedURL).toString();
  if (!chunkURL.endsWith("/")) {
    chunkURL = chunkURL + "/";
  }

  // Each chunk has an index in "chunk_contents.txt"
  let chunkContentURL = new URL("chunk_contents.txt", chunkURL).toString();

  let response = await fetchAndValidate(
    chunkContentURL,
    config.maxFileSizeBytes
  );

  const chunkContent = await response.text();
  const fileNames = chunkContent.split("\n");

  // download all the files in the chunk
  for (const fileName of fileNames) {
    if (fileName == "") {
      // Skip blank lines/trailing newline
      continue;
    }
    if (fileName !== sanitize(fileName)) {
      // Make sure we don't do things like get out of the directory.
      throw new BadRequestError(
        `Chunk index at ${chunkContentURL} cointains disallowed filename ${fileName}`
      );
    }

    // We can interpret all the files in chunk_contents.txt relative to the file they are listed in.
    let chunkFileURL = new URL(fileName, chunkContentURL).toString();

    // download only the tracks.json file if the inlcudeContent flag is false
    if (includeContent || fileName == "tracks.json") {
      let chunkFilePath = path.resolve(chunkDir, fileName);
      await downloadFile(chunkFileURL, chunkFilePath);
    }
  }
};

// aborts fetch request after certain amount of time
const timeoutController = (seconds) => {
  let controller = new AbortController();
  setTimeout(() => controller.abort(), seconds * 1000);
  return controller;
};

// Expects a bed file and a chunk name
// Attempts to download tracks associated with the chunk name from the bed file if it is a URL
// Returns tracks found from local directories as a tracks object
async function getChunkTracks(bedFile, chunk) {
  // Download tracks.json file if it is a URL
  if (isValidURL(bedFile)) {
    await retrieveChunk(bedFile, chunk, false);
  }

  // Get the path to where the track is downloaded
  let chunkPath = bedChunkLocalPath(bedFile, chunk);
  let track_json = path.resolve(chunkPath, "tracks.json");
  let tracks = null;
  // Attempt to read tracks.json and covnert it into a tracks object
  if (fs.existsSync(track_json)) {
    // Create string of tracks data
    const string_data = fs.readFileSync(track_json);

    // Convert to object container like the client component prop types expect
    tracks = JSON.parse(string_data);
  }

  return tracks;
}

// Expects a request with a bed file and a chunk name
// Returns tracks retrieved from getChunkTracks
api.post("/getChunkTracks", (req, res, next) => {
  captureErrors(next, async () => {
    console.log("received request for chunk tracks");
    if (!req.body.bedFile || !req.body.chunk) {
      throw new BadRequestError(
        "Invalid request format",
        req.body.bedFile,
        req.body.chunk
      );
    }

    // tracks are falsy if fetch is unsuccessful

    // TODO: This operation needs to hold a reader lock on the upload/download directories.
    // waiting for lock changes to be merged
    const tracks = await getChunkTracks(req.body.bedFile, req.body.chunk);
    res.json({ tracks: tracks });
  });
});

api.post("/getBedRegions", (req, res, next) => {
  captureErrors(next, async () => {
    console.log("received request for bedRegions");
    const result = {
      bedRegions: [],
      error: null,
    };

    if (req.body.bedFile) {
      let bed_info = await getBedRegions(req.body.bedFile);
      result.bedRegions = bed_info;
      res.json(result);
    } else {
      throw new BadRequestError("No BED file specified");
    }
  });
});

// Load up the given BED file by URL or path, and
// return a data structure decribing all the pre-cached regions it defines.
// Validates file paths for user-accessibility. May throw.
async function getBedRegions(bed) {
  let bed_info = {
    chr: [],
    start: [],
    end: [],
    desc: [],
    chunk: [],
    tracks: [],
  };
  let bed_data;
  let lines;
  let isURL = false;
  console.log("bed file recieved ", bed);
  if (isValidURL(bed)) {
    isURL = true;
    const reponse = await fetchAndValidate(bed, config.maxFileSizeBytes);
    bed_data = await reponse.text();
  } else {
    // otherwise search for bed file in dataPath
    if (!bed.endsWith(".bed")) {
      throw new BadRequestError("BED file path does not end in .bed: " + bed);
    }
    if (!isAllowedPath(bed)) {
      throw new BadRequestError("BED file path not allowed: " + bed);
    }
    if (!fs.existsSync(bed)) {
      throw new BadRequestError("BED file not found: " + bed);
    }

    // Load and parse the BED file
    bed_data = fs.readFileSync(bed).toString();
  }

  lines = bed_data.split(/\r?\n/);
  
  for (let [index, line] of lines.entries()) {
    let records = line.split("\t");

    if (records.length < 3) {
      // This is an empty line or otherwise not BED
      if (line !== "") {
        // This is a bad line
        throw new BadRequestError("BED line " + (index + 1) + " could not be parsed");
      }
      continue;
    }
    bed_info["chr"].push(records[0]);
    bed_info["start"].push(records[1]);
    bed_info["end"].push(records[2]);
    let desc = records.join("_");
    if (records.length > 3) {
      desc = records[3];
    }
    bed_info["desc"].push(desc);
    let chunk = "";
    if (records.length > 4) {
      chunk = records[4];
    }
    bed_info["chunk"].push(chunk);
  }

  if (bed_info.length === 0) {
    BadRequestError("BED file is empty");
  }

  // check for a tracks.json file to prefill tracks configuration
  for (let i = 0; i < bed_info["chunk"].length; i++) {
    let tracks = null;

    let chunk = bed_info["chunk"][i];
    if (chunk !== "") {
      // There is a premade chunk for this BED region.

      // Work out where it should be locally.
      const chunk_path = bedChunkLocalPath(bed, chunk);

      // See if we have downloaded tracks.json in a previous instance
      let track_json = path.resolve(chunk_path, "tracks.json");

      // If json file specifying the tracks exists, pass its information into a tracks object
      // future selection of this region won't re-fetch tracks.json
      if (fs.existsSync(track_json)) {
        // Create string of tracks data
        const string_data = fs.readFileSync(track_json);

        // Convert to object container like the client component prop types expect
        tracks = JSON.parse(string_data);
      }
    }

    // If there is no tracks JSON or no pre-made chunk, we send a falsey value
    // for tracks, which means whatever tracks were already selected will be
    // retained.

    bed_info["tracks"].push(tracks);
  }

  console.log("returning bed_info, ", bed_info);
  return bed_info;
}

// Return the string URL for the host and port at which the given Express app
// server is listening, with HTTP scheme.
function getServerURL(server) {
  let address = server.address();
  return (
    "http://" +
    (address.family === "IPv6"
      ? "[" + address.address + "]"
      : address.address) +
    ":" +
    address.port
  );
}

// Start the server. Returns a promise that resolves when the server is ready.
// To stop the server, close() the result. Server base URL can be obtained with
// getUrl().
export function start() {
  return new Promise((resolve, reject) => {
    // This holds the top-level state of the server and lets us close things up.
    // TODO: use a real class.
    let state = {
      // Express server
      server: undefined,
      // Web socket server
      wss: undefined,
      // Filesystem watch
      watcher: undefined,
      // Outstanding websocket connections
      connections: undefined,
      // Shut down the server
      close: async () => {
        // remove the temporary directory
        fs.rmSync(DOWNLOAD_DATA_PATH, { recursive: true, force: true });

        // Shutdown the Websocket Server.
        state.wss.shutDown();
        // Close the file watcher.
        state.watcher.close();

        await new Promise((resolve, reject) => {
          function stopIfReady() {
            if (state.connections.size === 0) {
              // No more open connections!
              resolve();
            } else {
              // Check back later
              setTimeout(stopIfReady, 10);
            }
          }
          stopIfReady();
        });

        // Wait for the HTTP server to close.
        await new Promise((resolve, reject) => {
          // close server
          state.server.close((err) => {
            if (err) {
              console.log("HTTP server has closed with error: " + err.message);
            } else {
              console.log("HTTP server has closed.");
            }
            resolve();
          });
        });

        console.log("TubeMapServer stopped.");
      },
      // Get the URL the server is listening on
      getUrl: () => {
        return getServerURL(state.server);
      },
      // Get the URL the server is listening on for the API
      getApiUrl: () => {
        return state.getUrl() + "/api/v0";
      },
    };

    // If the state fields are all filled in, resolve the promise for the closeable server object.
    function resolveIfReady() {
      if (
        state.server !== undefined &&
        state.wss !== undefined &&
        state.watcher !== undefined
      ) {
        resolve(state);
      }
    }

    // Start the server on the selected port and save the HTTP server instance
    // created by app.listen for the WebSocketServer
    const server = app.listen(SERVER_PORT, SERVER_BIND_ADDRESS, () => {
      console.log("TubeMapServer listening on " + getServerURL(server));
      // Server is ready so add to state.
      state.server = server;
      // See if the other server components are up yet and, if so, resolve our promise.
      resolveIfReady();
    });
    // Create the WebSocketServer, for watching for updated files, using the HTTP server instance
    // Note that all websocket connections on any path end up here!
    const wss = new WebSocketServer({ httpServer: server });

    // Set that holds all the WebSocketConnection instances that
    // notify the client of file directory changes
    state.connections = new Set();

    wss.on("request", function (request) {
      // We received a websocket connection request and we need to accept it.
      console.log(
        `${new Date()} New WebSocket connection from origin: ${request.origin}.`
      );
      const connection = request.accept(null, request.origin);
      // We save the connection so that we can notify them when there is a change in the file system
      state.connections.add(connection);
      connection.on("close", function (reasonCode, description) {
        // When the websocket connection closes, we delete it from our set of open connections
        state.connections.delete(connection);
        console.log(
          `A WebSocket connection has been closed: ${state.connections.size} remain open.`
        );
      });
    });

    // Web socket server is now ready
    state.wss = wss;

    // Start a watch. We can stop it by closing the watcher.
    const watcher = fs.watch(MOUNTED_DATA_PATH, function (event, filename) {
      // There was a change in the file directory
      console.log("Directory has been changed");
      for (let conn of state.connections) {
        // Notify all open connections about the change
        conn.send("change");
      }
    });

    // fs watcher is now ready
    state.watcher = watcher;

    // See if the server itself is up yet and, if so, resolve our promise.
    resolveIfReady();
  });
}

// Now we have to guess if we are the main module without being able to say or even poll for import.meta (or Jest explodes) or require.main (or Node explodes). Also when we are main, process.mainModule is empty because there's no CJS module to put there.

if (process) {
  // We assume we are named server.mjs
  let ourFilename = dirname() + "/server.mjs";
  let mainFilename = process.argv[1];
  if (ourFilename === mainFilename) {
    // If we are passed as the first argument we are probably being run.
    start();
  }
}

process.on("SIGINT", function () {
  console.log("\nshutting down from SIGINT");
  // remove the temporary directory
  fs.rmSync(DOWNLOAD_DATA_PATH, { recursive: true, force: true });

  process.exit();
});
