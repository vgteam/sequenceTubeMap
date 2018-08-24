/* eslint func-names: "off" */
/* eslint no-console: "off" */
/* eslint no-unused-vars: "off" */
// We need these to conditionally import a user config
/* eslint import/no-unresolved: "off" */
/* eslint global-require: "off" */

import * as mergeJSON from 'merge-json';

import * as tubeMap from './tubemap';

let CONFIG = require('../../config.default.json');

try {
  // Ordinarily this wouldn't work at all with browserify, but we use the
  // browserify-optional transform that makes it work great.
  CONFIG = mergeJSON.merge(CONFIG, require('../../config.json'));
} catch (err) {
    // Ignore errors; probably means the override config didn't exist at build
    // time.
}

const BACKEND_URL = CONFIG.BACKEND_URL || `http://${window.location.host}`;
const DATA_SOURCES = CONFIG.DATA_SOURCES;
let startTime = 0;

$('#dataSourceSelect').change(() => {
  $('#distance').prop('value', '100');
  $('#unitSelect').prop('value', '1');
  if ($('#dataSourceSelect').val() === 'custom') {
    $('#reloadButton').prop('disabled', false);
    $('#xgFileSelect').prop('disabled', false);
    $('#gbwtFileSelect').prop('disabled', false);
    $('#gamIndexSelect').prop('disabled', false);
    $('#pathNameSelect').prop('disabled', false);
    $('#position').prop('value', '1');
  } else {
    $('#reloadButton').prop('disabled', true);
    $('#xgFileSelect').prop('disabled', true);
    $('#gbwtFileSelect').prop('disabled', true);
    $('#gamIndexSelect').prop('disabled', true);
    $('#pathNameSelect').prop('disabled', true);

    DATA_SOURCES.forEach((ds) => {
      if (ds.name === $('#dataSourceSelect').val()) {
        $('#position').prop('value', ds.defaultPosition);
      }
    });
  }
});

$('#xgFileSelect').change(() => {
  $('#pathNameSelect').empty();
  if ($('#xgFileSelect').val() === 'none') {
    // $('#pathNameSelect').empty();
    const opt = document.createElement('option');
    opt.value = 'none';
    opt.innerHTML = 'None';
    $('#pathNameSelect').append(opt);
  } else {
    getPathNames();
    // $('#pathNameSelect').append('<option value="foo" selected>foo</option>');
  }
});

function getPathNames() {
  const xgFile = $('#xgFileSelect').val();
  $.ajax({
    type: 'POST',
    url: `${BACKEND_URL}/getPathNames`,
    crossDomain: true,
    data: { xgFile },
    dataType: 'json',
    success(response) {
      const pathNameSelect = document.getElementById('pathNameSelect');
      const optNone = document.createElement('option');
      optNone.value = 'none';
      optNone.innerHTML = 'None';
      $('#pathNameSelect').append(optNone);
      response.pathNames.forEach((fn) => {
        const opt = document.createElement('option');
        $('#pathNameSelect').append(`<option value="${fn}" selected>${fn}</option>`);
      });
    },
    error(responseData, textStatus, errorThrown) {
      console.log('POST failed.');
    },
  });
}

// display filename of chosen file in file picker
/* $('input[type=file]').change(() => {
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
}); */

document.getElementById('reloadButton').onclick = function () {
  populateDropdownsWithFilenames();
};

document.getElementById('goButton').onclick = function () {
  startTime = performance.now();
  prepareForTubeMap();
};

document.getElementById('goLeftButton').onclick = function () {
  const position = Number(document.getElementById('position').value);
  const distance = Number(document.getElementById('distance').value);
  document.getElementById('position').value = Math.max(position - distance, 0);
  prepareForTubeMap();
};


const zoomFactor = 2.0;
document.getElementById('zoomInButton').onclick = function () {
  // Get Width of the x-axis
  const Width = $('#svg').parent().width();

  // get the selection object
  const selection = d3.select('#svg');

  const currentX = -tubeMap.zoom.translate()[0];
  const currentY = tubeMap.zoom.translate()[1];

  if (tubeMap.zoom.scale() * zoomFactor <= tubeMap.zoom.scaleExtent()[1]) {
    /*
      This formula centralize the zoom In.
     ______________________                             ______________
    |-----------W----------|                           |-------W------|
    |----W/2----|          |                     |----deltaZ---|      |
    |    ______.___________|_____                 _____|______________|______
    |-T-|                  |     |               |     |       .      |      |
    |   |-delta-|          |     |               |     |--W/2--|      |      |
    |___|__________________|     |               |     |              |      |
        |                        |               |--T'-|______________|      |
        |                        |               |                           |
        |                        |               |                           |
        |__Before ZooM___________|               |___After Zoom______________|

     deltaZ = W'/2 + T' ; delta= W/2 + T
     Z(W/2 + T) = W'/2 + T'
     T' = (ZW- W)/2 + Z*T
    */
    const translateX = (((zoomFactor * Width) - Width) / 2.0) + (zoomFactor * currentX);
    /*
      Current y-axis coordinate location multiplies by zoom factor
      this feels natural. Notice y-axis works differently than x-axis.
      This behavior makes if you are on top of the screen the bar fix
      in the same y-axis region.
    */
    const translateY = zoomFactor * currentY;

    tubeMap.zoom.translate([-translateX, translateY]);
    // Apply the coords translation
    tubeMap.zoom.event(selection);
    // Scale by zoom factor
    tubeMap.zoom.scale(tubeMap.zoom.scale() * zoomFactor);
    // Apply the scale
    tubeMap.zoom.event(selection);
  }
};

document.getElementById('zoomOutButton').onclick = function () {
  // Get Width of the x-axis
  const Width = $('#svg').parent().width();
  // get the selection object
  const selection = d3.select('#svg');

  // Calculate the x-axis translation
  const currentX = -tubeMap.zoom.translate()[0];
  const currentY = tubeMap.zoom.translate()[1];

  if (tubeMap.zoom.scale() / zoomFactor > tubeMap.zoom.scaleExtent()[0]) {
    /*
      This formula centralize the zoom In.
     ______________________                             ______________
    |-----------W----------|                           |-------W------|
    |----W/2----|          |                     |----deltaZ---|      |
    |    _______.__________|_____                 _____|______________|______
    |-T-|                  |     |               |     |       .      |      |
    |   |-delta-|          |     |               |     |--W/2--|      |      |
    |___|__________________|     |               |     |              |      |
        |                        |               |--T'-|______________|      |
        |                        |               |                           |
        |                        |               |                           |
        |__Before ZooM___________|               |___After Zoom______________|

     deltaZ = W'/2 + T' ; delta= W/2 + T
     Z(W/2 + T) = W'/2 + T'
     T' = (ZW- W)/2 + Z*T
    */
    const translateX = (((Width / zoomFactor) - Width) / 2.0) + (currentX / zoomFactor);
    /*
      Current y-axis coordinate location multiplies by zoom factor
      this feels natural. Notice y-axis works differently than x-axis.
      This behavior makes if you are on top of the screen the bar fix
      in the same y-axis region.
    */
    const translateY = currentY / zoomFactor;

    // Translate the selection
    tubeMap.zoom.translate([-translateX, translateY]);
    // Apply the coords translation
    tubeMap.zoom.event(selection);
    // Scale by zoom factor
    tubeMap.zoom.scale(tubeMap.zoom.scale() / zoomFactor);
    // Apply the scale
    tubeMap.zoom.event(selection);
  } else if (selection.node().getBBox().width < Width) {
    const currentDistance = Number(document.getElementById('distance').value);
    document.getElementById('distance').value = currentDistance * 2;
    prepareForTubeMap().then(() => {
      tubeMap.zoom.scale(tubeMap.zoom.scaleExtent()[0]);
      tubeMap.zoom.event(selection);
      const center = Width / 2.0;
      const translateX = center - (selection.node().getBBox().width / 2);
      const translateY = currentY / zoomFactor;
      tubeMap.zoom.translate([translateX, translateY]);
      tubeMap.zoom.event(selection);
    });
  }
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
  const w = $('#tubeMapSVG').width();
  $('#legendDiv').html('');
  document
    .getElementById('loader')
    .setAttribute('style', `left:${(w / 2) - 25}px`);

  /* if ($('#dataSourceSelect').val() === 'cactus') {
    getCactusTubeMapData();
  } else {
    getRemoteTubeMapData();
  } */
  return getRemoteTubeMapData();
}

function getRemoteTubeMapData() {
  const nodeID = document.getElementById('position').value;
  const distance = document.getElementById('distance').value;
  const byNode = (document.getElementById('unitSelect').selectedIndex !== 0);

  let xgFile = $('#xgFileSelect').val();
  let gbwtFile = $('#gbwtFileSelect').val();
  let gamIndex = $('#gamIndexSelect').val();
  let anchorTrackName = $('#pathNameSelect').val();
  let useMountedPath = true;

  DATA_SOURCES.forEach((ds) => {
    if (ds.name === $('#dataSourceSelect').val()) {
      console.log('found');
      xgFile = ds.xgFile;
      gbwtFile = ds.gbwtFile;
      gamIndex = ds.gamIndex;
      anchorTrackName = ds.anchorTrackName;
      useMountedPath = ds.useMountedPath;
    }
  });

  console.log(`useMountedPath = ${useMountedPath}`);
  console.log(`anchorTrackName = ${anchorTrackName}`);

  return $.ajax({
    type: 'POST',
    url: `${BACKEND_URL}/chr22_v4`,
    crossDomain: true,
    data: { nodeID, distance, byNode, xgFile, gbwtFile, gamIndex, anchorTrackName, useMountedPath },
    dataType: 'json',
    success(response) {
      // execute when the client recieves a response
      if (response.graph === undefined) {
        // We did not get back a graph, only (possibly) an error.

        // display error message if any
        document.getElementById('inputError').innerText = response.error;
        // when there is an error hide the loader
        document.getElementById('loader').style.display = 'none';
      } else {
        // We did get back a graph. We may also have stderr text from vg, but we ignore it.
        document.getElementById('inputError').innerText = '';
        // otherwise extract the nodes, tracks, and reads from the response
        const nodes = tubeMap.vgExtractNodes(response.graph);
        const tracks = tubeMap.vgExtractTracks(response.graph);
        const reads = tubeMap.vgExtractReads(nodes, tracks, response.gam);
        // create the tube map from extracted data
        createTubeMap(nodes, tracks, reads);
      }
    },
    error(responseData, textStatus, errorThrown) {
      console.log('POST failed.');
    },
  });
  // return false; // prevents browser from reloading page (button within form tag)
}

function createTubeMap(nodes, tracks, reads) {
  tubeMap.create({
    svgID: '#svg',
    nodes,
    tracks,
    reads,
  });
  document.getElementById('loader').style.display = 'none';
  const endTime = performance.now();
  console.log(`Took ${endTime - startTime} milliseconds.`);
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

function clearDropdownsWithFilenames() {
  const xgSelect = document.getElementById('xgFileSelect');
  // remove old files
  while (xgSelect.hasChildNodes()) {
    xgSelect.removeChild(xgSelect.lastChild);
  }
  // create none option
  const opt1 = document.createElement('option');
  opt1.value = 'none';
  opt1.innerHTML = 'None';
  xgSelect.appendChild(opt1);

  const gbwtSelect = document.getElementById('gbwtFileSelect');
  while (gbwtSelect.hasChildNodes()) {
    gbwtSelect.removeChild(gbwtSelect.lastChild);
  }
  const opt2 = document.createElement('option');
  opt2.value = 'none';
  opt2.innerHTML = 'None';
  gbwtSelect.appendChild(opt2);

  const gamIndexSelect = document.getElementById('gamIndexSelect');
  while (gamIndexSelect.hasChildNodes()) {
    gamIndexSelect.removeChild(gamIndexSelect.lastChild);
  }
  const opt3 = document.createElement('option');
  opt3.value = 'none';
  opt3.innerHTML = 'None';
  gamIndexSelect.appendChild(opt3);
}


function populateDropdownsWithFilenames() {
  $.ajax({
    type: 'POST',
    url: `${BACKEND_URL}/getFilenames`,
    crossDomain: true,
    // dataType: 'json',
    success(response) {
      const xgSelect = document.getElementById('xgFileSelect');
      const xgSelectValue = xgSelect.options[xgSelect.selectedIndex].value;
      const gbwtSelect = document.getElementById('gbwtFileSelect');
      const gbwtSelectValue = gbwtSelect.options[gbwtSelect.selectedIndex].value;
      const gamIndexSelect = document.getElementById('gamIndexSelect');
      const gamSelectValue = gamIndexSelect.options[gamIndexSelect.selectedIndex].value;
      clearDropdownsWithFilenames();

      response.xgFiles.forEach((filename) => {
        const opt = document.createElement('option');
        opt.value = filename;
        opt.innerHTML = filename;
        if (opt.value === xgSelectValue) {
          opt.selected = 'true';
        }
        xgSelect.appendChild(opt);
      });
      response.gbwtFiles.forEach((filename) => {
        const opt = document.createElement('option');
        opt.value = filename;
        opt.innerHTML = filename;
        if (opt.value === gbwtSelectValue) {
          opt.selected = 'true';
        }
        gbwtSelect.appendChild(opt);
      });
      response.gamIndices.forEach((filename) => {
        const opt = document.createElement('option');
        opt.value = filename;
        opt.innerHTML = filename;
        if (opt.value === gamSelectValue) {
          opt.selected = 'true';
        }
        gamIndexSelect.appendChild(opt);
      });
    },
    error(responseData, textStatus, errorThrown) {
      console.log('POST failed.');
    },
  });
}

function setUpWebsocket() {
  const ws = new WebSocket(BACKEND_URL.replace(/^http/, 'ws'));
  ws.onmessage = function (message) {
    console.log('Message received');
    populateDropdownsWithFilenames();
  };
  ws.onclose = function (event) {
    setTimeout(setUpWebsocket, 1000);
  };
  ws.onerror = function (event) {
    ws.close();
  };
}


window.onload = function () {
  // populate UI 'data' dropdown with data from DATA_SOURCES
  const dsSelect = document.getElementById('dataSourceSelect');
  DATA_SOURCES.forEach((ds) => {
    const opt = document.createElement('option');
    opt.value = ds.name;
    opt.innerHTML = ds.name;
    dsSelect.appendChild(opt);
  });
  const opt = document.createElement('option');
  opt.value = 'custom';
  opt.innerHTML = 'custom';
  dsSelect.appendChild(opt);

  document.getElementById('goButton').click();
  populateDropdownsWithFilenames();

  document.getElementById('redundantNodesCheckbox').checked = true;
  document.getElementById('compressedViewCheckbox').checked = false;
  document.getElementById('showReadsCheckbox').checked = true;
  document.getElementById('softClipsCheckbox').checked = true;
  document.getElementById('colorsHaplo2').checked = true;
  document.getElementById('colorsFwReads3').checked = true;
  document.getElementById('colorsRevReads4').checked = true;

  setUpWebsocket();
};

// let panX;
// let panY;
// let panTop;
// let panLeft;
// let panDown;

// $('#tubeMapSVG').mousedown((e) => {
//   e.preventDefault();
//   panDown = true;
//   panX = e.pageX;
//   panY = e.pageY;
//   const container = document.getElementById('tubeMapSVG');
//   panLeft = container.scrollLeft;
//   panTop = container.scrollTop;
// });

// $('body').mousemove((e) => {
//   if (panDown) {
//     const newX = e.pageX;
//     const newY = e.pageY;
//     document.getElementById('tubeMapSVG').scrollTop = panTop - newY + panY;
//     document.getElementById('tubeMapSVG').scrollLeft = panLeft - newX + panX;
//   }
// });

// $('body').mouseup((e) => { panDown = false; });
