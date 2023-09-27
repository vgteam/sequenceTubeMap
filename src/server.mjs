/* eslint no-console: 'off' */
/* eslint strict:0 */
/* eslint no-param-reassign: 'off' */

"use strict";

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
import { readFileSync, writeFile } from 'fs';
import { parseRegion, convertRegionToRangeRegion, stringifyRangeRegion, stringifyRegion } from "./common.mjs";
import { Readable } from "stream";
import { finished } from "stream/promises";
import sanitize from "sanitize-filename";
import { createHash } from "node:crypto";
import { JSONParser} from '@streamparser/json';

// Now we want to load config.json.
//
// We *should* be able to import it, but that is not allowed by Node without
// 'assert { type: "json" }' at the end.
//
// But that syntax is in turn prohibited by Babel unless you add a flag to tell
// it to turn on its own ability to parse that "experimental" syntax.
//
// And the React setup prohibits you from setting the flag (unless you eject
// and take on the maintainance burden of all changes to react-scripts, or else
// you install one of the modules dedicated to hacking around this).
//
// We could go back to require for this, but then we'd have to say import.meta
// to get ahold of it, and we aren't allowed to say that with Jest's parser;
// it's a syntax error because React's Babel (?) turns all our code into
// non-module JS for Jest but doesn't handle that.
//
// So we try a filesystem load.
// See <https://stackoverflow.com/a/75705665>
// But we can't use top-level await, so it has to be synchronous.
//
// We also can't say "__dirname" or "import.meta" even to poll if those exist,
// or node and Babel (respectively) will yell at us.
// Luckily the es-dirname module exists which can find *our* directory by
// looking at the stack. See
// https://github.com/vdegenne/es-dirname/blob/master/es-dirname.js
const config = JSON.parse(readFileSync(dirname() + '/config.json'));

if (process.env.NODE_ENV !== "production") {
  // Load any .env file config
  dotenv.config();
}

const VG_PATH = config.vgPath;
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

const HAPLOTYPE_EXTENSIONS = [
  ".gbwt",
  ".gbz"
]

const fileTypes = {
  GRAPH: "graph",
  HAPLOTYPE: "haplotype",
  READ: "read",
  BED:"bed",
};

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

api.post("/graphFileSubmission", upload.single("graphFile"), (req, res) => {
  console.log("/graphFileSubmission");
  console.log(req.file);
  res.json({ path: path.relative(UPLOAD_DATA_PATH, req.file.path) });
});

api.post("/gbwtFileSubmission", upload.single("gbwtFile"), (req, res) => {
  console.log("/gbwtFileSubmission");
  console.log(req.file);
  res.json({ path: path.relative(UPLOAD_DATA_PATH, req.file.path) });
});

api.post("/gamFileSubmission", upload.single("gamFile"), (req, res) => {
  console.log("/gamFileSubmission");
  console.log(req.file);
  indexGamSorted(req, res);
});

function indexGamSorted(req, res) {
  const prefix = req.file.path.substring(0, req.file.path.lastIndexOf("."));
  const sortedGamFile = fs.createWriteStream(prefix + ".sorted.gam", {
    encoding: "binary",
  });
  const vgIndexChild = spawn(`${VG_PATH}vg`, [
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
    res.json({ path: path.relative(UPLOAD_DATA_PATH, prefix + ".sorted.gam") });
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

api.post("/getChunkedData", (req, res, next) => {
  // We would like this to be an async function, but then Express error
  // handling doesn't work, because it doesn't detect returned promise
  // rejections until Express 5. We have to pass an error to next() or else
  // throw synchronously.
  //
  // So we set up a promise here and we make sure to handle failures
  // ourselves with next().
  let promise = getChunkedData(req, res, next);
  promise.catch(next);
});

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

  let dataPath = pickDataPath(req.body.dataPath);
  console.log(`dataPath = ${dataPath}`);

  // This will have a conitg, start, end, or a contig, start, distance
  let parsedRegion;
  try {
    parsedRegion = parseRegion(req.body.region);
  } catch (e) {
    // Whatever went wrong in the parsing, it makes the request bad.
    throw new BadRequestError("Wrong query: " + e.message + " See ? button above.");
  }

  // check the bed file if this region has been pre-fetched
  let chunkPath = "";
  if (req.withBed) {
    // Determine where the BED is, URL or local path.
    let bed = isValidURL(bedFile) ? bedFile : path.resolve(dataPath, bedFile);
    // We need to parse the BED file we have been referred to so we can look up
    // the pre-parsed chunk.
    chunkPath = await getChunkPath(bed, parsedRegion);
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
    if (!isAllowedPath(`${dataPath}${graphFile}`)) {
      throw new BadRequestError("Graph file path not allowed: " + graphFile);
    }
    // TODO: Use same variable for check and command line?

    // Maybe check using file types in the future

    // See if we need to ignore haplotypes in gbz graph file

    if (req.withGbwt) {
      //either push gbz with graph and haplotype or push seperate graph and gbwt file
      if (graphFile.endsWith(".gbz") && gbwtFile.endsWith(".gbz") && graphFile === gbwtFile) { 
        // use gbz haplotype
        vgChunkParams.push("-x", `${dataPath}${graphFile}`);
      } else if (!graphFile.endsWith(".gbz") && gbwtFile.endsWith(".gbz")){
        throw new BadRequestError("Cannot use gbz as haplotype alone.");
      } else {
        // ignoring haplotype from graph file and using haplotype from gbwt file
        vgChunkParams.push("--no-embedded-haplotypes", "-x", `${dataPath}${graphFile}`);

        // double-check that the file is a .gbwt and allowed
        if (!endsWithExtensions(gbwtFile, HAPLOTYPE_EXTENSIONS)) {
          throw new BadRequestError(
            "GBWT file doesn't end in .gbwt or .gbz: " + gbwtFile
          );
        }
        if (!isAllowedPath(`${dataPath}${gbwtFile}`)) {
          throw new BadRequestError("GBWT file path not allowed: " + gbwtFile);
        }
        // Use a GBWT haplotype database
        vgChunkParams.push("--gbwt-name", `${dataPath}${gbwtFile}`);
      }
    } else {
      // push graph file
      if (graphFile.endsWith(".gbz")) {
        vgChunkParams.push("-x", `${dataPath}${graphFile}`, "--no-embedded-haplotypes");
      } else {
        vgChunkParams.push("-x", `${dataPath}${graphFile}`);
      }
    }

    // push all gam files
    for (const gamFile of gamFiles) {
      if (!gamFile.endsWith(".gam")) {
        throw new BadRequestError("GAM file doesn't end in .gam: " + gamFile);
      }
      if (!isAllowedPath(`${dataPath}${gamFile}`)) {
        throw new BadRequestError("GAM file path not allowed: " + gamFile);
      }
      // Use a GAM index
      console.log("pushing gam file", gamFile);
      vgChunkParams.push("-a", `${dataPath}${gamFile}`, "-g");
    }
    

    // to seach by node ID use "node" for the sequence name, e.g. 'node:1-10'
    if (parsedRegion.contig === "node") {
      if (parsedRegion.distance !== undefined) {
        // Start and distance of node IDs, so send that idiomatically.
        vgChunkParams.push("-r", parsedRegion.start, "-c", parsedRegion.distance);
      } else {
        // Start and end of node IDs
        vgChunkParams.push("-r", "".concat(parsedRegion.start, ":",  parsedRegion.end), "-c", 20);
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
    const vgChunkCall = spawn(`${VG_PATH}vg`, vgChunkParams);
    const vgViewCall = spawn(`${VG_PATH}vg`, ["view", "-j", "-"]);
    let graphAsString = "";
    req.error = Buffer.alloc(0);

    vgChunkCall.on("error", function (err) {
      console.log(
        "Error executing " +
          VG_PATH +
          "vg " +
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
      vgViewCall.stdin.write(data);
    });

    vgChunkCall.on("close", (code) => {
      console.log(`vg chunk exited with code ${code}`);
      vgViewCall.stdin.end();
      if (code !== 0) {
        console.log("Error from " + VG_PATH + "vg " + vgChunkParams.join(" "));
        // Execution failed
        if (!sentResponse) {
          sentResponse = true;
          return next(new VgExecutionError("vg chunk failed"));
        }
      }
    });

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
    const vgViewCall = spawn(`${VG_PATH}vg`, [
      "view",
      "-j",
      `${req.chunkDir}/chunk.vg`,
    ]);
    let graphAsString = "";
    req.error = Buffer.alloc(0);
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

// Gets the chunk path from a region specified in a bedfile, which may be a URL
// or an allowed local path.
//
// Also downloads the chunk data if the bed is an URL and it has not been
// downloaded yet.
//
// The returned path is either an allowed path, or an empty string if we are
// using a BED without a pre-generated chunk for the given region.
async function getChunkPath(bed, parsedRegion) {
  let chunk = "";
  let regionInfo = await getBedRegions(bed);


  for (let i = 0; i < regionInfo["desc"].length; i++) {
    let entryRegion = {
      contig: regionInfo["chr"][i],
      start: regionInfo["start"][i],
      end: regionInfo["end"][i]
    }
    if (stringifyRegion(entryRegion) === stringifyRegion(parsedRegion)) {
      // A BED entry is defined for this region exactly
      if (regionInfo["chunk"][i] !== "") {
        // And a chunk file is stored for it, so use that.
        chunk = regionInfo["chunk"][i];
        break;
      }
    }
  }

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
    throw new BadRequestError(`Couldn't find pre-fetched chunk at ${chunk_file}`);
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
  try{
    if (!isAllowedPath(gamFile)) {
      // This is probably under SCRATCH_DATA_PATH
      throw new BadRequestError("Path to GAM file not allowed: " + req.gamFile);
    }

    const vgViewChild = spawn(`${VG_PATH}vg`, [
      "view",
      "-j",
      "-a",
      gamFile,
    ]);

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
    // Find gam files
    let gamFiles = [];
    fs.readdirSync(req.chunkDir).forEach((file) => {
      console.log(file);
      if (file.endsWith(".gam")) {
        gamFiles.push(req.chunkDir + "/" + file);
      }
    });

    // Parse a GAM chunk name and get the GAM number from it
    // Names are like:
    // */chunk_*.gam for 0
    // */chunk-1_*.gam for 1, 2, 3, etc.
    let gamNameToNumber = (gamName) => {
      const pattern = /.*\/chunk(-([0-9])+)?_.*\.gam/
      let matches = gamName.match(pattern)
      if (!matches) {
        throw new InternalServerError("Bad GAM name " + gamName) 
      }
      if (matches[2] !== undefined) {
        // We have a number
        return parseInt(matches[2])
      }
      // If there's no number we are chunk 0
      return 0
    }

    // Sort all the GAM files we found in order of their chunk number,
    // ascending. This will also be the order of the GAM files passed to chunk,
    // and so the order we got the tracks in, and thus the order we want the
    // results in.
    gamFiles.sort((a, b) => {
      return gamNameToNumber(a) - gamNameToNumber(b)
    })

    req.gamResults = [];
    req.gamRemaining = gamFiles.length;
    for (let i = 0; i < gamFiles.length; i++){
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

// Decide where to pull the data from
// (builtin examples, mounted user data folder or uploaded data).
// Returned path is guaranteed to pass isAllowedPath().
function pickDataPath(reqDataPath) {
  let dataPath;
  switch (reqDataPath) {
    case "mounted":
      dataPath = MOUNTED_DATA_PATH;
      break;
    case "upload":
      dataPath = UPLOAD_DATA_PATH;
      break;
    case "default":
      dataPath = INTERNAL_DATA_PATH;
      break;
    default:
      // User supplied an impermissible option.
      throw new BadRequestError("Unrecognized data path type: " + reqDataPath);
  }
  if (!dataPath.endsWith("/")) {
    dataPath = dataPath + "/";
  }
  // This path will always be allowed. Caller does not need to check.
  assert(isAllowedPath(dataPath));
  return dataPath;
}

api.get("/getFilenames", (req, res) => {
  console.log("received request for filenames");
  const result = {
    files: [], // store a list of file object, excluding bed files, {  name: string; type: filetype;}
    bedFiles: [],
  };

  if (isAllowedPath(MOUNTED_DATA_PATH)) {
    // list files in folder
    fs.readdirSync(MOUNTED_DATA_PATH).forEach((file) => {
      if (endsWithExtensions(file, GRAPH_EXTENSIONS)) {
        result.files.push({"trackFile": file, "trackType": "graph"});
      }
      if (endsWithExtensions(file, HAPLOTYPE_EXTENSIONS)) {
        result.files.push({"trackFile": file, "trackType": "haplotype"});
      }
      if (file.endsWith(".sorted.gam")) {
        result.files.push({"trackFile": file, "trackType": "read"});
      }
      if (file.endsWith(".bed")) {
        result.bedFiles.push(file);
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

  let dataPath = pickDataPath(req.body.dataPath);

  // call 'vg paths' to get path name information
  const graphFile = `${dataPath}${req.body.graphFile}`;

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

  const vgViewChild = spawn(`${VG_PATH}vg`, ["paths", "-L", "-x", graphFile]);

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

// returns whether or not a string is a valid http url
function isValidURL(string) {
  if (!string) {
    return False;
  }

  let url;

  try {
    url = new URL(string)
  } catch(error) {
    return false;
  }

  return url.protocol === "http:" || url.protocol === "https:";
}

// Given a URL and a filename, download the given URL to that filename. Assumes required directories exist.
const downloadFile = async(fileURL, destination) => {
  if (!isAllowedPath(destination)) {
    throw new BadRequestError("Download destination path not allowed: " + destination);
  }

  const response = await fetchAndValidate(fileURL, config.maxFileSizeBytes);

  console.log("Save to:", destination);
 
  // overwrites file if it already exists
  const fileStream = fs.createWriteStream(destination, { flags: 'w' });
  await finished(Readable.fromWeb(response.body).pipe(fileStream));

}

const fetchAndValidate = async(url, maxBytes) => {
  const options = {
    method: "GET",
    credentials: "omit",
    cache: "default",
    signal: timeoutController(config.fetchTimeout).signal
  };
  
  console.log("Fetching URL:", url);
  let response = await fetch(url, options);

  // check for unsuccessful response codes
  if (!response.ok) {
    throw new BadRequestError(`Fetch request for ${url} failed: ` + response.status);
  }

  // check for size specified in header
  const contentLength = response.headers.get("Content-Length");

  if (contentLength > maxBytes) {
    throw new Error(`Fetch request for ${url} failed: Content-Length exceeds maximum file size of ${maxBytes} bytes`);
  }

  // use a reader to make sure we're not reading past the max size allowed
  const reader = response.body.getReader();

  let bytesRead = 0;
  const dataRead = [];

  while (true) {
    let {done, value} = await reader.read();

    if (done) {
      break;
    }

    dataRead.push(value);
    bytesRead += new Blob([value]).size;

    if (bytesRead > maxBytes) {
      reader.cancel();
      throw new Error(`Fetch request for ${url} failed: received content exceeds maximum file size of ${maxBytes} bytes`);
    }
  }

  return new Response(new Blob(dataRead), { headers: response.headers });

}

// Download files for the specified relative chunk path, for the BED file at
// the given URL.
//
// includeContent only downloads the tracks.json file when set to false. If
// true, all files listed in chunk_contents.txt will be downloaded.
const retrieveChunk = async(bedURL, chunk, includeContent) => {
  // path to the designated chunk in the temp directory
  const chunkDir = bedChunkLocalPath(bedURL, chunk);

  // TODO: check if this chunk has been downloaded before, to prevent duplicate fetches
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

  let response = await fetchAndValidate(chunkContentURL, config.maxFileSizeBytes);

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
      throw new BadRequestError(`Chunk index at ${chunkContentURL} cointains disallowed filename ${fileName}`); 
    }

    // We can interpret all the files in chunk_contents.txt relative to the file they are listed in.
    let chunkFileURL = new URL(fileName, chunkContentURL).toString();

    // download only the tracks.json file if the inlcudeContent flag is false
    if (includeContent || fileName == "tracks.json") {
      let chunkFilePath = path.resolve(chunkDir, fileName);
      await downloadFile(chunkFileURL, chunkFilePath);
    }
  }
  
}


// aborts fetch request after certain amount of time
const timeoutController = (seconds) => {
  let controller = new AbortController();
  setTimeout(() => controller.abort(), seconds * 1000);
  return controller;
}

api.post("/getBedRegions", (req, res, next) => {
  // Bridge async functions to Express error handling with next(err). Don't
  // return a promise. 
  let promise = (async () => {
    console.log("received request for bedRegions");
    const result = {
      bedRegions: [],
      error: null,
    };

    if (req.body.bedFile) {
      let dataPath = pickDataPath(req.body.dataPath);
      // Get the path or URL to the actual BED file.
      let bed = isValidURL(req.body.bedFile) ? req.body.bedFile : path.resolve(dataPath, req.body.bedFile);
      let bed_info = await getBedRegions(bed);
      result.bedRegions = bed_info;
      res.json(result);
    } else {
      throw new BadRequestError("No BED file specified");
    }
  })();
  promise.catch(next);
});

// Load up the given BED file by URL or path, and
// return a data structure decribing all the pre-cached regions it defines.
// Validates file paths for user-accessibility. May throw.
async function getBedRegions(bed) {
  let bed_info = { chr: [], start: [], end: [], desc: [], chunk: [], tracks: []};
  let bed_data;
  let lines;
  let isURL = false;
  console.log("bed file recieved ", bed);
  if (isValidURL(bed)) {
    isURL = true;
    const reponse = await fetchAndValidate(bed, config.maxFileSizeBytes);
    bed_data = await reponse.text();

  } else {  // otherwise search for bed file in dataPath
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
  

  lines = bed_data.split("\n");
  lines.map(function (line) {
    let records = line.split("\t");

    if (records.length < 3) {
      // This is an empty line or otherwise not BED
      return
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

  });


  // check for a tracks.json file to prefill tracks configuration
  for (let i = 0; i < bed_info["chunk"].length; i++) {
    let tracks = null;
    
    let chunk = bed_info["chunk"][i];
    if (chunk !== "") {
      // There is a premade chunk for this BED region.
      
      // Work out where it should be locally.
      const chunk_path = bedChunkLocalPath(bed, chunk);
      // download the tracks file if bed is an url
      if (isURL) {
        await retrieveChunk(bed, chunk, false);
      }

      let track_json = path.resolve(chunk_path, "tracks.json");

      let tracks_array = [];

      // If json file specifying the tracks exists
      if (fs.existsSync(track_json)) {
        // Create string of tracks data
        const string_data = fs.readFileSync(track_json);
        const parser = new JSONParser({separator: ''});
        parser.onValue = ({value, key, parent, stack}) => {
          if (stack.length > 0) {
            // ignore inner values
            return;
          }
          if (!Object.hasOwn(value, 'trackFile')) {
            throw new BadRequestError('Non-track object in tracks.json: ' + JSON.stringify(value))
          }
          // put tracks in array
          tracks_array.push(value);
        };
        parser.write(string_data);
        // Convert to object container like the client component prop types expect
        tracks = {...tracks_array}; 
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
  let ourFilename = dirname() + '/server.mjs';
  let mainFilename = process.argv[1];
  if (ourFilename === mainFilename) {
    // If we are passed as the first argument we are probably being run.
    start();
  }
}

process.on( "SIGINT", function() {
  console.log("\nshutting down from SIGINT");
  // remove the temporary directory
  fs.rmSync(DOWNLOAD_DATA_PATH, { recursive: true, force: true });

  process.exit();
})
