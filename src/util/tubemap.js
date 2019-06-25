/* eslint no-param-reassign: "off" */
/* eslint no-lonely-if: "off" */
/* eslint no-prototype-builtins: "off" */
/* eslint no-console: "off" */
/* eslint no-continue: "off" */

/* eslint max-len: "off" */
/* eslint no-loop-func: "off" */
/* eslint no-unused-vars: "off" */
/* eslint no-return-assign: "off" */
import * as d3 from 'd3';
import 'd3-selection-multi';

const DEBUG = false;

const greys = [
  '#d9d9d9',
  '#bdbdbd',
  '#969696',
  '#737373',
  '#525252',
  '#252525',
  '#000000'
];

const blues = [
  '#c6dbef',
  '#9ecae1',
  '#6baed6',
  '#4292c6',
  '#2171b5',
  '#08519c',
  '#08306b'
];

const reds = [
  '#fcbba1',
  '#fc9272',
  '#fb6a4a',
  '#ef3b2c',
  '#cb181d',
  '#a50f15',
  '#67000d'
];

// d3 category10
const plainColors = [
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf'
];

// d3 category10
const lightColors = [
  '#ABCCE3',
  '#FFCFA5',
  '#B0DBB0',
  '#F0AEAE',
  '#D7C6E6',
  '#C6ABA5',
  '#F4CCE8',
  '#CFCFCF',
  '#E6E6AC',
  '#A8E7ED'
];

let haplotypeColors = [];
let forwardReadColors = [];
let reverseReadColors = [];
let exonColors = [];

let svgID; // the (html-tag) ID of the svg
let svg; // the svg
export let zoom; // eslint-disable-line import/no-mutable-exports
let inputNodes = [];
let inputTracks = [];
let inputReads = [];
let nodes;
let tracks;
let reads;
let numberOfNodes;
let numberOfTracks;
let nodeMap; // maps node names to node indices
let nodesPerOrder;
let assignments = []; // contains info about lane assignments sorted by order
let extraLeft = []; // info whether nodes have to be moved further apart because of multiple 180° directional changes at the same horizontal order
let extraRight = []; // info whether nodes have to be moved further apart because of multiple 180° directional changes at the same horizontal order
let maxOrder; // horizontal order of the rightmost node

const config = {
  mergeNodesFlag: true,
  transparentNodesFlag: false,
  clickableNodesFlag: false,
  showExonsFlag: false,
  colorScheme: 0,
  // Options for the width of sequence nodes:
  // 0...scale node width linear with number of bases within node
  // 1...scale node width with log2 of number of bases within node
  // 2...scale node width with log10 of number of bases within node
  nodeWidthOption: 0,
  showReads: true,
  showSoftClips: true,
  haplotypeColors: 'greys',
  forwardReadColors: 'reds',
  reverseReadColors: 'blues',
  exonColors: 'lightColors',
  hideLegendFlag: false,
  colorReadsByMappingQuality: false,
  mappingQualityCutoff: 0
};

// variables for storing info which can be directly translated into drawing instructions
let trackRectangles = [];
let trackCurves = [];
let trackCorners = [];
let trackVerticalRectangles = []; // stored separately from horizontal rectangles. This allows drawing them in a separate step -> avoids issues with wrong overlapping
let trackRectanglesStep3 = [];

let maxYCoordinate = 0;
let minYCoordinate = 0;
let maxXCoordinate = 0;
let trackForRuler;

let bed;

// main function to call from outside
// which starts the process of creating a tube map visualization
export function create(params) {
  // mandatory parameters: svgID, nodes, tracks
  // optional parameters: bed, clickableNodes, reads, showLegend
  svgID = params.svgID;
  svg = d3.select(params.svgID);
  inputNodes = JSON.parse(JSON.stringify(params.nodes)); // deep copy
  inputTracks = JSON.parse(JSON.stringify(params.tracks)); // deep copy
  inputReads = params.reads || null;
  bed = params.bed || null;
  config.clickableNodesFlag = params.clickableNodes || false;
  config.hideLegendFlag = params.hideLegend || false;
  const tr = createTubeMap();
  if (!config.hideLegendFlag) drawLegend(tr);
}

// moves a specific track to the top
function moveTrackToFirstPosition(index) {
  inputTracks.unshift(inputTracks[index]); // add element to beginning
  inputTracks.splice(index + 1, 1); // remove 1 element from the middle
  straightenTrack(0);
}

// straighten track given by index by inverting inverted nodes
// only keep them inverted if this single track runs thrugh them in both directions
function straightenTrack(index) {
  let i;
  let j;
  const nodesToInvert = [];
  let currentSequence;
  let nodeName;

  // find out which nodes should be inverted
  currentSequence = inputTracks[index].sequence;
  for (i = 0; i < currentSequence.length; i += 1) {
    if (currentSequence[i].charAt(0) === '-') {
      nodeName = currentSequence[i].substr(1);
      if (
        currentSequence.indexOf(nodeName) === -1 ||
        currentSequence.indexOf(nodeName) > i
      ) {
        // only if this inverted node is no repeat
        nodesToInvert.push(currentSequence[i].substr(1));
      }
    }
  }

  // invert nodes in the tracks' sequence
  for (i = 0; i < inputTracks.length; i += 1) {
    currentSequence = inputTracks[i].sequence;
    for (j = 0; j < currentSequence.length; j += 1) {
      if (currentSequence[j].charAt(0) !== '-') {
        if (nodesToInvert.indexOf(currentSequence[j]) !== -1) {
          currentSequence[j] = `-${currentSequence[j]}`;
        }
      } else if (nodesToInvert.indexOf(currentSequence[j].substr(1)) !== -1) {
        currentSequence[j] = currentSequence[j].substr(1);
      }
    }
  }

  // invert the sequence within the nodes
  inputNodes.forEach(node => {
    if (nodesToInvert.indexOf(node.name) !== -1) {
      node.seq = node.seq
        .split('')
        .reverse()
        .join('');
    }
  });
}

export function changeTrackVisibility(trackID) {
  let i = 0;
  while (i < inputTracks.length && inputTracks[i].id !== trackID) i += 1;
  if (i < inputTracks.length) {
    if (inputTracks[i].hasOwnProperty('hidden')) {
      inputTracks[i].hidden = !inputTracks[i].hidden;
    } else {
      inputTracks[i].hidden = true;
    }
  }
  createTubeMap();
}

export function changeExonVisibility() {
  config.showExonsFlag = !config.showExonsFlag;
  createTubeMap();
}

// sets the flag for whether redundant nodes should be automatically removed or not
export function setMergeNodesFlag(value) {
  if (config.mergeNodesFlag !== value) {
    config.mergeNodesFlag = value;
    svg = d3.select(svgID);
    createTubeMap();
  }
}

// sets the flag for whether nodes should be fully transparent or not
export function setTransparentNodesFlag(value) {
  if (config.transparentNodesFlag !== value) {
    config.transparentNodesFlag = value;
    svg = d3.select(svgID);
    createTubeMap();
  }
}

// sets the flag for whether read soft clips should be displayed or not
export function setSoftClipsFlag(value) {
  if (config.showSoftClips !== value) {
    config.showSoftClips = value;
    svg = d3.select(svgID);
    createTubeMap();
  }
}

// sets the flag for whether reads should be displayed or not
export function setShowReadsFlag(value) {
  if (config.showReads !== value) {
    config.showReads = value;
    svg = d3.select(svgID);
    createTubeMap();
  }
}

export function setColorSet(trackType, colorSet) {
  if (config[trackType] !== colorSet) {
    config[trackType] = colorSet;
    const tr = createTubeMap();
    if (!config.hideLegendFlag) drawLegend(tr);
  }
}

// sets which option should be used for calculating the node width from its sequence length
export function setNodeWidthOption(value) {
  if (value === 0 || value === 1 || value === 2) {
    if (config.nodeWidthOption !== value) {
      config.nodeWidthOption = value;
      if (svg !== undefined) {
        svg = d3.select(svgID);
        createTubeMap();
      }
    }
  }
}

export function setColorReadsByMappingQualityFlag(value) {
  if (config.colorReadsByMappingQuality !== value) {
    config.colorReadsByMappingQuality = value;
    svg = d3.select(svgID);
    createTubeMap();
  }
}

export function setMappingQualityCutoff(value) {
  if (config.mappingQualityCutoff !== value) {
    config.mappingQualityCutoff = value;
    if (svg !== undefined) {
      svg = d3.select(svgID);
      createTubeMap();
    }
  }
}

// main
function createTubeMap() {
  trackRectangles = [];
  trackCurves = [];
  trackCorners = [];
  trackVerticalRectangles = [];
  trackRectanglesStep3 = [];
  assignments = [];
  extraLeft = [];
  extraRight = [];
  maxYCoordinate = 0;
  minYCoordinate = 0;
  maxXCoordinate = 0;
  trackForRuler = undefined;
  svg = d3.select(svgID);
  svg.selectAll('*').remove(); // clear svg for (re-)drawing

  // early exit is necessary when visualization options such as colors are
  // changed before any graph has been rendered
  if (inputNodes.length === 0 || inputTracks.length === 0) return;

  straightenTrack(0);
  nodes = JSON.parse(JSON.stringify(inputNodes)); // deep copy (can add stuff to copy and leave original unchanged)
  tracks = JSON.parse(JSON.stringify(inputTracks));
  reads = JSON.parse(JSON.stringify(inputReads));

  assignColorSets();
  reads = filterReads(reads);

  for (let i = tracks.length - 1; i >= 0; i -= 1) {
    if (!tracks[i].hasOwnProperty('type')) {
      // TODO: maybe remove "haplo"-property?
      tracks[i].type = 'haplo';
    }
    if (tracks[i].hasOwnProperty('hidden')) {
      if (tracks[i].hidden === true) {
        tracks.splice(i, 1);
      }
    }
    if (tracks[i] && tracks[i].hasOwnProperty('indexOfFirstBase')) {
      trackForRuler = tracks[i].name;
    }
  }
  if (tracks.length === 0) return;

  nodeMap = generateNodeMap(nodes);
  generateTrackIndexSequences(tracks);
  if (reads && config.showReads) generateTrackIndexSequences(reads);
  generateNodeWidth();

  if (config.mergeNodesFlag) {
    generateNodeSuccessors(); // requires indexSequence
    generateNodeOrder(); // requires successors
    if (reads && config.showReads) reverseReversedReads();
    mergeNodes();
    nodeMap = generateNodeMap(nodes);
    generateNodeWidth();
    generateTrackIndexSequences(tracks);
    if (reads && config.showReads) generateTrackIndexSequences(reads);
  }

  numberOfNodes = nodes.length;
  numberOfTracks = tracks.length;
  generateNodeSuccessors();
  generateNodeDegree();
  if (DEBUG) console.log(`${numberOfNodes} nodes.`);
  generateNodeOrder();
  maxOrder = getMaxOrder();

  // can cause problems when there is a reversed single track node
  // OTOH, can solve problems with complex inversion patterns
  // switchNodeOrientation();
  // generateNodeOrder(nodes, tracks);
  // maxOrder = getMaxOrder();

  calculateTrackWidth(tracks);
  generateLaneAssignment();

  if (config.showExonsFlag === true && bed !== null) addTrackFeatures();
  generateNodeXCoords();

  if (reads && config.showReads) {
    generateReadOnlyNodeAttributes();
    reverseReversedReads();
    generateTrackIndexSequences(reads);
    placeReads();
    tracks = tracks.concat(reads);
  }

  generateSVGShapesFromPath(nodes, tracks);
  if (DEBUG) {
    console.log('Tracks:');
    console.log(tracks);
    console.log('Nodes:');
    console.log(nodes);
    console.log('Lane assignment:');
    console.log(assignments);
  }
  getImageDimensions();
  alignSVG(nodes, tracks);
  defineSVGPatterns();

  drawTrackRectangles(trackRectangles);
  drawTrackCurves();
  drawReversalsByColor(trackCorners, trackVerticalRectangles);
  drawTrackRectangles(trackRectanglesStep3);
  drawTrackRectangles(trackRectangles, 'read');
  drawTrackCurves('read');

  // draw only those nodes which have coords assigned to them
  const dNodes = removeUnusedNodes(nodes);
  drawReversalsByColor(trackCorners, trackVerticalRectangles, 'read');
  drawNodes(dNodes);
  if (config.nodeWidthOption === 0) drawLabels(dNodes);
  if (trackForRuler !== undefined) drawRuler();
  if (config.nodeWidthOption === 0) drawMismatches(); // TODO: call this before drawLabels and fix d3 data/append/enter stuff
  if (DEBUG) {
    console.log(`number of tracks: ${numberOfTracks}`);
    console.log(`number of nodes: ${numberOfNodes}`);
  }
  return tracks;
}

// generates attributes (node.y, node.contentHeight) for nodes without tracks, only reads
function generateReadOnlyNodeAttributes() {
  nodesPerOrder = [];
  for (let i = 0; i <= maxOrder; i += 1) {
    nodesPerOrder[i] = [];
  }

  const orderY = new Map();
  nodes.forEach(node => {
    if (node.hasOwnProperty('order') && node.hasOwnProperty('y')) {
      setMapToMax(orderY, node.order, node.y + node.contentHeight);
    }
  });

  // for order values where there is no node with haplotypes, orderY is calculated via tracks
  tracks.forEach(track => {
    if (track.type === 'haplo') {
      track.path.forEach(step => {
        setMapToMax(orderY, step.order, step.y + track.width);
      });
    }
  });

  nodes.forEach((node, i) => {
    if (node.hasOwnProperty('order') && !node.hasOwnProperty('y')) {
      node.y = orderY.get(node.order) + 25;
      node.contentHeight = 0;
      nodesPerOrder[node.order].push(i);
    }
  });
}

function setMapToMax(map, key, value) {
  if (map.has(key)) {
    map.set(key, Math.max(map.get(key), value));
  } else {
    map.set(key, value);
  }
}

// add info about reads to nodes (incoming, outgoing and internal reads)
function assignReadsToNodes() {
  nodes.forEach(node => {
    node.incomingReads = [];
    node.outgoingReads = [];
    node.internalReads = [];
  });
  reads.forEach((read, idx) => {
    read.width = 7;
    if (read.path.length === 1) {
      nodes[read.path[0].node].internalReads.push(idx);
    } else {
      read.path.forEach((element, pathIdx) => {
        if (pathIdx === 0) {
          nodes[read.path[0].node].outgoingReads.push([idx, pathIdx]);
        } else if (read.path[pathIdx].node !== null) {
          nodes[read.path[pathIdx].node].incomingReads.push([idx, pathIdx]);
        }
      });
    }
  });
}

function removeNonPathNodesFromReads() {
  reads.forEach(read => {
    for (let i = read.sequence.length - 1; i >= 0; i -= 1) {
      let nodeName = read.sequence[i];
      if (nodeName.charAt(0) === '-') {
        nodeName = nodeName.substr(1);
      }
      if (!nodeMap.has(nodeName) || nodes[nodeMap.get(nodeName)].degree === 0) {
        read.sequence.splice(i, 1);
      }
    }
  });
}

// calculate paths (incl. correct y coordinate) for all reads
function placeReads() {
  generateBasicPathsForReads();
  assignReadsToNodes();

  // sort nodes by order, then by y-coordinate
  const sortedNodes = nodes.slice();
  sortedNodes.sort(compareNodesByOrder);

  // iterate over all nodes
  sortedNodes.forEach(node => {
    // sort incoming reads
    node.incomingReads.sort(compareReadIncomingSegmentsByComingFrom);

    // place incoming reads
    let currentY = node.y + node.contentHeight;
    const occupiedUntil = new Map();
    node.incomingReads.forEach(readElement => {
      reads[readElement[0]].path[readElement[1]].y = currentY;
      setOccupiedUntil(
        occupiedUntil,
        reads[readElement[0]],
        readElement[1],
        currentY,
        node
      );
      currentY += 7;
    });
    let maxY = currentY;

    // sort outgoing reads
    node.outgoingReads.sort(compareReadOutgoingSegmentsByGoingTo);

    // place outgoing reads
    const occupiedFrom = new Map();
    currentY = node.y + node.contentHeight;
    node.outgoingReads.forEach(readElement => {
      // place in next lane
      reads[readElement[0]].path[readElement[1]].y = currentY;
      occupiedFrom.set(currentY, reads[readElement[0]].firstNodeOffset);
      // if no conflicts
      if (
        !occupiedUntil.has(currentY) ||
        occupiedUntil.get(currentY) + 1 < reads[readElement[0]].firstNodeOffset
      ) {
        currentY += 7;
        maxY = Math.max(maxY, currentY);
      } else {
        // otherwise push down incoming reads to make place for outgoing Read
        occupiedUntil.set(currentY, 0);
        node.incomingReads.forEach(incReadElementIndices => {
          const incRead = reads[incReadElementIndices[0]];
          const incReadPathElement = incRead.path[incReadElementIndices[1]];
          if (incReadPathElement.y >= currentY) {
            incReadPathElement.y += 7;
            setOccupiedUntil(
              occupiedUntil,
              incRead,
              incReadElementIndices[1],
              incReadPathElement.y,
              node
            );
          }
        });
        currentY += 7;
        maxY += 7;
      }
    });

    // sort internal reads
    node.internalReads.sort(compareInternalReads);

    // place internal reads
    node.internalReads.forEach(readIdx => {
      const currentRead = reads[readIdx];
      currentY = node.y + node.contentHeight;
      while (
        currentRead.firstNodeOffset < occupiedUntil.get(currentY) + 2 ||
        currentRead.finalNodeCoverLength > occupiedFrom.get(currentY) - 3
      ) {
        currentY += 7;
      }
      currentRead.path[0].y = currentY;
      occupiedUntil.set(currentY, currentRead.finalNodeCoverLength);
      maxY = Math.max(maxY, currentY);
    });

    // adjust node height and move other nodes vertically down
    const heightIncrease = maxY - node.y - node.contentHeight;
    node.contentHeight += heightIncrease;
    adjustVertically3(node, heightIncrease);
  });

  // place read segments which are without node
  const bottomY = calculateBottomY();
  const elementsWithoutNode = [];
  reads.forEach((read, idx) => {
    read.path.forEach((element, pathIdx) => {
      if (!element.hasOwnProperty('y')) {
        elementsWithoutNode.push({
          readIndex: idx,
          pathIndex: pathIdx,
          previousY: reads[idx].path[pathIdx - 1].y
        });
      }
    });
  });
  elementsWithoutNode.sort(compareNoNodeReadsByPreviousY);
  elementsWithoutNode.forEach(element => {
    const segment = reads[element.readIndex].path[element.pathIndex];
    segment.y = bottomY[segment.order];
    bottomY[segment.order] += reads[element.readIndex].width;
  });

  if (DEBUG) {
    console.log('Reads:');
    console.log(reads);
  }
}

// keeps track of where reads end within nodes
function setOccupiedUntil(map, read, pathIndex, y, node) {
  if (pathIndex === read.path.length - 1) {
    // last node of current read
    map.set(y, read.finalNodeCoverLength);
  } else {
    // read covers the whole node
    map.set(y, node.sequenceLength);
  }
}

// compare read segments which are outside of nodes
// by the y-coord of where they are coming from
function compareNoNodeReadsByPreviousY(a, b) {
  const segmentA = reads[a.readIndex].path[a.pathIndex];
  const segmentB = reads[b.readIndex].path[b.pathIndex];
  if (segmentA.order === segmentB.order) {
    return a.previousY - b.previousY;
  }
  return segmentA.order - segmentB.order;
}

// compare read segments by where they are going to
function compareReadOutgoingSegmentsByGoingTo(a, b) {
  let pathIndexA = a[1];
  let pathIndexB = b[1];
  // let readA = reads[a[0]]
  // let nodeIndexA = readA.path[pathIndexA].node;
  let nodeA = nodes[reads[a[0]].path[pathIndexA].node];
  let nodeB = nodes[reads[b[0]].path[pathIndexB].node];
  while (nodeA !== null && nodeB !== null && nodeA === nodeB) {
    if (pathIndexA < reads[a[0]].path.length - 1) {
      pathIndexA += 1;
      while (reads[a[0]].path[pathIndexA].node === null) pathIndexA += 1; // skip null nodes in path
      nodeA = nodes[reads[a[0]].path[pathIndexA].node];
    } else {
      nodeA = null;
    }
    if (pathIndexB < reads[b[0]].path.length - 1) {
      pathIndexB += 1;
      while (reads[b[0]].path[pathIndexB].node === null) pathIndexB += 1; // skip null nodes in path
      nodeB = nodes[reads[b[0]].path[pathIndexB].node];
    } else {
      nodeB = null;
    }
  }
  if (nodeA !== null) {
    if (nodeB !== null) return compareNodesByOrder(nodeA, nodeB);
    return 1; // nodeB is null, nodeA not null
  }
  if (nodeB !== null) return -1; // nodeB not null, nodeA null
  // both nodes are null -> both end in the same node
  const beginDiff = reads[a[0]].firstNodeOffset - reads[b[0]].firstNodeOffset;
  if (beginDiff !== 0) return beginDiff;
  // break tie: both reads cover the same nodes and begin at the same position -> compare by endPosition
  return reads[a[0]].finalNodeCoverLength - reads[b[0]].finalNodeCoverLength;
}

// compare read segments by (y-coord of) where they are coming from
function compareReadIncomingSegmentsByComingFrom(a, b) {
  // these boundary conditions avoid errors for incoming reads
  // from inverted nodes (u-turns)
  if (a[1] === 0) return -1;
  if (b[1] === 0) return 1;

  const pathA = reads[a[0]].path[a[1] - 1];
  const pathB = reads[b[0]].path[b[1] - 1];
  if (pathA.hasOwnProperty('y')) {
    if (pathB.hasOwnProperty('y')) {
      return pathA.y - pathB.y; // a and b have y-property
    }
    return -1; // only a has y-property
  }
  if (pathB.hasOwnProperty('y')) {
    return 1; // only b has y-property
  }
  return compareReadIncomingSegmentsByComingFrom(
    [a[0], a[1] - 1],
    [b[0], b[1] - 1]
  ); // neither has y-property
}

// compare 2 reads which are completely within a single node
function compareInternalReads(idxA, idxB) {
  const a = reads[idxA];
  const b = reads[idxB];
  // compare by first base within first node
  if (a.firstNodeOffset < b.firstNodeOffset) return -1;
  else if (a.firstNodeOffset > b.firstNodeOffset) return 1;

  // compare by last base within last node
  if (a.finalNodeCoverLength < b.finalNodeCoverLength) return -1;
  else if (a.finalNodeCoverLength > b.finalNodeCoverLength) return 1;

  return 0;
}

// determine biggest y-coordinate for each order-value
function calculateBottomY() {
  const bottomY = [];
  for (let i = 0; i <= maxOrder; i += 1) {
    bottomY.push(0);
  }

  nodes.forEach(node => {
    bottomY[node.order] = Math.max(
      bottomY[node.order],
      node.y + node.contentHeight + 20
    );
  });

  tracks.forEach(track => {
    track.path.forEach(element => {
      bottomY[element.order] = Math.max(
        bottomY[element.order],
        element.y + track.width
      );
    });
  });
  return bottomY;
}

// generate path-info for each read
// containing order, node and orientation, but no concrete coordinates
function generateBasicPathsForReads() {
  let currentNodeIndex;
  let currentNodeIsForward;
  let currentNode;
  let previousNode;
  let previousNodeIsForward;
  const isPositive = n => ((n = +n) || 1 / n) >= 0;

  reads.forEach(read => {
    // add info for start of track
    currentNodeIndex = Math.abs(read.indexSequence[0]);
    currentNodeIsForward = isPositive(read.indexSequence[0]);
    currentNode = nodes[currentNodeIndex];

    read.path = [];
    read.path.push({
      order: currentNode.order,
      isForward: currentNodeIsForward,
      node: currentNodeIndex
    });

    for (let i = 1; i < read.sequence.length; i += 1) {
      previousNode = currentNode;
      previousNodeIsForward = currentNodeIsForward;

      currentNodeIndex = Math.abs(read.indexSequence[i]);
      currentNodeIsForward = isPositive(read.indexSequence[i]);
      currentNode = nodes[currentNodeIndex];

      if (currentNode.order > previousNode.order) {
        if (!previousNodeIsForward) {
          // backward to forward at previous node
          read.path.push({
            order: previousNode.order,
            isForward: true,
            node: null
          });
        }
        for (let j = previousNode.order + 1; j < currentNode.order; j += 1) {
          // forward without nodes
          read.path.push({ order: j, isForward: true, node: null });
        }
        if (!currentNodeIsForward) {
          // forward to backward at current node
          read.path.push({
            order: currentNode.order,
            isForward: true,
            node: null
          });
          read.path.push({
            order: currentNode.order,
            isForward: false,
            node: currentNodeIndex
          });
        } else {
          // current Node forward
          read.path.push({
            order: currentNode.order,
            isForward: true,
            node: currentNodeIndex
          });
        }
      } else if (currentNode.order < previousNode.order) {
        if (previousNodeIsForward) {
          // turnaround from fw to bw at previous node
          read.path.push({
            order: previousNode.order,
            isForward: false,
            node: null
          });
        }
        for (let j = previousNode.order - 1; j > currentNode.order; j -= 1) {
          // bachward without nodes
          read.path.push({ order: j, isForward: false, node: null });
        }
        if (currentNodeIsForward) {
          // backward to forward at current node
          read.path.push({
            order: currentNode.order,
            isForward: false,
            node: null
          });
          read.path.push({
            order: currentNode.order,
            isForward: true,
            node: currentNodeIndex
          });
        } else {
          // backward at current node
          read.path.push({
            order: currentNode.order,
            isForward: false,
            node: currentNodeIndex
          });
        }
      } else {
        if (currentNodeIsForward !== previousNodeIsForward) {
          read.path.push({
            order: currentNode.order,
            isForward: currentNodeIsForward,
            node: currentNodeIndex
          });
        } else {
          read.path.push({
            order: currentNode.order,
            isForward: !currentNodeIsForward,
            node: null
          });
          read.path.push({
            order: currentNode.order,
            isForward: currentNodeIsForward,
            node: currentNodeIndex
          });
        }
      }
    }
  });
}

// reverse reads which are reversed
function reverseReversedReads() {
  reads.forEach(read => {
    let pos = 0;
    while (pos < read.sequence.length && read.sequence[pos].charAt(0) === '-') {
      pos += 1;
    }
    if (pos === read.sequence.length) {
      // completely reversed read
      read.is_reverse = true;
      read.sequence = read.sequence.reverse(); // invert sequence
      for (let i = 0; i < read.sequence.length; i += 1) {
        read.sequence[i] = read.sequence[i].substr(1); // remove '-'
      }

      read.sequenceNew = read.sequenceNew.reverse(); // invert sequence
      for (let i = 0; i < read.sequenceNew.length; i += 1) {
        read.sequenceNew[i].nodeName = read.sequenceNew[i].nodeName.substr(1); // remove '-'
        const nodeWidth =
          nodes[nodeMap.get(read.sequenceNew[i].nodeName)].width;
        read.sequenceNew[i].mismatches.forEach(mm => {
          if (mm.type === 'insertion') {
            mm.pos = nodeWidth - mm.pos;
            mm.seq = getReverseComplement(mm.seq);
          } else if (mm.type === 'deletion') {
            mm.pos = nodeWidth - mm.pos - mm.length;
          } else if (mm.type === 'substitution') {
            mm.pos = nodeWidth - mm.pos - mm.seq.length;
            mm.seq = getReverseComplement(mm.seq);
          }
          if (mm.hasOwnProperty('seq')) {
            mm.seq = mm.seq
              .split('')
              .reverse()
              .join('');
          }
        });
      }

      // adjust firstNodeOffset and finalNodeCoverLength
      const temp = read.firstNodeOffset;
      let seqLength = nodes[nodeMap.get(read.sequence[0])].sequenceLength;
      read.firstNodeOffset = seqLength - read.finalNodeCoverLength;
      seqLength =
        nodes[nodeMap.get(read.sequence[read.sequence.length - 1])]
          .sequenceLength;
      read.finalNodeCoverLength = seqLength - temp;
    }
  });
}

function getReverseComplement(s) {
  let result = '';
  for (let i = s.length - 1; i >= 0; i -= 1) {
    switch (s.charAt(i)) {
      case 'A':
        result += 'T';
        break;
      case 'T':
        result += 'A';
        break;
      case 'C':
        result += 'G';
        break;
      case 'G':
        result += 'C';
        break;
      default:
        result += 'N';
    }
  }
  return result;
}

// for each track: generate sequence of node indices from seq. of node names
function generateTrackIndexSequencesNEW(tracksOrReads) {
  tracksOrReads.forEach(track => {
    track.indexSequence = [];
    track.sequence.forEach(edit => {
      if (edit.nodeName.charAt(0) === '-') {
        track.indexSequence.push(-nodeMap.get(edit.nodeName.substr(1)));
      } else {
        track.indexSequence.push(nodeMap.get(edit.nodeName));
      }
    });
  });
}

// for each track: generate sequence of node indices from seq. of node names
function generateTrackIndexSequences(tracksOrReads) {
  tracksOrReads.forEach(track => {
    track.indexSequence = [];
    track.sequence.forEach(nodeName => {
      if (nodeName.charAt(0) === '-') {
        track.indexSequence.push(-nodeMap.get(nodeName.substr(1)));
      } else {
        track.indexSequence.push(nodeMap.get(nodeName));
      }
    });
  });
}

// remove nodes with no tracks moving through them to avoid d3.js errors
function removeUnusedNodes(allNodes) {
  const dNodes = allNodes.slice(0);
  let i;
  for (i = dNodes.length - 1; i >= 0; i -= 1) {
    if (!dNodes[i].hasOwnProperty('x')) {
      dNodes.splice(i, 1);
    }
  }
  return dNodes;
}

// get the minimum and maximum coordinates used in the image to calculate image dimensions
function getImageDimensions() {
  maxXCoordinate = -99;
  minYCoordinate = 99;
  maxYCoordinate = -99;

  nodes.forEach(node => {
    if (node.hasOwnProperty('x')) {
      maxXCoordinate = Math.max(maxXCoordinate, node.x + 20 + node.pixelWidth);
    }
    if (node.hasOwnProperty('y')) {
      minYCoordinate = Math.min(minYCoordinate, node.y - 10);
      maxYCoordinate = Math.max(
        maxYCoordinate,
        node.y + node.contentHeight + 10
      );
    }
  });

  tracks.forEach(track => {
    track.path.forEach(segment => {
      maxYCoordinate = Math.max(maxYCoordinate, segment.y + track.width);
      minYCoordinate = Math.min(minYCoordinate, segment.y);
    });
  });
}

// align visualization to the top and left within svg and resize svg to correct size
// enable zooming and panning
function alignSVG() {
  svg.attr('height', maxYCoordinate - minYCoordinate + 50);
  svg.attr(
    'width',
    document.getElementById(svgID.substring(1)).parentNode.offsetWidth
  );

  function zoomed() {
    const transform = d3.event.transform;
    // vertical adjustment so that top of graph is at top of svg
    // otherwise would violate translateExtent, which leads to graph "jumping" on next pan
    transform.y = (25 - minYCoordinate) * transform.k;
    svg.attr('transform', transform);
    const svg2 = d3.select(svgID);
    // adjust height, so that vertical scroll bar is shown when necessary
    svg2.attr(
      'height',
      (maxYCoordinate - minYCoordinate + 50) * d3.event.transform.k
    );
    // adjust width to compensate for verical scroll bar appearing
    svg2.attr('width', document.getElementById('tubeMapSVG').clientWidth);
  }

  const minZoom = Math.min(
    1,
    document.getElementById(svgID.substring(1)).parentNode.offsetWidth /
      (maxXCoordinate + 10)
  );
  zoom = d3
    .zoom()
    .scaleExtent([minZoom, 8])
    .translateExtent([
      [-1, minYCoordinate - 25],
      [maxXCoordinate + 2, maxYCoordinate + 25]
    ])
    .on('zoom', zoomed);

  svg = svg
    .call(zoom)
    .on('dblclick.zoom', null)
    .append('g');

  // translate to correct position on initial draw
  const containerWidth = document.getElementById(svgID.substring(1)).parentNode
    .offsetWidth;
  const xOffset =
    maxXCoordinate + 10 < containerWidth
      ? (containerWidth - maxXCoordinate - 10) / 2
      : 0;
  d3.select(svgID).call(
    zoom.transform,
    d3.zoomIdentity.translate(xOffset, 25 - minYCoordinate)
  );
}

export function zoomBy(zoomFactor) {
  const minZoom = Math.min(
    1,
    document.getElementById(svgID.substring(1)).parentNode.offsetWidth /
      (maxXCoordinate + 10)
  );
  const maxZoom = 8;
  const width = document.getElementById(svgID.substring(1)).parentElement
    .clientWidth;

  const transform = d3.zoomTransform(d3.select(svgID).node());
  const translateK = Math.min(
    maxZoom,
    Math.max(transform.k * zoomFactor, minZoom)
  );
  let translateX =
    width / 2.0 - ((width / 2.0 - transform.x) * translateK) / transform.k;
  translateX = Math.min(translateX, 1 * translateK);
  translateX = Math.max(translateX, width - (maxXCoordinate + 2) * translateK);
  const translateY = (25 - minYCoordinate) * translateK;
  d3.select(svgID)
    .transition()
    .duration(750)
    .call(
      zoom.transform,
      d3.zoomIdentity.translate(translateX, translateY).scale(translateK)
    );
}

// map node names to node indices
function generateNodeMap() {
  nodeMap = new Map();
  nodes.forEach((node, index) => {
    nodeMap.set(node.name, index);
  });
  return nodeMap;
}

// adds a successor-array to each node containing the indices of the nodes coming directly after the current node
function generateNodeSuccessors() {
  let current;
  let follower;

  nodes.forEach(node => {
    node.successors = [];
    node.predecessors = [];
  });

  tracks.forEach(track => {
    for (let i = 0; i < track.indexSequence.length - 1; i += 1) {
      current = Math.abs(track.indexSequence[i]);
      follower = Math.abs(track.indexSequence[i + 1]);
      if (nodes[current].successors.indexOf(follower) === -1) {
        nodes[current].successors.push(follower);
      }
      if (nodes[follower].predecessors.indexOf(current) === -1) {
        nodes[follower].predecessors.push(current);
      }
    }
  });

  if (reads && config.showReads) {
    reads.forEach(track => {
      for (let i = 0; i < track.indexSequence.length - 1; i += 1) {
        current = Math.abs(track.indexSequence[i]);
        follower = Math.abs(track.indexSequence[i + 1]);
        if (nodes[current].successors.indexOf(follower) === -1) {
          nodes[current].successors.push(follower);
        }
        if (nodes[follower].predecessors.indexOf(current) === -1) {
          nodes[follower].predecessors.push(current);
        }
      }
    });
  }
}

function generateNodeOrderOfSingleTrack(sequence) {
  let forwardOrder = 0;
  let backwardOrder = 0;
  let currentNode;
  let minOrder = 0;

  sequence.forEach(nodeIndex => {
    if (nodeIndex < 0) {
      currentNode = nodes[Math.abs(nodeIndex)];
      if (!currentNode.hasOwnProperty('order')) {
        currentNode.order = backwardOrder;
      }
      if (currentNode.order < minOrder) minOrder = currentNode.order;
      forwardOrder = currentNode.order;
      backwardOrder = currentNode.order - 1;
    } else {
      currentNode = nodes[nodeIndex];
      if (!currentNode.hasOwnProperty('order')) {
        currentNode.order = forwardOrder;
      }
      forwardOrder = currentNode.order + 1;
      backwardOrder = currentNode.order;
    }
  });
  if (minOrder < 0) {
    increaseOrderForAllNodes(-minOrder);
  }
}

// calculate the order-value of nodes contained in sequence which are to the left of the first node which already has an order-value
function generateNodeOrderTrackBeginning(sequence) {
  let anchorIndex = 0;
  let currentOrder;
  let currentNode;
  let minOrder = 0;
  let increment;

  while (
    anchorIndex < sequence.length &&
    !nodes[Math.abs(sequence[anchorIndex])].hasOwnProperty('order')
  ) {
    anchorIndex += 1; // anchor = first node in common with existing graph
  }
  if (anchorIndex >= sequence.length) {
    return null;
  }

  if (sequence[anchorIndex] >= 0) {
    // regular node
    currentOrder = nodes[sequence[anchorIndex]].order - 1;
    increment = -1;
  } else {
    // reverse node
    currentOrder = nodes[-sequence[anchorIndex]].order + 1;
    increment = 1;
  }

  for (let j = anchorIndex - 1; j >= 0; j -= 1) {
    // assign order to nodes which are left of anchor node
    currentNode = nodes[Math.abs(sequence[j])];
    if (!currentNode.hasOwnProperty('order')) {
      currentNode.order = currentOrder;
      minOrder = Math.min(minOrder, currentOrder);
      currentOrder += increment;
    }
  }

  if (minOrder < 0) {
    increaseOrderForAllNodes(-minOrder);
  }
  return anchorIndex;
}

// generate global sequence of nodes from left to right, starting with first track and adding other tracks sequentially
function generateNodeOrder() {
  let modifiedSequence;
  let currentOrder;
  let currentNode;
  let rightIndex;
  let leftIndex;
  let minOrder = 0;
  let tracksAndReads;
  if (reads && config.showReads) tracksAndReads = tracks.concat(reads);
  else tracksAndReads = tracks;

  nodes.forEach(node => {
    delete node.order;
  });

  generateNodeOrderOfSingleTrack(tracks[0].indexSequence); // calculate order values for all nodes of the first track

  for (let i = 1; i < tracksAndReads.length; i += 1) {
    if (DEBUG) console.log(`generating order for track ${i + 1}`);
    rightIndex = generateNodeOrderTrackBeginning(
      tracksAndReads[i].indexSequence
    ); // calculate order values for all nodes until the first anchor
    if (rightIndex === null) {
      if (tracksAndReads[i].type === 'haplo') {
        generateNodeOrderOfSingleTrack(tracksAndReads[i].indexSequence);
      } else {
        tracksAndReads.splice(i, 1);
        reads.splice(i - tracks.length, 1);
        i -= 1;
      }
      continue;
    }
    modifiedSequence = uninvert(tracksAndReads[i].indexSequence);

    while (rightIndex < modifiedSequence.length) {
      // move right until the end of the sequence
      // find next anchor node
      leftIndex = rightIndex;
      rightIndex += 1;
      while (
        rightIndex < modifiedSequence.length &&
        !nodes[modifiedSequence[rightIndex]].hasOwnProperty('order')
      ) {
        rightIndex += 1;
      }

      if (rightIndex < modifiedSequence.length) {
        // middle segment between two anchors
        currentOrder = nodes[modifiedSequence[leftIndex]].order + 1; // start with order value of leftAnchor + 1
        for (let j = leftIndex + 1; j < rightIndex; j += 1) {
          nodes[modifiedSequence[j]].order = currentOrder; // assign order values
          currentOrder += 1;
        }

        if (
          nodes[modifiedSequence[rightIndex]].order >
          nodes[modifiedSequence[leftIndex]].order
        ) {
          // if order-value of left anchor < order-value of right anchor
          if (nodes[modifiedSequence[rightIndex]].order < currentOrder) {
            // and the right anchor now has a lower order-value than our newly added nodes
            increaseOrderForSuccessors(
              modifiedSequence[rightIndex],
              modifiedSequence[rightIndex - 1],
              currentOrder
            );
          }
        } else {
          // potential node reversal: check for ordering conflict, if no conflict found move node at rightIndex further to the right in order to not create a track reversal
          if (
            tracksAndReads[i].indexSequence[rightIndex] >= 0 &&
            !isSuccessor(
              modifiedSequence[rightIndex],
              modifiedSequence[leftIndex]
            )
          ) {
            // no real reversal
            increaseOrderForSuccessors(
              modifiedSequence[rightIndex],
              modifiedSequence[rightIndex - 1],
              currentOrder
            );
          } else {
            // real reversal
            if (
              tracksAndReads[i].sequence[leftIndex] < 0 ||
              (nodes[modifiedSequence[leftIndex + 1]].degree < 2 &&
                nodes[modifiedSequence[rightIndex]].order <
                  nodes[modifiedSequence[leftIndex]].order)
            ) {
              currentOrder = nodes[modifiedSequence[leftIndex]].order - 1; // start with order value of leftAnchor - 1
              for (let j = leftIndex + 1; j < rightIndex; j += 1) {
                nodes[modifiedSequence[j]].order = currentOrder; // assign order values
                currentOrder -= 1;
              }
            }
          }
        }
      } else {
        // right segment to the right of last anchor
        if (tracksAndReads[i].sequence[leftIndex] >= 0) {
          // elongate towards the right
          currentOrder = nodes[modifiedSequence[leftIndex]].order + 1;
          for (let j = leftIndex + 1; j < modifiedSequence.length; j += 1) {
            currentNode = nodes[modifiedSequence[j]];
            if (!currentNode.hasOwnProperty('order')) {
              currentNode.order = currentOrder;
              currentOrder += 1;
            }
          }
        } else {
          // elongate towards the left
          currentOrder = nodes[modifiedSequence[leftIndex]].order - 1;
          for (let j = leftIndex + 1; j < modifiedSequence.length; j += 1) {
            currentNode = nodes[modifiedSequence[j]];
            if (!currentNode.hasOwnProperty('order')) {
              currentNode.order = currentOrder;
              minOrder = Math.min(minOrder, currentOrder);
              currentOrder -= 1;
            }
          }
        }
      }
    }
  }

  // adjust all nodes if necessary, so that no order<0
  if (minOrder < 0) increaseOrderForAllNodes(-minOrder);
}

function isSuccessor(first, second) {
  const visited = new Array(numberOfNodes).fill(false);
  const stack = [];
  stack.push(first);
  visited[first] = true;
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === second) return true;
    for (let i = 0; i < nodes[current].successors.length; i += 1) {
      const childIndex = nodes[current].successors[i];
      if (!visited[childIndex]) {
        visited[childIndex] = true;
        stack.push(childIndex);
      }
    }
  }
  return false;
}

// get order number of the rightmost node
function getMaxOrder() {
  let max = -1;
  nodes.forEach(node => {
    if (node.hasOwnProperty('order') && node.order > max) max = node.order;
  });
  return max;
}

// generates sequence keeping the order but switching all reversed (negative) nodes to forward nodes
function uninvert(sequence) {
  const result = [];
  for (let i = 0; i < sequence.length; i += 1) {
    if (sequence[i] >= 0) {
      result.push(sequence[i]);
    } else {
      result.push(-sequence[i]);
    }
  }
  return result;
}

// increases the order-value of all nodes by amount
function increaseOrderForAllNodes(amount) {
  nodes.forEach(node => {
    if (node.hasOwnProperty('order')) node.order += amount;
  });
}

// increases the order-value for currentNode and (if necessary) successor nodes recursively
function increaseOrderForSuccessors(startingNode, tabuNode, newOrder) {
  const increasedOrders = new Map();
  const queue = [];
  queue.push([startingNode, newOrder]);

  while (queue.length > 0) {
    const current = queue.shift();
    const currentNode = current[0];
    const currentOrder = current[1];

    if (
      nodes[currentNode].hasOwnProperty('order') &&
      nodes[currentNode].order < currentOrder
    ) {
      if (
        !increasedOrders.has(currentNode) ||
        increasedOrders.get(currentNode) < currentOrder
      ) {
        increasedOrders.set(currentNode, currentOrder);
        nodes[currentNode].successors.forEach(successor => {
          if (
            nodes[successor].order > nodes[currentNode].order &&
            successor !== tabuNode
          ) {
            // only increase order of successors if they lie to the right of the currentNode (not for repeats/translocations)
            queue.push([successor, currentOrder + 1]);
          }
        });
        if (currentNode !== startingNode) {
          nodes[currentNode].predecessors.forEach(predecessor => {
            if (
              nodes[predecessor].order > currentNode.order &&
              predecessor !== tabuNode
            ) {
              // only increase order of predecessors if they lie to the right of the currentNode (not for repeats/translocations)
              queue.push([predecessor, currentOrder + 1]);
            }
          });
        }
      }
    }
  }

  increasedOrders.forEach((value, key) => {
    nodes[key].order = value;
  });
}

// calculates the node degree: the number of tracks passing through the node / the node height
function generateNodeDegree() {
  nodes.forEach(node => {
    node.tracks = [];
  });

  tracks.forEach(track => {
    track.indexSequence.forEach(nodeIndex => {
      nodes[Math.abs(nodeIndex)].tracks.push(track.id);
    });
  });

  nodes.forEach(node => {
    if (node.hasOwnProperty('tracks')) node.degree = node.tracks.length;
  });
}

// if more tracks pass through a specific node in reverse direction than in
// regular direction, switch its orientation
// (does not apply to the first track's nodes, these are always oriented as
// dictated by the first track)
function switchNodeOrientation() {
  const toSwitch = new Map();
  let nodeName;
  let prevNode;
  let nextNode;
  let currentNode;

  for (let i = 1; i < tracks.length; i += 1) {
    for (let j = 0; j < tracks[i].sequence.length; j += 1) {
      nodeName = tracks[i].sequence[j];
      if (nodeName.charAt(0) === '-') nodeName = nodeName.substr(1);
      currentNode = nodes[nodeMap.get(nodeName)];
      if (tracks[0].sequence.indexOf(nodeName) === -1) {
        // do not change orientation for nodes which are part of the pivot track
        if (j > 0) {
          if (tracks[i].sequence[j - 1].charAt(0) !== '-') {
            prevNode = nodes[nodeMap.get(tracks[i].sequence[j - 1])];
          } else {
            prevNode = nodes[nodeMap.get(tracks[i].sequence[j - 1].substr(1))];
          }
        }
        if (j < tracks[i].sequence.length - 1) {
          if (tracks[i].sequence[j + 1].charAt(0) !== '-') {
            nextNode = nodes[nodeMap.get(tracks[i].sequence[j + 1])];
          } else {
            nextNode = nodes[nodeMap.get(tracks[i].sequence[j + 1].substr(1))];
          }
        }
        if (
          (j === 0 || prevNode.order < currentNode.order) &&
          (j === tracks[i].sequence.length - 1 ||
            currentNode.order < nextNode.order)
        ) {
          if (!toSwitch.has(nodeName)) toSwitch.set(nodeName, 0);
          if (tracks[i].sequence[j].charAt(0) === '-') {
            toSwitch.set(nodeName, toSwitch.get(nodeName) + 1);
          } else {
            toSwitch.set(nodeName, toSwitch.get(nodeName) - 1);
          }
        }
        if (
          (j === 0 || prevNode.order > currentNode.order) &&
          (j === tracks[i].sequence.length - 1 ||
            currentNode.order > nextNode.order)
        ) {
          if (!toSwitch.has(nodeName)) toSwitch.set(nodeName, 0);
          if (tracks[i].sequence[j].charAt(0) === '-') {
            toSwitch.set(nodeName, toSwitch.get(nodeName) - 1);
          } else {
            toSwitch.set(nodeName, toSwitch.get(nodeName) + 1);
          }
        }
      }
    }
  }

  tracks.forEach((track, trackIndex) => {
    track.sequence.forEach((node, nodeIndex) => {
      nodeName = node;
      if (nodeName.charAt(0) === '-') nodeName = nodeName.substr(1);
      if (toSwitch.has(nodeName) && toSwitch.get(nodeName) > 0) {
        if (node.charAt(0) === '-') {
          tracks[trackIndex].sequence[nodeIndex] = node.substr(1);
        } else {
          tracks[trackIndex].sequence[nodeIndex] = `-${node}`;
        }
      }
    });
  });

  // invert the sequence within the nodes
  toSwitch.forEach((value, key) => {
    if (value > 0) {
      currentNode = nodeMap.get(key);
      nodes[currentNode].seq = nodes[currentNode].seq
        .split('')
        .reverse()
        .join('');
    }
  });
}

// calculates the concrete values for the nodes' x-coordinates
function generateNodeXCoords() {
  let currentX = 0;
  let nextX = 20;
  let currentOrder = -1;
  const sortedNodes = nodes.slice();
  sortedNodes.sort(compareNodesByOrder);
  const extra = calculateExtraSpace();

  sortedNodes.forEach(node => {
    if (node.hasOwnProperty('order')) {
      if (node.order > currentOrder) {
        currentOrder = node.order;
        currentX = nextX + 10 * extra[node.order];
      }
      node.x = currentX;
      nextX = Math.max(nextX, currentX + 40 + node.pixelWidth);
    }
  });
}

// calculates additional horizontal space needed between two nodes
// two neighboring nodes have to be moved further apart if there is a lot going on in between them
// -> edges turning to vertical orientation should not overlap
function calculateExtraSpace() {
  const leftSideEdges = [];
  const rightSideEdges = [];
  const extra = [];

  for (let i = 0; i <= maxOrder; i += 1) {
    leftSideEdges.push(0);
    rightSideEdges.push(0);
  }

  tracks.forEach(track => {
    for (let i = 1; i < track.path.length; i += 1) {
      if (track.path[i].order === track.path[i - 1].order) {
        // repeat or translocation
        if (track.path[i].isForward === true) {
          leftSideEdges[track.path[i].order] += 1;
        } else {
          rightSideEdges[track.path[i].order] += 1;
        }
      }
    }
  });

  extra.push(Math.max(0, leftSideEdges[0] - 1));
  for (let i = 1; i <= maxOrder; i += 1) {
    extra.push(
      Math.max(0, leftSideEdges[i] - 1) + Math.max(0, rightSideEdges[i - 1] - 1)
    );
  }
  return extra;
}

// create and fill assignment-variable, which contains info about tracks and lanes for each order-value
function generateLaneAssignment() {
  let segmentNumber;
  let currentNodeIndex;
  let currentNodeIsForward;
  let currentNode;
  let previousNode;
  let previousNodeIsForward;
  const prevSegmentPerOrderPerTrack = [];
  const isPositive = n => ((n = +n) || 1 / n) >= 0;

  // create empty variables
  for (let i = 0; i <= maxOrder; i += 1) {
    assignments[i] = [];
    prevSegmentPerOrderPerTrack[i] = [];
    for (let j = 0; j < numberOfTracks; j += 1) {
      prevSegmentPerOrderPerTrack[i][j] = null;
    }
  }

  tracks.forEach((track, trackNo) => {
    // add info for start of track
    currentNodeIndex = Math.abs(track.indexSequence[0]);
    currentNodeIsForward = isPositive(track.indexSequence[0]);
    currentNode = nodes[currentNodeIndex];

    track.path = [];
    track.path.push({
      order: currentNode.order,
      lane: null,
      isForward: currentNodeIsForward,
      node: currentNodeIndex
    });
    addToAssignment(
      currentNode.order,
      currentNodeIndex,
      trackNo,
      0,
      prevSegmentPerOrderPerTrack
    );

    segmentNumber = 1;
    for (let i = 1; i < track.sequence.length; i += 1) {
      previousNode = currentNode;
      previousNodeIsForward = currentNodeIsForward;

      currentNodeIndex = Math.abs(track.indexSequence[i]);
      currentNodeIsForward = isPositive(track.indexSequence[i]);
      currentNode = nodes[currentNodeIndex];

      if (currentNode.order > previousNode.order) {
        if (!previousNodeIsForward) {
          // backward to forward at previous node
          track.path.push({
            order: previousNode.order,
            lane: null,
            isForward: true,
            node: null
          });
          addToAssignment(
            previousNode.order,
            null,
            trackNo,
            segmentNumber,
            prevSegmentPerOrderPerTrack
          );
          segmentNumber += 1;
        }
        for (let j = previousNode.order + 1; j < currentNode.order; j += 1) {
          // forward without nodes
          track.path.push({
            order: j,
            lane: null,
            isForward: true,
            node: null
          });
          addToAssignment(
            j,
            null,
            trackNo,
            segmentNumber,
            prevSegmentPerOrderPerTrack
          );
          segmentNumber += 1;
        }
        if (!currentNodeIsForward) {
          // forward to backward at current node
          track.path.push({
            order: currentNode.order,
            lane: null,
            isForward: true,
            node: null
          });
          addToAssignment(
            currentNode.order,
            null,
            trackNo,
            segmentNumber,
            prevSegmentPerOrderPerTrack
          );
          segmentNumber += 1;
          track.path.push({
            order: currentNode.order,
            lane: null,
            isForward: false,
            node: currentNodeIndex
          });
          addToAssignment(
            currentNode.order,
            currentNodeIndex,
            trackNo,
            segmentNumber,
            prevSegmentPerOrderPerTrack
          );
          segmentNumber += 1;
        } else {
          // current Node forward
          track.path.push({
            order: currentNode.order,
            lane: null,
            isForward: true,
            node: currentNodeIndex
          });
          addToAssignment(
            currentNode.order,
            currentNodeIndex,
            trackNo,
            segmentNumber,
            prevSegmentPerOrderPerTrack
          );
          segmentNumber += 1;
        }
      } else if (currentNode.order < previousNode.order) {
        if (previousNodeIsForward) {
          // turnaround from fw to bw at previous node
          track.path.push({
            order: previousNode.order,
            lane: null,
            isForward: false,
            node: null
          });
          addToAssignment(
            previousNode.order,
            null,
            trackNo,
            segmentNumber,
            prevSegmentPerOrderPerTrack
          );
          segmentNumber += 1;
        }
        for (let j = previousNode.order - 1; j > currentNode.order; j -= 1) {
          // bachward without nodes
          track.path.push({
            order: j,
            lane: null,
            isForward: false,
            node: null
          });
          addToAssignment(
            j,
            null,
            trackNo,
            segmentNumber,
            prevSegmentPerOrderPerTrack
          );
          segmentNumber += 1;
        }
        if (currentNodeIsForward) {
          // backward to forward at current node
          track.path.push({
            order: currentNode.order,
            lane: null,
            isForward: false,
            node: null
          });
          addToAssignment(
            currentNode.order,
            null,
            trackNo,
            segmentNumber,
            prevSegmentPerOrderPerTrack
          );
          segmentNumber += 1;
          track.path.push({
            order: currentNode.order,
            lane: null,
            isForward: true,
            node: currentNodeIndex
          });
          addToAssignment(
            currentNode.order,
            currentNodeIndex,
            trackNo,
            segmentNumber,
            prevSegmentPerOrderPerTrack
          );
          segmentNumber += 1;
        } else {
          // backward at current node
          track.path.push({
            order: currentNode.order,
            lane: null,
            isForward: false,
            node: currentNodeIndex
          });
          addToAssignment(
            currentNode.order,
            currentNodeIndex,
            trackNo,
            segmentNumber,
            prevSegmentPerOrderPerTrack
          );
          segmentNumber += 1;
        }
      } else {
        if (currentNodeIsForward !== previousNodeIsForward) {
          track.path.push({
            order: currentNode.order,
            lane: null,
            isForward: currentNodeIsForward,
            node: currentNodeIndex
          });
          addToAssignment(
            currentNode.order,
            currentNodeIndex,
            trackNo,
            segmentNumber,
            prevSegmentPerOrderPerTrack
          );
          segmentNumber += 1;
        } else {
          track.path.push({
            order: currentNode.order,
            lane: null,
            isForward: !currentNodeIsForward,
            node: null
          });
          addToAssignment(
            currentNode.order,
            null,
            trackNo,
            segmentNumber,
            prevSegmentPerOrderPerTrack
          );
          segmentNumber += 1;
          track.path.push({
            order: currentNode.order,
            lane: null,
            isForward: currentNodeIsForward,
            node: currentNodeIndex
          });
          addToAssignment(
            currentNode.order,
            currentNodeIndex,
            trackNo,
            segmentNumber,
            prevSegmentPerOrderPerTrack
          );
          segmentNumber += 1;
        }
      }
    }
  });

  for (let i = 0; i <= maxOrder; i += 1) {
    generateSingleLaneAssignment(assignments[i], i); // this is where the lanes get assigned
  }
}

function addToAssignment(
  order,
  nodeIndex,
  trackNo,
  segmentID,
  prevSegmentPerOrderPerTrack
) {
  const compareToFromSame = prevSegmentPerOrderPerTrack[order][trackNo];

  if (nodeIndex === null) {
    assignments[order].push({
      type: 'single',
      node: null,
      tracks: [{ trackID: trackNo, segmentID, compareToFromSame }]
    });
    prevSegmentPerOrderPerTrack[order][trackNo] =
      assignments[order][assignments[order].length - 1].tracks[0];
  } else {
    for (let i = 0; i < assignments[order].length; i += 1) {
      if (assignments[order][i].node === nodeIndex) {
        // add to existing node in assignment
        assignments[order][i].type = 'multiple';
        assignments[order][i].tracks.push({
          trackID: trackNo,
          segmentID,
          compareToFromSame
        });
        prevSegmentPerOrderPerTrack[order][trackNo] =
          assignments[order][i].tracks[assignments[order][i].tracks.length - 1];
        return;
      }
    }
    // create new node in assignment
    assignments[order].push({
      type: 'single',
      node: nodeIndex,
      tracks: [{ trackID: trackNo, segmentID, compareToFromSame }]
    });
    prevSegmentPerOrderPerTrack[order][trackNo] =
      assignments[order][assignments[order].length - 1].tracks[0];
  }
}

// looks at assignment and sets idealY and idealLane by looking at where the tracks come from
function getIdealLanesAndCoords(assignment, order) {
  let index;

  assignment.forEach(node => {
    node.idealLane = 0;
    node.tracks.forEach(track => {
      if (track.segmentID === 0) {
        track.idealLane = track.trackID;
        track.idealY = null;
      } else {
        if (
          tracks[track.trackID].path[track.segmentID - 1].order ===
          order - 1
        ) {
          track.idealLane =
            tracks[track.trackID].path[track.segmentID - 1].lane;
          track.idealY = tracks[track.trackID].path[track.segmentID - 1].y;
        } else if (
          track.segmentID < tracks[track.trackID].path.length - 1 &&
          tracks[track.trackID].path[track.segmentID + 1].order === order - 1
        ) {
          track.idealLane =
            tracks[track.trackID].path[track.segmentID + 1].lane;
          track.idealY = tracks[track.trackID].path[track.segmentID + 1].y;
        } else {
          index = track.segmentID - 1;
          while (
            index >= 0 &&
            tracks[track.trackID].path[index].order !== order - 1
          ) {
            index -= 1;
          }
          if (index < 0) {
            track.idealLane = track.trackID;
            track.idealY = null;
          } else {
            track.idealLane = tracks[track.trackID].path[index].lane;
            track.idealY = tracks[track.trackID].path[index].y;
          }
        }
      }
      node.idealLane += track.idealLane;
    });
    node.idealLane /= node.tracks.length;
  });
}

// assigns the optimal lanes for a single horizontal position (=order)
// first an ideal lane is calculated for each track (which is ~ the lane of its predecessor)
// then the nodes are sorted by their average ideal lane
// and the whole construct is then moved up or down if necessary
function generateSingleLaneAssignment(assignment, order) {
  let currentLane = 0;
  const potentialAdjustmentValues = new Set();
  let currentY = 20;
  let prevNameIsNull = false;
  let prevTrack = -1;

  getIdealLanesAndCoords(assignment, order);
  assignment.sort(compareByIdealLane);

  assignment.forEach(node => {
    if (node.node !== null) {
      nodes[node.node].topLane = currentLane;
      if (prevNameIsNull) currentY -= 10;
      nodes[node.node].y = currentY;
      nodes[node.node].contentHeight = 0;
      prevNameIsNull = false;
    } else {
      if (prevNameIsNull) currentY -= 25;
      else if (currentY > 20) currentY -= 10;
      prevNameIsNull = true;
    }

    node.tracks.sort(compareByIdealLane);
    node.tracks.forEach(track => {
      track.lane = currentLane;
      if (track.trackID === prevTrack && node.node === null && prevNameIsNull) {
        currentY += 10;
      }
      tracks[track.trackID].path[track.segmentID].lane = currentLane;
      tracks[track.trackID].path[track.segmentID].y = currentY;
      if (track.idealY !== null) {
        potentialAdjustmentValues.add(track.idealY - currentY);
      }
      currentLane += 1;
      currentY += tracks[track.trackID].width;
      if (node.node !== null) {
        nodes[node.node].contentHeight += tracks[track.trackID].width;
      }
      prevTrack = track.trackID;
    });
    currentY += 25;
  });

  adjustVertically(assignment, potentialAdjustmentValues);
}

// moves all tracks at a single horizontal location (=order) up/down to minimize lane changes
function adjustVertically(assignment, potentialAdjustmentValues) {
  let verticalAdjustment = 0;
  let minAdjustmentCost = Number.MAX_SAFE_INTEGER;

  potentialAdjustmentValues.forEach(moveBy => {
    if (getVerticalAdjustmentCost(assignment, moveBy) < minAdjustmentCost) {
      minAdjustmentCost = getVerticalAdjustmentCost(assignment, moveBy);
      verticalAdjustment = moveBy;
    }
  });

  assignment.forEach(node => {
    if (node.node !== null) {
      nodes[node.node].y += verticalAdjustment;
    }
    node.tracks.forEach(track => {
      tracks[track.trackID].path[track.segmentID].y += verticalAdjustment;
    });
  });
}

function adjustVertically3(node, adjustBy) {
  if (node.hasOwnProperty('order')) {
    assignments[node.order].forEach(assignmentNode => {
      if (assignmentNode.node !== null) {
        const aNode = nodes[assignmentNode.node];
        if (aNode !== node && aNode.y > node.y) {
          aNode.y += adjustBy;
          assignmentNode.tracks.forEach(track => {
            tracks[track.trackID].path[track.segmentID].y += adjustBy;
          });
        }
      } else {
        // track-segment not within a node
        assignmentNode.tracks.forEach(track => {
          if (tracks[track.trackID].path[track.segmentID].y >= node.y) {
            tracks[track.trackID].path[track.segmentID].y += adjustBy;
          }
        });
      }
    });
    if (nodesPerOrder[node.order].length > 0) {
      nodesPerOrder[node.order].forEach(nodeIndex => {
        if (nodes[nodeIndex] !== node && nodes[nodeIndex].y > node.y) {
          nodes[nodeIndex].y += adjustBy;
        }
      });
    }
  }
}

// calculates cost of vertical adjustment as vertical distance * width of track
function getVerticalAdjustmentCost(assignment, moveBy) {
  let result = 0;
  assignment.forEach(node => {
    node.tracks.forEach(track => {
      if (track.idealY !== null && tracks[track.trackID].type !== 'read') {
        result +=
          Math.abs(
            track.idealY -
              moveBy -
              tracks[track.trackID].path[track.segmentID].y
          ) * tracks[track.trackID].width;
      }
    });
  });
  return result;
}

function compareByIdealLane(a, b) {
  if (a.hasOwnProperty('idealLane')) {
    if (b.hasOwnProperty('idealLane')) {
      if (a.idealLane < b.idealLane) return -1;
      else if (a.idealLane > b.idealLane) return 1;
      return 0;
    }
    return -1;
  }
  if (b.hasOwnProperty('idealLane')) {
    return 1;
  }
  return 0;
}

function compareNodesByOrder(a, b) {
  if (a === null) {
    if (b === null) return 0;
    return -1;
  }
  if (b === null) return 1;

  if (a.hasOwnProperty('order')) {
    if (b.hasOwnProperty('order')) {
      if (a.order < b.order) return -1;
      else if (a.order > b.order) return 1;
      if (a.hasOwnProperty('y') && b.hasOwnProperty('y')) {
        if (a.y < b.y) return -1;
        else if (a.y > b.y) return 1;
      }
      return 0;
    }
    return -1;
  }
  if (b.hasOwnProperty('order')) return 1;
  return 0;
}

function addTrackFeatures() {
  let nodeStart;
  let nodeEnd;
  let feature = {};

  bed.forEach(line => {
    let i = 0;
    while (i < numberOfTracks && tracks[i].name !== line.track) i += 1;
    if (i < numberOfTracks) {
      nodeStart = 0;
      tracks[i].path.forEach(node => {
        if (node.node !== null) {
          feature = {};
          if (nodes[node.node].hasOwnProperty('sequenceLength')) {
            nodeEnd = nodeStart + nodes[node.node].sequenceLength - 1;
          } else {
            nodeEnd = nodeStart + nodes[node.node].width - 1;
          }

          if (nodeStart >= line.start && nodeStart <= line.end) {
            feature.start = 0;
          }
          if (nodeStart < line.start && nodeEnd >= line.start) {
            feature.start = line.start - nodeStart;
          }
          if (nodeEnd <= line.end && nodeEnd >= line.start) {
            feature.end = nodeEnd - nodeStart;
            if (nodeEnd < line.end) feature.continue = true;
          }
          if (nodeEnd > line.end && nodeStart <= line.end) {
            feature.end = line.end - nodeStart;
          }
          if (feature.hasOwnProperty('start')) {
            feature.type = line.type;
            feature.name = line.name;
            if (!node.hasOwnProperty('features')) node.features = [];
            node.features.push(feature);
          }
          nodeStart = nodeEnd + 1;
        }
      });
    }
  });
}

function calculateTrackWidth() {
  // flag: if vg returns freq of 0 for all tracks, we will increase width manually
  let allAreFour = true;

  tracks.forEach(track => {
    if (track.hasOwnProperty('freq')) {
      // custom track width
      track.width = Math.round((Math.log(track.freq) + 1) * 4);
    } else {
      // default track width
      track.width = 15;
      if (track.hasOwnProperty('type') && track.type === 'read') {
        track.width = 4;
      }
    }
    if (track.width !== 4) {
      allAreFour = false;
    }
  });

  if (allAreFour) {
    tracks.forEach(track => {
      if (track.hasOwnProperty('freq')) {
        track.width = 15;
      }
    });
  }
}

export function useColorScheme(x) {
  config.colorScheme = x;
  svg = d3.select(svgID);
  const tr = createTubeMap();
  if (!config.hideLegendFlag) drawLegend(tr);
}

function assignColorSets() {
  haplotypeColors = getColorSet(config.haplotypeColors);
  forwardReadColors = getColorSet(config.forwardReadColors);
  reverseReadColors = getColorSet(config.reverseReadColors);
  exonColors = getColorSet(config.exonColors);
}

function getColorSet(colorSetName) {
  switch (colorSetName) {
    case 'plainColors':
      return plainColors;
    case 'reds':
      return reds;
    case 'blues':
      return blues;
    case 'greys':
      return greys;
    case 'lightColors':
      return lightColors;
    default:
      return greys;
  }
}

function generateTrackColor(track, highlight) {
  if (typeof highlight === 'undefined') highlight = 'plain';
  let trackColor;
  if (track.hasOwnProperty('type') && track.type === 'read') {
    if (config.colorReadsByMappingQuality) {
      trackColor = d3.interpolateRdYlGn(
        Math.min(60, track.mapping_quality) / 60
      );
    } else {
      if (track.hasOwnProperty('is_reverse') && track.is_reverse === true) {
        trackColor = reverseReadColors[track.id % reverseReadColors.length];
      } else {
        trackColor = forwardReadColors[track.id % forwardReadColors.length];
      }
    }
  } else {
    if (config.showExonsFlag === false || highlight !== 'plain') {
      trackColor = haplotypeColors[track.id % haplotypeColors.length];
    } else {
      trackColor = exonColors[track.id % exonColors.length];
    }
  }
  return trackColor;
}

function getReadXStart(read) {
  const node = nodes[read.path[0].node];
  if (read.path[0].isForward) {
    // read starts in forward direction
    return getXCoordinateOfBaseWithinNode(node, read.firstNodeOffset);
  }
  // read starts in backward direction
  return getXCoordinateOfBaseWithinNode(
    node,
    node.sequenceLength - read.firstNodeOffset
  );
}

function getReadXEnd(read) {
  const node = nodes[read.path[read.path.length - 1].node];
  if (read.path[read.path.length - 1].isForward) {
    // read ends in forward direction
    return getXCoordinateOfBaseWithinNode(node, read.finalNodeCoverLength);
  }
  // read ends in backward direction
  return getXCoordinateOfBaseWithinNode(
    node,
    node.sequenceLength - read.finalNodeCoverLength
  );
}

// returns the x coordinate (in pixels) of (the left side) of the given base
// position within the given node
function getXCoordinateOfBaseWithinNode(node, base) {
  if (base > node.sequenceLength) return null; // equality is allowed
  const nodeLeftX = node.x - 4;
  const nodeRightX = node.x + node.pixelWidth + 4;
  return nodeLeftX + (base / node.sequenceLength) * (nodeRightX - nodeLeftX);
}

// transforms the info in the tracks' path attribute into actual coordinates
// and saves them in trackRectangles and trackCurves
function generateSVGShapesFromPath() {
  let xStart;
  let xEnd;
  let yStart;
  let yEnd;
  let trackColor;
  let highlight;
  let dummy;
  let reversalFlag;

  for (let i = 0; i <= maxOrder; i += 1) {
    extraLeft.push(0);
    extraRight.push(0);
  }

  // generate x coords where each order starts and ends
  const orderStartX = [];
  const orderEndX = [];
  nodes.forEach(node => {
    if (node.hasOwnProperty('order')) {
      orderStartX[node.order] = node.x;
      if (orderEndX[node.order] === undefined) {
        orderEndX[node.order] = node.x + node.pixelWidth;
      } else {
        orderEndX[node.order] = Math.max(
          orderEndX[node.order],
          node.x + node.pixelWidth
        );
      }
    }
  });

  tracks.forEach(track => {
    highlight = 'plain';
    trackColor = generateTrackColor(track, highlight);

    // start of path
    yStart = track.path[0].y;
    if (track.type !== 'read') {
      if (track.sequence[0].charAt(0) === '-') {
        // The track starts with an inversed node
        xStart = orderEndX[track.path[0].order] + 20;
      } else {
        // The track starts with a forward node
        xStart = orderStartX[track.path[0].order] - 20;
      }
    } else {
      xStart = getReadXStart(track);
    }

    // middle of path
    for (let i = 0; i < track.path.length; i += 1) {
      if (track.path[i].y === yStart) {
        if (track.path[i].hasOwnProperty('features')) {
          reversalFlag =
            i > 0 && track.path[i - 1].order === track.path[i].order;
          dummy = createFeatureRectangle(
            track.path[i],
            orderStartX[track.path[i].order],
            orderEndX[track.path[i].order],
            highlight,
            track,
            xStart,
            yStart,
            trackColor,
            reversalFlag
          );
          highlight = dummy.highlight;
          xStart = dummy.xStart;
        }
      } else {
        if (track.path[i - 1].isForward) {
          xEnd = orderEndX[track.path[i - 1].order];
        } else {
          xEnd = orderStartX[track.path[i - 1].order];
        }
        if (xEnd !== xStart) {
          trackColor = generateTrackColor(track, highlight);
          trackRectangles.push({
            xStart: Math.min(xStart, xEnd),
            yStart,
            xEnd: Math.max(xStart, xEnd),
            yEnd: yStart + track.width - 1,
            color: trackColor,
            id: track.id,
            type: track.type
          });
        }

        if (track.path[i].order - 1 === track.path[i - 1].order) {
          // regular forward connection
          xStart = xEnd;
          xEnd = orderStartX[track.path[i].order];
          yEnd = track.path[i].y;
          trackColor = generateTrackColor(track, highlight);
          trackCurves.push({
            xStart,
            yStart,
            xEnd: xEnd + 1,
            yEnd,
            width: track.width,
            color: trackColor,
            laneChange: Math.abs(track.path[i].lane - track.path[i - 1].lane),
            id: track.id,
            type: track.type
          });
          xStart = xEnd;
          yStart = yEnd;
        } else if (track.path[i].order + 1 === track.path[i - 1].order) {
          // regular backward connection
          xStart = xEnd;
          xEnd = orderEndX[track.path[i].order];
          yEnd = track.path[i].y;
          trackColor = generateTrackColor(track, highlight);
          trackCurves.push({
            xStart: xStart + 1,
            yStart,
            xEnd,
            yEnd,
            width: track.width,
            color: trackColor,
            laneChange: Math.abs(track.path[i].lane - track.path[i - 1].lane),
            id: track.id,
            type: track.type
          });
          xStart = xEnd;
          yStart = yEnd;
        } else {
          // change of direction
          if (track.path[i - 1].isForward) {
            yEnd = track.path[i].y;
            generateForwardToReverse(
              xEnd,
              yStart,
              yEnd,
              track.width,
              trackColor,
              track.id,
              track.path[i].order,
              track.type
            );
            xStart = orderEndX[track.path[i].order];
            yStart = track.path[i].y;
          } else {
            yEnd = track.path[i].y;
            generateReverseToForward(
              xEnd,
              yStart,
              yEnd,
              track.width,
              trackColor,
              track.id,
              track.path[i].order,
              track.type
            );
            xStart = orderStartX[track.path[i].order];
            yStart = track.path[i].y;
          }
        }

        if (track.path[i].hasOwnProperty('features')) {
          reversalFlag = track.path[i - 1].order === track.path[i].order;
          dummy = createFeatureRectangle(
            track.path[i],
            orderStartX[track.path[i].order],
            orderEndX[track.path[i].order],
            highlight,
            track,
            xStart,
            yStart,
            trackColor,
            reversalFlag
          );
          highlight = dummy.highlight;
          xStart = dummy.xStart;
        }
      }
    }

    // ending edges
    if (track.type !== 'read') {
      if (!track.path[track.path.length - 1].isForward) {
        // The track ends with an inversed node
        xEnd = orderStartX[track.path[track.path.length - 1].order] - 20;
      } else {
        // The track ends with a forward node
        xEnd = orderEndX[track.path[track.path.length - 1].order] + 20;
      }
    } else {
      xEnd = getReadXEnd(track);
    }
    trackRectangles.push({
      xStart: Math.min(xStart, xEnd),
      yStart,
      xEnd: Math.max(xStart, xEnd),
      yEnd: yStart + track.width - 1,
      color: trackColor,
      id: track.id,
      type: track.type
    });
  });
}

function createFeatureRectangle(
  node,
  nodeXStart,
  nodeXEnd,
  highlight,
  track,
  rectXStart,
  yStart,
  trackColor,
  reversalFlag
) {
  let nodeWidth;
  let currentHighlight = highlight;
  let c;
  let co;
  let featureXStart;
  let featureXEnd;

  nodeXStart -= 8;
  nodeXEnd += 8;
  if (nodes[node.node].hasOwnProperty('sequenceLength')) {
    nodeWidth = nodes[node.node].sequenceLength;
  } else {
    nodeWidth = nodes[node.node].width;
  }

  node.features.sort((a, b) => a.start - b.start);
  node.features.forEach(feature => {
    if (currentHighlight !== feature.type) {
      // finish incoming rectangle
      c = generateTrackColor(track, currentHighlight);
      if (node.isForward === true) {
        featureXStart =
          nodeXStart +
          Math.round((feature.start * (nodeXEnd - nodeXStart + 1)) / nodeWidth);

        // overwrite narrow post-inversion rectangle if highlight starts near beginning of node
        if (reversalFlag && featureXStart < nodeXStart + 8) {
          featureXEnd =
            nodeXStart +
            Math.round(
              ((feature.end + 1) * (nodeXEnd - nodeXStart + 1)) / nodeWidth
            ) -
            1;
          co = generateTrackColor(track, feature.type);
          trackRectanglesStep3.push({
            xStart: featureXStart,
            yStart,
            xEnd: featureXEnd,
            yEnd: yStart + track.width - 1,
            color: co,
            id: track.id,
            type: track.type
          });
        }

        if (featureXStart > rectXStart + 1) {
          trackRectanglesStep3.push({
            xStart: rectXStart,
            yStart,
            xEnd: featureXStart - 1,
            yEnd: yStart + track.width - 1,
            color: c,
            id: track.id,
            type: track.type
          });
        }
      } else {
        featureXStart =
          nodeXEnd -
          Math.round((feature.start * (nodeXEnd - nodeXStart + 1)) / nodeWidth);

        // overwrite narrow post-inversion rectangle if highlight starts near beginning of node
        if (reversalFlag && featureXStart > nodeXEnd - 8) {
          featureXEnd =
            nodeXEnd -
            Math.round(
              ((feature.end + 1) * (nodeXEnd - nodeXStart + 1)) / nodeWidth
            ) -
            1;
          co = generateTrackColor(track, feature.type);
          trackRectanglesStep3.push({
            xStart: featureXEnd,
            yStart,
            xEnd: featureXStart,
            yEnd: yStart + track.width - 1,
            color: co,
            id: track.id,
            type: track.type
          });
        }

        if (rectXStart > featureXStart + 1) {
          trackRectanglesStep3.push({
            xStart: featureXStart + 1,
            yStart,
            xEnd: rectXStart,
            yEnd: yStart + track.width - 1,
            color: c,
            id: track.id,
            type: track.type
          });
        }
      }
      rectXStart = featureXStart;
      currentHighlight = feature.type;
    }
    if (feature.end < nodeWidth - 1 || !feature.hasOwnProperty('continue')) {
      // finish internal rectangle
      c = generateTrackColor(track, currentHighlight);
      if (node.isForward === true) {
        featureXEnd =
          nodeXStart +
          Math.round(
            ((feature.end + 1) * (nodeXEnd - nodeXStart + 1)) / nodeWidth
          ) -
          1;
        trackRectanglesStep3.push({
          xStart: rectXStart,
          yStart,
          xEnd: featureXEnd,
          yEnd: yStart + track.width - 1,
          color: c,
          id: track.id,
          type: track.type
        });
      } else {
        featureXEnd =
          nodeXEnd -
          Math.round(
            ((feature.end + 1) * (nodeXEnd - nodeXStart + 1)) / nodeWidth
          ) -
          1;
        trackRectanglesStep3.push({
          xStart: featureXEnd,
          yStart,
          xEnd: rectXStart,
          yEnd: yStart + track.width - 1,
          color: c,
          id: track.id,
          type: track.type
        });
      }
      rectXStart = featureXEnd + 1;
      currentHighlight = 'plain';
    }
  });
  return { xStart: rectXStart, highlight: currentHighlight };
}

function generateForwardToReverse(
  x,
  yStart,
  yEnd,
  trackWidth,
  trackColor,
  trackID,
  order,
  type
) {
  x += 10 * extraRight[order];
  const yTop = Math.min(yStart, yEnd);
  const yBottom = Math.max(yStart, yEnd);
  const radius = 7;

  trackVerticalRectangles.push({
    // elongate incoming rectangle a bit to the right
    xStart: x - 10 * extraRight[order],
    yStart,
    xEnd: x + 5,
    yEnd: yStart + trackWidth - 1,
    color: trackColor,
    id: trackID,
    type
  });
  trackVerticalRectangles.push({
    // vertical rectangle
    xStart: x + 5 + radius,
    yStart: yTop + trackWidth + radius - 1,
    xEnd: x + 5 + radius + Math.min(7, trackWidth) - 1,
    yEnd: yBottom - radius + 1,
    color: trackColor,
    id: trackID,
    type
  });
  trackVerticalRectangles.push({
    xStart: x - 10 * extraRight[order],
    yStart: yEnd,
    xEnd: x + 5,
    yEnd: yEnd + trackWidth - 1,
    color: trackColor,
    id: trackID,
    type
  }); // elongate outgoing rectangle a bit to the right

  let d = `M ${x + 5} ${yBottom}`;
  d += ` Q ${x + 5 + radius} ${yBottom} ${x + 5 + radius} ${yBottom - radius}`;
  d += ` H ${x + 5 + radius + Math.min(7, trackWidth)}`;
  d += ` Q ${x + 5 + radius + Math.min(7, trackWidth)} ${yBottom +
    trackWidth} ${x + 5} ${yBottom + trackWidth}`;
  d += ' Z ';
  trackCorners.push({ path: d, color: trackColor, id: trackID, type });

  d = `M ${x + 5} ${yTop}`;
  d += ` Q ${x + 5 + radius + Math.min(7, trackWidth)} ${yTop} ${x +
    5 +
    radius +
    Math.min(7, trackWidth)} ${yTop + trackWidth + radius}`;
  d += ` H ${x + 5 + radius}`;
  d += ` Q ${x + 5 + radius} ${yTop + trackWidth} ${x + 5} ${yTop +
    trackWidth}`;
  d += ' Z ';
  trackCorners.push({ path: d, color: trackColor, id: trackID, type });
  extraRight[order] += 1;
}

function generateReverseToForward(
  x,
  yStart,
  yEnd,
  trackWidth,
  trackColor,
  trackID,
  order,
  type
) {
  const yTop = Math.min(yStart, yEnd);
  const yBottom = Math.max(yStart, yEnd);
  const radius = 7;
  x -= 10 * extraLeft[order];

  trackVerticalRectangles.push({
    xStart: x - 6,
    yStart,
    xEnd: x + 10 * extraLeft[order],
    yEnd: yStart + trackWidth - 1,
    color: trackColor,
    id: trackID,
    type
  }); // elongate incoming rectangle a bit to the left
  trackVerticalRectangles.push({
    xStart: x - 5 - radius - Math.min(7, trackWidth),
    yStart: yTop + trackWidth + radius - 1,
    xEnd: x - 5 - radius - 1,
    yEnd: yBottom - radius + 1,
    color: trackColor,
    id: trackID,
    type
  }); // vertical rectangle
  trackVerticalRectangles.push({
    xStart: x - 6,
    yStart: yEnd,
    xEnd: x + 10 * extraLeft[order],
    yEnd: yEnd + trackWidth - 1,
    color: trackColor,
    id: trackID,
    type
  }); // elongate outgoing rectangle a bit to the left

  // Path for bottom 90 degree bend
  let d = `M ${x - 5} ${yBottom}`;
  d += ` Q ${x - 5 - radius} ${yBottom} ${x - 5 - radius} ${yBottom - radius}`;
  d += ` H ${x - 5 - radius - Math.min(7, trackWidth)}`;
  d += ` Q ${x - 5 - radius - Math.min(7, trackWidth)} ${yBottom +
    trackWidth} ${x - 5} ${yBottom + trackWidth}`;
  d += ' Z ';
  trackCorners.push({ path: d, color: trackColor, id: trackID, type });

  // Path for top 90 degree bend
  d = `M ${x - 5} ${yTop}`;
  d += ` Q ${x - 5 - radius - Math.min(7, trackWidth)} ${yTop} ${x -
    5 -
    radius -
    Math.min(7, trackWidth)} ${yTop + trackWidth + radius}`;
  d += ` H ${x - 5 - radius}`;
  d += ` Q ${x - 5 - radius} ${yTop + trackWidth} ${x - 5} ${yTop +
    trackWidth}`;
  d += ' Z ';
  trackCorners.push({ path: d, color: trackColor, id: trackID, type });
  extraLeft[order] += 1;
}

// to avoid problems with wrong overlapping of tracks, draw them in order of their color
function drawReversalsByColor(corners, rectangles, type) {
  if (typeof type === 'undefined') type = 'haplo';
  const co = new Set();
  rectangles.forEach(rect => {
    co.add(rect.color);
  });
  co.forEach(c => {
    drawTrackRectangles(
      rectangles.filter(filterObjectByAttribute('color', c)),
      type
    );
    drawTrackCorners(corners.filter(filterObjectByAttribute('color', c)), type);
  });
}

// draws nodes by building svg-path for border and filling it with transparent white
function drawNodes(dNodes) {
  let x;
  let y;

  dNodes.forEach(node => {
    // top left arc
    node.d = `M ${node.x - 9} ${node.y} Q ${node.x - 9} ${node.y - 9} ${
      node.x
    } ${node.y - 9}`;
    x = node.x;
    y = node.y - 9;

    // top straight
    if (node.width > 1) {
      x += node.pixelWidth;
      node.d += ` L ${x} ${y}`;
    }

    // top right arc
    node.d += ` Q ${x + 9} ${y} ${x + 9} ${y + 9}`;
    x += 9;
    y += 9;

    // right straight
    if (node.contentHeight > 0) {
      y += node.contentHeight - 0;
      node.d += ` L ${x} ${y}`;
    }

    // bottom right arc
    node.d += ` Q ${x} ${y + 9} ${x - 9} ${y + 9}`;
    x -= 9;
    y += 9;

    // bottom straight
    if (node.width > 1) {
      x -= node.pixelWidth;
      node.d += ` L ${x} ${y}`;
    }

    // bottom left arc
    node.d += ` Q ${x - 9} ${y} ${x - 9} ${y - 9}`;
    x -= 9;
    y -= 9;

    // left straight
    if (node.contentHeight > 0) {
      y -= node.contentHeight - 0;
      node.d += ` L ${x} ${y}`;
    }
  });

  svg
    .selectAll('.node')
    .data(dNodes)
    .enter()
    .append('path')
    .attr('id', d => d.name)
    .attr('d', d => d.d)
    .on('mouseover', nodeMouseOver)
    .on('mouseout', nodeMouseOut)
    .on('dblclick', nodeDoubleClick)
    .style('fill', config.transparentNodesFlag ? 'none' : '#fff')
    .style('fill-opacity', config.showExonsFlag ? '0.4' : '0.6')
    .style('stroke', 'black')
    .style('stroke-width', '2px')
    .append('svg:title')
    .text(d => getPopUpText(d));
}

function getPopUpText(node) {
  return (
    `Node ID: ${node.name}\n` +
    `Node Length: ${node.sequenceLength} bases\n` +
    `Haplotypes: ${node.degree}\n` +
    `Aligned Reads: ${node.incomingReads.length +
      node.internalReads.length +
      node.outgoingReads.length}`
  );
}

// draw seqence labels for nodes
function drawLabels(dNodes) {
  if (config.nodeWidthOption === 0) {
    svg
      .selectAll('text')
      .data(dNodes)
      .enter()
      .append('text')
      .attr('x', d => d.x - 4)
      .attr('y', d => d.y + 4)
      .text(d => d.seq)
      .attr('font-family', 'Courier, "Lucida Console", monospace')
      .attr('font-size', '14px')
      .attr('fill', 'black')
      .style('pointer-events', 'none');
  }
}

function drawRuler() {
  let rulerTrackIndex = 0;
  while (tracks[rulerTrackIndex].name !== trackForRuler) rulerTrackIndex += 1;
  const rulerTrack = tracks[rulerTrackIndex];

  // draw horizontal line
  svg
    .append('line')
    .attr('x1', 0)
    .attr('y1', minYCoordinate - 10)
    .attr('x2', maxXCoordinate)
    .attr('y2', minYCoordinate - 10)
    .attr('stroke-width', 1)
    .attr('stroke', 'black');

  let markingInterval = 100;
  if (config.nodeWidthOption === 0) markingInterval = 20;

  let indexOfFirstBaseInNode = rulerTrack.indexOfFirstBase;
  let atLeastOneMarkingDrawn = false;
  let xCoordOfPreviousMarking = -100;

  // draw ruler marking at the left end of chart for compressed charts
  // (this marking is on purpose not at a 0 % 100 position)
  if (config.nodeWidthOption !== 0) {
    const firstNode = nodes[rulerTrack.indexSequence[0]];
    xCoordOfPreviousMarking = getXCoordinateOfBaseWithinNode(firstNode, 0);
    drawRulerMarking(indexOfFirstBaseInNode, xCoordOfPreviousMarking);
    atLeastOneMarkingDrawn = true;
  }

  rulerTrack.indexSequence.forEach(nodeIndex => {
    const currentNode = nodes[nodeIndex];
    let nextMarking =
      Math.ceil(indexOfFirstBaseInNode / markingInterval) * markingInterval;
    while (nextMarking < indexOfFirstBaseInNode + currentNode.sequenceLength) {
      const xCoordOfMarking = getXCoordinateOfBaseWithinNode(
        currentNode,
        nextMarking - indexOfFirstBaseInNode
      );
      if (xCoordOfPreviousMarking + 80 <= xCoordOfMarking) {
        drawRulerMarking(nextMarking, xCoordOfMarking);
        atLeastOneMarkingDrawn = true;
        xCoordOfPreviousMarking = xCoordOfMarking;
      }
      nextMarking += markingInterval;
    }
    indexOfFirstBaseInNode += nodes[nodeIndex].sequenceLength;
  });

  // if no markings drawn, draw one at the very beginning
  if (!atLeastOneMarkingDrawn) {
    drawRulerMarking(
      rulerTrack.indexOfFirstBase,
      nodes[rulerTrack.indexSequence[0]].x - 4
    );
  }
}

function drawRulerMarking(sequencePosition, xCoordinate) {
  svg
    .append('text')
    .attr('x', xCoordinate)
    .attr('y', minYCoordinate - 13)
    .text(`|${sequencePosition}`)
    .attr('font-family', 'Courier, "Lucida Console", monospace')
    .attr('font-size', '12px')
    .attr('fill', 'black')
    .style('pointer-events', 'none');
}

function filterObjectByAttribute(attribute, value) {
  return item => item[attribute] === value;
}

function drawTrackRectangles(rectangles, type) {
  if (typeof type === 'undefined') type = 'haplo';
  rectangles = rectangles.filter(filterObjectByAttribute('type', type));

  svg
    .selectAll('trackRectangles')
    .data(rectangles)
    .enter()
    .append('rect')
    .attr('x', d => d.xStart)
    .attr('y', d => d.yStart)
    .attr('width', d => d.xEnd - d.xStart + 1)
    .attr('height', d => d.yEnd - d.yStart + 1)
    .style('fill', d => d.color)
    .attr('trackID', d => d.id)
    .attr('class', d => `track${d.id}`)
    .attr('color', d => d.color)
    .on('mouseover', trackMouseOver)
    .on('mouseout', trackMouseOut)
    .on('dblclick', trackDoubleClick);
}

function compareCurvesByLineChanges(a, b) {
  if (a[6] < b[6]) return -1;
  else if (a[6] > b[6]) return 1;
  return 0;
}

function defineSVGPatterns() {
  const defs = svg.append('defs');
  let pattern = defs.append('pattern').attrs({
    id: 'patternA',
    width: '7',
    height: '7',
    patternUnits: 'userSpaceOnUse',
    patternTransform: 'rotate(45)'
  });

  pattern
    .append('rect')
    .attrs({ x: '0', y: '0', width: '7', height: '7', fill: '#FFFFFF' });
  pattern
    .append('rect')
    .attrs({ x: '0', y: '0', width: '3', height: '3', fill: '#505050' });
  pattern
    .append('rect')
    .attrs({ x: '0', y: '4', width: '3', height: '3', fill: '#505050' });
  pattern
    .append('rect')
    .attrs({ x: '4', y: '0', width: '3', height: '3', fill: '#505050' });
  pattern
    .append('rect')
    .attrs({ x: '4', y: '4', width: '3', height: '3', fill: '#505050' });

  pattern = defs.append('pattern').attrs({
    id: 'patternB',
    width: '8',
    height: '8',
    patternUnits: 'userSpaceOnUse',
    patternTransform: 'rotate(45)'
  });
  pattern
    .append('rect')
    .attrs({ x: '0', y: '0', width: '8', height: '8', fill: '#FFFFFF' });
  pattern
    .append('rect')
    .attrs({ x: '0', y: '0', width: '3', height: '3', fill: '#1f77b4' });
  pattern
    .append('rect')
    .attrs({ x: '0', y: '5', width: '3', height: '3', fill: '#1f77b4' });
  pattern
    .append('rect')
    .attrs({ x: '5', y: '0', width: '3', height: '3', fill: '#1f77b4' });
  pattern
    .append('rect')
    .attrs({ x: '5', y: '5', width: '3', height: '3', fill: '#1f77b4' });

  pattern = defs.append('pattern').attrs({
    id: 'plaid0',
    width: '6',
    height: '6',
    patternUnits: 'userSpaceOnUse',
    patternTransform: 'rotate(45)'
  });
  pattern
    .append('rect')
    .attrs({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
  pattern
    .append('rect')
    .attrs({ x: '0', y: '0', width: '2', height: '2', fill: '#1f77b4' });
  pattern
    .append('rect')
    .attrs({ x: '0', y: '4', width: '2', height: '2', fill: '#1f77b4' });
  pattern
    .append('rect')
    .attrs({ x: '4', y: '0', width: '2', height: '2', fill: '#1f77b4' });
  pattern
    .append('rect')
    .attrs({ x: '4', y: '4', width: '2', height: '2', fill: '#1f77b4' });

  pattern = defs.append('pattern').attrs({
    id: 'plaid1',
    width: '6',
    height: '6',
    patternUnits: 'userSpaceOnUse',
    patternTransform: 'rotate(45)'
  });
  pattern
    .append('rect')
    .attrs({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
  pattern
    .append('rect')
    .attrs({ x: '0', y: '0', width: '2', height: '2', fill: '#ff7f0e' });
  pattern
    .append('rect')
    .attrs({ x: '0', y: '4', width: '2', height: '2', fill: '#ff7f0e' });
  pattern
    .append('rect')
    .attrs({ x: '4', y: '0', width: '2', height: '2', fill: '#ff7f0e' });
  pattern
    .append('rect')
    .attrs({ x: '4', y: '4', width: '2', height: '2', fill: '#ff7f0e' });

  pattern = defs.append('pattern').attrs({
    id: 'plaid2',
    width: '6',
    height: '6',
    patternUnits: 'userSpaceOnUse',
    patternTransform: 'rotate(45)'
  });
  pattern
    .append('rect')
    .attrs({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
  pattern
    .append('rect')
    .attrs({ x: '0', y: '0', width: '2', height: '2', fill: '#2ca02c' });
  pattern
    .append('rect')
    .attrs({ x: '0', y: '4', width: '2', height: '2', fill: '#2ca02c' });
  pattern
    .append('rect')
    .attrs({ x: '4', y: '0', width: '2', height: '2', fill: '#2ca02c' });
  pattern
    .append('rect')
    .attrs({ x: '4', y: '4', width: '2', height: '2', fill: '#2ca02c' });

  pattern = defs.append('pattern').attrs({
    id: 'plaid3',
    width: '6',
    height: '6',
    patternUnits: 'userSpaceOnUse',
    patternTransform: 'rotate(45)'
  });
  pattern
    .append('rect')
    .attrs({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
  pattern
    .append('rect')
    .attrs({ x: '0', y: '0', width: '2', height: '2', fill: '#d62728' });
  pattern
    .append('rect')
    .attrs({ x: '0', y: '4', width: '2', height: '2', fill: '#d62728' });
  pattern
    .append('rect')
    .attrs({ x: '4', y: '0', width: '2', height: '2', fill: '#d62728' });
  pattern
    .append('rect')
    .attrs({ x: '4', y: '4', width: '2', height: '2', fill: '#d62728' });

  pattern = defs.append('pattern').attrs({
    id: 'plaid4',
    width: '6',
    height: '6',
    patternUnits: 'userSpaceOnUse',
    patternTransform: 'rotate(45)'
  });
  pattern
    .append('rect')
    .attrs({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
  pattern
    .append('rect')
    .attrs({ x: '0', y: '0', width: '2', height: '2', fill: '#9467bd' });
  pattern
    .append('rect')
    .attrs({ x: '0', y: '4', width: '2', height: '2', fill: '#9467bd' });
  pattern
    .append('rect')
    .attrs({ x: '4', y: '0', width: '2', height: '2', fill: '#9467bd' });
  pattern
    .append('rect')
    .attrs({ x: '4', y: '4', width: '2', height: '2', fill: '#9467bd' });

  pattern = defs.append('pattern').attrs({
    id: 'plaid5',
    width: '6',
    height: '6',
    patternUnits: 'userSpaceOnUse',
    patternTransform: 'rotate(45)'
  });
  pattern
    .append('rect')
    .attrs({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
  pattern
    .append('rect')
    .attrs({ x: '0', y: '0', width: '2', height: '2', fill: '#8c564b' });
  pattern
    .append('rect')
    .attrs({ x: '0', y: '4', width: '2', height: '2', fill: '#8c564b' });
  pattern
    .append('rect')
    .attrs({ x: '4', y: '0', width: '2', height: '2', fill: '#8c564b' });
  pattern
    .append('rect')
    .attrs({ x: '4', y: '4', width: '2', height: '2', fill: '#8c564b' });
}

function drawTrackCurves(type) {
  if (typeof type === 'undefined') type = 'haplo';
  const myTrackCurves = trackCurves.filter(
    filterObjectByAttribute('type', type)
  );

  myTrackCurves.sort(compareCurvesByLineChanges);

  myTrackCurves.forEach(curve => {
    const xMiddle = (curve.xStart + curve.xEnd) / 2;
    let d = `M ${curve.xStart} ${curve.yStart}`;
    d += ` C ${xMiddle} ${curve.yStart} ${xMiddle} ${curve.yEnd} ${
      curve.xEnd
    } ${curve.yEnd}`;
    d += ` V ${curve.yEnd + curve.width}`;
    d += ` C ${xMiddle} ${curve.yEnd + curve.width} ${xMiddle} ${curve.yStart +
      curve.width} ${curve.xStart} ${curve.yStart + curve.width}`;
    d += ' Z';
    curve.path = d;
  });

  svg
    .selectAll('trackCurves')
    .data(trackCurves)
    .enter()
    .append('path')
    .attr('d', d => d.path)
    .style('fill', d => d.color)
    .attr('trackID', d => d.id)
    .attr('class', d => `track${d.id}`)
    .attr('color', d => d.color)
    .on('mouseover', trackMouseOver)
    .on('mouseout', trackMouseOut)
    .on('dblclick', trackDoubleClick);
}

function drawTrackCorners(corners, type) {
  if (typeof type === 'undefined') type = 'haplo';
  corners = corners.filter(filterObjectByAttribute('type', type));

  svg
    .selectAll('trackCorners')
    .data(corners)
    .enter()
    .append('path')
    .attr('d', d => d.path)
    .style('fill', d => d.color)
    .attr('trackID', d => d.id)
    .attr('class', d => `track${d.id}`)
    .attr('color', d => d.color)
    .on('mouseover', trackMouseOver)
    .on('mouseout', trackMouseOut)
    .on('dblclick', trackDoubleClick);
}

function drawLegend() {
  let content =
    '<table class="table-sm table-condensed table-nonfluid"><thead><tr><th>Color</th><th>Trackname</th><th>Show Track</th></tr></thead>';
  const listeners = [];
  for (let i = 0; i < tracks.length; i += 1) {
    if (tracks[i].type === 'haplo') {
      content += `<tr><td style="text-align:right"><div class="color-box" style="background-color: ${generateTrackColor(
        tracks[i],
        'exon'
      )};"></div></td>`;
      if (tracks[i].hasOwnProperty('name')) {
        content += `<td>${tracks[i].name}</td>`;
      } else {
        content += `<td>${tracks[i].id}</td>`;
      }
      content += `<td><input type="checkbox" checked=true id="showTrack${i}"></td>`;
      listeners.push(i);
    }
  }
  content += '</table';
  // $('#legendDiv').html(content);
  document.getElementById('legendDiv').innerHTML = content;
  listeners.forEach(i => {
    document
      .getElementById(`showTrack${i}`)
      .addEventListener('click', () => changeTrackVisibility(i), false);
  });
}

// Highlight track on mouseover
function trackMouseOver() {
  /* jshint validthis: true */
  const trackID = d3.select(this).attr('trackID');
  d3.selectAll(`.track${trackID}`).style('fill', 'url(#patternA)');
}

// Highlight node on mouseover
function nodeMouseOver() {
  /* jshint validthis: true */
  d3.select(this).style('stroke-width', '4px');
}

// Restore original track appearance on mouseout
function trackMouseOut() {
  /* jshint validthis: true */
  const trackID = d3.select(this).attr('trackID');
  d3.selectAll(`.track${trackID}`).each(function clearTrackHighlight() {
    const c = d3.select(this).attr('color');
    d3.select(this).style('fill', c);
  });
}

// Restore original node appearance on mouseout
function nodeMouseOut() {
  /* jshint validthis: true */
  d3.select(this).style('stroke-width', '2px');
}

// Move clicked track to first position
function trackDoubleClick() {
  /* jshint validthis: true */
  const trackID = d3.select(this).attr('trackID');
  let index = 0;
  while (
    index < inputTracks.length &&
    inputTracks[index].id !== Number(trackID)
  ) {
    index += 1;
  }
  if (index >= inputTracks.length) return;
  if (DEBUG) console.log(`moving index: ${index}`);
  moveTrackToFirstPosition(index);
  createTubeMap();
}

// Redraw with current node moved to beginning
function nodeDoubleClick() {
  /* jshint validthis: true */
  const nodeID = d3.select(this).attr('id');
  if (config.clickableNodesFlag) {
    if (reads && config.showReads) {
      document.getElementById('hgvmNodeID').value = nodeID;
      document.getElementById('hgvmPostButton').click();
    } else {
      document.getElementById('nodeID').value = nodeID;
      document.getElementById('postButton').click();
    }
  }
}

// extract info about nodes from vg-json
export function vgExtractNodes(vg) {
  const result = [];
  vg.node.forEach(node => {
    result.push({
      name: `${node.id}`,
      sequenceLength: node.sequence.length,
      seq: node.sequence
    });
  });
  return result;
}

// calculate node widths depending on sequence lengths and chosen calculation method
function generateNodeWidth() {
  nodes.forEach(node => {
    if (!node.hasOwnProperty('sequenceLength')) {
      node.sequenceLength = node.seq.length;
    }
  });

  switch (config.nodeWidthOption) {
    case 1:
      nodes.forEach(node => {
        node.width = 1 + Math.log(node.sequenceLength) / Math.log(2);
        node.pixelWidth = Math.round((node.width - 1) * 8.401);
      });
      break;
    case 2:
      nodes.forEach(node => {
        node.width = node.sequenceLength / 100;
        node.pixelWidth = Math.round((node.width - 1) * 8.401);
      });
      break;
    default:
      nodes.forEach(node => {
        node.width = node.sequenceLength;

        // get width of node's text label by writing label, measuring it and removing label
        svg
          .append('text')
          .attr('x', 0)
          .attr('y', 100)
          .attr('id', 'dummytext')
          .text(node.seq.substr(1))
          .attr('font-family', 'Courier, "Lucida Console", monospace')
          .attr('font-size', '14px')
          .attr('fill', 'black')
          .style('pointer-events', 'none');
        node.pixelWidth = Math.round(
          document.getElementById('dummytext').getComputedTextLength()
        );
        document.getElementById('dummytext').remove();
        // $('#dummytext').remove();
      });
  }
}

// extract track info from vg-json
export function vgExtractTracks(vg) {
  const result = [];
  vg.path.forEach((path, index) => {
    const sequence = [];
    let isCompletelyReverse = true;
    path.mapping.forEach(pos => {
      if (
        pos.position.hasOwnProperty('is_reverse') &&
        pos.position.is_reverse === true
      ) {
        sequence.push(`-${pos.position.node_id}`);
      } else {
        sequence.push(`${pos.position.node_id}`);
        isCompletelyReverse = false;
      }
    });
    if (isCompletelyReverse) {
      sequence.reverse();
      sequence.forEach((node, index2) => {
        sequence[index2] = node.substr(1);
      });
    }
    const track = {};
    track.id = index;
    track.sequence = sequence;
    if (path.hasOwnProperty('freq')) track.freq = path.freq;
    if (path.hasOwnProperty('name')) track.name = path.name;
    if (path.hasOwnProperty('indexOfFirstBase')) {
      track.indexOfFirstBase = Number(path.indexOfFirstBase);
    }
    result.push(track);
  });
  return result;
}

function compareReadsByLeftEnd(a, b) {
  let leftNodeA;
  let leftNodeB;
  let leftIndexA;
  let leftIndexB;

  if (a.sequence[0].charAt(0) === '-') {
    if (a.sequence[a.sequence.length - 1].charAt(0) === '-') {
      leftNodeA = a.sequence[a.sequence.length - 1].substr(1);
      leftIndexA =
        nodes[nodeMap.get(leftNodeA)].sequenceLength - a.finalNodeCoverLength;
    } else {
      leftNodeA = a.sequence[a.sequence.length - 1];
      leftIndexA = 0;
    }
  } else {
    leftNodeA = a.sequence[0];
    leftIndexA = a.firstNodeOffset;
  }

  if (b.sequence[0].charAt(0) === '-') {
    if (b.sequence[b.sequence.length - 1].charAt(0) === '-') {
      leftNodeB = b.sequence[b.sequence.length - 1].substr(1);
      leftIndexB =
        nodes[nodeMap.get(leftNodeB)].sequenceLength - b.finalNodeCoverLength;
    } else {
      leftNodeB = b.sequence[b.sequence.length - 1];
      leftIndexB = 0;
    }
  } else {
    leftNodeB = b.sequence[0];
    leftIndexB = b.firstNodeOffset;
  }

  if (leftNodeA < leftNodeB) return -1;
  else if (leftNodeA > leftNodeB) return 1;
  if (leftIndexA < leftIndexB) return -1;
  else if (leftIndexA > leftIndexB) return 1;
  return 0;
}

function compareReadsByLeftEnd2(a, b) {
  // compare by order of first node
  if (nodes[a.indexSequence[0]].order < nodes[b.indexSequence[0]].order) {
    return -1;
  } else if (
    nodes[a.indexSequence[0]].order > nodes[b.indexSequence[0]].order
  ) {
    return 1;
  }

  // compare by first base within first node
  if (a.firstNodeOffset < b.firstNodeOffset) return -1;
  else if (a.firstNodeOffset > b.firstNodeOffset) return 1;

  // compare by order of last node
  if (
    nodes[a.indexSequence[a.indexSequence.length - 1]].order <
    nodes[b.indexSequence[b.indexSequence.length - 1]].order
  ) {
    return -1;
  } else if (
    nodes[a.indexSequence[a.indexSequence.length - 1]].order >
    nodes[b.indexSequence[b.indexSequence.length - 1]].order
  ) {
    return 1;
  }

  // compare by last base withing last node
  if (a.finalNodeCoverLength < b.finalNodeCoverLength) return -1;
  else if (a.finalNodeCoverLength > b.finalNodeCoverLength) return 1;

  return 0;
}

export function vgExtractReads(myNodes, myTracks, myReads) {
  if (DEBUG) {
    console.log('Reads:');
    console.log(myReads);
  }
  const extracted = [];

  const nodeNames = [];
  myNodes.forEach(node => {
    nodeNames.push(node.name, 10);
  });

  for (let i = 0; i < myReads.length; i += 1) {
    const read = myReads[i];
    const sequence = [];
    const sequenceNew = [];
    let firstIndex = -1; // index within mapping of the first node id contained in nodeNames
    let lastIndex = -1; // index within mapping of the last node id contained in nodeNames
    read.path.mapping.forEach((pos, j) => {
      if (nodeNames.indexOf(pos.position.node_id) > -1) {
        const edit = {};
        let offset = 0;
        if (
          pos.position.hasOwnProperty('is_reverse') &&
          pos.position.is_reverse === true
        ) {
          sequence.push(`-${pos.position.node_id}`);
          edit.nodeName = `-${pos.position.node_id}`;
        } else {
          sequence.push(`${pos.position.node_id}`);
          edit.nodeName = pos.position.node_id.toString();
        }
        if (firstIndex < 0) {
          firstIndex = j;
          if (pos.position.hasOwnProperty('offset')) {
            pos.position.offset = parseInt(pos.position.offset, 10);
            offset = pos.position.offset;
          }
        }
        lastIndex = j;

        const mismatches = [];
        let posWithinNode = offset;
        pos.edit.forEach(element => {
          if (
            element.hasOwnProperty('to_length') &&
            !element.hasOwnProperty('from_length')
          ) {
            // insertion
            mismatches.push({
              type: 'insertion',
              pos: posWithinNode,
              seq: element.sequence
            });
          } else if (
            !element.hasOwnProperty('to_length') &&
            element.hasOwnProperty('from_length')
          ) {
            // deletion
            mismatches.push({
              type: 'deletion',
              pos: posWithinNode,
              length: element.from_length
            });
          } else if (element.hasOwnProperty('sequence')) {
            // substitution
            if (element.sequence.length > 1) {
              if (DEBUG) {
                console.log(
                  `found substitution at read ${i}, node ${j} = ${
                    pos.position.node_id
                  }, seq = ${element.sequence}`
                );
              }
            }
            mismatches.push({
              type: 'substitution',
              pos: posWithinNode,
              seq: element.sequence
            });
          }
          if (element.hasOwnProperty('from_length')) {
            posWithinNode += element.from_length;
          }
        });
        edit.mismatches = mismatches;
        sequenceNew.push(edit);
      }
    });
    if (sequence.length === 0) {
      if (DEBUG) {
        console.log(`read ${i} is empty`);
      }
    } else {
      const track = {};
      track.id = myTracks.length + extracted.length;
      track.sequence = sequence;
      track.sequenceNew = sequenceNew;
      track.type = 'read';
      if (read.path.hasOwnProperty('freq')) track.freq = read.path.freq;
      if (read.path.hasOwnProperty('name')) track.name = read.path.name;

      // where within node does read start
      track.firstNodeOffset = 0;
      if (read.path.mapping[firstIndex].position.hasOwnProperty('offset')) {
        track.firstNodeOffset = read.path.mapping[firstIndex].position.offset;
      }

      // where within node does read end
      const finalNodeEdit = read.path.mapping[lastIndex].edit;
      track.finalNodeCoverLength = 0;
      if (read.path.mapping[lastIndex].position.hasOwnProperty('offset')) {
        track.finalNodeCoverLength +=
          read.path.mapping[lastIndex].position.offset;
      }
      finalNodeEdit.forEach(edit => {
        if (edit.hasOwnProperty('from_length')) {
          track.finalNodeCoverLength += edit.from_length;
        }
      });

      track.mapping_quality = read.mapping_quality || 0;
      track.is_secondary = read.is_secondary || false;

      extracted.push(track);
    }
  }
  return extracted;
}

// remove redundant nodes
// two nodes A and B can be merged if all tracks leaving A go directly into B
// and all tracks entering B come directly from A
// (plus no inversions involved)
function mergeNodes() {
  let nodeName;
  let nodeName2;
  const pred = []; // array of set of predecessors of each node
  const succ = []; // array of set of successors of each node
  for (let i = 0; i < nodes.length; i += 1) {
    pred.push(new Set());
    succ.push(new Set());
  }

  let tracksAndReads;
  if (reads && config.showReads) tracksAndReads = tracks.concat(reads);
  else tracksAndReads = tracks;

  tracksAndReads.forEach(track => {
    for (let i = 0; i < track.sequence.length; i += 1) {
      if (track.sequence[i].charAt(0) !== '-') {
        // forward Node
        if (i > 0) {
          nodeName = track.sequence[i - 1];
          pred[nodeMap.get(track.sequence[i])].add(nodeName);
          if (nodeName.charAt(0) === '-') {
            // add 2 predecessors, to make sure there is no node merging in this case
            pred[nodeMap.get(track.sequence[i])].add(nodeName.substr(1));
          }
        } else if (track.type === 'haplo') {
          pred[nodeMap.get(track.sequence[i])].add('None');
        }
        if (i < track.sequence.length - 1) {
          nodeName = track.sequence[i + 1];
          succ[nodeMap.get(track.sequence[i])].add(nodeName);
          if (nodeName.charAt(0) === '-') {
            // add 2 successors, to make sure there is no node merging in this case
            succ[nodeMap.get(track.sequence[i])].add(nodeName.substr(1));
          }
        } else if (track.type === 'haplo') {
          succ[nodeMap.get(track.sequence[i])].add('None');
        }
      } else {
        // reverse Node
        nodeName = track.sequence[i].substr(1);
        if (i > 0) {
          nodeName2 = track.sequence[i - 1];
          if (nodeName2.charAt(0) === '-') {
            succ[nodeMap.get(nodeName)].add(nodeName2.substr(1));
          } else {
            // add 2 successors, to make sure there is no node merging in this case
            succ[nodeMap.get(nodeName)].add(nodeName2);
            succ[nodeMap.get(nodeName)].add(`-${nodeName2}`);
          }
        } else if (track.type === 'haplo') {
          succ[nodeMap.get(nodeName)].add('None');
        }
        if (i < track.sequence.length - 1) {
          nodeName2 = track.sequence[i + 1];
          if (nodeName2.charAt(0) === '-') {
            pred[nodeMap.get(nodeName)].add(nodeName2.substr(1));
          } else {
            pred[nodeMap.get(nodeName)].add(nodeName2);
            pred[nodeMap.get(nodeName)].add(`-${nodeName2}`);
          }
        } else if (track.type === 'haplo') {
          pred[nodeMap.get(nodeName)].add('None');
        }
      }
    }
  });

  // convert sets to arrays
  for (let i = 0; i < nodes.length; i += 1) {
    succ[i] = Array.from(succ[i]);
    pred[i] = Array.from(pred[i]);
  }

  // update reads which pass through merging nodes
  if (reads && config.showReads) {
    // sort nodes by order, then by y-coordinate
    const sortedNodes = nodes.slice();
    sortedNodes.sort(compareNodesByOrder);

    // iterate over all nodes and calculate their position within the new merged node
    const mergeOffset = new Map();
    const mergeOrigin = new Map(); // maps to leftmost node of a node's "merging cascade"
    sortedNodes.forEach(node => {
      const predecessor = mergeableWithPred(nodeMap.get(node.name), pred, succ);
      if (predecessor) {
        mergeOffset.set(
          node.name,
          mergeOffset.get(predecessor) +
            nodes[nodeMap.get(predecessor)].sequenceLength
        );
        mergeOffset.set(
          '-' + node.name,
          mergeOffset.get(predecessor) +
            nodes[nodeMap.get(predecessor)].sequenceLength
        );
        mergeOrigin.set(node.name, mergeOrigin.get(predecessor));
        mergeOrigin.set('-' + node.name, mergeOrigin.get(predecessor));
      } else {
        mergeOffset.set(node.name, 0);
        mergeOffset.set('-' + node.name, 0);
        mergeOrigin.set(node.name, node.name);
        mergeOrigin.set('-' + node.name, node.name);
      }
    });

    reads.forEach(read => {
      read.firstNodeOffset += mergeOffset.get(read.sequence[0]);
      read.finalNodeCoverLength += mergeOffset.get(
        read.sequence[read.sequence.length - 1]
      );
      for (let i = read.sequence.length - 1; i >= 0; i -= 1) {
        const nodeName =
          read.sequence[i][0] === '-'
            ? read.sequence[i].substr(1)
            : read.sequence[i];
        if (mergeableWithPred(nodeMap.get(nodeName), pred, succ)) {
          const predecessor = mergeableWithPred(
            nodeMap.get(nodeName),
            pred,
            succ
          );
          if (mergeableWithSucc(nodeMap.get(predecessor), pred, succ)) {
            if (i > 0) {
              read.sequence.splice(i, 1);
              // adjust position of mismatches
              read.sequenceNew[i].mismatches.forEach(mismatch => {
                mismatch.pos += nodes[nodeMap.get(predecessor)].sequenceLength;
              });
              // append mismatches to previous entry's mismatches
              read.sequenceNew[i - 1].mismatches = read.sequenceNew[
                i - 1
              ].mismatches.concat(read.sequenceNew[i].mismatches);
              read.sequenceNew.splice(i, 1);
            } else {
              read.sequence[0] = mergeOrigin.get(read.sequence[0]);
              read.sequenceNew[i].mismatches.forEach(mismatch => {
                mismatch.pos += mergeOffset.get(read.sequenceNew[0].nodeName);
              });
              read.sequenceNew[0].nodeName = mergeOrigin.get(
                read.sequenceNew[0].nodeName
              );
            }
          }
        }
      }
    });
  }

  // update node sequences + sequence lengths
  for (let i = 0; i < nodes.length; i += 1) {
    if (mergeableWithSucc(i, pred, succ) && !mergeableWithPred(i, pred, succ)) {
      let donor = i;
      while (mergeableWithSucc(donor, pred, succ)) {
        donor = succ[donor][0];
        if (donor.charAt(0) === '-') donor = donor.substr(1);
        donor = nodeMap.get(donor);
        if (nodes[i].hasOwnProperty('sequenceLength')) {
          nodes[i].sequenceLength += nodes[donor].sequenceLength;
        } else {
          nodes[i].width += nodes[donor].width;
        }
        nodes[i].seq += nodes[donor].seq;
      }
    }
  }

  // actually merge the nodes by removing the corresponding nodes from track data
  tracks.forEach(track => {
    for (let i = track.sequence.length - 1; i >= 0; i -= 1) {
      nodeName = track.sequence[i];
      if (nodeName.charAt(0) === '-') nodeName = nodeName.substr(1);
      const nodeIndex = nodeMap.get(nodeName);
      if (mergeableWithPred(nodeIndex, pred, succ)) {
        track.sequence.splice(i, 1);
      }
    }
  });

  // remove the nodes from node-array
  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    if (mergeableWithPred(i, pred, succ)) {
      nodes.splice(i, 1);
    }
  }
}

function mergeableWithPred(index, pred, succ) {
  if (pred[index].length !== 1) return false;
  if (pred[index][0] === 'None') return false;
  let predecessor = pred[index][0];
  if (predecessor.charAt(0) === '-') predecessor = predecessor.substr(1);
  const predecessorIndex = nodeMap.get(predecessor);
  if (succ[predecessorIndex].length !== 1) return false;
  if (succ[predecessorIndex][0] === 'None') return false;
  return predecessor;
}

function mergeableWithSucc(index, pred, succ) {
  if (succ[index].length !== 1) return false;
  if (succ[index][0] === 'None') return false;
  let successor = succ[index][0];
  if (successor.charAt(0) === '-') successor = successor.substr(1);
  const successorIndex = nodeMap.get(successor);
  if (pred[successorIndex].length !== 1) return false;
  if (pred[successorIndex][0] === 'None') return false;
  return true;
}

function drawMismatches() {
  tracks.forEach((read, trackIdx) => {
    if (read.type === 'read') {
      read.sequenceNew.forEach((element, i) => {
        element.mismatches.forEach(mm => {
          const nodeName =
            element.nodeName[0] === '-'
              ? element.nodeName.substr(1)
              : element.nodeName;
          const nodeIndex = nodeMap.get(nodeName);
          const node = nodes[nodeIndex];
          const x = getXCoordinateOfBaseWithinNode(node, mm.pos);
          let pathIndex = i;
          while (read.path[pathIndex].node !== nodeIndex) pathIndex += 1;
          const y = read.path[pathIndex].y;
          if (mm.type === 'insertion') {
            if (
              config.showSoftClips ||
              ((mm.pos !== read.firstNodeOffset || i !== 0) &&
                (mm.pos !== read.finalNodeCoverLength ||
                  i !== read.sequenceNew.length - 1))
            ) {
              drawInsertion(x - 3, y + 7, mm.seq, node.y);
            }
          } else if (mm.type === 'deletion') {
            const x2 = getXCoordinateOfBaseWithinNode(node, mm.pos + mm.length);
            drawDeletion(x, x2, y + 4, node.y);
          } else if (mm.type === 'substitution') {
            const x2 = getXCoordinateOfBaseWithinNode(
              node,
              mm.pos + mm.seq.length
            );
            drawSubstitution(x + 1, x2, y + 7, node.y, mm.seq);
          }
        });
      });
    }
  });
}

function drawInsertion(x, y, seq, nodeY) {
  svg
    .append('text')
    .attr('x', x)
    .attr('y', y)
    .text('*')
    .attr('font-family', 'Courier, "Lucida Console", monospace')
    .attr('font-size', '12px')
    .attr('fill', 'black')
    .attr('nodeY', nodeY)
    .on('mouseover', insertionMouseOver)
    .on('mouseout', insertionMouseOut)
    .append('svg:title')
    .text(seq);
}

function drawSubstitution(x1, x2, y, nodeY, seq) {
  svg
    .append('text')
    .attr('x', x1)
    .attr('y', y)
    .text(seq)
    .attr('font-family', 'Courier, "Lucida Console", monospace')
    .attr('font-size', '12px')
    .attr('fill', 'black')
    .attr('nodeY', nodeY)
    .attr('rightX', x2)
    .on('mouseover', substitutionMouseOver)
    .on('mouseout', substitutionMouseOut);
}

function drawDeletion(x1, x2, y, nodeY) {
  // draw horizontal block
  svg
    .append('line')
    .attr('x1', x1)
    .attr('y1', y - 1)
    .attr('x2', x2)
    .attr('y2', y - 1)
    .attr('stroke-width', 7)
    .attr('stroke', 'grey')
    .attr('nodeY', nodeY)
    .on('mouseover', deletionMouseOver)
    .on('mouseout', deletionMouseOut);
}

function insertionMouseOver() {
  /* jshint validthis: true */
  d3.select(this).attr('fill', 'red');
  const x = Number(d3.select(this).attr('x'));
  const y = Number(d3.select(this).attr('y'));
  const yTop = Number(d3.select(this).attr('nodeY'));
  svg
    .append('line')
    .attr('class', 'insertionHighlight')
    .attr('x1', x + 4)
    .attr('y1', y - 10)
    .attr('x2', x + 4)
    .attr('y2', yTop + 5)
    .attr('stroke-width', 1)
    .attr('stroke', 'black');
}

function deletionMouseOver() {
  /* jshint validthis: true */
  d3.select(this).attr('stroke', 'red');
  const x1 = Number(d3.select(this).attr('x1'));
  const x2 = Number(d3.select(this).attr('x2'));
  const y = Number(d3.select(this).attr('y1'));
  const yTop = Number(d3.select(this).attr('nodeY'));
  svg
    .append('line')
    .attr('class', 'deletionHighlight')
    .attr('x1', x1)
    .attr('y1', y - 3)
    .attr('x2', x1)
    .attr('y2', yTop + 5)
    .attr('stroke-width', 1)
    .attr('stroke', 'black');
  svg
    .append('line')
    .attr('class', 'deletionHighlight')
    .attr('x1', x2)
    .attr('y1', y - 3)
    .attr('x2', x2)
    .attr('y2', yTop + 5)
    .attr('stroke-width', 1)
    .attr('stroke', 'black');
}

function substitutionMouseOver() {
  /* jshint validthis: true */
  d3.select(this).attr('fill', 'red');
  const x1 = Number(d3.select(this).attr('x'));
  const x2 = Number(d3.select(this).attr('rightX'));
  const y = Number(d3.select(this).attr('y'));
  const yTop = Number(d3.select(this).attr('nodeY'));
  svg
    .append('line')
    .attr('class', 'substitutionHighlight')
    .attr('x1', x1 - 1)
    .attr('y1', y - 7)
    .attr('x2', x1 - 1)
    .attr('y2', yTop + 5)
    .attr('stroke-width', 1)
    .attr('stroke', 'black');
  svg
    .append('line')
    .attr('class', 'substitutionHighlight')
    .attr('x1', x2 + 1)
    .attr('y1', y - 7)
    .attr('x2', x2 + 1)
    .attr('y2', yTop + 5)
    .attr('stroke-width', 1)
    .attr('stroke', 'black');
}

function insertionMouseOut() {
  /* jshint validthis: true */
  d3.select(this).attr('fill', 'black');
  d3.selectAll('.insertionHighlight').remove();
}

function deletionMouseOut() {
  /* jshint validthis: true */
  d3.select(this).attr('stroke', 'grey');
  d3.selectAll('.deletionHighlight').remove();
}

function substitutionMouseOut() {
  /* jshint validthis: true */
  d3.select(this).attr('fill', 'black');
  d3.selectAll('.substitutionHighlight').remove();
}

function filterReads(reads) {
  if (!reads) return reads;
  return reads.filter(
    read =>
      !read.is_secondary && read.mapping_quality >= config.mappingQualityCutoff
  );
}
