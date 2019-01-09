/* eslint no-console: 'off' */
/* eslint strict:0 */
/* eslint no-param-reassign: 'off' */

'use strict';

const spawn = require('child_process').spawn;
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const uuid = require('uuid/v1');
const fs = require('fs-extra');
const rl = require('readline');
const compression = require('compression');
const config = require('./config.json');

const VG_PATH = config.vgPath;
const MOUNTED_DATA_PATH = config.dataPath;
const INTERNAL_DATA_PATH = config.internalDataPath;
const SERVER_PORT = 3000


var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    let ext = file.originalname.substring(
      file.originalname.lastIndexOf('.'),
      file.originalname.length
    );
    cb(null, Date.now() + ext);
  }
});
var limits = {
  files: 1, // allow only 1 file per request
  fileSize: 1024 * 1024 * 5 // 5 MB (max file size)
};
var upload = multer({ storage, limits });

const app = express();
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(
  bodyParser.urlencoded({
    // to support URL-encoded bodies
    extended: true
  })
);
app.use(compression());

// required for local usage (access docker container from outside)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});

app.use(express.static('./build'));

app.post('/xgFileSubmission', upload.single('xgFile'), (req, res) => {
  console.log('/xgFileSubmission');
  console.log(req.file);
  res.json({ path: req.file.path });
});

app.post('/gbwtFileSubmission', upload.single('gbwtFile'), (req, res) => {
  console.log('/gbwtFileSubmission');
  console.log(req.file);
  res.json({ path: req.file.path });
});

app.post('/gamFileSubmission', upload.single('gamFile'), (req, res) => {
  console.log('/gamFileSubmission');
  console.log(req.file);
  indexGamSorted(req, res);
});

function indexGamSorted(req, res) {
  const prefix = req.file.path.substring(0, req.file.path.lastIndexOf('.'));
  const sortedGamFile = fs.createWriteStream(prefix + '.sorted.gam', {
    encoding: 'binary'
  });
  const vgIndexChild = spawn(`${VG_PATH}vg`, [
    'gamsort',
    '-i',
    prefix + '.sorted.gam.gai',
    req.file.path
  ]);

  vgIndexChild.stderr.on('data', data => {
    console.log(`err data: ${data}`);
  });

  vgIndexChild.stdout.on('data', function(data) {
    sortedGamFile.write(data);
  });

  vgIndexChild.on('close', () => {
    sortedGamFile.end();
    res.json({ path: prefix + '.sorted.gam' });
  });
}

app.post('/getChunkedData', (req, res) => {
  let sentErrorResponse = false;
  console.time('request-duration');
  console.log('http POST chr22_v4 received');
  console.log(`nodeID = ${req.body.nodeID}`);
  console.log(`distance = ${req.body.distance}`);

  // Assign each request a UUID. v1 UUIDs can be very similar for similar
  // timestamps on the same node, but are still guaranteed to be unique within
  // a given nodejs process.
  req.uuid = uuid();

  // Make a temp directory for vg output files for this request
  req.tempDir = `./tmp-${req.uuid}`;
  fs.mkdirSync(req.tempDir);

  // We always have an XG file
  const xgFile = req.body.xgFile;

  // We sometimes have a GAM file with reads
  const gamFile = req.body.gamFile;
  req.withGam = true;
  if (!gamFile || gamFile === 'none') {
    req.withGam = false;
    console.log('no gam index provided.');
  }

  // We sometimes have a GBWT with haplotypes that override any in the XG
  const gbwtFile = req.body.gbwtFile;
  req.withGbwt = true;
  if (!gbwtFile || gbwtFile === 'none') {
    req.withGbwt = false;
    console.log('no gbwt file provided.');
  }

  // What path should be our anchoring path?
  const anchorTrackName = req.body.anchorTrackName;

  // Decide where to pull the data from
  // (builtin examples, mounted user data folder or uploaded data)
  let dataPath;
  switch (req.body.dataPath) {
    case 'mounted':
      dataPath = MOUNTED_DATA_PATH;
      break;
    case 'upload':
      dataPath = './';
      break;
    default:
      dataPath = INTERNAL_DATA_PATH;
  }
  console.log(`dataPath = ${dataPath}`);

  // call 'vg chunk' to generate graph
  let vgChunkParams = ['chunk', '-x', `${dataPath}${xgFile}`];
  if (req.withGam) {
    // Use a GAM index
    vgChunkParams.push('-a', `${dataPath}${gamFile}`, '-g');
  }
  if (req.withGbwt) {
    // Use a GBWT haplotype database
    vgChunkParams.push('--gbwt-name', `${dataPath}${gbwtFile}`);
  }
  const position = Number(req.body.nodeID);
  const distance = Number(req.body.distance);
  if (
    Object.prototype.hasOwnProperty.call(req.body, 'byNode') &&
    req.body.byNode === 'true'
  ) {
    vgChunkParams.push('-r', position, '-c', distance);
  } else {
    vgChunkParams.push(
      '-c',
      '20',
      '-p',
      `${anchorTrackName}:${position}-${position + distance}`
    );
  }
  vgChunkParams.push(
    '-T',
    '-b',
    `${req.tempDir}/chunk`,
    '-E',
    `${req.tempDir}/regions.tsv`
  );

  console.time('vg chunk');
  const vgChunkCall = spawn(`${VG_PATH}vg`, vgChunkParams);
  const vgViewCall = spawn(`${VG_PATH}vg`, ['view', '-j', '-']);
  let graphAsString = '';
  req.error = new Buffer(0);

  vgChunkCall.on('error', function(err) {
    console.log('Error executing "vg chunk": ' + err);
    if (!sentErrorResponse) {
      sentErrorResponse = true;
      returnError(req, res);
    }
    return;
  });

  vgChunkCall.stderr.on('data', data => {
    console.log(`vg chunk err data: ${data}`);
    req.error += data;
  });

  vgChunkCall.stdout.on('data', function(data) {
    vgViewCall.stdin.write(data);
  });

  vgChunkCall.on('close', code => {
    console.log(`vg chunk exited with code ${code}`);
    vgViewCall.stdin.end();
  });

  vgViewCall.on('error', function(err) {
    console.log('Error executing "vg view": ' + err);
    if (!sentErrorResponse) {
      sentErrorResponse = true;
      returnError(req, res);
    }
    return;
  });

  vgViewCall.stderr.on('data', data => {
    console.log(`vg view err data: ${data}`);
  });

  vgViewCall.stdout.on('data', function(data) {
    graphAsString += data.toString();
  });

  vgViewCall.on('close', code => {
    console.log(`vg view exited with code ${code}`);
    console.timeEnd('vg chunk');
    if (graphAsString === '') {
      if (!sentErrorResponse) {
        sentErrorResponse = true;
        returnError(req, res);
      }
      return;
    }
    req.graph = JSON.parse(graphAsString);
    processAnnotationFile(req, res);
  });
});

function returnError(req, res) {
  console.log('returning error');
  const result = {};
  result.error = req.error.toString('utf-8');
  res.json(result);
  // Clean up the temp directory for the request recursively
  fs.remove(req.tempDir);
}

function processAnnotationFile(req, res) {
  // find annotation file
  // TODO: This is not going to work if multiple people hit the server at once!
  // We need to make vg chunk take an argument from us for where to put the file.
  console.time('processing annotation file');
  fs.readdirSync(req.tempDir).forEach(file => {
    if (file.substr(file.length - 12) === 'annotate.txt') {
      req.annotationFile = req.tempDir + '/' + file;
    }
  });

  if (
    !req.hasOwnProperty('annotationFile') ||
    typeof req.annotationFile === 'undefined'
  ) {
    returnError(req, res);
    return;
  }
  console.log(`annotationFile: ${req.annotationFile}`);

  // read annotation file
  const lineReader = rl.createInterface({
    input: fs.createReadStream(req.annotationFile)
  });

  let i = 0;
  lineReader.on('line', line => {
    const arr = line.replace(/\s+/g, ' ').split(' ');
    if (req.graph.path[i].name === arr[0]) {
      req.graph.path[i].freq = arr[1];
    } else {
      console.log('Mismatch');
    }
    i += 1;
  });

  lineReader.on('close', () => {
    console.timeEnd('processing annotation file');
    if (req.withGam === true) {
      processGamFile(req, res);
    } else {
      processRegionFile(req, res);
    }
  });
}

function processGamFile(req, res) {
  console.time('processing gam file');
  // Find gam file
  fs.readdirSync(req.tempDir).forEach(file => {
    if (file.substr(file.length - 3) === 'gam') {
      req.gamFile = req.tempDir + '/' + file;
    }
  });

  // call 'vg view' to transform gam to json
  const vgViewChild = spawn(`${VG_PATH}vg`, ['view', '-j', '-a', req.gamFile]);

  vgViewChild.stderr.on('data', data => {
    console.log(`err data: ${data}`);
  });

  let gamJSON = '';
  vgViewChild.stdout.on('data', function(data) {
    gamJSON += data.toString();
  });

  vgViewChild.on('close', () => {
    req.gamArr = gamJSON
      .split('\n')
      .filter(function(a) {
        return a != '';
      })
      .map(function(a) {
        return JSON.parse(a);
      });
    console.timeEnd('processing gam file');
    processRegionFile(req, res);
  });
}

function processRegionFile(req, res) {
  console.time('processing region file');
  const lineReader = rl.createInterface({
    input: fs.createReadStream(`${req.tempDir}/regions.tsv`)
  });

  lineReader.on('line', line => {
    const arr = line.replace(/\s+/g, ' ').split(' ');
    req.graph.path.forEach(path => {
      if (path.name === arr[0]) path.indexOfFirstBase = arr[1];
    });
  });

  lineReader.on('close', () => {
    console.timeEnd('processing region file');
    cleanUpAndSendResult(req, res);
  });
}

function cleanUpAndSendResult(req, res) {
  fs.unlink(req.annotationFile);
  if (req.withGam === true) {
    fs.unlink(req.gamFile);
  }
  // Clean up the temp directory for the request recursively (even though it should be empty)
  fs.remove(req.tempDir);

  const result = {};
  result.error = req.error.toString('utf-8');
  result.graph = req.graph;
  result.gam = req.withGam === true ? req.gamArr : [];
  res.json(result);
  console.timeEnd('request-duration');
}

app.post('/getFilenames', (req, res) => {
  console.log('received request for filenames');
  const result = {
    xgFiles: [],
    gbwtFiles: [],
    gamIndices: []
  };

  fs.readdirSync(MOUNTED_DATA_PATH).forEach(file => {
    if (file.endsWith('.xg')) {
      result.xgFiles.push(file);
    }
    if (file.endsWith('.gbwt')) {
      result.gbwtFiles.push(file);
    }
    if (file.endsWith('.sorted.gam')) {
      result.gamIndices.push(file);
    }
  });

  console.log(result);
  res.json(result);
});

app.post('/getPathNames', (req, res) => {
  console.log('received request for pathNames');
  const result = {
    pathNames: []
  };

  // call 'vg paths' to get path name information
  const xgFile =
    req.body.isUploadedFile === 'true'
      ? `./${req.body.xgFile}`
      : `${MOUNTED_DATA_PATH}${req.body.xgFile}`;

  const vgViewChild = spawn(`${VG_PATH}vg`, ['paths', '-L', '-x', xgFile]);

  vgViewChild.stderr.on('data', data => {
    console.log(`err data: ${data}`);
  });

  let pathNames = '';
  vgViewChild.stdout.on('data', function(data) {
    pathNames += data.toString();
  });

  vgViewChild.on('close', () => {
    result.pathNames = pathNames.split('\n').filter(function(a) {
      return a != '';
    });
    console.log(result);
    res.json(result);
  });
});

// Set-up for Web Sockets to notify client when files change in MOUNTED_DATA_PATH
// Get the server class of the node websocket module
const WebSocketServer = require('websocket').server;
// Start the server on the selected port and save the HTTP server instance
// created by app.listen for the WebScoketServer
const server = app.listen(SERVER_PORT, () =>
  console.log('TubeMapServer listening on port ' + SERVER_PORT + '!')
);
// Create the WebSocketServer using the HTTP server instance
const wss = new WebSocketServer({ httpServer: server });
// Set that holds all the WebSocketConnection instances that
// notify the client of file directory changes
const connections = new Set();

wss.on('request', function(request) {
  // We recieved a websocket connection request and we need to accept it.
  console.log(new Date() + ' Connection from origin ' + request.origin + '.');
  const connection = request.accept(null, request.origin);
  // We save the connection so that we can notify them when there is a change in the file system
  connections.add(connection);
  connection.on('close', function(reasonCode, description) {
    // When the websocket connection closes, we delete it from our set of open connections
    connections.delete(connection);
    console.log('A connection has been closed');
  });
});

fs.watch(MOUNTED_DATA_PATH, function(event, filename) {
  // There was a change in the file directory
  console.log('Directory has been changed');
  for (let conn of connections) {
    // Notify all open connections about the change
    conn.send('change');
  }
});
