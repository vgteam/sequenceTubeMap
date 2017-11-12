/* eslint func-names: "off" */
/* eslint no-console: "off" */
/* eslint no-unused-vars: "off" */

import * as tubeMap from './tubemap';
import * as data from './demo-data';

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

document.getElementById('redundantNodesCheckbox').onclick = function () {
  if (document.getElementById('redundantNodesCheckbox').checked === true) tubeMap.setMergeNodesFlag(true);
  else tubeMap.setMergeNodesFlag(false);
};

document.getElementById('compressedViewCheckbox').onclick = function () {
  if (document.getElementById('compressedViewCheckbox').checked === true) tubeMap.setNodeWidthOption(1);
  else tubeMap.setNodeWidthOption(0);
};

document.getElementById('showReadsCheckbox').onclick = function () {
  if (document.getElementById('showReadsCheckbox').checked === true) tubeMap.setShowReadsFlag(true);
  else tubeMap.setShowReadsFlag(false);
};

document.getElementById('softClipsCheckbox').onclick = function () {
  if (document.getElementById('softClipsCheckbox').checked === true) tubeMap.setSoftClipsFlag(true);
  else tubeMap.setSoftClipsFlag(false);
};

const radios = document.getElementsByClassName('colorRadio');
for (let i = 0; i < radios.length; i += 1) {
  let trackType;
  // console.log(radios[i].name);
  switch (radios[i].name) {
    case 'colorsHaplo':
      trackType = 'haplotypeColors';
      break;
    case 'colorsFwReads':
      trackType = 'forwardReadColors';
      break;
    case 'colorsRevReads':
      trackType = 'reverseReadColors';
      break;
    case 'colorsExons':
      trackType = 'exonColors';
      break;
    default:
      console.log('Could not find track type in color set assignment');
  }
  let colorSet;
  switch (radios[i].value) {
    case 'option1':
      colorSet = 'plainColors';
      break;
    case 'option2':
      colorSet = 'greys';
      break;
    case 'option3':
      colorSet = 'reds';
      break;
    case 'option4':
      colorSet = 'blues';
      break;
    case 'option5':
      colorSet = 'lightColors';
      break;
    default:
      console.log('Could not find color type in color set assignment');
  }
  radios[i].onclick = function () {
    console.log(this);
    tubeMap.setColorSet(trackType, colorSet);
  };
}

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

document.getElementById('example1').onclick = function () {
  tubeMap.create({
    svgID: '#svg',
    nodes: data.inputNodes,
    tracks: data.inputTracks1,
    bed: data.bed1,
  });
  tubeMap.setColorSet('haplotypeColors', 'plainColors');
  document.getElementById('colorsHaplo1').checked = true;
};

document.getElementById('example2').onclick = function () {
  $('#example1').removeClass('active');
  tubeMap.create({
    svgID: '#svg',
    nodes: data.inputNodes,
    tracks: data.inputTracks2,
    bed: data.bed1,
  });
  tubeMap.setColorSet('haplotypeColors', 'plainColors');
  document.getElementById('colorsHaplo1').checked = true;
};

document.getElementById('example3').onclick = function () {
  $('#example1').removeClass('active');
  tubeMap.create({
    svgID: '#svg',
    nodes: data.inputNodes,
    tracks: data.inputTracks3,
    bed: data.bed1,
  });
  tubeMap.setColorSet('haplotypeColors', 'plainColors');
  document.getElementById('colorsHaplo1').checked = true;
};

document.getElementById('example4').onclick = function () {
  $('#example1').removeClass('active');
  tubeMap.create({
    svgID: '#svg',
    nodes: data.inputNodes,
    tracks: data.inputTracks4,
    bed: data.bed1,
  });
  tubeMap.setColorSet('haplotypeColors', 'plainColors');
  document.getElementById('colorsHaplo1').checked = true;
};

document.getElementById('example5').onclick = function () {
  $('#example1').removeClass('active');
  tubeMap.create({
    svgID: '#svg',
    nodes: data.inputNodes,
    tracks: data.inputTracks5,
    bed: data.bed1,
  });
  tubeMap.setColorSet('haplotypeColors', 'plainColors');
  document.getElementById('colorsHaplo1').checked = true;
};

document.getElementById('example6').onclick = function () {
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
  tubeMap.setColorSet('haplotypeColors', 'greys');
  document.getElementById('colorsHaplo2').checked = true;
};

window.onload = function () {
  // tubeMap.setColorSet('haplotypeColors', 'plainColors');
  document.getElementById('example1').click();
};
