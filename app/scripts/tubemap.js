/* eslint-env jquery */
/* eslint no-use-before-define: "off" */
/* eslint no-param-reassign: "off" */
/* eslint no-lonely-if: "off" */
/* eslint no-prototype-builtins: "off" */
/* eslint no-console: "off" */
/* global d3 */

/* eslint max-len: "off" */
/* eslint no-mixed-operators: ["error", {"allowSamePrecedence": true}] */

/* added these for faster publish -> TODO: remove again */
/* eslint prefer-template: "off" */
/* eslint no-continue: "off" */
/* eslint no-loop-func: "off" */
/* eslint no-restricted-syntax: "off" */
/* eslint no-unused-vars: "off" */


const DEBUG = false;
// let offsetY = 0;

// const d3color = d3.scale.category10().domain([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
// let greys = ['#d9d9d9','#bdbdbd','#969696','#737373','#525252','#252525','#000000'];
const blues = ['#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'];
// const reds = ['#fff5f0','#fee0d2','#fcbba1','#fc9272','#fb6a4a','#ef3b2c','#cb181d','#a50f15','#67000d'];
const reds = ['#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d'];

const plainColors = ['#1b5e20', '#0850B8', '#ff9800', '#039be5', '#f44336', '#9c27b0', '#8bc34a', '#5d4037', '#ffeb3b'];
const lightColors = ['#AAC3AB', '#A2BDE4', '#FFD89F', '#A1DAF5', '#FAA19B', '#DAAEE1', '#D4E9BB', '#AEA09B', '#FFF7B5'];
// const greys = ['#212121', '#424242', '#616161', '#757575', '#9e9e9e', '#bdbdbd', '#CFD8DC'];

let svgID; // the (html-tag) ID of the svg
let svg; // he svg
let inputNodes = [];
let inputTracks = [];
let nodes;
let tracks;
let reads;
let numberOfNodes;
let numberOfTracks;
let nodeMap; // maps node names to node indices
let assignments = []; // contains info about lane assignments sorted by order
let extraLeft = []; // info whether nodes have to be moved further apart because of multiple 180° directional changes at the same horizontal order
let extraRight = []; // info whether nodes have to be moved further apart because of multiple 180° directional changes at the same horizontal order
let maxOrder; // horizontal order of the rightmost node
let mergeNodesFlag = false;
let clickableNodesFlag = false;
let showExonsFlag = false;
let colorScheme = 1;

// 0...scale node width linear with number of bases within node
// 1...scale node width with log2 of number of bases within node
// 2...scale node width with log10 of number of bases within node
let nodeWidthOption = 0;

// letiables for storing info which can be directly translated into drawing instructions
let trackRectangles = [];
let trackCurves = [];
let trackCorners = [];
let trackVerticalRectangles = []; // stored separately from horizontal rectangles. This allows drawing them in a separate step -> avoids issues with wrong overlapping
let trackRectanglesStep3 = [];

let maxYCoordinate = 0;
let minYCoordinate = 0;

let bed;

// public function to fill the svg with a visualization of the data contained in nodes and tracks variables
export function create(inputSvg, origNodes, origTracks, clickableNodes, inputBed, inputReads) {
  if (typeof clickableNodes === 'undefined') clickableNodesFlag = false;
  else clickableNodesFlag = clickableNodes;
  svgID = inputSvg;
  svg = d3.select(inputSvg);
  inputNodes = (JSON.parse(JSON.stringify(origNodes))); // deep copy
  inputTracks = (JSON.parse(JSON.stringify(origTracks)));
  reads = inputReads;
  bed = null;
  if (typeof inputBed !== 'undefined') {
    bed = inputBed;
    // console.log('received bed info');
  }
  const tr = createTubeMap();
  drawLegend(tr);
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
      if ((currentSequence.indexOf(nodeName) === -1) || (currentSequence.indexOf(nodeName) > i)) {
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
      } else {
        if (nodesToInvert.indexOf(currentSequence[j].substr(1)) !== -1) {
          currentSequence[j] = currentSequence[j].substr(1);
        }
      }
    }
  }

  // invert the sequence within the nodes
  inputNodes.forEach((node) => {
    if (nodesToInvert.indexOf(node.name) !== -1) {
      node.seq = node.seq.split('').reverse().join('');
    }
  });
}

export function changeTrackVisibility(trackID) {
  let i = 0;
  while ((i < inputTracks.length) && (inputTracks[i].id !== trackID)) i += 1;
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
  showExonsFlag = !showExonsFlag;
  createTubeMap();
}

// sets the flag for whether redundant nodes should be automatically removed or not
export function setMergeNodesFlag(value) {
  if (mergeNodesFlag !== value) {
    mergeNodesFlag = value;
    svg = d3.select(svgID);
    createTubeMap();
  }
}

// sets which option should be used for calculating the node width from its sequence length
export function setNodeWidthOption(value) {
  if ((value === 0) || (value === 1) || (value === 2)) {
    if (nodeWidthOption !== value) {
      nodeWidthOption = value;
      if (svg !== undefined) {
        svg = d3.select(svgID);
        createTubeMap();
      }
    }
  }
}

// main
function createTubeMap() {
  // traightenTrack(0);
  nodes = (JSON.parse(JSON.stringify(inputNodes))); // deep copy (can add stuff to copy and leave original unchanged)
  tracks = (JSON.parse(JSON.stringify(inputTracks)));
  nodeMap = generateNodeMap(nodes);
  if (typeof reads !== 'undefined') {
    reads.sort(compareReadsByLeftEnd);
    tracks = tracks.concat(reads);
  }

  for (let i = tracks.length - 1; i >= 0; i -= 1) {
    if (!tracks[i].hasOwnProperty('type')) {
      tracks[i].type = 'haplo';
    }
    if (tracks[i].hasOwnProperty('hidden')) {
      if (tracks[i].hidden === true) {
        tracks.splice(i, 1);
      }
    }
  }

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
  svg = d3.select(svgID);
  svg.selectAll('*').remove(); // clear svg for (re-)drawing

  if (mergeNodesFlag) {
    // let NodesAndTracks = mergeNodes(nodes, tracks);
    // const NodesAndTracks = mergeNodes(nodes, tracks);
    // nodes = NodesAndTracks.nodes;
    // tracks = NodesAndTracks.tracks;
    mergeNodes();
  }


  numberOfNodes = nodes.length;
  numberOfTracks = tracks.length;
  nodeMap = generateNodeMap(nodes);
  generateNodeSuccessors(nodes, tracks);
  generateNodeWidth();
  generateNodeDegree();
  console.log(`${numberOfNodes} nodes.`);

  generateNodeOrder();
  maxOrder = getMaxOrder();

  // can cause problems when there is a reversed single track node
  // OTOH, can solve problems with complex inversion patterns
  // switchNodeOrientation();

  // generateNodeOrder(nodes, tracks);
  // maxOrder = getMaxOrder();

  calculateTrackWidth(tracks);
  generateLaneAssignment();

  if ((showExonsFlag === true) && (bed !== null)) addTrackFeatures();

  generateNodeXCoords();
  generateSVGShapesFromPath(nodes, tracks);
  removeUnusedNodes(nodes);
  console.log('tracks:');
  console.log(tracks);
  console.log('Nodes:');
  console.log(nodes);
  console.log('Lane assignment:');
  console.log(assignments);
  alignSVG(nodes, tracks);
  defineSVGPatterns();

  console.log(trackRectangles);
  console.log(trackRectanglesStep3);
  console.log(trackCurves);
  drawTrackRectangles(trackRectangles);
  drawTrackCurves();
  drawReversalsByColor(trackCorners, trackVerticalRectangles);
  drawTrackRectangles(trackRectanglesStep3);

  // drawNodes();
  drawTrackRectangles(trackRectangles, 'read');
  drawTrackCurves('read');
  drawNodes();

  drawReversalsByColor(trackCorners, trackVerticalRectangles, 'read');

  if (nodeWidthOption === 0) drawLabels();

  if (DEBUG) {
    console.log(`number of tracks: ${numberOfTracks}`);
    console.log(`number of nodes: ${numberOfNodes}`);
  }

  return tracks;
}

// remove nodes with no tracks moving through them to avoid d3.js errors
function removeUnusedNodes() {
  let i;

  for (i = nodes.length - 1; i >= 0; i -= 1) {
    if (nodes[i].degree === 0) {
      nodes.splice(i, 1);
    }
  }
  numberOfNodes = nodes.length;
}

// align visualization to the top and left within svg and resize svg to correct size
function alignSVG() {
  let maxX = -9007199254740991;

  nodes.forEach((node) => {
    if (node.hasOwnProperty('x')) {
      maxX = Math.max(maxX, node.x + 20 + node.pixelWidth);
    }
  });

  // enable Pan + Zoom
  const zoom = d3.behavior.zoom().scaleExtent([0.1, 5]).on('zoom', () => {
    svg.attr('transform', `translate(${d3.event.translate}) scale(${d3.event.scale})`);
  });
  svg = svg.call(zoom).on('dblclick.zoom', null).append('g');

  // translate so that top of drawing is visible
  zoom.translate([0, -minYCoordinate + 15]);
  zoom.event(svg);

  // resize svg depending on drawing size
  // this feels dirty, but changing the attributes of the 'svg'-Variable does not have the desired effect
  const svg2 = d3.select(svgID);
  svg2.attr('height', maxYCoordinate - minYCoordinate + 30);
  svg2.attr('width', Math.max(maxX, $(svgID).parent().width()));
}

// map node names to node indices
function generateNodeMap() {
  nodeMap = new Map();

  nodes.forEach((node, index) => {
    nodeMap.set(node.name, index);
  });
  return nodeMap;
}

// adds a successor-array to each node containing the names of the nodes coming directly after the current node
function generateNodeSuccessors() {
  let currentNode;
  let followerID;
  let modifiedSequence = [];

  nodes.forEach((node) => {
    node.successors = [];
    node.predecessors = [];
  });

  tracks.forEach((track) => {
    modifiedSequence = uninvert(track.sequence);
    for (let i = 0; i < modifiedSequence.length - 1; i += 1) {
      currentNode = nodes[nodeMap.get(modifiedSequence[i])];
      followerID = modifiedSequence[i + 1];
      if (currentNode.successors.indexOf(followerID) === -1) {
        currentNode.successors.push(followerID);
      }
      if (nodes[nodeMap.get(followerID)].predecessors.indexOf(modifiedSequence[i]) === -1) {
        nodes[nodeMap.get(followerID)].predecessors.push(modifiedSequence[i]);
      }
    }
  });
}

function generateNodeOrderOfSingleTrack(sequence) {
  let forwardOrder = 0;
  let backwardOrder = 0;
  let currentNode;
  let minOrder = 0;

  sequence.forEach((nodeName) => {
    if (nodeName.charAt(0) === '-') {
      nodeName = nodeName.substr(1);
      currentNode = nodes[nodeMap.get(nodeName)];
      if (!currentNode.hasOwnProperty('order')) {
        currentNode.order = backwardOrder;
      }
      if (currentNode.order < minOrder) minOrder = currentNode.order;
      forwardOrder = currentNode.order;
      backwardOrder = currentNode.order - 1;
    } else {
      currentNode = nodes[nodeMap.get(nodeName)];
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

  const modifiedSequence = uninvert(sequence);

  while (!nodes[nodeMap.get(modifiedSequence[anchorIndex])].hasOwnProperty('order')) anchorIndex += 1; // anchor = first node in common with existing graph

  if (sequence[anchorIndex].charAt(0) !== '-') {
    currentOrder = nodes[nodeMap.get(sequence[anchorIndex])].order - 1;
    for (let j = anchorIndex - 1; j >= 0; j -= 1) { // assign order to nodes
      currentNode = nodes[nodeMap.get(modifiedSequence[j])];
      if (!currentNode.hasOwnProperty('order')) {
        currentNode.order = currentOrder;
        minOrder = Math.min(minOrder, currentOrder);
        currentOrder -= 1;
      }
    }
  } else {
    currentOrder = nodes[nodeMap.get(modifiedSequence[anchorIndex])].order + 1;
    for (let j = anchorIndex - 1; j >= 0; j -= 1) {
      currentNode = nodes[nodeMap.get(modifiedSequence[j])];
      if (!currentNode.hasOwnProperty('order')) {
        currentNode.order = currentOrder;
        minOrder = Math.min(minOrder, currentOrder);
        currentOrder += 1;
      }
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

  generateNodeOrderOfSingleTrack(tracks[0].sequence); // calculate order values for all nodes of the first track

  for (let i = 1; i < tracks.length; i += 1) {
    if (DEBUG) console.log(`generating order for track ${i + 1}`);
    modifiedSequence = uninvert(tracks[i].sequence);
    // rightIndex = generateNodeOrderLeftEnd(modifiedSequence); // calculate order values for all nodes until the first anchor
    rightIndex = generateNodeOrderTrackBeginning(tracks[i].sequence); // calculate order values for all nodes until the first anchor

    while (rightIndex < modifiedSequence.length) { // move right until the end of the sequence
      // find next anchor node
      leftIndex = rightIndex;
      rightIndex += 1;
      while ((rightIndex < modifiedSequence.length) && (!nodes[nodeMap.get(modifiedSequence[rightIndex])].hasOwnProperty('order'))) rightIndex += 1;

      if (rightIndex < modifiedSequence.length) { // middle segment between two anchors
        currentOrder = nodes[nodeMap.get(modifiedSequence[leftIndex])].order + 1; // start with order value of leftAnchor + 1
        for (let j = leftIndex + 1; j < rightIndex; j += 1) {
          nodes[nodeMap.get(modifiedSequence[j])].order = currentOrder; // assign order values
          currentOrder += 1;
        }

        if (nodes[nodeMap.get(modifiedSequence[rightIndex])].order > nodes[nodeMap.get(modifiedSequence[leftIndex])].order) { // if order-value of left anchor < order-value of right anchor
          if (nodes[nodeMap.get(modifiedSequence[rightIndex])].order < currentOrder) { // and the right anchor now has a lower order-value than our newly added nodes
            increaseOrderForSuccessors(nodes[nodeMap.get(modifiedSequence[rightIndex])], modifiedSequence[rightIndex - 1], currentOrder);
          }
        } else { // potential node reversal: check for ordering conflict, if no conflict found move node at rightIndex further to the right in order to not create a track reversal
          // if (!isSuccessor(nodeMap.get(modifiedSequence[rightIndex]), nodeMap.get(modifiedSequence[leftIndex]))) { // no real reversal
          if ((tracks[i].sequence[rightIndex].charAt(0) !== '-') && (!isSuccessor(nodeMap.get(modifiedSequence[rightIndex]), nodeMap.get(modifiedSequence[leftIndex])))) { // no real reversal
            increaseOrderForSuccessors(nodes[nodeMap.get(modifiedSequence[rightIndex])], modifiedSequence[rightIndex - 1], currentOrder);
          } else { // real reversal
            if ((tracks[i].sequence[leftIndex].charAt(0) === '-') || ((nodes[nodeMap.get(modifiedSequence[leftIndex + 1])].degree < 2) && (nodes[nodeMap.get(modifiedSequence[rightIndex])].order < nodes[nodeMap.get(modifiedSequence[leftIndex])].order))) {
              currentOrder = nodes[nodeMap.get(modifiedSequence[leftIndex])].order - 1; // start with order value of leftAnchor - 1
              for (let j = leftIndex + 1; j < rightIndex; j += 1) {
                nodes[nodeMap.get(modifiedSequence[j])].order = currentOrder; // assign order values
                currentOrder -= 1;
              }
            }
          }
        }
      } else { // right segment to the right of last anchor
        if (tracks[i].sequence[leftIndex].charAt(0) !== '-') { // elongate towards the right
          currentOrder = nodes[nodeMap.get(modifiedSequence[leftIndex])].order + 1;
          for (let j = leftIndex + 1; j < modifiedSequence.length; j += 1) {
            currentNode = nodes[nodeMap.get(modifiedSequence[j])];
            if (!currentNode.hasOwnProperty('order')) {
              currentNode.order = currentOrder;
              currentOrder += 1;
            }
          }
        } else { // elongate towards the left
          currentOrder = nodes[nodeMap.get(modifiedSequence[leftIndex])].order - 1;
          for (let j = leftIndex + 1; j < modifiedSequence.length; j += 1) {
            currentNode = nodes[nodeMap.get(modifiedSequence[j])];
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
    if (nodes[current].name === nodes[second].name) return true;
    for (let i = 0; i < nodes[current].successors.length; i += 1) {
      const childIndex = nodeMap.get(nodes[current].successors[i]);
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

  nodes.forEach((node) => {
    if ((node.hasOwnProperty('order')) && (node.order > max)) max = node.order;
  });

  return max;
}

// generates sequence keeping the order but removing all '-'s from nodes
function uninvert(sequence) {
  const result = [];

  for (let i = 0; i < sequence.length; i += 1) {
    if (sequence[i].charAt(0) !== '-') {
      result.push(sequence[i]);
    } else {
      result.push(sequence[i].substr(1));
    }
  }
  return result;
}

// increases the order-value of all nodes by amount
function increaseOrderForAllNodes(amount) {
  nodes.forEach((node) => {
    if (node.hasOwnProperty('order')) node.order += amount;
  });
}

// increases the order-value for currentNode and (if necessary) successor nodes recursively
function increaseOrderForSuccessors(startingNode, tabuNode, order) {
  const increasedOrders = {};
  const queue = [];
  queue.push([startingNode, order]);

  while (queue.length > 0) {
    const current = queue.shift();
    const currentNode = current[0];
    order = current[1];

    if ((currentNode.hasOwnProperty('order')) && (currentNode.order < order)) {
      if ((!increasedOrders.hasOwnProperty(currentNode.name)) || (increasedOrders[currentNode.name] < order)) {
        increasedOrders[currentNode.name] = order;
        currentNode.successors.forEach((successor) => {
          if ((nodes[nodeMap.get(successor)].order > currentNode.order) && (successor !== tabuNode)) { // only increase order of successors if they lie to the right of the currentNode (not for repeats/translocations)
            queue.push([nodes[nodeMap.get(successor)], order + 1]);
          }
        });
        if (currentNode !== startingNode) {
          currentNode.predecessors.forEach((predecessor) => {
            if ((nodes[nodeMap.get(predecessor)].order > currentNode.order) && (predecessor !== tabuNode)) { // only increase order of predecessors if they lie to the right of the currentNode (not for repeats/translocations)
              queue.push([nodes[nodeMap.get(predecessor)], order + 1]);
            }
          });
        }
      }
    }
  }

  for (const nodeName in increasedOrders) {
    if (increasedOrders.hasOwnProperty(nodeName)) {
      nodes[nodeMap.get(nodeName)].order = increasedOrders[nodeName];
    }
  }
}

// calculates the node degree: the number of tracks passing through the node / the node height
function generateNodeDegree() {
  nodes.forEach((node) => { node.tracks = []; });

  tracks.forEach((track) => {
    track.sequence.forEach((nodeName) => {
      let noMinusName = nodeName;
      if (noMinusName.charAt(0) === '-') noMinusName = noMinusName.substr(1);
      nodes[nodeMap.get(noMinusName)].tracks.push(track.id);
    });
  });

  nodes.forEach((node) => {
    if (node.hasOwnProperty('tracks')) node.degree = node.tracks.length;
  });
}

// if more tracks pass through a specific node in reverse direction than in
// regular direction, switch its orientation
// (does not apply to the first track's nodes, these are always oriented as
// dictated by the first track)
function switchNodeOrientation() {
  const toSwitch = {};
  let nodeName;
  let prevNode;
  let nextNode;
  let currentNode;

  for (let i = 1; i < tracks.length; i += 1) {
    for (let j = 0; j < tracks[i].sequence.length; j += 1) {
      nodeName = tracks[i].sequence[j];
      if (nodeName.charAt(0) === '-') nodeName = nodeName.substr(1);
      currentNode = nodes[nodeMap.get(nodeName)];
      if (tracks[0].sequence.indexOf(nodeName) === -1) { // do not change orientation for nodes which are part of the pivot track
        if (j > 0) {
          if (tracks[i].sequence[j - 1].charAt(0) !== '-') prevNode = nodes[nodeMap.get(tracks[i].sequence[j - 1])];
          else prevNode = nodes[nodeMap.get(tracks[i].sequence[j - 1].substr(1))];
        }
        if (j < tracks[i].sequence.length - 1) {
          if (tracks[i].sequence[j + 1].charAt(0) !== '-') nextNode = nodes[nodeMap.get(tracks[i].sequence[j + 1])];
          else nextNode = nodes[nodeMap.get(tracks[i].sequence[j + 1].substr(1))];
        }
        if (((j === 0) || (prevNode.order < currentNode.order)) && ((j === tracks[i].sequence.length - 1) || (currentNode.order < nextNode.order))) {
          if (!toSwitch.hasOwnProperty(nodeName)) toSwitch[nodeName] = 0;
          if (tracks[i].sequence[j].charAt(0) === '-') toSwitch[nodeName] += 1;
          else toSwitch[nodeName] -= 1;
        }
        if (((j === 0) || (prevNode.order > currentNode.order)) && ((j === tracks[i].sequence.length - 1) || (currentNode.order > nextNode.order))) {
          if (!toSwitch.hasOwnProperty(nodeName)) toSwitch[nodeName] = 0;
          if (tracks[i].sequence[j].charAt(0) === '-') toSwitch[nodeName] -= 1;
          else toSwitch[nodeName] += 1;
        }
      }
    }
  }

  tracks.forEach((track, trackIndex) => {
    track.sequence.forEach((node, nodeIndex) => {
      nodeName = node;
      if (nodeName.charAt(0) === '-') nodeName = nodeName.substr(1);
      if ((toSwitch.hasOwnProperty(nodeName)) && (toSwitch[nodeName] > 0)) {
        if (node.charAt(0) === '-') tracks[trackIndex].sequence[nodeIndex] = node.substr(1);
        else tracks[trackIndex].sequence[nodeIndex] = `-${node}`;
      }
    });
  });

  // invert the sequence within the nodes
  for (const prop in toSwitch) {
    if (toSwitch.hasOwnProperty(prop) && toSwitch[prop] > 0) {
      currentNode = nodeMap.get(prop);
      nodes[currentNode].seq = nodes[currentNode].seq.split('').reverse().join('');
    }
  }
}

// calculates the concrete values for the nodes' x-coordinates
function generateNodeXCoords() {
  let currentX = 0;
  let nextX = 20;
  let currentOrder = -1;

  nodes.sort(compareNodesByOrder);
  nodeMap = generateNodeMap(nodes);
  const extra = calculateExtraSpace();

  nodes.forEach((node) => {
    if (node.hasOwnProperty('order')) {
      if (node.order > currentOrder) {
        currentOrder = node.order;
        currentX = nextX + (10 * extra[node.order]);
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

  tracks.forEach((track) => {
    for (let i = 1; i < track.path.length; i += 1) {
      if (track.path[i].order === track.path[i - 1].order) { // repeat or translocation
        if (track.path[i].isForward === true) leftSideEdges[track.path[i].order] += 1;
        else rightSideEdges[track.path[i].order] += 1;
      }
    }
  });

  extra.push(Math.max(0, leftSideEdges[0] - 1));
  for (let i = 1; i <= maxOrder; i += 1) {
    extra.push(Math.max(0, leftSideEdges[i] - 1) + Math.max(0, rightSideEdges[i - 1] - 1));
  }

  return extra;
}

// create and fill assignment-letiable, which contains info about tracks and lanes for each order-value
function generateLaneAssignment() {
  let segmentNumber;
  let currentNodeId;
  let currentNodeIsForward;
  let currentNode;
  let previousNode;
  let previousNodeIsForward;
  const prevSegmentPerOrderPerTrack = [];

  for (let i = 0; i <= maxOrder; i += 1) {
    assignments[i] = [];
    prevSegmentPerOrderPerTrack[i] = [];
    for (let j = 0; j < numberOfTracks; j += 1) {
      prevSegmentPerOrderPerTrack[i][j] = null;
    }
  }

  tracks.forEach((track, trackNo) => {
    // add info for start of track
    currentNodeId = track.sequence[0];
    if (currentNodeId.charAt(0) !== '-') {
      currentNodeIsForward = true;
    } else {
      currentNodeId = currentNodeId.substr(1);
      currentNodeIsForward = false;
    }
    currentNode = nodes[nodeMap.get(currentNodeId)];

    track.path = [];
    track.path.push({ order: currentNode.order, lane: null, isForward: currentNodeIsForward, node: currentNodeId });
    addToAssignment(currentNode.order, currentNodeId, trackNo, 0, prevSegmentPerOrderPerTrack);

    segmentNumber = 1;
    for (let i = 1; i < track.sequence.length; i += 1) {
      previousNode = currentNode;
      previousNodeIsForward = currentNodeIsForward;

      currentNodeId = track.sequence[i];
      currentNodeIsForward = true;
      if (currentNodeId.charAt(0) === '-') {
        currentNodeId = currentNodeId.substr(1);
        currentNodeIsForward = false;
      }
      currentNode = nodes[nodeMap.get(currentNodeId)];

      if (currentNode.order > previousNode.order) {
        if (!previousNodeIsForward) {
          track.path.push({ order: previousNode.order, lane: null, isForward: true, node: null });
          addToAssignment(previousNode.order, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
          segmentNumber += 1;
        }
        for (let j = previousNode.order + 1; j < currentNode.order; j += 1) {
          track.path.push({ order: j, lane: null, isForward: true, node: null });
          addToAssignment(j, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
          segmentNumber += 1;
        }
        if (!currentNodeIsForward) {
          track.path.push({ order: currentNode.order, lane: null, isForward: true, node: null });
          addToAssignment(currentNode.order, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
          segmentNumber += 1;
          track.path.push({ order: currentNode.order, lane: null, isForward: false, node: currentNodeId });
          addToAssignment(currentNode.order, currentNodeId, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
          segmentNumber += 1;
        } else {
          track.path.push({ order: currentNode.order, lane: null, isForward: true, node: currentNodeId });
          addToAssignment(currentNode.order, currentNodeId, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
          segmentNumber += 1;
        }
      } else if (currentNode.order < previousNode.order) {
        if (previousNodeIsForward) {
          track.path.push({ order: previousNode.order, lane: null, isForward: false, node: null });
          addToAssignment(previousNode.order, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
          segmentNumber += 1;
        }
        for (let j = previousNode.order - 1; j > currentNode.order; j -= 1) {
          track.path.push({ order: j, lane: null, isForward: false, node: null });
          addToAssignment(j, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
          segmentNumber += 1;
        }
        if (currentNodeIsForward) {
          track.path.push({ order: currentNode.order, lane: null, isForward: false, node: null });
          addToAssignment(currentNode.order, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
          segmentNumber += 1;
          track.path.push({ order: currentNode.order, lane: null, isForward: true, node: currentNodeId });
          addToAssignment(currentNode.order, currentNodeId, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
          segmentNumber += 1;
        } else {
          track.path.push({ order: currentNode.order, lane: null, isForward: false, node: currentNodeId });
          addToAssignment(currentNode.order, currentNodeId, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
          segmentNumber += 1;
        }
      } else { // currentNode.order === previousNode.order
        if (currentNodeIsForward !== previousNodeIsForward) {
          track.path.push({ order: currentNode.order, lane: null, isForward: currentNodeIsForward, node: currentNodeId });
          addToAssignment(currentNode.order, currentNodeId, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
          segmentNumber += 1;
        } else {
          track.path.push({ order: currentNode.order, lane: null, isForward: !currentNodeIsForward, node: null });
          addToAssignment(currentNode.order, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
          segmentNumber += 1;
          track.path.push({ order: currentNode.order, lane: null, isForward: currentNodeIsForward, node: currentNodeId });
          addToAssignment(currentNode.order, currentNodeId, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
          segmentNumber += 1;
        }
      }
    }
  });

  for (let i = 0; i <= maxOrder; i += 1) {
    generateSingleLaneAssignment(assignments[i], i); // this is where the lanes get assigned
  }
}

function addToAssignment(order, nodeID, trackNo, segmentID, prevSegmentPerOrderPerTrack) {
  let compareToFromSame;

  compareToFromSame = null;
  if (prevSegmentPerOrderPerTrack[order][trackNo] !== null) {
    compareToFromSame = prevSegmentPerOrderPerTrack[order][trackNo];
  }

  if (nodeID === null) {
    assignments[order].push({ type: 'single', name: null, tracks: [{ trackID: trackNo, segmentID, compareToFromSame }] });
    prevSegmentPerOrderPerTrack[order][trackNo] = assignments[order][assignments[order].length - 1].tracks[0];
  } else {
    for (let i = 0; i < assignments[order].length; i += 1) {
      if (assignments[order][i].name === nodeID) { // add to existing node in assignment
        assignments[order][i].type = 'multiple';
        assignments[order][i].tracks.push({ trackID: trackNo, segmentID, compareToFromSame });
        prevSegmentPerOrderPerTrack[order][trackNo] = assignments[order][i].tracks[assignments[order][i].tracks.length - 1];
        return;
      }
    }
    // create new node in assignment
    assignments[order].push({ type: 'single', name: nodeID, tracks: [{ trackID: trackNo, segmentID, compareToFromSame }] });
    prevSegmentPerOrderPerTrack[order][trackNo] = assignments[order][assignments[order].length - 1].tracks[0];
  }
}

// looks at assignment and sets idealY and idealLane by looking at where the tracks come from
function getIdealLanesAndCoords(assignment, order) {
  let index;

  assignment.forEach((node) => {
    node.idealLane = 0;
    node.tracks.forEach((track) => {
      if (track.segmentID === 0) {
        track.idealLane = track.trackID;
        track.idealY = null;
      } else {
        if (tracks[track.trackID].path[track.segmentID - 1].order === order - 1) {
          track.idealLane = tracks[track.trackID].path[track.segmentID - 1].lane;
          track.idealY = tracks[track.trackID].path[track.segmentID - 1].y;
        } else if ((track.segmentID < tracks[track.trackID].path.length - 1) && (tracks[track.trackID].path[track.segmentID + 1].order === order - 1)) {
          track.idealLane = tracks[track.trackID].path[track.segmentID + 1].lane;
          track.idealY = tracks[track.trackID].path[track.segmentID + 1].y;
        } else {
          index = track.segmentID - 1;
          while ((index >= 0) && (tracks[track.trackID].path[index].order !== order - 1)) index -= 1;
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
  // let sumOfLaneChanges = 0;
  const potentialAdjustmentValues = new Set();
  // let totalLanes = 0;
  // let currentY = offsetY + 20;
  let currentY = 20;
  let prevNameIsNull = false;
  let prevTrack = -1;

  // console.log('order : ' + order);
  // console.log(assignment);

  getIdealLanesAndCoords(assignment, order);
  assignment.sort(compareByIdealLane);

  assignment.forEach((node) => {
    if (node.name !== null) {
      nodes[nodeMap.get(node.name)].topLane = currentLane;
      if (prevNameIsNull) currentY -= 10;
      nodes[nodeMap.get(node.name)].y = currentY;
      nodes[nodeMap.get(node.name)].contentHeight = 0;

      prevNameIsNull = false;
    } else {
      if (prevNameIsNull) currentY -= 25;
      // else if (currentY > offsetY + 20) currentY -= 10;
      else if (currentY > 20) currentY -= 10;
      prevNameIsNull = true;
    }

    node.tracks.sort(compareByIdealLane);
    node.tracks.forEach((track) => {
      track.lane = currentLane;
      if ((track.trackID === prevTrack) && (node.name === null) && (prevNameIsNull)) currentY += 10;
      tracks[track.trackID].path[track.segmentID].lane = currentLane;
      tracks[track.trackID].path[track.segmentID].y = currentY;
      // sumOfLaneChanges += currentLane - track.idealLane;
      if (track.idealY !== null) potentialAdjustmentValues.add(track.idealY - currentY);
      // totalLanes += 1;
      currentLane += 1;
      currentY += tracks[track.trackID].width;
      if (node.name !== null) {
        nodes[nodeMap.get(node.name)].contentHeight += tracks[track.trackID].width;
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

  potentialAdjustmentValues.forEach((moveBy) => {
    if (getVerticalAdjustmentCost(assignment, moveBy) < minAdjustmentCost) {
      minAdjustmentCost = getVerticalAdjustmentCost(assignment, moveBy);
      verticalAdjustment = moveBy;
    }
  });

  assignment.forEach((node) => {
    if (node.name !== null) {
      nodes[nodeMap.get(node.name)].y += verticalAdjustment;
    }
    node.tracks.forEach((track) => {
      tracks[track.trackID].path[track.segmentID].y += verticalAdjustment;
    });
  });
}

// calculates cost of vertical adjustment as vertical distance * width of track
function getVerticalAdjustmentCost(assignment, moveBy) {
  let result = 0;
  assignment.forEach((node) => {
    node.tracks.forEach((track) => {
      // if (track.idealY !== null) {
      if ((track.idealY !== null) && (tracks[track.trackID].type !== 'read')) {
        result += Math.abs(track.idealY - moveBy - tracks[track.trackID].path[track.segmentID].y) * tracks[track.trackID].width;
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
  if (a.hasOwnProperty('order')) {
    if (b.hasOwnProperty('order')) {
      if (a.order < b.order) return -1;
      else if (a.order > b.order) return 1;
      return 0;
    }
    return -1;
  }
  if (b.hasOwnProperty('order')) return 1;
  return 0;
}

function addTrackFeatures() {
  // console.log('adding track features');
  let nodeStart;
  let nodeEnd;
  let feature = {};

  // console.log('processing BED-info');
  bed.forEach((line) => {
    let i = 0;
    while ((i < numberOfTracks) && (tracks[i].name !== line.track)) i += 1;
    if (i < numberOfTracks) {
      // console.log('Track ' + line.track + ' found');
      nodeStart = 0;
      tracks[i].path.forEach((node) => {
        if (node.node !== null) {
          feature = {};
          // console.log(nodes[nodeMap.get(node.node)]);
          if (nodes[nodeMap.get(node.node)].hasOwnProperty('sequenceLength')) {
            nodeEnd = nodeStart + nodes[nodeMap.get(node.node)].sequenceLength - 1;
          } else {
            nodeEnd = nodeStart + nodes[nodeMap.get(node.node)].width - 1;
          }

          // console.log(nodeStart + ', ' + nodeEnd);
          // console.log(line.start + ' ' + line.end);
          if ((nodeStart >= line.start) && (nodeStart <= line.end)) feature.start = 0;
          if ((nodeStart < line.start) && (nodeEnd >= line.start)) feature.start = line.start - nodeStart;
          if ((nodeEnd <= line.end) && (nodeEnd >= line.start)) {
            // console.log('drin');
            feature.end = nodeEnd - nodeStart;
            if (nodeEnd < line.end) feature.continue = true;
          }
          if ((nodeEnd > line.end) && (nodeStart <= line.end)) feature.end = line.end - nodeStart;
          if (feature.hasOwnProperty('start')) {
            feature.type = line.type;
            feature.name = line.name;
            if (!node.hasOwnProperty('features')) node.features = [];
            // console.log(feature);
            node.features.push(feature);
            // console.log('adding feature');
          }
          nodeStart = nodeEnd + 1;
        }
      });
    } else {
      // console.log('Track ' + line.track + ' not found');
    }
  });
}

function calculateTrackWidth() {
  tracks.forEach((track) => {
    if (track.hasOwnProperty('freq')) { // custom track width
      // track.width = track.freq;
      track.width = Math.round((Math.log(track.freq) + 1) * 4);
      // track.width = Math.round((Math.log(track.freq) + 1));
    } else { // default track width
      track.width = 15;
      if (track.hasOwnProperty('type') && track.type === 'read') {
        track.width = 4;
      }
    }
  });
}

export function useColorScheme(x) {
  colorScheme = x;
  svg = d3.select(svgID);
  // createTubeMap();
  const tr = createTubeMap();
  drawLegend(tr);
}

function generateTrackColor(track, highlight) {
  if (typeof highlight === 'undefined') highlight = 'plain';
  let trackColor;
  if (track.hasOwnProperty('type') && track.type === 'read') {
    // trackColor = greys[track.id % greys.length];
    trackColor = reds[track.id % reds.length];
    if (track.sequence[0].charAt(0) === '-') trackColor = blues[track.id % blues.length];
  } else {
    if ((showExonsFlag === false) || (highlight !== 'plain')) {
      if (colorScheme === 0) {
        trackColor = plainColors[track.id % plainColors.length];
      } else if (colorScheme === 1) {
        trackColor = blues[track.id % blues.length];
      }
      // if (track.id === 2) trackColor = reds[4];
      // if (track.id === 9) trackColor = plainColors[0];
      // if (track.id === 5) trackColor = plainColors[2];
      // trackColor = reds[track.id % reds.length];
    } else {
      trackColor = lightColors[track.id % lightColors.length];
    }
  }
  // track.color = trackColor;
  return trackColor;
}

function getReadXStart(read) {
  let x;
  let offset;
  const node = nodes[nodeMap.get(read.path[0].node)];
  const nodeLeftX = node.x - 4;
  const nodeRightX = node.x + node.pixelWidth + 4;
  if (read.path[0].isForward) { // read starts in forward direction
    offset = read.firstNodeOffset;
    x = nodeLeftX + ((offset / node.sequenceLength) * (nodeRightX - nodeLeftX));
  } else { // read starts in backward direction
    // offset = node.sequenceLength - read.firstNodeOffset;
    offset = read.firstNodeOffset;
    x = nodeRightX - ((offset / node.sequenceLength) * (nodeRightX - nodeLeftX));
  }
  return x;
}

function getReadXEnd(read) {
  let x;
  let offset;
  const node = nodes[nodeMap.get(read.path[read.path.length - 1].node)];
  const nodeLeftX = node.x - 4;
  const nodeRightX = node.x + node.pixelWidth + 4;
  if (read.path[read.path.length - 1].isForward) { // read ends in forward direction
    offset = read.finalNodeCoverLength;
    x = nodeLeftX + ((offset / node.sequenceLength) * (nodeRightX - nodeLeftX));
  } else { // read ends in backward direction
    offset = node.sequenceLength - read.finalNodeCoverLength;
    // x = nodeRightX - (offset / node.sequenceLength) * (nodeRightX - nodeLeftX);
    x = nodeLeftX + ((offset / node.sequenceLength) * (nodeRightX - nodeLeftX));
  }
  return x;
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
  nodes.forEach((node) => {
    if (node.hasOwnProperty('order')) {
      orderStartX[node.order] = node.x;
      if (orderEndX[node.order] === undefined) orderEndX[node.order] = node.x + node.pixelWidth;
      else orderEndX[node.order] = Math.max(orderEndX[node.order], node.x + node.pixelWidth);
    }
  });

  tracks.forEach((track) => {
    highlight = 'plain';
    trackColor = generateTrackColor(track, highlight);

    // start of path
    yStart = track.path[0].y;
    if (track.type !== 'read') {
      if (track.sequence[0].charAt(0) === '-') { // The track starts with an inversed node
        xStart = orderEndX[track.path[0].order] + 20;
      } else { // The track starts with a forward node
        xStart = orderStartX[track.path[0].order] - 20;
      }
    } else {
      xStart = getReadXStart(track);
    }

    // middle of path
    for (let i = 0; i < track.path.length; i += 1) {
      // if  (track.path[i].y === track.path[i - 1].y) continue;
      if (track.path[i].y === yStart) {
        if (!track.path[i].hasOwnProperty('features')) continue;
        if ((i > 0) && (track.path[i - 1].order === track.path[i].order)) reversalFlag = true;
        else reversalFlag = false;
        dummy = createFeatureRectangle(track.path[i], orderStartX[track.path[i].order], orderEndX[track.path[i].order], highlight, track, xStart, yStart, trackColor, reversalFlag);
        highlight = dummy.highlight;
        xStart = dummy.xStart;
        continue;
      }
      if (track.path[i - 1].isForward) {
        xEnd = orderEndX[track.path[i - 1].order];
      } else {
        xEnd = orderStartX[track.path[i - 1].order];
      }
      if (xEnd !== xStart) {
        trackColor = generateTrackColor(track, highlight);
        trackRectangles.push({ xStart: Math.min(xStart, xEnd), yStart, xEnd: Math.max(xStart, xEnd), yEnd: yStart + track.width - 1, color: trackColor, id: track.id, type: track.type });
      }

      if (track.path[i].order - 1 === track.path[i - 1].order) { // regular forward connection
        xStart = xEnd;
        xEnd = orderStartX[track.path[i].order];
        yEnd = track.path[i].y;
        trackColor = generateTrackColor(track, highlight);
        trackCurves.push({ xStart, yStart, xEnd: xEnd + 1, yEnd, width: track.width, color: trackColor, laneChange: Math.abs(track.path[i].lane - track.path[i - 1].lane), id: track.id, type: track.type });
        xStart = xEnd;
        yStart = yEnd;
      } else if (track.path[i].order + 1 === track.path[i - 1].order) { // regular backward connection
        xStart = xEnd;
        xEnd = orderEndX[track.path[i].order];
        yEnd = track.path[i].y;
        trackColor = generateTrackColor(track, highlight);
        trackCurves.push({ xStart: xStart + 1, yStart, xEnd, yEnd, width: track.width, color: trackColor, laneChange: Math.abs(track.path[i].lane - track.path[i - 1].lane), id: track.id, type: track.type });
        xStart = xEnd;
        yStart = yEnd;
      } else { // change of direction
        if (track.path[i - 1].isForward) {
          yEnd = track.path[i].y;
          generateForwardToReverse(xEnd, yStart, yEnd, track.width, trackColor, track.id, track.path[i].order, track.type);
          xStart = orderEndX[track.path[i].order];
          yStart = track.path[i].y;
        } else {
          yEnd = track.path[i].y;
          generateReverseToForward(xEnd, yStart, yEnd, track.width, trackColor, track.id, track.path[i].order, track.type);
          xStart = orderStartX[track.path[i].order];
          yStart = track.path[i].y;
        }
      }

      if (track.path[i].hasOwnProperty('features')) {
        if (track.path[i - 1].order === track.path[i].order) reversalFlag = true;
        else reversalFlag = false;
        dummy = createFeatureRectangle(track.path[i], orderStartX[track.path[i].order], orderEndX[track.path[i].order], highlight, track, xStart, yStart, trackColor, reversalFlag);
        highlight = dummy.highlight;
        xStart = dummy.xStart;
      }


      maxYCoordinate = Math.max(maxYCoordinate, yStart + track.width);
      minYCoordinate = Math.min(minYCoordinate, yStart);
    }
    maxYCoordinate = Math.max(maxYCoordinate, yStart + track.width);
    minYCoordinate = Math.min(minYCoordinate, yStart);

    // ending edges
    if (track.type !== 'read') {
      if (!track.path[track.path.length - 1].isForward) { // The track ends with an inversed node
        xEnd = orderStartX[track.path[track.path.length - 1].order] - 20;
      } else { // The track ends with a forward node
        xEnd = orderEndX[track.path[track.path.length - 1].order] + 20;
      }
    } else {
      xEnd = getReadXEnd(track);
    }
    // trackRectangles.push({xStart: xStart, yStart: yStart, xEnd: xEnd, yEnd: yStart + track.width - 1, color: trackColor, id: track.id, type: track.type});
    trackRectangles.push({ xStart: Math.min(xStart, xEnd), yStart, xEnd: Math.max(xStart, xEnd), yEnd: yStart + track.width - 1, color: trackColor, id: track.id, type: track.type });
  });
}

function createFeatureRectangle(node, nodeXStart, nodeXEnd, highlight, track, rectXStart, yStart, trackColor, reversalFlag) {
  let nodeWidth;
  let currentHighlight = highlight;
  let c;
  let co;
  let featureXStart;
  let featureXEnd;

  nodeXStart -= 8;
  nodeXEnd += 8;
  // console.log('creating highlight');
  if (nodes[nodeMap.get(node.node)].hasOwnProperty('sequenceLength')) {
    nodeWidth = nodes[nodeMap.get(node.node)].sequenceLength;
  } else {
    nodeWidth = nodes[nodeMap.get(node.node)].width;
  }

  // console.log(nodeWidth);
  // console.log(nodeXStart);
  // console.log(nodeXEnd);
  node.features.sort((a, b) => a.start - b.start);
  node.features.forEach((feature) => {
    // console.log(feature);
    if (currentHighlight !== feature.type) { // finish incoming rectangle
      c = generateTrackColor(track, currentHighlight);
      if (node.isForward === true) {
        featureXStart = nodeXStart + Math.round(feature.start * (nodeXEnd - nodeXStart + 1) / nodeWidth);

        // overwrite narrow post-inversion rectangle if highlight starts near beginning of node
        if ((reversalFlag) && (featureXStart < nodeXStart + 8)) {
          featureXEnd = nodeXStart + Math.round((feature.end + 1) * (nodeXEnd - nodeXStart + 1) / nodeWidth) - 1;
          co = generateTrackColor(track, feature.type);
          trackRectanglesStep3.push({ xStart: featureXStart, yStart, xEnd: featureXEnd, yEnd: yStart + track.width - 1, color: co, id: track.id, type: track.type });
        }

        if (featureXStart > rectXStart + 1) {
          // console.log('drawing rect 1: ' + rectXStart + ' bis '  + (featureXStart - 1));
          trackRectanglesStep3.push({ xStart: rectXStart, yStart, xEnd: featureXStart - 1, yEnd: yStart + track.width - 1, color: c, id: track.id, type: track.type });
        }
      } else {
        // console.log('reversal 1 here:');
        featureXStart = nodeXEnd - Math.round(feature.start * (nodeXEnd - nodeXStart + 1) / nodeWidth);

        // overwrite narrow post-inversion rectangle if highlight starts near beginning of node
        if ((reversalFlag) && (featureXStart > nodeXEnd - 8)) {
          featureXEnd = nodeXEnd - Math.round((feature.end + 1) * (nodeXEnd - nodeXStart + 1) / nodeWidth) - 1;
          co = generateTrackColor(track, feature.type);
          trackRectanglesStep3.push({ xStart: featureXEnd, yStart, xEnd: featureXStart, yEnd: yStart + track.width - 1, color: co, id: track.id, type: track.type });
        }

        if (rectXStart > featureXStart + 1) {
          // console.log('drawing rect 1 reverse: ' + rectXStart + ' bis '  + (featureXStart + 1));
          trackRectanglesStep3.push({ xStart: featureXStart + 1, yStart, xEnd: rectXStart, yEnd: yStart + track.width - 1, color: c, id: track.id, type: track.type });
        }
      }
      rectXStart = featureXStart;
      currentHighlight = feature.type;
    }
    if ((feature.end < nodeWidth - 1) || (!feature.hasOwnProperty('continue'))) { // finish internal rectangle
      c = generateTrackColor(track, currentHighlight);
      if (node.isForward === true) {
        featureXEnd = nodeXStart + Math.round((feature.end + 1) * (nodeXEnd - nodeXStart + 1) / nodeWidth) - 1;
        // console.log('drawing rect 2: ' + rectXStart + ' bis ' + (featureXEnd));
        trackRectanglesStep3.push({ xStart: rectXStart, yStart, xEnd: featureXEnd, yEnd: yStart + track.width - 1, color: c, id: track.id, type: track.type });
      } else {
        // console.log('reversal 2 here:');
        featureXEnd = nodeXEnd - Math.round((feature.end + 1) * (nodeXEnd - nodeXStart + 1) / nodeWidth) - 1;
        // console.log('drawing rect 2 reverse: ' + rectXStart + ' bis ' + featureXEnd);
        trackRectanglesStep3.push({ xStart: featureXEnd, yStart, xEnd: rectXStart, yEnd: yStart + track.width - 1, color: c, id: track.id, type: track.type });
      }
      rectXStart = featureXEnd + 1;
      currentHighlight = 'plain';
    }
  });
  return { xStart: rectXStart, highlight: currentHighlight };
}

function generateForwardToReverse(x, yStart, yEnd, trackWidth, trackColor, trackID, order, type) {
  x += 10 * extraRight[order];
  const yTop = Math.min(yStart, yEnd);
  const yBottom = Math.max(yStart, yEnd);
  const radius = 7;

  trackVerticalRectangles.push({ // elongate incoming rectangle a bit to the right
    xStart: x - (10 * extraRight[order]),
    yStart,
    xEnd: x + 5,
    yEnd: yStart + trackWidth - 1,
    color: trackColor,
    id: trackID,
    type,
  });
  trackVerticalRectangles.push({ // vertical rectangle
    xStart: x + 5 + radius,
    yStart: yTop + trackWidth + radius - 1,
    xEnd: x + 5 + radius + Math.min(7, trackWidth) - 1,
    yEnd: yBottom - radius + 1,
    color: trackColor,
    id: trackID,
    type,
  });
  trackVerticalRectangles.push({
    xStart: x - (10 * extraRight[order]),
    yStart: yEnd,
    xEnd: x + 5,
    yEnd: yEnd + trackWidth - 1,
    color: trackColor,
    id: trackID,
    type,
  }); // elongate outgoing rectangle a bit to the right

  let d = 'M ' + (x + 5) + ' ' + yBottom;
  d += ' Q ' + (x + 5 + radius) + ' ' + yBottom + ' ' + (x + 5 + radius) + ' ' + (yBottom - radius);
  d += ' H ' + (x + 5 + radius + Math.min(7, trackWidth));
  d += ' Q ' + (x + 5 + radius + Math.min(7, trackWidth)) + ' ' + (yBottom + trackWidth) + ' ' + (x + 5) + ' ' + (yBottom + trackWidth);
  d += ' Z ';
  trackCorners.push({ path: d, color: trackColor, id: trackID, type });

  d = 'M ' + (x + 5) + ' ' + yTop;
  d += ' Q ' + (x + 5 + radius + Math.min(7, trackWidth)) + ' ' + yTop + ' ' + (x + 5 + radius + Math.min(7, trackWidth)) + ' ' + (yTop + trackWidth + radius);
  d += ' H ' + (x + 5 + radius);
  d += ' Q ' + (x + 5 + radius) + ' ' + (yTop + trackWidth) + ' ' + (x + 5) + ' ' + (yTop + trackWidth);
  d += ' Z ';
  trackCorners.push({ path: d, color: trackColor, id: trackID, type });
  extraRight[order] += 1;
}

function generateReverseToForward(x, yStart, yEnd, trackWidth, trackColor, trackID, order, type) {
  const yTop = Math.min(yStart, yEnd);
  const yBottom = Math.max(yStart, yEnd);
  const radius = 7;
  x -= 10 * extraLeft[order];

  trackVerticalRectangles.push({
    xStart: x - 6,
    yStart,
    xEnd: x + (10 * extraLeft[order]),
    yEnd: yStart + trackWidth - 1,
    color: trackColor,
    id: trackID,
    type,
  }); // elongate incoming rectangle a bit to the left
  trackVerticalRectangles.push({
    xStart: x - 5 - radius - Math.min(7, trackWidth),
    yStart: yTop + trackWidth + radius - 1,
    xEnd: x - 5 - radius - 1,
    yEnd: yBottom - radius + 1,
    color: trackColor,
    id: trackID,
    type,
  }); // vertical rectangle
  trackVerticalRectangles.push({
    xStart: x - 6,
    yStart: yEnd,
    xEnd: x + (10 * extraLeft[order]),
    yEnd: yEnd + trackWidth - 1,
    color: trackColor,
    id: trackID,
    type,
  }); // elongate outgoing rectangle a bit to the left

  // Path for bottom 90 degree bend
  let d = 'M ' + (x - 5) + ' ' + yBottom;
  d += ' Q ' + (x - 5 - radius) + ' ' + yBottom + ' ' + (x - 5 - radius) + ' ' + (yBottom - radius);
  d += ' H ' + (x - 5 - radius - Math.min(7, trackWidth));
  d += ' Q ' + (x - 5 - radius - Math.min(7, trackWidth)) + ' ' + (yBottom + trackWidth) + ' ' + (x - 5) + ' ' + (yBottom + trackWidth);
  d += ' Z ';
  trackCorners.push({ path: d, color: trackColor, id: trackID, type });

  // Path for top 90 degree bend
  d = 'M ' + (x - 5) + ' ' + yTop;
  d += ' Q ' + (x - 5 - radius - Math.min(7, trackWidth)) + ' ' + yTop + ' ' + (x - 5 - radius - Math.min(7, trackWidth)) + ' ' + (yTop + trackWidth + radius);
  d += ' H ' + (x - 5 - radius);
  d += ' Q ' + (x - 5 - radius) + ' ' + (yTop + trackWidth) + ' ' + (x - 5) + ' ' + (yTop + trackWidth);
  d += ' Z ';
  trackCorners.push({ path: d, color: trackColor, id: trackID, type });
  extraLeft[order] += 1;
}

// to avoid problems with wrong overlapping of tracks, draw them in order of their color
function drawReversalsByColor(corners, rectangles, type) {
  if (typeof type === 'undefined') type = 'haplo';
  // trackCurves = trackCurves.filter(filterObjectByAttribute('type', type));

  const co = new Set();
  rectangles.forEach((rect) => {
    // console.log('rect: ' + rect[4]);
    // co.add(rect[4]);
    co.add(rect.color);
  });
  // console.log(co);
  co.forEach((c) => {
    drawTrackRectangles(rectangles.filter(filterObjectByAttribute('color', c)), type);
    drawTrackCorners(corners.filter(filterObjectByAttribute('color', c)), type);
  });

  /* for (c = 0; c < numberOfColors; c += 1) {
    co = blues[c];
    drawTrackRectangles(rectangles.filter(filterRectByColor(co)));
    drawTrackCorners(corners.filter(filterCornerByColor(co)));
  }*/
}

// draws nodes by building svg-path for border and filling it with transparent white
function drawNodes() {
  let x;
  let y;

  nodes.forEach((node) => {
    // top left arc
    node.d = 'M ' + (node.x - 9) + ' ' + node.y + ' Q ' + (node.x - 9) + ' ' + (node.y - 9) + ' ' + node.x + ' ' + (node.y - 9);
    x = node.x;
    y = node.y - 9;

    // top straight
    if (node.width > 1) {
      x += node.pixelWidth;
      node.d += ' L ' + x + ' ' + y;
    }

    // top right arc
    node.d += ' Q ' + (x + 9) + ' ' + y + ' ' + (x + 9) + ' ' + (y + 9);
    x += 9;
    y += 9;

    // right straight
    if (node.contentHeight > 0) {
      // y += (node.degree - 1) * 22;
      y += node.contentHeight - 0;
      node.d += ' L ' + x + ' ' + y;
    }

    // bottom right arc
    node.d += ' Q ' + x + ' ' + (y + 9) + ' ' + (x - 9) + ' ' + (y + 9);
    x -= 9;
    y += 9;

    // bottom straight
    if (node.width > 1) {
      x -= node.pixelWidth;
      node.d += ' L ' + x + ' ' + y;
    }

    // bottom left arc
    node.d += ' Q ' + (x - 9) + ' ' + y + ' ' + (x - 9) + ' ' + (y - 9);
    x -= 9;
    y -= 9;

    // left straight
    // if (node.degree > 1) {
    if (node.contentHeight > 0) {
      // y -= (node.degree - 1) * 22;
      y -= node.contentHeight - 0;
      node.d += ' L ' + x + ' ' + y;
    }
  });

  svg.selectAll('.node')
    .data(nodes)
    .enter()
    .append('path')
    .attr('id', d => d.name)
    .attr('d', d => d.d)
    // .attr('title', function(d) { return d.name; })
    .on('mouseover', nodeMouseOver)
    .on('mouseout', nodeMouseOut)
    .on('dblclick', nodeDoubleClick)
    .style('fill', '#fff')
    // .style('fill-opacity', '0.4')
    .style('fill-opacity', showExonsFlag ? '0.4' : '0.8')
    .style('stroke', 'black')
    .style('stroke-width', '2px')
    .append('svg:title')
        .text(d => d.name);
}

// draw seqence labels for nodes
function drawLabels() {
  if (nodeWidthOption === 0) {
    svg.selectAll('text')
      .data(nodes)
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

function filterObjectByAttribute(attribute, value) {
  return item => item[attribute] === value;
}

function drawTrackRectangles(rectangles, type) {
  if (typeof type === 'undefined') type = 'haplo';
  rectangles = rectangles.filter(filterObjectByAttribute('type', type));

  svg.selectAll('trackRectangles')
    .data(rectangles)
    .enter().append('rect')
    .attr('x', d => d.xStart)
    .attr('y', d => d.yStart)
    .attr('width', d => d.xEnd - d.xStart + 1)
    .attr('height', d => d.yEnd - d.yStart + 1)
    // .style('fill', function(d) { return color(d[4]); })
    .style('fill', d => d.color)
    // .style('fill', 'none')
    .attr('trackID', d => d.id)
    .attr('class', d => `track${d.id}`)
    .attr('color', d => d.color)
    .on('mouseover', trackMouseOver)
    .on('mouseout', trackMouseOut)
    .on('dblclick', trackDoubleClick);

  // drawEmptyRects(trackRectangles);
}

// just an experiment, didn't look good
/* function drawEmptyRects(trackRectangles) {
  svg.selectAll('trackLines')
    .data(trackRectangles)
    .enter().append('line')
    .attr('x1', function(d) { return d[0]; })
    .attr('y1', function(d) { return d[1] + 1; })
    .attr('x2', function(d) { return d[2] + 1; })
    .attr('y2', function(d) { return d[1] + 1; })
    .attr('stroke-width', '2px')
    //.style('stroke', 'red');
    .style('stroke', function(d) { return d[4]; });

  svg.selectAll('trackLines')
    .data(trackRectangles)
    .enter().append('line')
    .attr('x1', function(d) { return d[0]; })
    .attr('y1', function(d) { return d[3]; })
    .attr('x2', function(d) { return d[2] + 1; })
    .attr('y2', function(d) { return d[3]; })
    .attr('stroke-width', '2px')
    // .style('stroke', 'blue');
    .style('stroke', function(d) { return d[4]; });
}*/

function compareCurvesByLineChanges(a, b) {
  if (a[6] < b[6]) return -1;
  else if (a[6] > b[6]) return 1;
  return 0;
}

function defineSVGPatterns() {
  let pattern = svg.append('defs')
    .append('pattern')
    .attr({ id: 'patternA', width: '7', height: '7', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '7', height: '7', fill: '#FFFFFF' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '3', height: '3', fill: '#505050' });
  pattern.append('rect')
    .attr({ x: '0', y: '4', width: '3', height: '3', fill: '#505050' });
  pattern.append('rect')
    .attr({ x: '4', y: '0', width: '3', height: '3', fill: '#505050' });
  pattern.append('rect')
    .attr({ x: '4', y: '4', width: '3', height: '3', fill: '#505050' });

  pattern = svg.append('defs')
    .append('pattern')
    .attr({ id: 'patternB', width: '8', height: '8', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '8', height: '8', fill: '#FFFFFF' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '3', height: '3', fill: '#1f77b4' });
  pattern.append('rect')
    .attr({ x: '0', y: '5', width: '3', height: '3', fill: '#1f77b4' });
  pattern.append('rect')
    .attr({ x: '5', y: '0', width: '3', height: '3', fill: '#1f77b4' });
  pattern.append('rect')
    .attr({ x: '5', y: '5', width: '3', height: '3', fill: '#1f77b4' });

  pattern = svg.append('defs')
    .append('pattern')
    .attr({ id: 'plaid0', width: '6', height: '6', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '2', height: '2', fill: '#1f77b4' });
  pattern.append('rect')
    .attr({ x: '0', y: '4', width: '2', height: '2', fill: '#1f77b4' });
  pattern.append('rect')
    .attr({ x: '4', y: '0', width: '2', height: '2', fill: '#1f77b4' });
  pattern.append('rect')
    .attr({ x: '4', y: '4', width: '2', height: '2', fill: '#1f77b4' });

  pattern = svg.append('defs')
    .append('pattern')
    .attr({ id: 'plaid1', width: '6', height: '6', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '2', height: '2', fill: '#ff7f0e' });
  pattern.append('rect')
    .attr({ x: '0', y: '4', width: '2', height: '2', fill: '#ff7f0e' });
  pattern.append('rect')
    .attr({ x: '4', y: '0', width: '2', height: '2', fill: '#ff7f0e' });
  pattern.append('rect')
    .attr({ x: '4', y: '4', width: '2', height: '2', fill: '#ff7f0e' });

  pattern = svg.append('defs')
    .append('pattern')
    .attr({ id: 'plaid2', width: '6', height: '6', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '2', height: '2', fill: '#2ca02c' });
  pattern.append('rect')
    .attr({ x: '0', y: '4', width: '2', height: '2', fill: '#2ca02c' });
  pattern.append('rect')
    .attr({ x: '4', y: '0', width: '2', height: '2', fill: '#2ca02c' });
  pattern.append('rect')
    .attr({ x: '4', y: '4', width: '2', height: '2', fill: '#2ca02c' });

  pattern = svg.append('defs')
    .append('pattern')
    .attr({ id: 'plaid3', width: '6', height: '6', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '2', height: '2', fill: '#d62728' });
  pattern.append('rect')
    .attr({ x: '0', y: '4', width: '2', height: '2', fill: '#d62728' });
  pattern.append('rect')
    .attr({ x: '4', y: '0', width: '2', height: '2', fill: '#d62728' });
  pattern.append('rect')
    .attr({ x: '4', y: '4', width: '2', height: '2', fill: '#d62728' });

  pattern = svg.append('defs')
    .append('pattern')
    .attr({ id: 'plaid4', width: '6', height: '6', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '2', height: '2', fill: '#9467bd' });
  pattern.append('rect')
    .attr({ x: '0', y: '4', width: '2', height: '2', fill: '#9467bd' });
  pattern.append('rect')
    .attr({ x: '4', y: '0', width: '2', height: '2', fill: '#9467bd' });
  pattern.append('rect')
    .attr({ x: '4', y: '4', width: '2', height: '2', fill: '#9467bd' });

  pattern = svg.append('defs')
    .append('pattern')
    .attr({ id: 'plaid5', width: '6', height: '6', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '2', height: '2', fill: '#8c564b' });
  pattern.append('rect')
    .attr({ x: '0', y: '4', width: '2', height: '2', fill: '#8c564b' });
  pattern.append('rect')
    .attr({ x: '4', y: '0', width: '2', height: '2', fill: '#8c564b' });
  pattern.append('rect')
    .attr({ x: '4', y: '4', width: '2', height: '2', fill: '#8c564b' });
}

function drawTrackCurves(type) {
  if (typeof type === 'undefined') type = 'haplo';
  const myTrackCurves = trackCurves.filter(filterObjectByAttribute('type', type));

  myTrackCurves.sort(compareCurvesByLineChanges);

  myTrackCurves.forEach((curve) => {
    const xMiddle = (curve.xStart + curve.xEnd) / 2;
    let d = 'M ' + curve.xStart + ' ' + curve.yStart;
    d += ' C ' + xMiddle + ' ' + curve.yStart + ' ' + xMiddle + ' ' + curve.yEnd + ' ' + curve.xEnd + ' ' + curve.yEnd;
    d += ' V ' + (curve.yEnd + curve.width);
    d += ' C ' + xMiddle + ' ' + (curve.yEnd + curve.width) + ' ' + xMiddle + ' ' + (curve.yStart + curve.width) + ' ' + curve.xStart + ' ' + (curve.yStart + curve.width);
    d += ' Z';
    // curve.push(d);
    curve.path = d;
  });

  svg.selectAll('trackCurves')
    .data(trackCurves)
    .enter().append('path')
    .attr('d', d => d.path)
    // .style('fill', d => color(d[5]); })
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

  svg.selectAll('trackCorners')
    .data(corners)
    .enter().append('path')
    .attr('d', d => d.path)
    // .style('fill', d => color(d[1]); })
    .style('fill', d => d.color)
    .attr('trackID', d => d.id)
    .attr('class', d => `track${d.id}`)
    .attr('color', d => d.color)
    .on('mouseover', trackMouseOver)
    .on('mouseout', trackMouseOut)
    .on('dblclick', trackDoubleClick);
}

function drawLegend() {
  let content = '<table class="table table-condensed table-nonfluid"><thead><tr><th>Color</th><th>Trackname</th><th>Show Track</th></tr></thead>';
  const listeners = [];
  for (let i = 0; i < tracks.length; i += 1) {
    if (tracks[i].type === 'haplo') {
      // content += '<tr><td><span style="color: ' + generateTrackColor(tracks[i], 'exon') + '"><i class="fa fa-square" aria-hidden="true"></i></span></td>';
      content += '<tr><td><span style="color: ' + generateTrackColor(tracks[i], 'exon') + '"><span class="glyphicon glyphicon-stop" aria-hidden="true"></span></td>';
      if (tracks[i].hasOwnProperty('name')) {
        content += '<td>' + tracks[i].name + '</td>';
      } else {
        content += '<td>' + tracks[i].id + '</td>';
      }
      content += '<td><input type="checkbox" checked=true id="showTrack' + i + '"></td>';
      listeners.push(i);
    }
  }
  content += '</table';
  $('#legendDiv').html(content);
  listeners.forEach((i) => {
    document.getElementById(`showTrack${i}`).addEventListener('click', () => changeTrackVisibility(i), false);
  });
}

// Highlight track on mouseover
function trackMouseOver() {
  /* jshint validthis: true */
  const trackID = d3.select(this).attr('trackID');
  d3.selectAll('.track' + trackID).style('fill', 'url(#patternA)');
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
  d3.selectAll('.track' + trackID)
    .each(function clearTrackHighlight() {
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
function trackDoubleClick() { // Move clicked track to first position
  /* jshint validthis: true */
  const trackID = d3.select(this).attr('trackID');
  let index = 0;
  while (inputTracks[index].id !== trackID) index += 1;
  console.log('moving index: ' + index);
  moveTrackToFirstPosition(index);
  createTubeMap();
}

// Redraw with current node moved to beginning
function nodeDoubleClick() { // Move clicked track to first position
  /* jshint validthis: true */
  const nodeID = d3.select(this).attr('id');
  if (clickableNodesFlag) {
    document.getElementById('nodeID').value = nodeID;
    document.getElementById('postButton').click();
  }
}

// extract info about nodes from vg-json
export function vgExtractNodes(vg) {
  const result = [];
  vg.node.forEach((node) => {
    result.push({ name: '' + node.id, sequenceLength: node.sequence.length, seq: node.sequence });
    // console.log('name: ' + node.id + ', length: ' + node.sequence.length);
  });
  return result;
}

// calculated node widths depending on sequence lengths and chosen calculation method
function generateNodeWidth() {
  switch (nodeWidthOption) {
    case 1:
      nodes.forEach((node) => {
        if (node.hasOwnProperty('sequenceLength')) node.width = (1 + (Math.log(node.sequenceLength) / Math.log(2)));
        node.pixelWidth = Math.round((node.width - 1) * 8.401);
      });
      break;
    case 2:
      nodes.forEach((node) => {
        // if (node.hasOwnProperty('sequenceLength')) node.width = (1 + Math.log(node.sequenceLength) / Math.log(10));
        // node.pixelWidth = Math.round((node.width - 1) * 8.401);

        if (node.hasOwnProperty('sequenceLength')) node.width = (node.sequenceLength / 100);
        node.pixelWidth = Math.round((node.width - 1) * 8.401);
      });
      break;
    default:
      nodes.forEach((node) => {
        if (node.hasOwnProperty('sequenceLength')) node.width = node.sequenceLength;

        // get width of node's text label by writing label, measuring it and removing label
        svg.append('text')
          .attr('x', 0)
          .attr('y', 100)
          .attr('id', 'dummytext')
          .text(node.seq.substr(1))
          .attr('font-family', 'Courier, "Lucida Console", monospace')
          .attr('font-size', '14px')
          .attr('fill', 'black')
          .style('pointer-events', 'none');
        node.pixelWidth = Math.round(document.getElementById('dummytext').getComputedTextLength());
        $('#dummytext').remove();
      });
  }
}

// extract track info from vg-json
export function vgExtractTracks(vg) {
  const result = [];
  vg.path.forEach((path, index) => {
    const sequence = [];
    let isCompletelyReverse = true;
    path.mapping.forEach((pos) => {
      if ((pos.position.hasOwnProperty('is_reverse')) && (pos.position.is_reverse === true)) {
        sequence.push('-' + pos.position.node_id);
      } else {
        sequence.push('' + pos.position.node_id);
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
    result.push(track);
  });
  return result;
}

function compareReadsByLeftEnd(a, b) {
  /* if (a.hasOwnProperty('order')) {
    if (b.hasOwnProperty('order')) {
      if (a.order < b.order) return -1;
      else if (a.order > b.order) return 1;
      else return 0;
    } else return -1;
  } else {
    if (b.hasOwnProperty('order')) return 1;
    else return 0;
  } */
  let leftNodeA;
  let leftNodeB;
  // let leftNodeAForward = true;
  // let leftNodeBForward = true;
  let leftIndexA;
  let leftIndexB;

  if (a.sequence[0].charAt(0) === '-') {
    if (a.sequence[a.sequence.length - 1].charAt(0) === '-') {
      leftNodeA = a.sequence[a.sequence.length - 1].substr(1);
      // leftNodeAForward = false;
      leftIndexA = nodes[nodeMap.get(leftNodeA)].sequenceLength - a.finalNodeCoverLength;
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
      // leftNodeBForward = false;
      leftIndexB = nodes[nodeMap.get(leftNodeB)].sequenceLength - b.finalNodeCoverLength;
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

export function vgExtractReads(myTracks, myReads) {
  const extracted = [];

  for (let i = 0; i < myReads.length; i += 1) {
  // for (let i = 2; i < 6; i += 1) {
    if (myReads[i].length > 0) {
      const read = JSON.parse(myReads[i]);
      const sequence = [];
      read.path.mapping.forEach((pos) => {
        if ((pos.position.hasOwnProperty('is_reverse')) && (pos.position.is_reverse === true)) {
          sequence.push('-' + pos.position.node_id);
        } else {
          sequence.push('' + pos.position.node_id);
        }
      });

      const track = {};
      track.id = myTracks.length + extracted.length;
      track.sequence = sequence;
      track.type = 'read';
      if (read.path.hasOwnProperty('freq')) track.freq = read.path.freq;
      if (read.path.hasOwnProperty('name')) track.name = read.path.name;

      track.firstNodeOffset = 0;
      if (read.path.mapping[0].position.hasOwnProperty('offset')) {
        track.firstNodeOffset = read.path.mapping[0].position.offset;
      }

      const finalNodeEdit = read.path.mapping[read.path.mapping.length - 1].edit;
      track.finalNodeCoverLength = 0;
      if (read.path.mapping[read.path.mapping.length - 1].position.hasOwnProperty('offset')) {
        track.finalNodeCoverLength += read.path.mapping[read.path.mapping.length - 1].position.offset;
      }
      finalNodeEdit.forEach((edit) => {
        if (edit.hasOwnProperty('from_length')) {
          track.finalNodeCoverLength += edit.from_length;
        }
      });

      extracted.push(track);
    }
  }
  // console.log('READS:');
  // console.log(tracks);

  // extracted.sort(compareReadsByLeftEnd);

  // tracks = tracks.concat(extracted);
  // return tracks;

  return extracted;
}

// remove redundant nodes
// two nodes A and B can be merged if all tracks leaving A go directly into B
// and all tracks entering B come directly from A
// (plus no inversions involved)
function mergeNodes() {
  let nodeName;
  let nodeName2;
  const pred = [];
  const succ = [];
  for (let i = 0; i < nodes.length; i += 1) {
    pred.push(new Set());
    succ.push(new Set());
  }
  nodeMap = generateNodeMap(nodes);
  console.log('map:');
  console.log(nodeMap);

  tracks.forEach((track) => {
    if (track.type === 'haplo') {
      for (let i = 0; i < track.sequence.length; i += 1) {
        if (track.sequence[i].charAt(0) !== '-') {  // forward Node
          if (i > 0) {
            nodeName = track.sequence[i - 1];
            pred[nodeMap.get(track.sequence[i])].add(nodeName);
            if (nodeName.charAt(0) === '-') { // add 2 predecessors, to make sure there is no node merging in this case
              pred[nodeMap.get(track.sequence[i])].add(nodeName.substr(1));
            }
          } else {
            pred[nodeMap.get(track.sequence[i])].add('None');
          }
          if (i < track.sequence.length - 1) {
            nodeName = track.sequence[i + 1];
            succ[nodeMap.get(track.sequence[i])].add(nodeName);
            if (nodeName.charAt(0) === '-') { // add 2 successors, to make sure there is no node merging in this case
              succ[nodeMap.get(track.sequence[i])].add(nodeName.substr(1));
            }
          } else {
            succ[nodeMap.get(track.sequence[i])].add('None');
          }
        } else { // reverse Node
          nodeName = track.sequence[i].substr(1);
          if (i > 0) {
            nodeName2 = track.sequence[i - 1];
            if (nodeName2.charAt(0) === '-') {
              succ[nodeMap.get(nodeName)].add(nodeName2.substr(1));
            } else { // add 2 successors, to make sure there is no node merging in this case
              succ[nodeMap.get(nodeName)].add(nodeName2);
              succ[nodeMap.get(nodeName)].add('-' + nodeName2);
            }
          } else {
            succ[nodeMap.get(nodeName)].add('None');
          }
          if (i < track.sequence.length - 1) {
            nodeName2 = track.sequence[i + 1];
            if (nodeName2.charAt(0) === '-') {
              pred[nodeMap.get(nodeName)].add(nodeName2.substr(1));
            } else {
              pred[nodeMap.get(nodeName)].add(nodeName2);
              pred[nodeMap.get(nodeName)].add('-' + nodeName2);
            }
          } else {
            pred[nodeMap.get(nodeName)].add('None');
          }
        }
      }
    }
  });

  // convert sets to arrays
  for (let i = 0; i < nodes.length; i += 1) {
    succ[i] = Array.from(succ[i]);
    pred[i] = Array.from(pred[i]);
  }

  /* console.log('pred');
  console.log(pred);
  console.log('succ');
  console.log(succ);
  for (i = 0; i < nodes.length; i += 1) {
    console.log(i + ': ' + mergeableWithPred(i, pred, succ) + ' ' + mergeableWithSucc(i, pred, succ));
  }*/

  // update node sequences + sequence lengths
  for (let i = 0; i < nodes.length; i += 1) {
    if (mergeableWithSucc(i, pred, succ) && !mergeableWithPred(i, pred, succ)) {
      // if ((pred[i].length > 1) || (pred[i][0] === 'None')) { // node has multiple predecessors
        // --> node is at the left end of (potentially multiple) mergers
      let donor = i;
      while (mergeableWithSucc(donor, pred, succ)) {
        donor = succ[donor][0];
        if (donor.charAt(0) === '-') donor = donor.substr(1);
        donor = nodeMap.get(donor);

        // console.log('Adding node ' + donor + ' to node ' + i);
        if (nodes[i].hasOwnProperty('sequenceLength')) {
          nodes[i].sequenceLength += nodes[donor].sequenceLength;
        } else {
          nodes[i].width += nodes[donor].width;
        }
        nodes[i].seq += nodes[donor].seq;
      }
      // }
    }
  }

  // actually merge the nodes by removing the corresponding nodes from track data
  tracks.forEach((track) => {
    for (let i = track.sequence.length - 1; i >= 0; i -= 1) {
      nodeName = track.sequence[i];
      if (nodeName.charAt(0) === '-') nodeName = nodeName.substr(1);
      const nodeIndex = nodeMap.get(nodeName);
      if (mergeableWithPred(nodeIndex, pred, succ)) {
        // console.log('removing node ' + nodeName + ' from track:' + i);
        track.sequence.splice(i, 1);
      }
    }
    // console.log(track.sequence);
  });

  // remove the nodes from node-array
  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    if (mergeableWithPred(i, pred, succ)) {
      // console.log('removing node ' + i);
      nodes.splice(i, 1);
    }
  }
  // console.log('done merging');
  return { nodes, tracks };
}

function mergeableWithPred(index, pred, succ) {
  if (pred[index].length !== 1) return false;
  if (pred[index][0] === 'None') return false;
  let predecessor = pred[index][0];
  if (predecessor.charAt(0) === '-') predecessor = predecessor.substr(1);
  const predecessorIndex = nodeMap.get(predecessor);
  if (succ[predecessorIndex].length !== 1) return false;
  if (succ[predecessorIndex][0] === 'None') return false;
  return true;
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
