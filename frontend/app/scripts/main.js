/* eslint func-names: "off" */
/* eslint no-console: "off" */
/* eslint no-unused-vars: "off" */

import * as tubeMap from './tubemap';
// import * as data from './demo-data';
// import * as cactus from './cactus-data';
// import * as cactus from './cactus-data-small';
// import * as hgvm from './hgvm-data';

// const BACKEND_URL = `http://${window.location.host}`;
// const BACKEND_URL = 'https://api.wbeyer.com/';
const BACKEND_URL = 'http://52.178.70.70:3000';


$('#dataSourceSelect').change(() => {
  if ($('#dataSourceSelect').val() === 'custom') {
    $('#unitSelect').prop('disabled', false);
    $('#position').prop('disabled', false);
    $('#distance').prop('disabled', false);
    $('#xgFileSelect').prop('disabled', false);
    $('#gamIndexSelect').prop('disabled', false);
    $('#pathName').prop('disabled', false);
  } else {
  // if ($('#dataSourceSelect').val() === 'cactus') { // render most form components inactive
    // $('#unitSelect').prop('disabled', true);
    // $('#position').prop('disabled', true);
    // $('#distance').prop('disabled', true);
    $('#xgFileSelect').prop('disabled', true);
    $('#gamIndexSelect').prop('disabled', true);
    $('#pathName').prop('disabled', true);
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
  prepareForTubeMap();
};

document.getElementById('goLeftButton').onclick = function () {
  const position = Number(document.getElementById('position').value);
  const distance = Number(document.getElementById('distance').value);
  document.getElementById('position').value = Math.max(position - distance, 0);
  prepareForTubeMap();
};

document.getElementById('goRightButton').onclick = function () {
  const position = Number(document.getElementById('position').value);
  const distance = Number(document.getElementById('distance').value);
  document.getElementById('position').value = position + distance;
  prepareForTubeMap();
};

function prepareForTubeMap() {
  d3
    .select('#svg')
    .selectAll('*')
    .remove();
  d3.select('#svg').attr('width', 100);
  const w = $('.tubeMapSVG').width();
  $('#legendDiv').html('');
  document
    .getElementById('loader')
    .setAttribute('style', `left:${(w / 2) - 25}px`);

  /* if ($('#dataSourceSelect').val() === 'cactus') {
    getCactusTubeMapData();
  } else {
    getRemoteTubeMapData();
  } */
  getRemoteTubeMapData();
}

function getRemoteTubeMapData() {
  const nodeID = document.getElementById('position').value;
  const distance = document.getElementById('distance').value;
  const byNode = (document.getElementById('unitSelect').selectedIndex !== 0);

  let xgFile = 'chr22_v4.xg';
  let gamIndex = 'NA12878_mapped_v4.gam.index';
  let anchorTrackName = '22';
  let useMountedPath = false;

  switch ($('#dataSourceSelect').val()) {
    case 'cactus':
      xgFile = 'cactus.vg.xg';
      gamIndex = 'cactus-NA12879.gam.index';
      anchorTrackName = 'ref';
      useMountedPath = false;
      break;
    case 'snp1kg-BRAC1':
      xgFile = 'snp1kg-BRAC1.vg.xg';
      gamIndex = 'NA12878-BRCA1.gam.index';
      anchorTrackName = '17';
      useMountedPath = false;
      break;
    case 'custom':
      xgFile = $('#xgFileSelect').val();
      gamIndex = $('#gamIndexSelect').val();
      anchorTrackName = $('#pathName').val();
      useMountedPath = true;
      break;
    default:
      break;
  }

  /* if ($('#dataSourceSelect').val() === 'custom') {
    xgFile = $('#xgFileSelect').val();
    gamIndex = $('#gamIndexSelect').val();
    // anchorTrackName = '17';
    anchorTrackName = $('#pathName').val();
    useMountedPath = true;
  } */
  console.log(`useMountedPath = ${useMountedPath}`);
  console.log(`anchorTrackName = ${anchorTrackName}`);

  $.ajax({
    type: 'POST',
    url: `${BACKEND_URL}/chr22_v4`,
    crossDomain: true,
    data: { nodeID, distance, byNode, xgFile, gamIndex, anchorTrackName, useMountedPath },
    dataType: 'json',
    success(response) {
      if ($.isEmptyObject(response)) {
        console.log('empty');
        document.getElementById('loader').style.display = 'none';
        return;
      }
      const nodes = tubeMap.vgExtractNodes(response.graph);
      const tracks = tubeMap.vgExtractTracks(response.graph);
      const reads = tubeMap.vgExtractReads(nodes, tracks, response.gam);
      createTubeMap(nodes, tracks, reads);
    },
    error(responseData, textStatus, errorThrown) {
      console.log('POST failed.');
    },
  });
  // return false; // prevents browser from reloading page (button within form tag)
}

/* function getCactusTubeMapData() {
  const vg = JSON.parse(cactus.cactus);
  const nodes = tubeMap.vgExtractNodes(vg);
  const tracks = tubeMap.vgExtractTracks(vg);
  const reads = tubeMap.vgExtractReads(nodes, tracks, readsFromStringToArray(cactus.cactusReads));
  createTubeMap(nodes, tracks, reads);
} */

function createTubeMap(nodes, tracks, reads) {
  tubeMap.create({
    svgID: '#svg',
    nodes,
    tracks,
    reads,
  });
  document.getElementById('loader').style.display = 'none';
}

/* function readsFromStringToArray(readsString) {
  const lines = readsString.split('\n');
  const result = [];
  lines.forEach((line) => {
    if (line.length > 0) {
      result.push(JSON.parse(line));
    }
  });
  return result;
} */

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

/* document.getElementById('positionTypeSelect').onchange = function () {
  document.getElementById('distanceTypeSelect').selectedIndex = this.selectedIndex;
};

document.getElementById('distanceTypeSelect').onchange = function () {
  document.getElementById('positionTypeSelect').selectedIndex = this.selectedIndex;
}; */

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

function populateDropdownsWithFilenames() {
  $.ajax({
    type: 'POST',
    url: `${BACKEND_URL}/getFilenames`,
    crossDomain: true,
    // dataType: 'json',
    success(response) {
      const xgSelect = document.getElementById('xgFileSelect');
      response.xgFiles.forEach((filename) => {
        const opt = document.createElement('option');
        opt.value = filename;
        opt.innerHTML = filename;
        xgSelect.appendChild(opt);
      });
      const gamIndexSelect = document.getElementById('gamIndexSelect');
      response.gamIndices.forEach((filename) => {
        const opt = document.createElement('option');
        opt.value = filename;
        opt.innerHTML = filename;
        gamIndexSelect.appendChild(opt);
      });
    },
    error(responseData, textStatus, errorThrown) {
      console.log('POST failed.');
    },
  });
}

window.onload = function () {
  document.getElementById('goButton').click();
  populateDropdownsWithFilenames();
};
