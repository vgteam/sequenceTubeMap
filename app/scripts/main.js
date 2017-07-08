/* eslint func-names: "off" */
/* eslint no-console: "off" */
/* eslint no-unused-vars: "off" */

import * as tubeMap from './tubemap';
import * as data from './demo-data';
import * as cactus from './cactus-data';
// import * as cactus from './cactus-data-small';
import * as hgvm from './hgvm-data';

document.getElementById('example1').onclick = function () {
  tubeMap.create({
    svgID: '#svg',
    nodes: data.inputNodes,
    tracks: data.inputTracks1,
    bed: data.bed1,
  });
};

document.getElementById('example2').onclick = function () {
  $('#example1').removeClass('active');
  tubeMap.create({
    svgID: '#svg',
    nodes: data.inputNodes,
    tracks: data.inputTracks2,
    bed: data.bed1,
  });
};

document.getElementById('example3').onclick = function () {
  $('#example1').removeClass('active');
  tubeMap.create({
    svgID: '#svg',
    nodes: data.inputNodes,
    tracks: data.inputTracks3,
    bed: data.bed1,
  });
};

/* document.getElementById('example3').onclick = function () {
  $('#example1').removeClass('active');
  const vg = JSON.parse(hgvm.hgvm1);
  const nodes = tubeMap.vgExtractNodes(vg);
  const tracks = tubeMap.vgExtractTracks(vg);
  const reads = tubeMap.vgExtractReads(nodes, tracks, hgvm.hgvmReads1.split('\n'));
  // const reads = tubeMap.vgExtractReads(tracks, cactusReadSmall.split('\n'));
  tubeMap.create({
    svgID: '#svg',
    nodes,
    tracks,
    reads,
  });
}; */

document.getElementById('example4').onclick = function () {
  $('#example1').removeClass('active');
  tubeMap.create({
    svgID: '#svg',
    nodes: data.inputNodes,
    tracks: data.inputTracks4,
    bed: data.bed1,
  });
};
document.getElementById('example5').onclick = function () {
  $('#example1').removeClass('active');
  tubeMap.create({
    svgID: '#svg',
    nodes: data.inputNodes,
    tracks: data.inputTracks5,
    bed: data.bed1,
  });
};
document.getElementById('example6').onclick = function () {
  $('#example1').removeClass('active');
  console.log('onclick');
  displayVGjson('exampleData/B-3106.json');
};
document.getElementById('example7').onclick = function () {
  $('#example1').removeClass('active');
  displayVGjson('exampleData/C-3107.json');
};
document.getElementById('example8').onclick = function () {
  $('#example1').removeClass('active');
  displayVGjson('exampleData/DQA1-3117.json');
};
document.getElementById('example9').onclick = function () {
  $('#example1').removeClass('active');
  displayVGjson('exampleData/F-3134.json');
};

document.getElementById('parseButton').onclick = function () {
  $('#example1').removeClass('active');
  const vg = JSON.parse(document.getElementById('textarea1').value);
  const nodes = tubeMap.vgExtractNodes(vg);
  const tracks = tubeMap.vgExtractTracks(vg);
  tubeMap.create({
    svgID: '#svg',
    nodes,
    tracks,
    bed: data.notch2Simpl1000Bed,
  });
};

document.getElementById('postButton').onclick = function () {
  d3.select('#svg').selectAll('*').remove();
  const w1 = $('#svg').width();
  const w2 = $('#chart0').width();
  const w = Math.min(w1, w2);
  $('#legendDiv').html('');
  document.getElementById('loader').setAttribute('style', `left:${((w / 2) - 25)}px`);
  // document.getElementById('loader').style.display = 'block';
  $('#example1').removeClass('active');

  const nodeID = document.getElementById('nodeID').value;
  const distance = document.getElementById('distance').value;

  $.ajax({
    type: 'POST',
    url: 'https://api.wbeyer.com/vg_trace',
    crossDomain: true,
    data: { nodeID, distance },
    dataType: 'json',
    success(response) {
      const nodes = tubeMap.vgExtractNodes(response);
      const tracks = tubeMap.vgExtractTracks(response);
      tubeMap.create({
        svgID: '#svg',
        nodes,
        tracks,
        clickableNodes: true,
      });
      document.getElementById('loader').style.display = 'none';
    },
    error(responseData, textStatus, errorThrown) {
      console.log('POST failed.');
    },
  });
};

document.getElementById('hgvmPostButton').onclick = function () {
  d3.select('#svg').selectAll('*').remove();
  const w1 = $('#svg').width();
  const w2 = $('#chart0').width();
  const w = Math.min(w1, w2);
  $('#legendDiv').html('');
  document.getElementById('loader').setAttribute('style', `left:${((w / 2) - 25)}px`);
  // document.getElementById('loader').style.display = 'block';
  $('#example1').removeClass('active');

  const nodeID = document.getElementById('hgvmNodeID').value;
  const distance = document.getElementById('hgvmDistance').value;

  $.ajax({
    type: 'POST',
    url: 'https://api.wbeyer.com/vg_hgvm',
    crossDomain: true,
    data: { nodeID, distance },
    dataType: 'json',
    success(response) {
      const nodes = tubeMap.vgExtractNodes(response.graph);
      const tracks = tubeMap.vgExtractTracks(response.graph);
      const reads = tubeMap.vgExtractReads(nodes, tracks, response.gam);
      tubeMap.create({
        svgID: '#svg',
        nodes,
        tracks,
        reads,
        clickableNodes: true,
      });
      document.getElementById('loader').style.display = 'none';
    },
    error(responseData, textStatus, errorThrown) {
      console.log('POST failed.');
    },
  });
};

document.getElementById('downloadButton').onclick = function () {
  const svgN = document.getElementById('svg');
  const svgData = (new XMLSerializer()).serializeToString(svgN);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  const downloadLink = document.createElement('a');
  downloadLink.href = svgUrl;
  downloadLink.download = 'graph.svg';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
};

document.getElementById('inputFile').addEventListener('change', (e) => {
  const file = document.getElementById('inputFile').files[0];
  console.log(file);
  const reader = new FileReader();
  reader.onload = function (er) {
    document.getElementById('textarea1').value = reader.result;
  };
  reader.readAsText(file);
});

document.getElementById('redundantNodesCheckbox').onclick = function () {
  if (document.getElementById('redundantNodesCheckbox').checked === true) tubeMap.setMergeNodesFlag(true);
  else tubeMap.setMergeNodesFlag(false);
};

document.getElementById('linear').onchange = function () {
  tubeMap.setNodeWidthOption(0);
};

document.getElementById('log2').onchange = function () {
  tubeMap.setNodeWidthOption(1);
};

document.getElementById('divide100').onchange = function () {
  tubeMap.setNodeWidthOption(2);
};

document.getElementById('colorfulRadioButton').onclick = function () {
  tubeMap.useColorScheme(0);
};

document.getElementById('bluesRadioButton').onclick = function () {
  tubeMap.useColorScheme(1);
};

document.getElementById('exonCheckbox').onclick = function () {
  tubeMap.changeExonVisibility();
};

function loadJSON(filename, callback) {
  const xobj = new XMLHttpRequest();
  xobj.overrideMimeType('application/json');
  xobj.open('GET', filename, true);
  xobj.onreadystatechange = function () {
    if (xobj.readyState === 4 && xobj.status === 200) {
      callback(xobj.responseText);
    }
  };
  xobj.send(null);
}

function displayVGjson(filename) {
  console.log('drin');
  loadJSON(filename, (response) => {
    console.log('received response');
    const vg = JSON.parse(response);
    const nodes = tubeMap.vgExtractNodes(vg);
    const tracks = tubeMap.vgExtractTracks(vg);
    tubeMap.create({
      svgID: '#svg',
      nodes,
      tracks,
    });
  });
}

/* function getJSONFromServer(url) {
  loadJSON(url, function(response) {
    document.getElementById('textarea2').value = response;
  });
} */

/* function changeTrackVisibility(trackID) {
  tubeMap.changeTrackVisibility(trackID);
} */

document.getElementById('bugfix1').onclick = function () {
  $('#example1').removeClass('active');
  tubeMap.create({
    svgID: '#svg',
    nodes: data.inputNodes,
    tracks: data.inputTracks6,
  });
};

document.getElementById('simpleReadsExample').onclick = function () {
  $('#example1').removeClass('active');
  const vg = JSON.parse(data.k3138);
  const nodes = tubeMap.vgExtractNodes(vg);
  const tracks = tubeMap.vgExtractTracks(vg);
  const reads = tubeMap.vgExtractReads(nodes, tracks, readsFromStringToArray(data.demoReads));
  tubeMap.create({
    svgID: '#svg',
    nodes,
    tracks,
    reads,
  });
};

function readsFromStringToArray(readsString) {
  const lines = readsString.split('\n');
  const result = [];
  lines.forEach((line) => {
    if (line.length > 0) {
      result.push(JSON.parse(line));
    }
  });
  return result;
}

document.getElementById('cactusWithReads').onclick = function () {
  $('#example1').removeClass('active');
  const vg = JSON.parse(cactus.cactus);
  const nodes = tubeMap.vgExtractNodes(vg);
  const tracks = tubeMap.vgExtractTracks(vg);
  const reads = tubeMap.vgExtractReads(nodes, tracks, readsFromStringToArray(cactus.cactusReads));
  tubeMap.create({
    svgID: '#svg',
    nodes,
    tracks,
    reads,
  });
};

document.getElementById('cactusWithoutReads').onclick = function () {
  $('#example1').removeClass('active');
  const vg = JSON.parse(cactus.cactus);
  const nodes = tubeMap.vgExtractNodes(vg);
  const tracks = tubeMap.vgExtractTracks(vg);
  tubeMap.create({
    svgID: '#svg',
    nodes,
    tracks,
  });
};

document.getElementById('example1').click();

// document.getElementById('log21').onchange
// $('#log21').click();
