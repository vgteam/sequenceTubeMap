/*jshint esversion:6 */

var spawn = require('child_process').spawn;
var express = require('express');
var bodyParser = require('body-parser');

var app = express();
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

//app.use(express.static('public'));

app.post('/vg_trace', function(req, res) {
    var nodeID = req.body.nodeID;
    var distance = req.body.distance;
    console.log('http POST received');
    console.log('nodeID = ' + nodeID);
    console.log('distance = ' + distance);

    var child = spawn('vg', ['trace', '-x', './vg_data/chr22_v3.vg.xg', '-n', nodeID, '-d', distance, '-j', './vg_data/out3.json']);

    child.stderr.on('data', (data) => {
        console.log('err data: ' + data);
    });

    child.stdout.on('data', (data) => {
        //result += data.toString();
        //data.pipe(res);
        console.log(data.toString());
    });

    child.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        //var jsonfile = require("./vg_data/out3.json");

        // Read Synchronously
        var fs = require("fs");
        var jsonfile = fs.readFileSync("./vg_data/out3.json");
        var obj = JSON.parse(jsonfile);

        var lineReader = require('readline').createInterface({
          input: fs.createReadStream('./vg_data/out3.json.annotation')
        });

        var i = 0;
        lineReader.on('line', function (line) {
          line = line.replace(/\s+/g, ' ');
          var arr = line.split(' ');
          if (obj.path[i].name == arr[0]) {
            obj.path[i].freq = arr[1];
          } else {
            console.log('Mismatch');
          }
          i++;
        });

        lineReader.on('close', function () {
          return res.json(obj);
        });

    });
});

app.listen(3000, function () {
    console.log('TubeMapServer listening on port 3000!');
});
