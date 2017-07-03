/* eslint no-console: "off" */
/* eslint strict:0 */

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
  console.log('http POST received');
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
  // const child = spawn('./vg_data/vg', ['chunk', '-x', './vg_data/hgvm.xg', '-a', 'aligned.gam.index', '-g', '-p', 'chr22:8206732-8206732', '-i', '-c', distance, '|', 'vg', 'view', '-j', '-', `>./vg_data/${fileName}.json`]);
  const child = spawn('sh', ['-c', `./vg_data/vg chunk -x ./vg_data/hgvm.xg -a ./vg_data/aligned.gam.index -g -p chr22:${nodeID}-${nodeID} -i -c ${distance} | ./vg_data/vg view -j - >./vg_data/${fileName}.json`]);

  child.stderr.on('data', (data) => {
    console.log(`err data: ${data}`);
  });

  child.on('close', (code) => {
    console.log(`child process exited with code ${code}`);

    // Read File Synchronously
    const jsonfile = fs.readFileSync(`./vg_data/${fileName}.json`);
    const obj = JSON.parse(jsonfile);

    let gamFile;
    fs.readdirSync('./').forEach(file => {
      if (file.substr(file.length - 3) === 'gam') {
        gamFile = file;
      }
    });

    const vgViewChild = spawn('sh', ['-c', `./vg_data/vg view -j -a ${gamFile} >gam.json`]);

    vgViewChild.stderr.on('data', (data) => {
      console.log(`err data: ${data}`);
    });

    vgViewChild.on('close', (code) => {
      const lineReader = rl.createInterface({
        input: fs.createReadStream('gam.json'),
      });

      let gamArr = [];
      lineReader.on('line', (line) => {
        // console.log(JSON.parse(line));
        gamArr.push(JSON.parse(line));
      });
      // const gamObj = JSON.parse('gam.json');

      lineReader.on('close', () => {
        // console.log(gamArr);
        let resultJSON = {};
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

app.listen(3000, () => console.log('TubeMapServer listening on port 3000!'));
