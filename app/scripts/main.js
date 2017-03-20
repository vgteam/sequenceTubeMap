/* eslint-env jquery */
/* eslint func-names: "off" */
/* eslint no-use-before-define: "off" */
/* eslint no-console: "off" */
/* eslint no-unused-vars: "off" */
/* global d3 */

import * as tubeMap from './tubemap';
import * as data from './demo-data';
import * as cactus from './cactus-data';
// import * as cactus from './cactus-data-small';

document.getElementById('example1').onclick = function () {
  tubeMap.create('#svg', data.inputNodes, data.inputTracks1, false, data.bed1);
};
document.getElementById('example2').onclick = function () {
  $('#example1').removeClass('active');
  tubeMap.create('#svg', data.inputNodes, data.inputTracks2, false, data.bed1);
};
document.getElementById('example3').onclick = function () {
  $('#example1').removeClass('active');
  tubeMap.create('#svg', data.inputNodes, data.inputTracks3, false, data.bed1);
};
document.getElementById('example4').onclick = function () {
  $('#example1').removeClass('active');
  tubeMap.create('#svg', data.inputNodes, data.inputTracks4, false, data.bed1);
};
document.getElementById('example5').onclick = function () {
  $('#example1').removeClass('active');
  tubeMap.create('#svg', data.inputNodes, data.inputTracks5, false, data.bed1);
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
  tubeMap.create('#svg', nodes, tracks, false, data.notch2Simpl1000Bed);
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
      tubeMap.create('#svg', nodes, tracks, true);
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

document.getElementById('redundantNodesCheckbox1').onclick = function () {
  document.getElementById('redundantNodesCheckbox2').checked = document.getElementById('redundantNodesCheckbox1').checked;
  document.getElementById('redundantNodesCheckbox3').checked = document.getElementById('redundantNodesCheckbox1').checked;
  if (document.getElementById('redundantNodesCheckbox1').checked === true) tubeMap.setMergeNodesFlag(true);
  else tubeMap.setMergeNodesFlag(false);
};

document.getElementById('redundantNodesCheckbox2').onclick = function () {
  document.getElementById('redundantNodesCheckbox1').checked = document.getElementById('redundantNodesCheckbox2').checked;
  document.getElementById('redundantNodesCheckbox3').checked = document.getElementById('redundantNodesCheckbox2').checked;
  if (document.getElementById('redundantNodesCheckbox2').checked === true) tubeMap.setMergeNodesFlag(true);
  else tubeMap.setMergeNodesFlag(false);
};

document.getElementById('redundantNodesCheckbox3').onclick = function () {
  document.getElementById('redundantNodesCheckbox1').checked = document.getElementById('redundantNodesCheckbox3').checked;
  document.getElementById('redundantNodesCheckbox2').checked = document.getElementById('redundantNodesCheckbox3').checked;
  if (document.getElementById('redundantNodesCheckbox3').checked === true) tubeMap.setMergeNodesFlag(true);
  else tubeMap.setMergeNodesFlag(false);
};

document.getElementById('linear1').onchange = function () {
  document.getElementById('linear2').checked = true;
  document.getElementById('linear3').checked = true;
  tubeMap.setNodeWidthOption(0);
};

document.getElementById('log21').onchange = function () {
  document.getElementById('log22').checked = true;
  document.getElementById('log23').checked = true;
  tubeMap.setNodeWidthOption(1);
};

document.getElementById('log101').onchange = function () {
  document.getElementById('log102').checked = true;
  document.getElementById('log103').checked = true;
  tubeMap.setNodeWidthOption(2);
};

document.getElementById('linear2').onchange = function () {
  document.getElementById('linear1').checked = true;
  document.getElementById('linear3').checked = true;
  tubeMap.setNodeWidthOption(0);
};

document.getElementById('log22').onchange = function () {
  document.getElementById('log21').checked = true;
  document.getElementById('log23').checked = true;
  tubeMap.setNodeWidthOption(1);
};

document.getElementById('log102').onchange = function () {
  document.getElementById('log101').checked = true;
  document.getElementById('log103').checked = true;
  tubeMap.setNodeWidthOption(2);
};

document.getElementById('linear3').onchange = function () {
  document.getElementById('linear1').checked = true;
  document.getElementById('linear2').checked = true;
  tubeMap.setNodeWidthOption(0);
};

document.getElementById('log23').onchange = function () {
  document.getElementById('log21').checked = true;
  document.getElementById('log22').checked = true;
  tubeMap.setNodeWidthOption(1);
};

document.getElementById('log103').onchange = function () {
  document.getElementById('log101').checked = true;
  document.getElementById('log102').checked = true;
  tubeMap.setNodeWidthOption(2);
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
    // tubeMap.create('#svg', nodes, tracks, false, b3106_bed);
    tubeMap.create('#svg', nodes, tracks, false);
  });
}

/* function getJSONFromServer(url) {
  loadJSON(url, function(response) {
    document.getElementById('textarea2').value = response;
  });
} */

document.getElementById('colorfulRadioButton').onclick = function () {
  tubeMap.useColorScheme(0);
};
document.getElementById('bluesRadioButton').onclick = function () {
  tubeMap.useColorScheme(1);
};

document.getElementById('exonCheckbox').onclick = function () {
  tubeMap.changeExonVisibility();
};

function changeTrackVisibility(trackID) {
  tubeMap.changeTrackVisibility(trackID);
}

document.getElementById('bugfix1').onclick = function () {
  $('#example1').removeClass('active');
  tubeMap.create('#svg', data.inputNodes, data.inputTracks6, false);
};

document.getElementById('simpleReadsExample').onclick = function () {
  $('#example1').removeClass('active');
  const vg = JSON.parse(data.k3138);
  const nodes = tubeMap.vgExtractNodes(vg);
  const tracks = tubeMap.vgExtractTracks(vg);
  const reads = tubeMap.vgExtractReads(tracks, data.demoReads.split('\n'));
  tubeMap.create('#svg', nodes, tracks, false, null, reads);
};

document.getElementById('cactusWithReads').onclick = function () {
  $('#example1').removeClass('active');
  const vg = JSON.parse(cactus.cactus);
  const nodes = tubeMap.vgExtractNodes(vg);
  const tracks = tubeMap.vgExtractTracks(vg);
  const reads = tubeMap.vgExtractReads(tracks, cactus.cactusReads.split('\n'));
  // const reads = tubeMap.vgExtractReads(tracks, cactusReadSmall.split('\n'));
  tubeMap.create('#svg', nodes, tracks, false, null, reads);
};

document.getElementById('cactusWithoutReads').onclick = function () {
  $('#example1').removeClass('active');
  const vg = JSON.parse(cactus.cactus);
  const nodes = tubeMap.vgExtractNodes(vg);
  const tracks = tubeMap.vgExtractTracks(vg);
  tubeMap.create('#svg', nodes, tracks, false);
};

document.getElementById('example1').click();

// document.getElementById('log21').onchange
// $('#log21').click();
