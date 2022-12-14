/* eslint no-console: 'off' */
/* eslint strict:0 */
/* eslint no-param-reassign: 'off' */

"use strict";

const assert = require("assert");
const spawn = require("child_process").spawn;
const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const { v1: uuid } = require("uuid");
const fs = require("fs-extra");
const path = require("path");
const pathIsInside = require("path-is-inside");
const rl = require("readline");
const compression = require("compression");
const WebSocketServer = require("websocket").server;
const config = require("./config.json");
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const VG_PATH = config.vgPath;
const MOUNTED_DATA_PATH = config.dataPath;
const INTERNAL_DATA_PATH = config.internalDataPath;
// THis is where we will store uploaded files
const UPLOAD_DATA_PATH = "uploads/";
// This is where we will store per-request generated files
const SCRATCH_DATA_PATH = "tmp/";
const SERVER_PORT = process.env.SERVER_PORT || config.serverPort || 3000;
const SERVER_BIND_ADDRESS = config.serverBindAddress || undefined;

// This holds a collection of all the absolute path root directories that the
// server is allowed to access on behalf of users.
const ALLOWED_DATA_DIRECTORIES = [
  MOUNTED_DATA_PATH,
  INTERNAL_DATA_PATH,
  UPLOAD_DATA_PATH,
  SCRATCH_DATA_PATH,
].map((p) => path.resolve(p));

const GRAPH_EXTENSIONS = [
  ".xg",
  ".vg",
  ".pg",
  ".hg",
  ".gbz"
]

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

api.post("graphFileSubmission", upload.single("graphFile"), (req, res) => {
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

function endsWithExtensions(file, extensions) {
  for (const extension of extensions) {
    if (file.endsWith(extension)) {
      return true;
    }
  }
  return false;
}

function getFileFromType(track, type) {
  for (const file of track.files) {
    if (file.type == type) {
      return file.name;
    }
  }
  return "none";
}

api.post("/getChunkedData", (req, res, next) => {
  // We only want to have one downstream callback chain out of here.
  // TODO: Does Express let us next(err) multiple times if multiple errors happen concurrently???
  let sentResponse = false;
  console.time("request-duration");
  console.log("http POST getChunkedData received");
  console.log(`region = ${req.body.region}`);
  debugger;

  // Assign each request a UUID. v1 UUIDs can be very similar for similar
  // timestamps on the same node, but are still guaranteed to be unique within
  // a given nodejs process.
  req.uuid = uuid();

  // Make a temp directory for vg output files for this request
  req.chunkDir = path.join(SCRATCH_DATA_PATH, `tmp-${req.uuid}`);
  fs.mkdirSync(req.chunkDir);
  // This request owns the directory, so clean it up when the request finishes.
  req.rmChunk = true;

  //TODO: loop through and process all tracks


  // We always have an graph file
  const graphFile = getFileFromType(req.body.tracks[0], fileTypes.GRAPH);
  // We sometimes have a GBWT with haplotypes that override any in the graph file
  const gbwtFile = getFileFromType(req.body.tracks[1], fileTypes.HAPLOTYPE);
  // We sometimes have a GAM file with reads
  const gamFile = getFileFromType(req.body.tracks[2], fileTypes.READ);
  // We sometimes have a BED file with regions to look at
  const bedFile = getFileFromType(req.body.tracks[3], fileTypes.BED);


  req.withGam = true;
  if (!gamFile || gamFile === "none") {
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

  // parse region
  // either a range -> seq:start-end
  // or a position and distance -> seq:post+distance
  let region = req.body.region;
  if (!region || region === "none") {
    throw new BadRequestError(
      "Wrong query: Missing region field. See ? button above."
    );
  }
  if (!region.includes(":")) {
    throw new BadRequestError(
      "Wrong query: region doesn't contain a ':'. See ? button above."
    );
  }
  let region_col = region.split(":");
  let start_end = region_col[1].split("-");
  let pos_dist = region_col[1].split("+");
  let r_start = -1;
  let r_end = -1;
  let distance = -1;
  if (start_end.length == 2) {
    r_start = Number(start_end[0]);
    r_end = Number(start_end[1]);
  } else if (pos_dist.length == 2) {
    r_start = Number(pos_dist[0]);
    distance = Number(pos_dist[1]);
  } else {
    throw new BadRequestError(
      "Wrong query: coordinates must be in the form 'X:Y-Z' or 'X:Y+Y'. See ? button above."
    );
  }

  // check the bed file if this region has been pre-fetched
  let chunkPath = "";
  if (req.withBed) {
    // We need to parse the BED file we have been referred to so we can look up
    // the pre-parsed chunk. We don't want the client re-uploading the BED to
    // us on every request.
    let regionInfo = getBedRegions(bedFile, dataPath);

    for (let i = 0; i < regionInfo["desc"].length; i++) {
      let region_chr = regionInfo["chr"][i];
      let region_start = regionInfo["start"][i];
      let region_end = regionInfo["end"][i];
      if (region_chr.concat(":", region_start, "-", region_end) === region) {
        // A BED entry is defined for this region exactly
        if (regionInfo["chunk"][i] !== "") {
          // And a chunk file is stored for it, so use that.
          chunkPath = regionInfo["chunk"][i];
          break;
        }
      }
    }
    // check that the 'chunk.vg' file exists in the chunk folder
    chunkPath = `${dataPath}${chunkPath}`;
    if (chunkPath.endsWith("/")) {
      chunkPath = chunkPath.substring(0, chunkPath.length - 1);
    }
    let chunk_file = `${chunkPath}/chunk.vg`;
    if (!isAllowedPath(chunk_file)) {
      // We need to check allowed-ness before we check existence.
      throw new BadRequestError("Path to chunk not allowed: " + chunkPath);
    }
    if (fs.existsSync(chunk_file)) {
      console.log(`found pre-fetched chunk at ${chunk_file}`);
    } else {
      console.log(`couldn't find pre-fetched chunk at ${chunk_file}`);
      chunkPath = "";
    }
  }

  if (chunkPath === "") {
    // call 'vg chunk' to generate graph
    let vgChunkParams = ["chunk"];
    // double-check that the file has a valid graph extension and is allowed
    if (!endsWithExtensions(graphFile, GRAPH_EXTENSIONS)) {
      throw new BadRequestError("Graph file does not end in valid extension: " + graphFile);
    }
    if (!isAllowedPath(`${dataPath}${graphFile}`)) {
      throw new BadRequestError("Graph file path not allowed: " + graphFile);
    }
    // TODO: Use same variable for check and command line?

    // Maybe check using file types in the future

    // See if we need to ignore haplotypes in gbz graph file
/*
    if (graphFile.endsWith(".gbz")) {
      if (req.withGbwt) {
        if (gbwtFile.endsWith(".gbz")) {
          vgChunkParams.push("-x", `${dataPath}${graphFile}`);
        } else {
          vgChunkParams.push("-x", "--ignore-embedded-haplotypes", `${dataPath}${graphFile}`);
        }
      }
    }
*/
    if (req.withGbwt) {
      //either push gbz with graph and haplotype or push seperate graph and gbwt file
      if (graphFile.endsWith(".gbz") && gbwtFile.endsWith(".gbz")) { 
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
    
    
    //vgChunkParams.push("-x", `${dataPath}${graphFile}`);

    if (req.withGam) {
      // double-check that the file is a .gam and allowed
      if (!gamFile.endsWith(".gam")) {
        throw new BadRequestError("GAM file doesn't end in .gam: " + gamFile);
      }
      if (!isAllowedPath(`${dataPath}${gamFile}`)) {
        throw new BadRequestError("GAM file path not allowed: " + gamFile);
      }
      // Use a GAM index
      vgChunkParams.push("-a", `${dataPath}${gamFile}`, "-g");
    }
    /*
    if (req.withGbwt) {
      // double-check that the file is a .gbwt and allowed
      if (!gbwtFile.endsWith(".gbwt")) {
        throw new BadRequestError(
          "GBWT file doesn't end in .gbwt: " + gbwtFile
        );
      }
      if (!isAllowedPath(`${dataPath}${gbwtFile}`)) {
        throw new BadRequestError("GBWT file path not allowed: " + gbwtFile);
      }
      // Use a GBWT haplotype database
      vgChunkParams.push("--gbwt-name", `${dataPath}${gbwtFile}`);
    }
    */
    // to seach by node ID use "node" for the sequence name, e.g. 'node:1-10'
    if (region_col[0] === "node") {
      if (distance > -1) {
        vgChunkParams.push("-r", r_start, "-c", distance);
      } else {
        vgChunkParams.push("-r", "".concat(r_start, ":", r_end), "-c", 20);
      }
    } else {
      // reformat pos+dist into start-end range
      if (distance > -1) {
        r_end = r_start + distance;
        region = region_col[0].concat(":", r_start, "-", r_end);
      }
      vgChunkParams.push("-c", "20", "-p", `${region}`);
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
    req.error = new Buffer(0);

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
      if (code != 0) {
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
      if (code != 0) {
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
      req.region = [r_start, r_end];
      if (!sentResponse) {
        sentResponse = true;
        processAnnotationFile(req, res, next);
      }
    });
  } else {
    // chunk has already been pre-fecthed and is saved in chunkPath
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
    req.error = new Buffer(0);
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
      req.region = [r_start, r_end];
      if (!sentResponse) {
        sentResponse = true;
        processAnnotationFile(req, res, next);
      }
    });
  }
});

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

// We can use this middleware to ensure that errors we throw
// or next(err) will be sent along to the user.
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

function processAnnotationFile(req, res, next) {
  try {
    // find annotation file
    // TODO: This is not going to work if multiple people hit the server at once!
    // We need to make vg chunk take an argument from us for where to put the file.
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
        processGamFile(req, res, next);
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

function processGamFile(req, res, next) {
  try {
    console.time("processing gam file");
    // Find gam file
    fs.readdirSync(req.chunkDir).forEach((file) => {
      if (file.endsWith(".gam")) {
        req.gamFile = req.chunkDir + "/" + file;
      }
    });

    if (!isAllowedPath(req.gamFile)) {
      // This is probably under SCRATCH_DATA_PATH
      throw new BadRequestError("Path to GAM file not allowed: " + req.gamFile);
    }

    // call 'vg view' to transform gam to json
    const vgViewChild = spawn(`${VG_PATH}vg`, [
      "view",
      "-j",
      "-a",
      req.gamFile,
    ]);

    vgViewChild.stderr.on("data", (data) => {
      console.log(`err data: ${data}`);
    });

    let gamJSON = "";
    vgViewChild.stdout.on("data", function (data) {
      gamJSON += data.toString();
    });

    vgViewChild.on("close", () => {
      req.gamArr = gamJSON
        .split("\n")
        .filter(function (a) {
          return a != "";
        })
        .map(function (a) {
          return JSON.parse(a);
        });
      console.timeEnd("processing gam file");
      processRegionFile(req, res, next);
    });
  } catch (error) {
    return next(error);
  }
}

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
      cleanUpAndSendResult(req, res, next);
    });
  } catch (error) {
    return next(error);
  }
}

// Cleanup functuion shared between success and error code paths.
// May throw.
// TODO: Use as a middleware?
function cleanUpChunkIfOwned(req, res) {
  if (req.rmChunk) {
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
    result.gam = req.withGam === true ? req.gamArr : [];
    result.region = req.region;
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
    if (part == "..") {
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
    graphFiles: [],
    gbwtFiles: [],
    gamIndices: [],
    bedFiles: [],
  };

  if (isAllowedPath(MOUNTED_DATA_PATH)) {
    // list files in folder
    fs.readdirSync(MOUNTED_DATA_PATH).forEach((file) => {
      if (endsWithExtensions(file, GRAPH_EXTENSIONS)) {
        result.graphFiles.push(file);
      }
      if (endsWithExtensions(file, HAPLOTYPE_EXTENSIONS)) {
        result.gbwtFiles.push(file);
      }
      if (file.endsWith(".sorted.gam")) {
        result.gamIndices.push(file);
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
      "Path to Graph file does not end in valid extension: " + req.body.graphFile
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
    if (code != 0) {
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
        return a != "" && !a.startsWith("_");
      })
      .sort();
    console.log(result);
    if (!sentResponse) {
      sentResponse = true;
      res.json(result);
    }
  });
});

api.post("/getBedRegions", (req, res) => {
  console.log("received request for bedRegions");
  const result = {
    bedRegions: [],
    error: null,
  };

  if (req.body.bedFile != "none") {
    let dataPath = pickDataPath(req.body.dataPath);
    let bed_info = getBedRegions(req.body.bedFile, dataPath);
    console.log("bed reading done");
    result.bedRegions = bed_info;
    res.json(result);
  } else {
    throw new BadReqestError("No BED file specified");
  }
});

// Load up the given BED file, relative to the given pre-resolved dataPath, and
// return a data structure decribing all the pre-cached regions it defines.
// Validates file paths for user-accessibility. May throw.
function getBedRegions(bedFile, dataPath) {
  if (!bedFile.endsWith(".bed")) {
    throw new BadRequestError("BED file path does not end in .bed: " + bedFile);
  }

  // Work out what file we're talking about
  let bed_path = path.join(dataPath, bedFile);
  if (!isAllowedPath(bed_path)) {
    throw new BadRequestError("BED file path not allowed: " + bedFile);
  }
  if (!fs.existsSync(bed_path)) {
    throw new BadRequestError("BED file not found: " + bedFile);
  }

  let bed_info = { chr: [], start: [], end: [], desc: [], chunk: [] };

  // Load and parse the BED file
  let bed_data = fs.readFileSync(bed_path).toString();
  let lines = bed_data.split("\n");
  lines.map(function (line) {
    let records = line.split("\t");
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

  return bed_info;
}

// Return the string URL for the host and port at which the given Express app
// server is listening, with HTTP scheme.
function getServerURL(server) {
  let address = server.address();
  return (
    "http://" +
    (address.family == "IPv6" ? "[" + address.address + "]" : address.address) +
    ":" +
    address.port
  );
}

// Start the server. Returns a promise that resolves when the server is ready.
// To stop the server, close() the result. Server base URL can be obtained with
// getUrl().
function start() {
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
        // Close out all the servers
        state.wss.shutDown();
        state.server.close();
        state.watcher.close();

        // Wait for all the web sockets to be closed.
        await new Promise((resolve, reject) => {
          function stopIfReady() {
            if (state.connections.size == 0) {
              // No more open connections!
              resolve();
            } else {
              // Check back later
              setTimeout(stopIfReady, 10);
            }
          }
          stopIfReady();
        });

        console.log("TubeMapServer stopped.");
        // TODO: do we have to do more to wait for the close to take effect?
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
    // created by app.listen for the WebScoketServer
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
      // We recieved a websocket connection request and we need to accept it.
      console.log(
        new Date() + " Connection from origin " + request.origin + "."
      );
      const connection = request.accept(null, request.origin);
      // We save the connection so that we can notify them when there is a change in the file system
      state.connections.add(connection);
      connection.on("close", function (reasonCode, description) {
        // When the websocket connection closes, we delete it from our set of open connections
        state.connections.delete(connection);
        console.log("A connection has been closed");
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

module.exports = { start };

if (require.main === module) {
  // We are running on the command line. Start the server.
  start();
}
