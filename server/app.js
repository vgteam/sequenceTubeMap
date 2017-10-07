/* eslint no-console: "off" */
/* eslint strict:0 */
/* eslint no-param-reassign: "off" */

'use strict';

const spawn = require('child_process').spawn;
const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('uuid/v1');
const fs = require('fs');
const rl = require('readline');

const app = express();
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
  extended: true,
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.post('/chr22_v4', (req, res) => {
  console.log('http POST chr22_v4 received');
  console.log(`nodeID = ${req.body.nodeID}`);
  console.log(`distance = ${req.body.distance}`);

  req.uuid = uuid();
  req.basepath = './vg_data4';

  // call 'vg chunk' to generate graph
  let vgCall = `${req.basepath}/vg chunk -x ${req.basepath}/chr22_v4.xg -a ${req.basepath}/NA12878_mapped_v4.gam.index -g `;
  const position = Number(req.body.nodeID);
  const distance = Number(req.body.distance);
  if (Object.prototype.hasOwnProperty.call(req.body, 'byNode') && req.body.byNode === 'true') {
    vgCall += `-r ${position} -c ${distance} -T -E regions.tsv | ${req.basepath}/vg view -j - >${req.uuid}.json`;
  } else {
    vgCall += `-p 22:${position}-${position + distance} -T -E regions.tsv | ${req.basepath}/vg view -j - >${req.uuid}.json`;
  }

  console.log(vgCall);
  const child = spawn('sh', ['-c', vgCall]);

  child.stderr.on('data', (data) => {
    console.log(`err data: ${data}`);
  });

  child.on('close', (code) => {
    console.log(`child process exited with code ${code}`);

    // Read Result File Synchronously
    const graphAsString = fs.readFileSync(`${req.uuid}.json`);
    req.graph = JSON.parse(graphAsString);

    processAnnotationFile(req, res);
  });
});

function processAnnotationFile(req, res) {
  // find annotation file
  fs.readdirSync('./').forEach((file) => {
    if (file.substr(file.length - 12) === 'annotate.txt') {
      req.annotationFile = file;
    }
  });

  // read annotation file
  const lineReader = rl.createInterface({
    input: fs.createReadStream(req.annotationFile),
  });

  let i = 0;
  lineReader.on('line', (line) => {
    const arr = line.replace(/\s+/g, ' ').split(' ');
    if (req.graph.path[i].name === arr[0]) {
      req.graph.path[i].freq = arr[1];
    } else {
      console.log('Mismatch');
    }
    i += 1;
  });

  lineReader.on('close', () => {
    processGamFile(req, res);
  });
}

function processGamFile(req, res) {
  // Find gam file
  fs.readdirSync('./').forEach((file) => {
    if (file.substr(file.length - 3) === 'gam') {
      req.gamFile = file;
    }
  });

  // call 'vg view' to transform gam to json
  const vgViewChild = spawn('sh', ['-c', `${req.basepath}/vg view -j -a ${req.gamFile} > gam.json`]);

  vgViewChild.stderr.on('data', (data) => {
    console.log(`err data: ${data}`);
  });

  vgViewChild.on('close', () => {
    // read gam.json line by line
    const lineReader = rl.createInterface({
      input: fs.createReadStream('gam.json'),
    });

    req.gamArr = [];
    lineReader.on('line', (line) => {
      req.gamArr.push(JSON.parse(line));
    });

    lineReader.on('close', () => {
      processRegionFile(req, res);
    });
  });
}

function processRegionFile(req, res) {
  // read regions.tsv
  const lineReader = rl.createInterface({
    input: fs.createReadStream('regions.tsv'),
    // input: fs.createReadStream('test.txt'),
    // input: fs.createReadStream(req.annotationFile),
  });

  lineReader.on('line', (line) => {
    const arr = line.replace(/\s+/g, ' ').split(' ');
    // req.graph.sequencePosition = { path: arr[0], position: arr[1] };
    req.graph.path.forEach((path) => {
      if (path.name === arr[0]) path.indexOfFirstBase = arr[1];
    });
  });

  lineReader.on('close', () => {
    cleanUpAndSendResult(req, res);
  });
}

function cleanUpAndSendResult(req, res) {
  fs.unlink(`${req.uuid}.json`);
  fs.unlink(req.gamFile);
  fs.unlink('gam.json');
  fs.unlink(req.annotationFile);
  // fs.unlink('regions.tsv');

  const result = {};
  result.graph = req.graph;
  result.gam = req.gamArr;
  res.json(result);
}

app.post('/test', (req, res) => {
  console.log('received test request');
  const path = './vg_data4';
  const result = {
    xgFiles: [],
    gamIndices: [],
  };

  fs.readdirSync(path).forEach((file) => {
    if (file.substr(file.length - 2) === 'xg') {
      result.xgFiles.push(file);
    }
    if (file.substr(file.length - 9) === 'gam.index') {
      result.gamIndices.push(file);
    }
  });

  console.log(result);

  // result.answer = 'testAnswer';
  res.json(result);
});

app.listen(3000, () => console.log('TubeMapServer listening on port 3000!'));
