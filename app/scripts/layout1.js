/* eslint func-names: "off" */
/* eslint no-console: "off" */
/* eslint no-unused-vars: "off" */

import * as tubeMap from './tubemap';
// import * as data from './demo-data';
// import * as cactus from './cactus-data';
// import * as cactus from './cactus-data-small';
// import * as hgvm from './hgvm-data';

// show file pickers only when datasource = custom
$('#dataSourceSelect').change(() => {
// document.getElementById('dataSourceSelect').onchange = function() {
  if ($('#dataSourceSelect').val() === '4') {
    $('#collapseExample').collapse('show');
  } else {
    $('#collapseExample').collapse('hide');
  }
});

// display filename of chosen file in file picker
$('input[type=file]').change(() => {
  console.log('foo');
  let fieldVal = $(this).val();
  if (fieldVal !== undefined || fieldVal !== '') {
    console.log(fieldVal);
    console.log(/\\([^\\]+$)/.exec(fieldVal));
    // removes 'fakepath' and keeps only filename after last '/'
    fieldVal = /\\([^\\]+$)/.exec(fieldVal)[1];
    $(this)
    .next('.custom-file-control')
    .attr('data-content', fieldVal);
  }
});

document.getElementById('goButton').onclick = function () {
  generateTubeMap();
};

function generateTubeMap() {
  d3
    .select('#svg')
    .selectAll('*')
    .remove();
  const w = $('#svg').width();
  // const w2 = $('#chart0').width();
  // const w = Math.min(w1, w2);
  $('#legendDiv').html('');
  document
    .getElementById('loader')
    .setAttribute('style', `left:${(w / 2) - 25}px`);
  // document.getElementById('loader').style.display = 'block';

  const nodeID = document.getElementById('position').value;
  const distance = document.getElementById('distance').value;

  $.ajax({
    type: 'POST',
    url: 'https://api.wbeyer.com/chr22_v4',
    // url: 'vg_hgvm',
    crossDomain: true,
    data: { nodeID, distance },
    dataType: 'json',
    success(response) {
      const nodes = tubeMap.vgExtractNodes(response.graph);
      const tracks = tubeMap.vgExtractTracks(response.graph);
      const reads = tubeMap.vgExtractReads(nodes, tracks, response.gam);
      // console.log('path: ' + response.graph.sequencePosition.path +
      // ', position: ' + response.graph.sequencePosition.position)
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
  return false; // prevents browser from reloading page (button within form tag)
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
  // console.log(radios[i].value);
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

window.onload = function () {
  document.getElementById('goButton').click();
};
