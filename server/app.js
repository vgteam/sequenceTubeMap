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

// app.use(express.static('public'));

app.post('/vg_trace', (req, res) => {
  const nodeID = req.body.nodeID;
  const distance = req.body.distance;
  console.log('http POST vg_trace received');
  console.log(`nodeID = ${nodeID}`);
  console.log(`distance = ${distance}`);

  const fileName = uuid();
  const child = spawn('vg', ['trace', '-x', './vg_data/chr22_v3.vg.xg', '-n', nodeID, '-d', distance, '-j', `./vg_data/${fileName}.json`]);

  child.stderr.on('data', (data) => {
    console.log(`err data: ${data}`);
  });

  child.on('close', (code) => {
    console.log(`child process exited with code ${code}`);

    // Read File Synchronously
    const jsonfile = fs.readFileSync(`./vg_data/${fileName}.json`);
    const obj = JSON.parse(jsonfile);

    const lineReader = rl.createInterface({
      input: fs.createReadStream(`./vg_data/${fileName}.json.annotation`),
    });

    let i = 0;
    lineReader.on('line', (line) => {
      // line = line.replace(/\s+/g, ' ');
      const arr = line.replace(/\s+/g, ' ').split(' ');
      if (obj.path[i].name === arr[0]) {
        obj.path[i].freq = arr[1];
      } else {
        console.log('Mismatch');
      }
      i += 1;
    });

    lineReader.on('close', () => {
      fs.unlink(`./vg_data/${fileName}.json`);
      fs.unlink(`./vg_data/${fileName}.json.annotation`);
      res.json(obj);
    });
  });
});

app.post('/vg_hgvm', (req, res) => {
  const nodeID = req.body.nodeID;
  const distance = req.body.distance;
  console.log('http POST hgvm received');
  console.log(`nodeID = ${nodeID}`);
  console.log(`distance = ${distance}`);

  const fileName = uuid();
  const child = spawn('sh', ['-c', `./vg_data/vg chunk -x ./vg_data/hgvm.xg -a ./vg_data/aligned.gam.index -g -p chr22:${nodeID}-${nodeID} -i -c ${distance} | ./vg_data/vg view -j - >./vg_data/${fileName}.json`]);
  // const child = spawn('sh', ['-c', `./vg_data2/vg chunk -x ./vg_data2/chr22_v4.vg.xg -a ./vg_data2/NA12878_mapped_v4.gam.index -g -p 22:${nodeID}-${nodeID} -i -c ${distance} | ./vg_data2/vg view -j - >./vg_data2/${fileName}.json`]);

  child.stderr.on('data', (data) => {
    console.log(`err data: ${data}`);
  });

  child.on('close', (code) => {
    console.log(`child process exited with code ${code}`);

    // Read File Synchronously
    const jsonfile = fs.readFileSync(`./vg_data/${fileName}.json`);
    const obj = JSON.parse(jsonfile);

    let gamFile;
    fs.readdirSync('./').forEach((file) => {
      if (file.substr(file.length - 3) === 'gam') {
        gamFile = file;
      }
    });

    const vgViewChild = spawn('sh', ['-c', `./vg_data/vg view -j -a ${gamFile} >gam.json`]);

    vgViewChild.stderr.on('data', (data) => {
      console.log(`err data: ${data}`);
    });

    vgViewChild.on('close', () => {
      const lineReader = rl.createInterface({
        input: fs.createReadStream('gam.json'),
      });

      const gamArr = [];
      lineReader.on('line', (line) => {
        // console.log(JSON.parse(line));
        gamArr.push(JSON.parse(line));
      });
      // const gamObj = JSON.parse('gam.json');

      lineReader.on('close', () => {
        // console.log(gamArr);
        const resultJSON = {};
        resultJSON.graph = obj;
        resultJSON.gam = gamArr;

        fs.unlink(`./vg_data/${fileName}.json`);
        fs.unlink(gamFile);
        fs.unlink('gam.json');
        res.json(resultJSON);
      });
    });
  });
});

app.post('/chr22_v4', (req, res) => {
  console.log('http POST chr22_v4 received');
  console.log(`nodeID = ${req.body.nodeID}`);
  console.log(`distance = ${req.body.distance}`);

  req.uuid = uuid();
  // req.basepath = './vg_data3';
  req.basepath = './vg_data4';

  // call 'vg chunk' to generate graph
  // const child = spawn('sh', ['-c', `${req.basepath}/vg chunk -x ${req.basepath}/chr22_v4.xg -a ${req.basepath}/NA12878_mapped_v4.gam.index -g -n ${req.body.nodeID} -d ${req.body.distance} | ${req.basepath}/vg view -j - >${req.uuid}.json`]);
  const child = spawn('sh', ['-c', `${req.basepath}/vg chunk -x ${req.basepath}/chr22_v4.xg -a ${req.basepath}/NA12878_mapped_v4.gam.index -g -p 22:${req.body.nodeID} -c ${req.body.distance} -T -E regions.tsv | ${req.basepath}/vg view -j - >${req.uuid}.json`]);

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
    // console.log('path: ' + req.sequencePosition.path + ', Position: ' + req.sequencePosition.position);
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

app.listen(3000, () => console.log('TubeMapServer listening on port 3000!'));
