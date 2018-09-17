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
// flag is true if instead of selecting input files from mounted folder of docker containter,
// they are uploaded via the web app (only possible for small files)
const FILE_INPUT_FLAG = document.getElementById('xgFileSelect').nodeName.toLowerCase() !== 'select';
const customInputFiles = {};

$('#dataSourceSelect').change(() => {
  $('#distance').prop('value', '100');
  $('#unitSelect').prop('value', '1');
  if ($('#dataSourceSelect').val() === 'custom') {
    $('#reloadButton').prop('disabled', false);
    $('#xgFileSelect').prop('disabled', false);
    $('#gbwtFileSelect').prop('disabled', false);
    $('#gamFileSelect').prop('disabled', false);
    $('#pathNameSelect').prop('disabled', false);
    $('#position').prop('value', '1');
  } else {
    $('#reloadButton').prop('disabled', true);
    $('#xgFileSelect').prop('disabled', true);
    $('#gbwtFileSelect').prop('disabled', true);
    $('#gamFileSelect').prop('disabled', true);
    $('#pathNameSelect').prop('disabled', true);

    DATA_SOURCES.forEach((ds) => {
      if (ds.name === $('#dataSourceSelect').val()) {
        $('#position').prop('value', ds.defaultPosition);
      }
    });
  }
});

function createDropDownNoneOption() {
  const opt = document.createElement('option');
  opt.value = 'none';
  opt.innerHTML = 'None';
  return opt;
}

$('#xgFileSelect').change(() => {
  $('#pathNameSelect').empty();
  if (!FILE_INPUT_FLAG) {
    if ($('#xgFileSelect').val() === 'none') {
      $('#pathNameSelect').append(createDropDownNoneOption());
    } else {
      getPathNames();
    }
    return;
  }
  const file = document.getElementById('xgFileSelect').files[0];
  if (file === undefined) {
    $('#pathNameSelect').append(createDropDownNoneOption());
    delete customInputFiles.xgFile;
  } else {
    document.getElementById('fileUploadSpinner').style.display = 'block';
    document.getElementById('goButton').disabled = true;
    const formData = new FormData();
    formData.append('xgFile', file);
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'json';
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4 && xhr.status === 200) {
        // Every thing ok, file uploaded
        customInputFiles.xgFile = xhr.response.path;
        document.getElementById('fileUploadSpinner').style.display = 'none';
        document.getElementById('goButton').disabled = false;
        getPathNames();
      }
    };
    xhr.open('POST', `${BACKEND_URL}/xgFileSubmission`, true);
    xhr.send(formData);
  }
});

$('#gbwtFileSelect').change(() => {
  if (FILE_INPUT_FLAG) {
    const file = document.getElementById('gbwtFileSelect').files[0];
    if (file === undefined) {
      delete customInputFiles.gbwtFile;
    } else {
      document.getElementById('fileUploadSpinner').style.display = 'block';
      document.getElementById('goButton').disabled = true;
      const formData = new FormData();
      formData.append('gbwtFile', file);
      const xhr = new XMLHttpRequest();
      xhr.responseType = 'json';
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
          // Every thing ok, file uploaded
          customInputFiles.gbwtFile = xhr.response.path;
          document.getElementById('fileUploadSpinner').style.display = 'none';
          document.getElementById('goButton').disabled = false;
        }
      };
      xhr.open('POST', `${BACKEND_URL}/gbwtFileSubmission`, true);
      xhr.send(formData);
    }
  }
});

$('#gamFileSelect').change(() => {
  if (FILE_INPUT_FLAG) {
    const file = document.getElementById('gamFileSelect').files[0];
    if (file === undefined) {
      delete customInputFiles.gamFile;
    } else {
      document.getElementById('fileUploadSpinner').style.display = 'block';
      document.getElementById('goButton').disabled = true;
      const formData = new FormData();
      formData.append('gamFile', file);
      const xhr = new XMLHttpRequest();
      xhr.responseType = 'json';
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
          // Every thing ok, file uploaded
          customInputFiles.gamFile = xhr.response.path;
          document.getElementById('fileUploadSpinner').style.display = 'none';
          document.getElementById('goButton').disabled = false;
        }
      };
      xhr.open('POST', `${BACKEND_URL}/gamFileSubmission`, true);
      xhr.send(formData);
    }
  }
});

function getPathNames() {
  let xgFile;
  let isUploadedFile;
  if (FILE_INPUT_FLAG) {
    xgFile = customInputFiles.xgFile;
    isUploadedFile = true;
  } else {
    xgFile = $('#xgFileSelect').val();
    isUploadedFile = false;
  }
  $.ajax({
    type: 'POST',
    url: `${BACKEND_URL}/getPathNames`,
    crossDomain: true,
    data: { xgFile, isUploadedFile },
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
  tubeMap.zoomBy(zoomFactor);
};

document.getElementById('zoomOutButton').onclick = function () {
  tubeMap.zoomBy(1.0 / zoomFactor);
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

  return getRemoteTubeMapData();
}

function getRemoteTubeMapData() {
  const nodeID = document.getElementById('position').value;
  const distance = document.getElementById('distance').value;
  const byNode = (document.getElementById('unitSelect').selectedIndex !== 0);

  let xgFile;
  let gbwtFile;
  let gamFile;
  if (FILE_INPUT_FLAG) {
    xgFile = customInputFiles.xgFile;
    gbwtFile = customInputFiles.gbwtFile;
    gamFile = customInputFiles.gamFile;
  } else {
    xgFile = $('#xgFileSelect').val();
    gbwtFile = $('#gbwtFileSelect').val();
    gamFile = $('#gamFileSelect').val();
  }
  let anchorTrackName = $('#pathNameSelect').val();
  let dataPath = customInputFiles.xgFile === undefined ? 'mounted' : 'upload';

  DATA_SOURCES.forEach((ds) => {
    if (ds.name === $('#dataSourceSelect').val()) {
      xgFile = ds.xgFile;
      gbwtFile = ds.gbwtFile;
      gamFile = ds.gamFile;
      anchorTrackName = ds.anchorTrackName;
      dataPath = 'default';
    }
  });

  return $.ajax({
    type: 'POST',
    url: `${BACKEND_URL}/chr22_v4`,
    crossDomain: true,
    data: {
      nodeID,
      distance,
      byNode,
      xgFile,
      gbwtFile,
      gamFile,
      anchorTrackName,
      dataPath,
    },
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

  const gamFileSelect = document.getElementById('gamFileSelect');
  while (gamFileSelect.hasChildNodes()) {
    gamFileSelect.removeChild(gamFileSelect.lastChild);
  }
  const opt3 = document.createElement('option');
  opt3.value = 'none';
  opt3.innerHTML = 'None';
  gamFileSelect.appendChild(opt3);
}

function populateDropdownsWithFilenames() {
  if (!FILE_INPUT_FLAG) {
    $.ajax({
      type: 'POST',
      url: `${BACKEND_URL}/getFilenames`,
      crossDomain: true,
      success(response) {
        const xgSelect = document.getElementById('xgFileSelect');
        const xgSelectValue = xgSelect.options[xgSelect.selectedIndex].value;
        const gbwtSelect = document.getElementById('gbwtFileSelect');
        const gbwtSelectValue =
          gbwtSelect.options[gbwtSelect.selectedIndex].value;
        const gamFileSelect = document.getElementById('gamFileSelect');
        const gamSelectValue =
          gamFileSelect.options[gamFileSelect.selectedIndex].value;
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
          gamFileSelect.appendChild(opt);
        });
      },
      error(responseData, textStatus, errorThrown) {
        console.log('POST failed.');
      },
    });
  }
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
