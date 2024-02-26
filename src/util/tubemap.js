/* eslint no-param-reassign: "off" */
/* eslint no-lonely-if: "off" */
/* eslint no-prototype-builtins: "off" */
/* eslint no-console: "off" */
/* eslint no-continue: "off" */

/* eslint max-len: "off" */
/* eslint no-loop-func: "off" */
/* eslint no-unused-vars: "off" */
/* eslint no-return-assign: "off" */
import * as d3 from "d3";
import "d3-selection-multi";
import "../config-client.js";
import externalConfig from "../config-global.mjs";
import { defaultTrackColors } from "../common.mjs";

const deepEqual = require("deep-equal");

const DEBUG = false;

const greys = [
  "#d9d9d9",
  "#bdbdbd",
  "#969696",
  "#737373",
  "#525252",
  "#252525",
  "#000000",
];

// Greys but with a special color for the first thing.
const ygreys = [
  "#9467bd",
  "#d9d9d9",
  "#bdbdbd",
  "#969696",
  "#737373",
  "#525252",
  "#252525",
  "#000000",
];

const blues = [
  "#c6dbef",
  "#9ecae1",
  "#6baed6",
  "#4292c6",
  "#2171b5",
  "#08519c",
  "#08306b",
];

const reds = [
  "#fcbba1",
  "#fc9272",
  "#fb6a4a",
  "#ef3b2c",
  "#cb181d",
  "#a50f15",
  "#67000d",
];

// d3 category10
const plainColors = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf",
];

// d3 category10
const lightColors = [
  "#ABCCE3",
  "#FFCFA5",
  "#B0DBB0",
  "#F0AEAE",
  "#D7C6E6",
  "#C6ABA5",
  "#F4CCE8",
  "#CFCFCF",
  "#E6E6AC",
  "#A8E7ED",
];

// Font stack we will use in the SVG
// We start with Courier New because it exists a lot more places than
// "Courier", and because tools like Inkscape can't interpret the text properly
// if they don't have the first font named here.
const fonts = '"Courier New", "Courier", "Lucida Console", monospace';

let svgID; // the (html-tag) ID of the svg
let svg; // the svg
export let zoom; // eslint-disable-line import/no-mutable-exports
let inputNodes = [];
let inputTracks = [];
let inputReads = [];
let inputRegion = [];
let nodes;
// Each track has a `path`, which is an array of objects describing pieces of the path that need to be drawn, in order along the path. The objects in the path are Segment objects and have fields:
//
// * order: horizontal order number at which this piece of the track's path should be drawn.
// * lane: vertical lane that this piece of the track's path should be drawn at, or null if not yet assigned.
// * isForward: true if the track is running left to right here, false if it is running right to left.
// * node: the node being visited, or null if this piece of the track is outside nodes.
let tracks;
// Each read also has a `path` list of objects (here Elements) with `order`, `isForward`, and `node` fields, but there is no `lane` field; reads are organized vertically using a completely different system than non-read tracks.
let reads;
let numberOfNodes;
let numberOfTracks;
let nodeMap; // maps node names to node indices
let nodesPerOrder;
// Contains info about lane assignments for tracks, in one list for each horizontal "order" slot.
// Each entry is an Assignment, which is a list of NodeAssignment objects.
// A NodeAssignment object is:
//
// * type: can be "single" (if only one track visits the node) or "multiple" (if multiple tracks visit the node)
// * node: the node index in nodes that the Assignment belongs to, or null if the Assignment is for a region outside of any node.
// * tracks: a list of SegmentAssignment objects
//
// A SegmentAssignment object contains:
//
// * trackID: the number of the track that the SegmentAssignment represents a piece of.
// * segmentID: the number along all that track's Segments in the track's `path` that is assigned here.
// * compareToFromSame: any earlier SegmentAssignment for this track in this order slot, or null. TODO: This is never used.
//
// This is all duplicative with the tracks' `path` lists, but is organized by order slot instead of by track.
// This is NOT used for reads! Reads use their own system.
let assignments = [];
let extraLeft = []; // info whether nodes have to be moved further apart because of multiple 180° directional changes at the same horizontal order
let extraRight = []; // info whether nodes have to be moved further apart because of multiple 180° directional changes at the same horizontal order
let maxOrder; // horizontal order of the rightmost node

const config = {
  mergeNodesFlag: true,
  transparentNodesFlag: false,
  clickableNodesFlag: false,
  showExonsFlag: false,
  // Options for the width of sequence nodes:
  // 0...scale node width linear with number of bases within node
  // 1...scale node width with log2 of number of bases within node
  // 2...scale node width with log10 of number of bases within node
  nodeWidthOption: 0,
  showReads: true,
  showSoftClips: true,
  colorSchemes: {},
  // colors corresponds with tracks(input files), [haplotype, read1, read2, ...]
  exonColors: "lightColors",
  hideLegendFlag: false,
  mappingQualityCutoff: 0,
  showInfoCallback: function (info) {
    alert(info);
  },
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
  // mandatory parameters: svgID (really a selector, but must be an ID selector), nodes, tracks
  // optional parameters: bed, clickableNodes, reads, showLegend
  svgID = params.svgID;
  svg = d3.select(params.svgID);
  inputNodes = deepCopy(params.nodes); // deep copy
  // Nodes are referenced in inputs by internal `name` attribute and not by index.
  // Internally in e.g. a path's indexSequence we need to reference nodes by *signed* index.
  // Which means that index 0 can never be allowed to be used, so we need to make sure it is not there.
  // So budge everything down
  inputNodes.unshift(undefined);
  // And then leave a hole in the array at 0 which we won't iterate over.
  delete inputNodes[0];
  inputTracks = deepCopy(params.tracks); // deep copy
  inputReads = params.reads || null;
  inputRegion = params.region;
  bed = params.bed || null;
  config.clickableNodesFlag = params.clickableNodes || false;
  config.hideLegendFlag = params.hideLegend || false;
  const tr = createTubeMap();
  if (!config.hideLegendFlag) drawLegend(tr);
}

// Deep copy something, but preserve array holes at the top level
function deepCopy(val) {
  let newVal = JSON.parse(JSON.stringify(val));
  for (let prop of Object.keys(newVal)) {
    if (!Object.hasOwn(val, prop)) {
      // This should be a hole, so punch it
      delete newVal[prop];
    }
  }
  return newVal;
}

// Return true if the given name names a reverse strand node, and false otherwise.
function isReverse(nodeName) {
  const s = String(nodeName);
  return s.length >= 1 && s.charAt(0) === "-";
}

// Get the forward version of a node name, which may be either forward or backward (negative)
function forward(nodeName) {
  if (isReverse(nodeName)) {
    // It looks like a negative value.
    // Make sure it's a string and cut off the -.
    return String(nodeName).substr(1);
  } else {
    // It's forward.
    return nodeName;
  }
}

// Get the reverse version of a node name, which may be either forward or backward (negative)
function reverse(nodeName) {
  if (isReverse(nodeName)) {
    return nodeName;
  } else {
    return `-${nodeName}`;
  }
}

// Get the opposite orientation node name for the given node.
function flip(nodeName) {
  if (isReverse(nodeName)) {
    return forward(nodeName);
  } else {
    return reverse(nodeName);
  }
}

// moves a specific track to the top
function moveTrackToFirstPosition(index) {
  inputTracks.unshift(inputTracks[index]); // add element to beginning
  inputTracks.splice(index + 1, 1); // remove 1 element from the middle
  straightenTrack(0);
}

// straighten track given by index by inverting inverted nodes
// only keep them inverted if this single track runs thrugh them in both directions
// TODO: This operates on `inputNodes`, etc. when it probably ought to operate on `nodes`
function straightenTrack(index) {
  let i;
  let j;
  const nodesToInvert = [];
  let currentSequence;
  let nodeName;

  // find out which nodes should be inverted
  currentSequence = inputTracks[index].sequence;
  for (i = 0; i < currentSequence.length; i += 1) {
    if (isReverse(currentSequence[i])) {
      nodeName = forward(currentSequence[i]);
      if (
        currentSequence.indexOf(nodeName) === -1 ||
        currentSequence.indexOf(nodeName) > i
      ) {
        // only if this inverted node is no repeat
        nodesToInvert.push(nodeName);
      }
    }
  }

  // invert nodes in the tracks' sequence
  for (i = 0; i < inputTracks.length; i += 1) {
    currentSequence = inputTracks[i].sequence;
    for (j = 0; j < currentSequence.length; j += 1) {
      if (!isReverse(currentSequence[j])) {
        if (nodesToInvert.indexOf(currentSequence[j]) !== -1) {
          currentSequence[j] = reverse(currentSequence[j]);
        }
      } else if (nodesToInvert.indexOf(forward(currentSequence[j])) !== -1) {
        currentSequence[j] = forward(currentSequence[j]);
      }
    }
  }

  // invert the sequence within the nodes
  inputNodes.forEach((node) => {
    if (nodesToInvert.indexOf(node.name) !== -1) {
      node.seq = node.seq.split("").reverse().join("");
    }
  });
}

export function changeTrackVisibility(trackID) {
  let i = 0;
  while (i < inputTracks.length && inputTracks[i].id !== trackID) i += 1;
  if (i < inputTracks.length) {
    if (inputTracks[i].hasOwnProperty("hidden")) {
      inputTracks[i].hidden = !inputTracks[i].hidden;
    } else {
      inputTracks[i].hidden = true;
    }
  }
  createTubeMap();
}

// to select/deselect all
export function changeAllTracksVisibility(value) {
  let i = 0;
  while (i < inputTracks.length) {
    inputTracks[i].hidden = !value;
    var checkbox = document.getElementById(`showTrack${i}`);
    checkbox.checked = value;
    i += 1;
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

export function setColorSet(fileID, newColor) {
  const currColor = config.colorSchemes[fileID];
  // update if any coloring parameter is different
  if (!currColor || !deepEqual(currColor, newColor)) {
    config.colorSchemes[fileID] = newColor;
    const tr = createTubeMap();
    if (!config.hideLegendFlag && tracks) drawLegend(tr);
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

export function setColoredNodes(value) {
  config.coloredNodes = value;
}

// sets callback function that would generate React popup of track information. The callback would
// accept an array argument of track attribute pairs containing attribute name as a string and attribute value
// as a string or number, to be displayed.
export function setInfoCallback(newCallback) {
  config.showInfoCallback = newCallback;
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
  console.log("Recreating tube map in", svgID);
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
  svg.selectAll("*").remove(); // clear svg for (re-)drawing

  // early exit is necessary when visualization options such as colors are
  // changed before any graph has been rendered
  if (inputNodes.length === 0 || inputTracks.length === 0) return;

  straightenTrack(0);
  nodes = deepCopy(inputNodes); // deep copy (can add stuff to copy and leave original unchanged)
  tracks = deepCopy(inputTracks);
  reads = deepCopy(inputReads);

  reads = filterReads(reads);

  for (let i = tracks.length - 1; i >= 0; i -= 1) {
    if (!tracks[i].hasOwnProperty("type")) {
      // TODO: maybe remove "haplo"-property?
      tracks[i].type = "haplo";
    }
    if (tracks[i].hasOwnProperty("hidden")) {
      if (tracks[i].hidden === true) {
        tracks.splice(i, 1);
      }
    }
    if (tracks[i] && tracks[i].hasOwnProperty("indexOfFirstBase")) {
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
  switchNodeOrientation();
  generateNodeOrder(nodes, tracks);
  maxOrder = getMaxOrder();

  calculateTrackWidth(tracks);
  generateLaneAssignment();

  if (config.showExonsFlag === true && bed !== null) addTrackFeatures();

  if (reads && config.showReads) {
    generateReadOnlyNodeAttributes();
    reverseReversedReads();
    generateTrackIndexSequences(reads);
    placeReads();
    tracks = tracks.concat(reads);
    // we do not have any reads to display
  } else {
    nodes.forEach((node) => {
      node.incomingReads = [];
      node.outgoingReads = [];
      node.internalReads = [];
    });
  }

  generateNodeXCoords();

  generateSVGShapesFromPath(nodes, tracks);
  if (DEBUG) {
    console.log("Tracks:");
    console.log(tracks);
    console.log("Nodes:");
    console.log(nodes);
    console.log("Lane assignment:");
    console.log(assignments);
  }
  getImageDimensions();
  alignSVG(nodes, tracks);
  defineSVGPatterns();

  // all drawn tracks are grouped
  let trackGroup = svg.append("g").attr("class", "track");
  drawTrackRectangles(trackRectangles, "haplo", trackGroup);
  drawTrackCurves("haplo", trackGroup);
  drawReversalsByColor(
    trackCorners,
    trackVerticalRectangles,
    "haplo",
    trackGroup
  );
  drawTrackRectangles(trackRectanglesStep3, "haplo", trackGroup);
  drawTrackRectangles(trackRectangles, "read", trackGroup);
  drawTrackCurves("read", trackGroup);

  // draw only those nodes which have coords assigned to them
  const dNodes = removeUnusedNodes(nodes);
  drawReversalsByColor(
    trackCorners,
    trackVerticalRectangles,
    "read",
    trackGroup
  );

  // all drawn nodes are grouped
  let nodeGroup = svg.append("g").attr("class", "node");
  drawNodes(dNodes, nodeGroup);
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
  nodes.forEach((node) => {
    if (node.hasOwnProperty("order") && node.hasOwnProperty("y")) {
      setMapToMax(orderY, node.order, node.y + node.contentHeight);
    }
  });

  // for order values where there is no node with haplotypes, orderY is calculated via tracks
  tracks.forEach((track) => {
    if (track.type === "haplo") {
      track.path.forEach((step) => {
        setMapToMax(orderY, step.order, step.y + track.width);
      });
    }
  });

  nodes.forEach((node, i) => {
    if (node.hasOwnProperty("order") && !node.hasOwnProperty("y")) {
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

const READ_WIDTH = 7;

// add info about reads to nodes (incoming, outgoing and internal reads)
function assignReadsToNodes() {
  nodes.forEach((node) => {
    node.incomingReads = [];
    node.outgoingReads = [];
    node.internalReads = [];
  });
  reads.forEach((read, idx) => {
    read.width = READ_WIDTH;
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
  reads.forEach((read) => {
    for (let i = read.sequence.length - 1; i >= 0; i -= 1) {
      let nodeName = forward(read.sequence[i]);
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

  // Organize read IDs by source track
  let readsBySource = {};
  for (let i = 0; i < reads.length; i++) {
    let source = reads[i].sourceTrackID;
    if (readsBySource[source] === undefined) {
      // First read from this source
      readsBySource[source] = [i];
    } else {
      // Put it with the others from this source
      readsBySource[source].push(i);
    }
  }

  let allSources = Object.keys(readsBySource);
  allSources.sort((a, b) => Number(a) - Number(b));

  console.log("All sources: ", allSources);

  // Space out read tracks if multiple exist
  let topMargin = allSources.length > 1 ? READ_WIDTH : 0;
  for (let source of allSources) {
    // Go through all source tracks in order
    sortedNodes.forEach((node) => {
      // And for each node, place these reads in it.
      // Use a margin to separate multiple read tracks if we have them.
      placeReadSet(readsBySource[source], node, topMargin);
    });
  }

  // place read segments which are without node
  const bottomY = calculateBottomY();
  const elementsWithoutNode = [];
  reads.forEach((read, idx) => {
    read.path.forEach((element, pathIdx) => {
      if (!element.hasOwnProperty("y")) {
        // previous y value from pathIdx - 1 might not exist yet if that segment is also without node 
        // use previous y value from last segment with node instead 
        let lastIndex = pathIdx - 1;
        let previousVisitToNode;
        while ((previousVisitToNode?.node === null || !previousVisitToNode?.node) && lastIndex >= 0) {
          previousVisitToNode = reads[idx].path[lastIndex];
          lastIndex = lastIndex - 1;
        }

        let previousValidY = previousVisitToNode?.y;

        // sometimes, elements without nodes are between 2 segments going to a node we've already visited, from the same direction
        // this means we're looping back to a node we've already been to, and we should sort in reverse
        
        // Find the next node in our path
        let nextPathIndex = pathIdx + 1
        let nextVisitToNode = reads[idx].path[nextPathIndex];
        while ((nextVisitToNode?.node === null || !nextVisitToNode?.node) && nextPathIndex < reads[idx].path.length) {
          nextVisitToNode = reads[idx].path[nextPathIndex];
          nextPathIndex = nextPathIndex + 1;
        }

        // Specifically referring to segments between a cycle that's traversing from right to left
        let betweenCycleReverseTraversal = 
        // A segment can be between a cycle if it there are nodes on both sides
        (nextVisitToNode && previousVisitToNode) &&
        // Make sure the visitToNode objects are what we expect
        (typeof previousVisitToNode.order !== "undefined" && typeof nextVisitToNode.order !== "undefined" && typeof nextVisitToNode.isForward !== "undefined" && typeof previousVisitToNode.isForward !== "undefined") &&
        // A segment is between a cycle if the next node it visits is behind the previous node it visited
        ((previousVisitToNode.order > nextVisitToNode.order) ||
        // A segment can also be between a cycle if it's visiting the same node it just visited in the same direction
        (nextVisitToNode.order === previousVisitToNode.order && nextVisitToNode.isForward === previousVisitToNode.isForward));

        reads[idx].path[pathIdx].betweenCycleReverseTraversal = betweenCycleReverseTraversal;

        elementsWithoutNode.push({
          readIndex: idx,
          pathIndex: pathIdx,
          previousY: previousValidY,
        });
      }
    });
  });

  elementsWithoutNode.sort(compareNoNodeReadsByPreviousY);
  elementsWithoutNode.forEach((element) => {
    const segment = reads[element.readIndex].path[element.pathIndex];
    segment.y = bottomY[segment.order];
    bottomY[segment.order] += reads[element.readIndex].width;
  });

  if (DEBUG) {
    console.log("Reads:");
    console.log(reads);
  }
}

// Place a particular collection of reads, identified by a list of read
// numbers, into the given node at the right Y coordinates. All reads in all
// nodes above it, and no reads in any nodes below it, are already placed.
// Makes the given node bigger if needed and moves other nodes down if needed.
// If topMargin is set, applies that amount of spacing down from whatever is above the reads.
function placeReadSet(readIDs, node, topMargin) {
  // Parse arguments
  if (!topMargin) {
    topMargin = 0;
  }

  // Turn the read IDs into a set
  let toPlace = new Set(readIDs);

  // Get arrays of the read entry/exit/internal-ness records we want to work on
  let incomingReads = node.incomingReads.filter(([readID, pathIndex]) =>
    toPlace.has(readID)
  );
  let outgoingReads = node.outgoingReads.filter(([readID, pathIndex]) =>
    toPlace.has(readID)
  );
  let internalReads = node.internalReads.filter((readID) =>
    toPlace.has(readID)
  );

  // Only actually use the top margin if we have any reads on the node.
  if (
    incomingReads.length === 0 &&
    outgoingReads.length === 0 &&
    internalReads.length === 0
  ) {
    topMargin = 0;
  }

  // Determine where we start vertically in the node.
  // TODO: Why do we have to double this to keep reads out of adjacent lanes???
  let startY = node.y + node.contentHeight + topMargin * 2;

  // sort incoming reads
  incomingReads.sort(compareReadIncomingSegmentsByComingFrom);

  // place incoming reads
  let currentY = startY;
  const occupiedUntil = new Map();
  incomingReads.forEach((readElement) => {
    reads[readElement[0]].path[readElement[1]].y = currentY;
    setOccupiedUntil(
      occupiedUntil,
      reads[readElement[0]],
      readElement[1],
      currentY,
      node
    );
    currentY += READ_WIDTH;
  });
  let maxY = currentY;

  // sort outgoing reads
  outgoingReads.sort(compareReadOutgoingSegmentsByGoingTo);

  // place outgoing reads
  const occupiedFrom = new Map();
  currentY = startY;
  outgoingReads.forEach((readElement) => {
    // place in next lane
    reads[readElement[0]].path[readElement[1]].y = currentY;
    occupiedFrom.set(currentY, reads[readElement[0]].firstNodeOffset);
    // if no conflicts
    if (
      !occupiedUntil.has(currentY) ||
      occupiedUntil.get(currentY) + 1 < reads[readElement[0]].firstNodeOffset
    ) {
      currentY += READ_WIDTH;
      maxY = Math.max(maxY, currentY);
    } else {
      // otherwise push down incoming reads to make place for outgoing Read
      occupiedUntil.set(currentY, 0);
      incomingReads.forEach((incReadElementIndices) => {
        const incRead = reads[incReadElementIndices[0]];
        const incReadPathElement = incRead.path[incReadElementIndices[1]];
        if (incReadPathElement.y >= currentY) {
          incReadPathElement.y += READ_WIDTH;
          setOccupiedUntil(
            occupiedUntil,
            incRead,
            incReadElementIndices[1],
            incReadPathElement.y,
            node
          );
        }
      });
      currentY += READ_WIDTH;
      maxY += READ_WIDTH;
    }
  });

  // sort internal reads
  internalReads.sort(compareInternalReads);

  // place internal reads
  internalReads.forEach((readIdx) => {
    const currentRead = reads[readIdx];
    currentY = startY;
    while (
      currentRead.firstNodeOffset < occupiedUntil.get(currentY) + 2 ||
      currentRead.finalNodeCoverLength > occupiedFrom.get(currentY) - 3
    ) {
      currentY += READ_WIDTH;
    }
    currentRead.path[0].y = currentY;
    occupiedUntil.set(currentY, currentRead.finalNodeCoverLength);
    maxY = Math.max(maxY, currentY);
  });

  // adjust node height and move other nodes vertically down
  const heightIncrease = maxY - node.y - node.contentHeight;
  node.contentHeight += heightIncrease;
  adjustVertically3(node, heightIncrease);
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
    // We want to sort in reverse order when the segment is along the reverse-going part of a cycle.
    // This ensures a loop that starts on the outside, stays on the outside,
    // and rolls up in order with other loops.
    if (segmentA?.betweenCycleReverseTraversal && segmentB?.betweenCycleReverseTraversal) {
      return b.previousY - a.previousY;
    } else {
      return a.previousY - b.previousY;
    }
  }
  return segmentA.order - segmentB.order;
}

// compare read segments by where they are going to
function compareReadOutgoingSegmentsByGoingTo([readIndexA, pathIndexA], [readIndexB, pathIndexB]) {
  // Expect two arrays both containing 2 integers.
  // The first index of each array contains the read index
  // The second index of each array contains the path index

  // Segments are first sorted by the y value of their last node,
  // then by the node they end on,
  // then by length in final node
  let previousValidYA = null;
  let previousValidYB = null;
  let lastPathIndexA = reads[readIndexA].path.length - 1;
  let lastPathIndexB = reads[readIndexB].path.length - 1;
  while ((previousValidYA === null || !previousValidYA) && lastPathIndexA >= 0) {
    previousValidYA = reads[readIndexA].path[lastPathIndexA].y;
    lastPathIndexA -= 1;
  }
  while ((previousValidYB === null || !previousValidYB) && lastPathIndexB >= 0) {
    previousValidYB = reads[readIndexB].path[lastPathIndexB].y;
    lastPathIndexB -= 1;
  }
  
  if (previousValidYA && previousValidYB) {
    return previousValidYA - previousValidYB;
  }

  // Couldn't find a valid y value for at least one of the reads, sort by which node reads end on
  let nodeA = nodes[reads[readIndexA].path[pathIndexA].node];
  let nodeB = nodes[reads[readIndexB].path[pathIndexB].node];
  // Follow the reads' paths until we find the node they diverge at
  // Or, they go through all the same nodes and we do a tiebreaker at the end
  while (nodeA !== null && nodeB !== null && nodeA === nodeB) {
    if (pathIndexA < reads[readIndexA].path.length - 1) {
      pathIndexA += 1;
      while (reads[readIndexA].path[pathIndexA].node === null) pathIndexA += 1; // skip null nodes in path
      nodeA = nodes[reads[readIndexA].path[pathIndexA].node]; // the next node a is going to
    } else {
      nodeA = null;
    }
    if (pathIndexB < reads[readIndexB].path.length - 1) {
      pathIndexB += 1;
      while (reads[readIndexB].path[pathIndexB].node === null) pathIndexB += 1; // skip null nodes in path
      nodeB = nodes[reads[readIndexB].path[pathIndexB].node]; // the next node b is going to
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
  const beginDiff = reads[readIndexA].firstNodeOffset - reads[readIndexB].firstNodeOffset;
  if (beginDiff !== 0) return beginDiff;

  // break tie: both reads cover the same nodes and begin at the same position

  // One or both reads didn't have a previously valid Y value, compare by the endPosition of the read
  return reads[readIndexA].finalNodeCoverLength - reads[readIndexB].finalNodeCoverLength;
}

// compare read segments by (y-coord of) where they are coming from
function compareReadIncomingSegmentsByComingFrom(a, b) {
  // these boundary conditions avoid errors for incoming reads
  // from inverted nodes (u-turns)
  if (a[1] === 0) return -1;
  if (b[1] === 0) return 1;

  const pathA = reads[a[0]].path[a[1] - 1];
  const pathB = reads[b[0]].path[b[1] - 1];
  if (pathA.hasOwnProperty("y")) {
    if (pathB.hasOwnProperty("y")) {
      return pathA.y - pathB.y; // a and b have y-property
    }
    return -1; // only a has y-property
  }
  if (pathB.hasOwnProperty("y")) {
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

  nodes.forEach((node) => {
    bottomY[node.order] = Math.max(
      bottomY[node.order],
      node.y + node.contentHeight + 20
    );
  });

  tracks.forEach((track) => {
    track.path.forEach((element) => {
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
// TODO: Duplicates a lot of the same work as generateLaneAssignment() does for non-read tracks.
function generateBasicPathsForReads() {
  let currentNodeIndex;
  let currentNodeIsForward;
  let currentNode;
  let previousNode;
  let previousNodeIsForward;
  const isPositive = (n) => ((n = +n) || 1 / n) >= 0;

  reads.forEach((read) => {
    // add info for start of track
    currentNodeIndex = Math.abs(read.indexSequence[0]);
    currentNodeIsForward = isPositive(read.indexSequence[0]);
    currentNode = nodes[currentNodeIndex];

    read.path = [];
    read.path.push({
      order: currentNode.order,
      isForward: currentNodeIsForward,
      node: currentNodeIndex,
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
            node: null,
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
            node: null,
          });
          read.path.push({
            order: currentNode.order,
            isForward: false,
            node: currentNodeIndex,
          });
        } else {
          // current Node forward
          read.path.push({
            order: currentNode.order,
            isForward: true,
            node: currentNodeIndex,
          });
        }
      } else if (currentNode.order < previousNode.order) {
        if (previousNodeIsForward) {
          // turnaround from fw to bw at previous node
          read.path.push({
            order: previousNode.order,
            isForward: false,
            node: null,
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
            node: null,
          });
          read.path.push({
            order: currentNode.order,
            isForward: true,
            node: currentNodeIndex,
          });
        } else {
          // backward at current node
          read.path.push({
            order: currentNode.order,
            isForward: false,
            node: currentNodeIndex,
          });
        }
      } else {
        if (currentNodeIsForward !== previousNodeIsForward) {
          read.path.push({
            order: currentNode.order,
            isForward: currentNodeIsForward,
            node: currentNodeIndex,
          });
        } else {
          read.path.push({
            order: currentNode.order,
            isForward: !currentNodeIsForward,
            node: null,
          });
          read.path.push({
            order: currentNode.order,
            isForward: currentNodeIsForward,
            node: currentNodeIndex,
          });
        }
      }
    }
  });
}

// reverse reads which are reversed
function reverseReversedReads() {
  reads.forEach((read) => {
    let pos = 0;
    while (pos < read.sequence.length && read.sequence[pos].charAt(0) === "-") {
      pos += 1;
    }
    if (pos === read.sequence.length) {
      // completely reversed read
      read.is_reverse = true;
      read.sequence = read.sequence.reverse(); // invert sequence
      for (let i = 0; i < read.sequence.length; i += 1) {
        read.sequence[i] = forward(read.sequence[i]); // visit nodes forward
        // TODO: Do we really want to visit all the nodes forward here? Are we
        // sure we aren't in mixed orientation?
      }

      read.sequenceNew = read.sequenceNew.reverse(); // invert sequence
      for (let i = 0; i < read.sequenceNew.length; i += 1) {
        read.sequenceNew[i].nodeName = forward(read.sequenceNew[i].nodeName); // visit nodes forward
        const nodeWidth =
          nodes[nodeMap.get(read.sequenceNew[i].nodeName)].width;
        read.sequenceNew[i].mismatches.forEach((mm) => {
          if (mm.type === "insertion") {
            mm.pos = nodeWidth - mm.pos;
            mm.seq = getReverseComplement(mm.seq);
          } else if (mm.type === "deletion") {
            mm.pos = nodeWidth - mm.pos - mm.length;
          } else if (mm.type === "substitution") {
            mm.pos = nodeWidth - mm.pos - mm.seq.length;
            mm.seq = getReverseComplement(mm.seq);
          }
          if (mm.hasOwnProperty("seq")) {
            mm.seq = mm.seq.split("").reverse().join("");
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
  let result = "";
  for (let i = s.length - 1; i >= 0; i -= 1) {
    switch (s.charAt(i)) {
      case "A":
        result += "T";
        break;
      case "T":
        result += "A";
        break;
      case "C":
        result += "G";
        break;
      case "G":
        result += "C";
        break;
      default:
        result += "N";
    }
  }
  return result;
}

// for each track: generate sequence of node indices from seq. of node names
function generateTrackIndexSequences(tracksOrReads) {
  tracksOrReads.forEach((track) => {
    track.indexSequence = [];
    track.sequence.forEach((nodeName) => {
      // if node was switched, reverse it here
      // Q? Is flipping the index enough? It looks like yes. Or should we also flip the node name in 'sequence'?
      let switched = nodes[nodeMap.get(forward(nodeName))].switched || false;
      if (switched) {
        nodeName = flip(nodeName);
      }
      // Get the index to visit the node. If the node is switched, this means
      // visiting it reverse. Otherwise, this means visiting it forward.
      let nodeIndex = nodeMap.get(forward(nodeName));
      if (nodeIndex === 0) {
        // If a node index is ever 0, we can't visit it in reverse, so we don't allow that to happen.
        throw new Error(
          "Node " + forward(nodeName) + " has prohibited index 0"
        );
      }
      if (isReverse(nodeName) !== switched) {
        // If we visit the node in reverse XOR the node is switched, go through
        // it right to left as displayed.
        track.indexSequence.push(-nodeIndex);
      } else {
        // If either the node isn't switched and we go through it forward, or
        // the node is switched *and* we go through it backward, go through it
        // left to right as displayed.
        track.indexSequence.push(nodeIndex);
      }
    });
  });
}

// remove nodes with no tracks moving through them to avoid d3.js errors
function removeUnusedNodes(allNodes) {
  const dNodes = allNodes.slice(0);
  let i;
  for (i = dNodes.length - 1; i >= 0; i -= 1) {
    if (!dNodes[i] || !dNodes[i].hasOwnProperty("x")) {
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

  nodes.forEach((node) => {
    if (node.hasOwnProperty("x")) {
      maxXCoordinate = Math.max(maxXCoordinate, node.x + 20 + node.pixelWidth);
    }
    if (node.hasOwnProperty("y")) {
      minYCoordinate = Math.min(minYCoordinate, node.y - 10);
      maxYCoordinate = Math.max(
        maxYCoordinate,
        node.y + node.contentHeight + 10
      );
    }
  });

  tracks.forEach((track) => {
    track.path.forEach((segment) => {
      maxYCoordinate = Math.max(maxYCoordinate, segment.y + track.width);
      minYCoordinate = Math.min(minYCoordinate, segment.y);
    });
  });
}

// This needs to be the width of the ruler.
// TODO: Tell the ruler drawing code.
const RULER_WIDTH = 15;
const NODE_MARGIN = 10;
// This is how much space to let us pan, around the nodes as measure by getImageDimensions()
const RAIL_SPACE = 25;

// align visualization to the top and left within svg and resize svg to correct size
// enable zooming and panning
function alignSVG() {
  // Find the SVG element.
  // Trim off the leading "#" from the SVG ID.
  let svgElement = document.getElementById(svgID.substring(1));
  // And find its parent holding element.
  let parentElement = svgElement.parentNode;

  function zoomed() {
    // Apply the panning/zooming transform
    const transform = d3.event.transform;
    svg.attr("transform", transform);
  }

  zoom = d3.zoom();
  zoom.on("zoom", zoomed);

  function configureZoomBounds() {
    // Configure panning and zooming, given the SVG parent's size on the page.

    svg.attr("height", maxYCoordinate - minYCoordinate + RAIL_SPACE * 2);
    svg.attr("width", parentElement.clientWidth);

    const minZoom = Math.min(
      1,
      parentElement.clientWidth / (maxXCoordinate + 10)
    );

    // We need to set an extent here because auto-determination of the region
    // to zoom breaks on the React testing jsdom
    zoom
      .extent([
        [0, 0],
        [parentElement.clientWidth, parentElement.clientHeight],
      ])
      .scaleExtent([minZoom, 8])
      .translateExtent([
        [0, minYCoordinate - RAIL_SPACE],
        [maxXCoordinate, maxYCoordinate + RAIL_SPACE],
      ]);
  }

  // Initially configure panning and zooming
  configureZoomBounds();
  svg = svg.call(zoom).on("dblclick.zoom", null).append("g");
  // Don't let scrolling bubble up from the visualization
  parentElement.addEventListener("wheel", (e) => {
    e.preventDefault();
  });

  // If the view area resizes, reconfigure the zoom
  if (window.ResizeObserver) {
    // This feature is in all current major browsers, but not in React's testing environment.
    const resizeObserver = new window.ResizeObserver((resizes) => {
      configureZoomBounds();
    });
    resizeObserver.observe(parentElement);
  }

  // translate to correct position on initial draw
  const containerWidth = parentElement.clientWidth;
  const xOffset =
    maxXCoordinate + 10 < containerWidth
      ? (containerWidth - maxXCoordinate - 10) / 2
      : 0;
  d3.select(document)
    .select(svgID)
    .call(
      zoom.transform,
      d3.zoomIdentity.translate(xOffset, RAIL_SPACE - minYCoordinate)
    );
}

export function zoomBy(zoomFactor) {
  // Find the SVG element.
  // Trim off the leading "#" from the SVG ID.
  let svgElement = document.getElementById(svgID.substring(1));
  // And find its parent holding element.
  let parentElement = svgElement.parentNode;

  const minZoom = Math.min(
    1,
    parentElement.clientWidth / (maxXCoordinate + 10)
  );
  const maxZoom = 8;
  const width = parentElement.clientWidth;

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

  nodes.forEach((node) => {
    node.successors = [];
    node.predecessors = [];
  });

  tracks.forEach((track) => {
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
    reads.forEach((track) => {
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

  sequence.forEach((nodeIndex) => {
    if (nodeIndex < 0) {
      currentNode = nodes[Math.abs(nodeIndex)];
      if (!currentNode.hasOwnProperty("order")) {
        currentNode.order = backwardOrder;
      }
      if (currentNode.order < minOrder) minOrder = currentNode.order;
      forwardOrder = currentNode.order;
      backwardOrder = currentNode.order - 1;
    } else {
      currentNode = nodes[nodeIndex];
      if (!currentNode.hasOwnProperty("order")) {
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
    !nodes[Math.abs(sequence[anchorIndex])].hasOwnProperty("order")
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
    if (!currentNode.hasOwnProperty("order")) {
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

  nodes.forEach((node) => {
    delete node.order;
  });

  generateNodeOrderOfSingleTrack(tracks[0].indexSequence); // calculate order values for all nodes of the first track

  for (let i = 1; i < tracksAndReads.length; i += 1) {
    if (DEBUG) console.log(`generating order for track ${i + 1}`);
    rightIndex = generateNodeOrderTrackBeginning(
      tracksAndReads[i].indexSequence
    ); // calculate order values for all nodes until the first anchor
    if (rightIndex === null) {
      if (tracksAndReads[i].type === "haplo") {
        generateNodeOrderOfSingleTrack(tracksAndReads[i].indexSequence);
      } else {
        tracksAndReads.splice(i, 1);
        reads.splice(i - tracks.length, 1);
        i -= 1;
      }
      continue;
    }
    // Create a sequence with orientation removed and everything
    // positive/forward
    modifiedSequence = uninvert(tracksAndReads[i].indexSequence);

    while (rightIndex < modifiedSequence.length) {
      // move right until the end of the sequence
      // find next anchor node
      leftIndex = rightIndex;
      rightIndex += 1;
      while (
        rightIndex < modifiedSequence.length &&
        !nodes[modifiedSequence[rightIndex]].hasOwnProperty("order")
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
            if (!currentNode.hasOwnProperty("order")) {
              currentNode.order = currentOrder;
              currentOrder += 1;
            }
          }
        } else {
          // elongate towards the left
          currentOrder = nodes[modifiedSequence[leftIndex]].order - 1;
          for (let j = leftIndex + 1; j < modifiedSequence.length; j += 1) {
            currentNode = nodes[modifiedSequence[j]];
            if (!currentNode.hasOwnProperty("order")) {
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
  nodes.forEach((node) => {
    if (node.hasOwnProperty("order") && node.order > max) max = node.order;
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
  nodes.forEach((node) => {
    if (node.hasOwnProperty("order")) node.order += amount;
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
      nodes[currentNode].hasOwnProperty("order") &&
      nodes[currentNode].order < currentOrder
    ) {
      if (
        !increasedOrders.has(currentNode) ||
        increasedOrders.get(currentNode) < currentOrder
      ) {
        increasedOrders.set(currentNode, currentOrder);
        nodes[currentNode].successors.forEach((successor) => {
          if (
            nodes[successor].order > nodes[currentNode].order &&
            successor !== tabuNode
          ) {
            // only increase order of successors if they lie to the right of the currentNode (not for repeats/translocations)
            queue.push([successor, currentOrder + 1]);
          }
        });
        if (currentNode !== startingNode) {
          nodes[currentNode].predecessors.forEach((predecessor) => {
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
  nodes.forEach((node) => {
    node.tracks = [];
  });

  tracks.forEach((track) => {
    track.indexSequence.forEach((nodeIndex) => {
      nodes[Math.abs(nodeIndex)].tracks.push(track.id);
    });
  });

  nodes.forEach((node) => {
    if (node.hasOwnProperty("tracks")) node.degree = node.tracks.length;
  });
}

// Optimize the orientations for nodes in the global `nodes` for displaying the
// paths in the global `tracks` and the read paths, if applicable, in the
// global `reads`
function switchNodeOrientation() {
  let pivotPath = tracks[0];
  let countPaths = tracks.slice(1, tracks.length);
  if (reads && config.showReads) {
    countPaths = countPaths.concat(reads);
  }
  switchNodeOrientationForPaths(countPaths, pivotPath);
  if (reads && config.showReads) {
    // Any changes should be committed back
    for (let i = 0; i < reads.length; i++) {
      if (reads[i] !== countPaths[i + tracks.length - 1]) {
        throw new Error("Read inequality");
      }
    }
  }
}

// If more of the given paths pass through a specific node in reverse direction than in
// regular direction, switch its orientation. Processes all paths' nodes in
// place, so if you want e.g. a first track with nodes fixed in that
// orientation, pass it as pivotPath.
// References and modifies the global nodes variable.
function switchNodeOrientationForPaths(paths, pivotPath) {
  const toSwitch = new Map();
  let nodeName;
  let prevNode;
  let nextNode;
  let currentNode;

  for (let i = 0; i < paths.length; i += 1) {
    for (let j = 0; j < paths[i].sequence.length; j += 1) {
      nodeName = paths[i].sequence[j];
      nodeName = forward(nodeName);
      currentNode = nodes[nodeMap.get(nodeName)];
      if (pivotPath && pivotPath.sequence.indexOf(nodeName) === -1) {
        // do not change orientation for nodes which are part of the pivot path
        if (j > 0) {
          prevNode = nodes[nodeMap.get(forward(paths[i].sequence[j - 1]))];
        }
        if (j < paths[i].sequence.length - 1) {
          nextNode = nodes[nodeMap.get(forward(paths[i].sequence[j + 1]))];
        }
        if (
          (j === 0 || prevNode.order < currentNode.order) &&
          (j === paths[i].sequence.length - 1 ||
            currentNode.order < nextNode.order)
        ) {
          // Node is visited in increasing order along the path
          if (!toSwitch.has(nodeName)) toSwitch.set(nodeName, 0);
          if (isReverse(paths[i].sequence[j])) {
            // Node is reverse, so increment
            toSwitch.set(nodeName, toSwitch.get(nodeName) + 1);
          } else {
            // Node is forward, so decrement
            toSwitch.set(nodeName, toSwitch.get(nodeName) - 1);
          }
        }
        if (
          (j === 0 || prevNode.order > currentNode.order) &&
          (j === paths[i].sequence.length - 1 ||
            currentNode.order > nextNode.order)
        ) {
          // Node is visited in *decreasing* order along the path, so is already backward
          if (!toSwitch.has(nodeName)) toSwitch.set(nodeName, 0);
          if (isReverse(paths[i].sequence[j])) {
            // Node is reverse, so decrement
            toSwitch.set(nodeName, toSwitch.get(nodeName) - 1);
          } else {
            // Node is forward, so increment
            toSwitch.set(nodeName, toSwitch.get(nodeName) + 1);
          }
        }
      }
    }
  }

  paths.forEach((path, pathIndex) => {
    path.sequence.forEach((node, nodeIndex) => {
      nodeName = forward(node);
      if (toSwitch.has(nodeName) && toSwitch.get(nodeName) > 0) {
        // This node is backward more so flip it around
        paths[pathIndex].sequence[nodeIndex] = flip(node);
        paths[pathIndex].indexSequence[nodeIndex] =
          -paths[pathIndex].indexSequence[nodeIndex];
      }
    });
  });

  // invert the sequence within the nodes and mark them as "switched"
  toSwitch.forEach((value, key) => {
    if (value > 0) {
      currentNode = nodeMap.get(key);
      let newSeq = getReverseComplement(nodes[currentNode].seq);
      nodes[currentNode].seq = newSeq;
      nodes[currentNode].switched = true;
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

  sortedNodes.forEach((node) => {
    if (node.hasOwnProperty("order")) {
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

  tracks.forEach((track) => {
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
  // For each horizontal order slot, for each track number, holds the
  // SegmentAssignment object for the visit of that track to that order slot.
  // When an order slot is visited multiple times, holds whatever
  // SegmentAssignment was created most recently.
  const prevSegmentPerOrderPerTrack = [];
  const isPositive = (n) => ((n = +n) || 1 / n) >= 0;

  // create empty variables
  for (let i = 0; i <= maxOrder; i += 1) {
    assignments[i] = [];
    prevSegmentPerOrderPerTrack[i] = [];
    for (let j = 0; j < numberOfTracks; j += 1) {
      prevSegmentPerOrderPerTrack[i][j] = null;
    }
  }

  tracks.forEach((track, trackNo) => {
    // Trace along each track and create Segment objects in the track's path
    // field, and SegmentAssignment objects in NodeAssignment objects in all
    // the order slots that are visited by the track. Set up all the
    // cross-reverencing indexes and work out when we need segments to let
    // tracks pass nodes and turn around, but leave all the assigned lane
    // values empty for now.

    // add info for start of track
    currentNodeIndex = Math.abs(track.indexSequence[0]);
    currentNodeIsForward = isPositive(track.indexSequence[0]);
    currentNode = nodes[currentNodeIndex];

    track.path = [];
    track.path.push({
      order: currentNode.order,
      lane: null,
      isForward: currentNodeIsForward,
      node: currentNodeIndex,
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
            node: null,
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
            node: null,
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
            node: null,
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
            node: currentNodeIndex,
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
            node: currentNodeIndex,
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
            node: null,
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
            node: null,
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
            node: null,
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
            node: currentNodeIndex,
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
            node: currentNodeIndex,
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
            node: currentNodeIndex,
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
            node: null,
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
            node: currentNodeIndex,
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

  // Now sweep left to right across order slots and assign vertical lanes to all the segments.
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
      type: "single",
      node: null,
      tracks: [{ trackID: trackNo, segmentID, compareToFromSame }],
    });
    prevSegmentPerOrderPerTrack[order][trackNo] =
      assignments[order][assignments[order].length - 1].tracks[0];
  } else {
    for (let i = 0; i < assignments[order].length; i += 1) {
      if (assignments[order][i].node === nodeIndex) {
        // add to existing node in assignment
        assignments[order][i].type = "multiple";
        assignments[order][i].tracks.push({
          trackID: trackNo,
          segmentID,
          compareToFromSame,
        });
        prevSegmentPerOrderPerTrack[order][trackNo] =
          assignments[order][i].tracks[assignments[order][i].tracks.length - 1];
        return;
      }
    }
    // create new node in assignment
    assignments[order].push({
      type: "single",
      node: nodeIndex,
      tracks: [{ trackID: trackNo, segmentID, compareToFromSame }],
    });
    prevSegmentPerOrderPerTrack[order][trackNo] =
      assignments[order][assignments[order].length - 1].tracks[0];
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

  assignment.forEach((node) => {
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
    node.tracks.forEach((track) => {
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

  potentialAdjustmentValues.forEach((moveBy) => {
    if (getVerticalAdjustmentCost(assignment, moveBy) < minAdjustmentCost) {
      minAdjustmentCost = getVerticalAdjustmentCost(assignment, moveBy);
      verticalAdjustment = moveBy;
    }
  });

  assignment.forEach((node) => {
    if (node.node !== null) {
      nodes[node.node].y += verticalAdjustment;
    }
    node.tracks.forEach((track) => {
      tracks[track.trackID].path[track.segmentID].y += verticalAdjustment;
    });
  });
}

// Budge down all nodes and out-of-node tracks below this node by this amount
function adjustVertically3(node, adjustBy) {
  if (node.hasOwnProperty("order")) {
    assignments[node.order].forEach((assignmentNode) => {
      if (assignmentNode.node !== null) {
        const aNode = nodes[assignmentNode.node];
        if (aNode !== node && aNode.y > node.y) {
          aNode.y += adjustBy;
          assignmentNode.tracks.forEach((track) => {
            tracks[track.trackID].path[track.segmentID].y += adjustBy;
          });
        }
      } else {
        // track-segment not within a node
        assignmentNode.tracks.forEach((track) => {
          if (tracks[track.trackID].path[track.segmentID].y >= node.y) {
            tracks[track.trackID].path[track.segmentID].y += adjustBy;
          }
        });
      }
    });
    if (nodesPerOrder[node.order].length > 0) {
      nodesPerOrder[node.order].forEach((nodeIndex) => {
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
  assignment.forEach((node) => {
    node.tracks.forEach((track) => {
      if (track.idealY !== null && tracks[track.trackID].type !== "read") {
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
  if (a.hasOwnProperty("idealLane")) {
    if (b.hasOwnProperty("idealLane")) {
      if (a.idealLane < b.idealLane) return -1;
      else if (a.idealLane > b.idealLane) return 1;
      return 0;
    }
    return -1;
  }
  if (b.hasOwnProperty("idealLane")) {
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

  if (a.hasOwnProperty("order")) {
    if (b.hasOwnProperty("order")) {
      if (a.order < b.order) return -1;
      else if (a.order > b.order) return 1;
      if (a.hasOwnProperty("y") && b.hasOwnProperty("y")) {
        if (a.y < b.y) return -1;
        else if (a.y > b.y) return 1;
      }
      return 0;
    }
    return -1;
  }
  if (b.hasOwnProperty("order")) return 1;
  return 0;
}

function addTrackFeatures() {
  let nodeStart;
  let nodeEnd;
  let feature = {};

  bed.forEach((line) => {
    let i = 0;
    while (i < numberOfTracks && tracks[i].name !== line.track) i += 1;
    if (i < numberOfTracks) {
      nodeStart = 0;
      tracks[i].path.forEach((node) => {
        if (node.node !== null) {
          feature = {};
          if (nodes[node.node].hasOwnProperty("sequenceLength")) {
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
          if (feature.hasOwnProperty("start")) {
            feature.type = line.type;
            feature.name = line.name;
            if (!node.hasOwnProperty("features")) node.features = [];
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

  const NARROW_WIDTH = 4;
  const WIDE_WIDTH = 15;

  tracks.forEach((track) => {
    if (track.hasOwnProperty("freq")) {
      // custom track width
      track.width = Math.round((Math.log(track.freq) + 1) * NARROW_WIDTH);
    } else {
      // default track width
      track.width = WIDE_WIDTH;
      if (track.hasOwnProperty("type") && track.type === "read") {
        track.width = NARROW_WIDTH;
      }
    }
    if (track.width !== NARROW_WIDTH) {
      allAreFour = false;
    }
  });

  if (allAreFour) {
    tracks.forEach((track) => {
      if (track.hasOwnProperty("freq")) {
        track.width = WIDE_WIDTH;
      }
    });
  }
}

function getColorSet(colorSetName) {
  // single color hex
  if (colorSetName.startsWith("#")) {
    return [colorSetName];
  }

  // set of color hexes
  switch (colorSetName) {
    case "plainColors":
      return plainColors;
    case "reds":
      return reds;
    case "blues":
      return blues;
    case "greys":
      return greys;
    case "ygreys":
      return ygreys;
    case "lightColors":
      return lightColors;
    default:
      return greys;
  }
}

function generateTrackColor(track, highlight) {
  if (typeof highlight === "undefined") highlight = "plain";
  let trackColor;

  const sourceID = track.sourceTrackID;
  if (!config.colorSchemes[sourceID]) {
    config.colorSchemes[sourceID] = defaultTrackColors(track.type);
  }

  if (track.hasOwnProperty("type") && track.type === "read") {
    if (config.colorSchemes[sourceID].colorReadsByMappingQuality) {
      trackColor = d3.interpolateRdYlGn(
        Math.min(60, track.mapping_quality) / 60
      );
    } else {
      if (track.hasOwnProperty("is_reverse") && track.is_reverse === true) {
        // get the color currently stored for this read source file, and stagger color using modulo
        const colorSet = getColorSet(config.colorSchemes[sourceID].auxPalette);
        trackColor = colorSet[track.id % colorSet.length];
      } else {
        const colorSet = getColorSet(config.colorSchemes[sourceID].mainPalette);
        trackColor = colorSet[track.id % colorSet.length];
      }
    }
  } else {
    if (config.showExonsFlag === false || highlight !== "plain") {
      // Don't repeat the color of the first track (reference) to highilight is better.
      // TODO: Allow using color 0 for other schemes not the same as the one for the reference path.
      // TODO: Stop reads from taking this color?
      const auxColorSet = getColorSet(config.colorSchemes[sourceID].auxPalette);
      const primaryColorSet = getColorSet(
        config.colorSchemes[sourceID].mainPalette
      );
      if (track.id === 0) {
        trackColor = primaryColorSet[0];
      } else {
        trackColor = auxColorSet[(track.id - 1) % auxColorSet.length];
      }
    } else {
      const colorSet = getColorSet(config.exonColors);
      trackColor = colorSet[track.id % colorSet.length];
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
  nodes.forEach((node) => {
    if (node.hasOwnProperty("order")) {
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

  tracks.forEach((track) => {
    highlight = "plain";
    trackColor = generateTrackColor(track, highlight);

    // start of path
    yStart = track.path[0].y;
    if (track.type !== "read") {
      if (track.sequence[0].charAt(0) === "-") {
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
        if (track.path[i].hasOwnProperty("features")) {
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
            // TODO: This is not actually the index of the track!
            id: track.id,
            name: track.name,
            type: track.type,
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
            name: track.name,
            type: track.type,
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
            name: track.name,
            type: track.type,
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
              track.type,
              track.name
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
              track.type,
              track.name
            );
            xStart = orderStartX[track.path[i].order];
            yStart = track.path[i].y;
          }
        }

        if (track.path[i].hasOwnProperty("features")) {
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
    if (track.type !== "read") {
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
      name: track.name,
      type: track.type,
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
  if (nodes[node.node].hasOwnProperty("sequenceLength")) {
    nodeWidth = nodes[node.node].sequenceLength;
  } else {
    nodeWidth = nodes[node.node].width;
  }

  node.features.sort((a, b) => a.start - b.start);
  node.features.forEach((feature) => {
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
            name: track.name,
            type: track.type,
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
            name: track.name,
            type: track.type,
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
            name: track.name,
            type: track.type,
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
            name: track.name,
            type: track.type,
          });
        }
      }
      rectXStart = featureXStart;
      currentHighlight = feature.type;
    }
    if (feature.end < nodeWidth - 1 || !feature.hasOwnProperty("continue")) {
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
          name: track.name,
          type: track.type,
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
          name: track.name,
          type: track.type,
        });
      }
      rectXStart = featureXEnd + 1;
      currentHighlight = "plain";
    }
  });
  return { xStart: rectXStart, highlight: currentHighlight };
}

const MIN_BEND_WIDTH = 7;

function generateForwardToReverse(
  x,
  yStart,
  yEnd,
  trackWidth,
  trackColor,
  trackID,
  order,
  type,
  trackName
) {
  x += 10 * extraRight[order];
  const yTop = Math.min(yStart, yEnd);
  const yBottom = Math.max(yStart, yEnd);
  const radius = MIN_BEND_WIDTH;

  trackVerticalRectangles.push({
    // elongate incoming rectangle a bit to the right
    xStart: x - 10 * extraRight[order],
    yStart,
    xEnd: x + 5,
    yEnd: yStart + trackWidth - 1,
    color: trackColor,
    id: trackID,
    name: trackName,
    type,
  });
  trackVerticalRectangles.push({
    // vertical rectangle
    xStart: x + 5 + radius,
    yStart: yTop + trackWidth + radius - 1,
    xEnd: x + 5 + radius + Math.min(MIN_BEND_WIDTH, trackWidth) - 1,
    yEnd: yBottom - radius + 1,
    color: trackColor,
    id: trackID,
    name: trackName,
    type,
  });
  trackVerticalRectangles.push({
    xStart: x - 10 * extraRight[order],
    yStart: yEnd,
    xEnd: x + 5,
    yEnd: yEnd + trackWidth - 1,
    color: trackColor,
    id: trackID,
    name: trackName,
    type,
  }); // elongate outgoing rectangle a bit to the right

  let d = `M ${x + 5} ${yBottom}`;
  d += ` Q ${x + 5 + radius} ${yBottom} ${x + 5 + radius} ${yBottom - radius}`;
  d += ` H ${x + 5 + radius + Math.min(MIN_BEND_WIDTH, trackWidth)}`;
  d += ` Q ${x + 5 + radius + Math.min(MIN_BEND_WIDTH, trackWidth)} ${
    yBottom + trackWidth
  } ${x + 5} ${yBottom + trackWidth}`;
  d += " Z ";
  trackCorners.push({ path: d, color: trackColor, id: trackID, type });

  d = `M ${x + 5} ${yTop}`;
  d += ` Q ${x + 5 + radius + Math.min(MIN_BEND_WIDTH, trackWidth)} ${yTop} ${
    x + 5 + radius + Math.min(MIN_BEND_WIDTH, trackWidth)
  } ${yTop + trackWidth + radius}`;
  d += ` H ${x + 5 + radius}`;
  d += ` Q ${x + 5 + radius} ${yTop + trackWidth} ${x + 5} ${
    yTop + trackWidth
  }`;
  d += " Z ";
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
  type,
  trackName
) {
  const yTop = Math.min(yStart, yEnd);
  const yBottom = Math.max(yStart, yEnd);
  const radius = MIN_BEND_WIDTH;
  x -= 10 * extraLeft[order];

  trackVerticalRectangles.push({
    xStart: x - 6,
    yStart,
    xEnd: x + 10 * extraLeft[order],
    yEnd: yStart + trackWidth - 1,
    color: trackColor,
    id: trackID,
    name: trackName,
    type,
  }); // elongate incoming rectangle a bit to the left
  trackVerticalRectangles.push({
    xStart: x - 5 - radius - Math.min(MIN_BEND_WIDTH, trackWidth),
    yStart: yTop + trackWidth + radius - 1,
    xEnd: x - 5 - radius - 1,
    yEnd: yBottom - radius + 1,
    color: trackColor,
    id: trackID,
    name: trackName,
    type,
  }); // vertical rectangle
  trackVerticalRectangles.push({
    xStart: x - 6,
    yStart: yEnd,
    xEnd: x + 10 * extraLeft[order],
    yEnd: yEnd + trackWidth - 1,
    color: trackColor,
    id: trackID,
    name: trackName,
    type,
  }); // elongate outgoing rectangle a bit to the left

  // Path for bottom 90 degree bend
  let d = `M ${x - 5} ${yBottom}`;
  d += ` Q ${x - 5 - radius} ${yBottom} ${x - 5 - radius} ${yBottom - radius}`;
  d += ` H ${x - 5 - radius - Math.min(MIN_BEND_WIDTH, trackWidth)}`;
  d += ` Q ${x - 5 - radius - Math.min(MIN_BEND_WIDTH, trackWidth)} ${
    yBottom + trackWidth
  } ${x - 5} ${yBottom + trackWidth}`;
  d += " Z ";
  trackCorners.push({ path: d, color: trackColor, id: trackID, type });

  // Path for top 90 degree bend
  d = `M ${x - 5} ${yTop}`;
  d += ` Q ${x - 5 - radius - Math.min(MIN_BEND_WIDTH, trackWidth)} ${yTop} ${
    x - 5 - radius - Math.min(MIN_BEND_WIDTH, trackWidth)
  } ${yTop + trackWidth + radius}`;
  d += ` H ${x - 5 - radius}`;
  d += ` Q ${x - 5 - radius} ${yTop + trackWidth} ${x - 5} ${
    yTop + trackWidth
  }`;
  d += " Z ";
  trackCorners.push({ path: d, color: trackColor, id: trackID, type });
  extraLeft[order] += 1;
}

// to avoid problems with wrong overlapping of tracks, draw them in order of their color
function drawReversalsByColor(corners, rectangles, type, groupTrack) {
  const co = new Set();
  rectangles.forEach((rect) => {
    co.add(rect.color);
  });
  co.forEach((c) => {
    drawTrackRectangles(
      rectangles.filter(filterObjectByAttribute("color", c)),
      type,
      groupTrack
    );
    drawTrackCorners(
      corners.filter(filterObjectByAttribute("color", c)),
      type,
      groupTrack
    );
  });
}

// draws nodes by building svg-path for border and filling it with transparent white

function drawNodes(dNodes, groupNode) {
  let x;
  let y;

  dNodes.forEach((node) => {
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

  console.log("config:", config);

  groupNode
    .selectAll("node")
    .data(dNodes)
    .enter()
    .append("path")
    .attr("id", (d) => d.name)
    .attr("d", (d) => d.d)
    .on("mouseover", nodeMouseOver)
    .on("mouseout", nodeMouseOut)
    .on("dblclick", nodeDoubleClick)
    .on("click", nodeSingleClick)
    .style("fill", (d) => colorNodes(d.name)["fill"])
    .style("fill-opacity", (d) => colorNodes(d.name)["fill-opacity"])
    .style("stroke", (d) => colorNodes(d.name)["outline"])
    .style("stroke-width", "2px")
    .append("svg:title")
    .text((d) => getPopUpNodeText(d));
}

// Given a node name, return an object with "fill", "fill-opacity", and "outline"
// keys describing what colors should be used to draw it.
function colorNodes(nodeName) {
  let nodesColors = {};
  if (config.coloredNodes.includes(nodeName)) {
    nodesColors["fill"] = "#ffc0cb";
    nodesColors["fill-opacity"] = "0.4";
    nodesColors["outline"] = "#ff0000";
  } else {
    nodesColors["fill"] = "#ffffff";
    nodesColors["fill-opacity"] = "0.4";
    nodesColors["outline"] = "#000000";
  }
  return nodesColors;
}

function getPopUpNodeText(node) {
  return `Node ID: ${node.name}` + (node.switched ? ` (reversed)` : ``) + `\n`;
}

// Get any node object by name.
function getNodeByName(nodeName) {
  if (typeof nodeName !== "string") {
    throw new Error("Node Names must be strings");
  }
  // We just do a scan.
  // TODO: index!
  console.log("All nodes:", nodes); //
  for (let i = 1; i < nodes.length; i++) {
    // changes i to start from 1 instead of 0
    if (nodes[i].name === nodeName) {
      console.log("Found node with name", nodeName, "at index ", i);
      return nodes[i];
    }
  }
}

function nodeSingleClick() {
  /* jshint validthis: true */
  // Get the node name
  const nodeName = d3.select(this).attr("id");
  let currentNode = getNodeByName(nodeName);
  console.log("Node ", nodeName, " is ", currentNode);
  if (currentNode === undefined) {
    console.error("Missing node: ", nodeName);
    return;
  }
  let nodeAttributes = [];
  nodeAttributes.push([
    "Node ID:",
    currentNode.name + currentNode.switched ? "(reversed)" : "",
  ]);
  nodeAttributes.push(["Node Length:", currentNode.sequenceLength + " bases"]);
  nodeAttributes.push(["Haplotypes:", currentNode.degree]);
  nodeAttributes.push([
    "Aligned Reads:",
    currentNode.incomingReads.length +
      currentNode.internalReads.length +
      currentNode.outgoingReads.length,
  ]);
  nodeAttributes.push(["Total Visits:", numReadsVisitNode(currentNode)]);
  nodeAttributes.push(["Coverage:", coverage(currentNode, reads)]);

  console.log("Single Click");
  console.log("node show info callback", config.showInfoCallback);
  config.showInfoCallback(nodeAttributes);
}

// Count the number of distinct reads that visit the given node object.
export function numReadsVisitNode(node) {
  let countReads = new Set();
  // incoming reads are reads that enter the node but don't start within it. They are represented as
  // an array of subarrays which have 2 elements: an index indicating the read index and read path's index.
  // The first node will not have any incoming reads.
  for (let readVisit of node.incomingReads) {
    countReads.add(readVisit[0]);
  }
  // internal reads are reads that start and end within the node. They are represented as
  // an array of values which indicate the read index.
  for (let read of node.internalReads) {
    countReads.add(read);
  }
  // outgoing reads are reads that exit the node when the read starts within it. They are represented as
  // an array of subarrays which have 2 elements: an index indicating the read index and read path's index.
  // The last node will not have any outgoing reads.
  for (let readVisit of node.outgoingReads) {
    countReads.add(readVisit[0]);
  }
  return countReads.size;
}

// computes average number of reads passing through each base in the node
export function coverage(node, allReads) {
  if (node.sequenceLength === 0) {
    return 0.0;
  }
  let countBases = 0;
  for (let readVisit of node.incomingReads) {
    let readNum = readVisit[0];
    let readPathIndex = readVisit[1];
    let currRead = allReads[readNum];
    let numNodes = currRead.sequenceNew.length;
    // identify deletion: if there's a deletion, then those bases must be deleted from total base count
    for (let i = 0; i < currRead.sequenceNew.length; i += 1) {
      currRead.sequenceNew[i].mismatches.forEach((mm) => {
        if (mm.type === "deletion") {
          console.log("this read has a deletion", currRead);
          countBases -= mm.length;
        }
      });
    }
    //  if current node is the last node on the read path, add the finalNodeCoverLength number of bases
    if (numNodes === readPathIndex + 1) {
      countBases += currRead.finalNodeCoverLength;
      // otherwise add the node's sequence length (width of node in bases)
    } else {
      countBases += node.sequenceLength;
    }
  }
  // internal reads
  for (let readVisit of node.internalReads) {
    // compute coverage of read by finalNodeCoverLength and firstNodeOffset fields
    //  indicating read's starting and ending points within the node.
    let readNum = readVisit;
    let currRead = allReads[readNum];
    // identify deletion: if there's a deletion, then those bases must be deleted from total base count
    for (let i = 0; i < currRead.sequenceNew.length; i += 1) {
      currRead.sequenceNew[i].mismatches.forEach((mm) => {
        if (mm.type === "deletion") {
          console.log("this read has a deletion", currRead);
          countBases -= mm.length;
        }
      });
    }
    countBases += currRead.finalNodeCoverLength - currRead.firstNodeOffset;
  }
  // outgoing reads
  for (let readVisit of node.outgoingReads) {
    let readNum = readVisit[0];
    let currRead = allReads[readNum];
    // identify deletion: if there's a deletion, then those bases must be deleted from total base count
    for (let i = 0; i < currRead.sequenceNew.length; i += 1) {
      currRead.sequenceNew[i].mismatches.forEach((mm) => {
        if (mm.type === "deletion") {
          console.log("this read has a deletion", currRead);
          countBases -= mm.length;
        }
      });
    }
    // coverage of outgoing read would be the the distance between the end of the node and the
    //  starting point of the read within the node
    countBases += node.sequenceLength - currRead.firstNodeOffset;
  }
  // average coverage is total number of bases traversed by all reads divided by sequence length (width of node in bases)
  return Math.round((countBases / node.sequenceLength) * 100) / 100;
}

// draw seqence labels for nodes
function drawLabels(dNodes) {
  if (config.nodeWidthOption === 0) {
    svg
      .selectAll("text")
      .data(dNodes)
      .enter()
      .append("text")
      .attr("x", (d) => d.x - 4)
      .attr("y", (d) => d.y + 4)
      .text((d) => d.seq)
      .attr("font-family", fonts)
      .attr("font-size", "14px")
      .attr("fill", "black")
      .style("pointer-events", "none");
  }
}

function drawRuler() {
  let rulerTrackIndex = 0;
  while (tracks[rulerTrackIndex].name !== trackForRuler) rulerTrackIndex += 1;
  const rulerTrack = tracks[rulerTrackIndex];

  // How often should we have a tick in bp?
  let markingInterval = 100;
  if (config.nodeWidthOption === 0) markingInterval = 20;
  // How close may markings be in image space?
  const markingClearance = 80;

  // We need to call drawRulerMarking(base pair number, layout X coordinate)
  // for each tick mark we want in our legend. But we can't just walk the path
  // and X at the same time, placing ticks periodically because the ruler path
  // isn't nexessarily used for the layout backbone, and can go all over the
  // place, including backward through nodes.

  // So we walk along the path, place ticks, and then drop the ones that are
  // too close together.

  // This will hold pairs of base position, x coordinate.
  let ticks = [];
  let ticks_region = [];

  // We keep a cursor to the start of the current node traversal along the path
  let indexOfFirstBaseInNode = rulerTrack.indexOfFirstBase;
  // And the next index along the path that doesn't have a mark but could.
  let nextUnmarkedIndex = indexOfFirstBaseInNode;

  function getCorrectXCoordinateOfBaseWithinNode(
    position,
    currentNode,
    currentNodeIsReverse,
    is_region = false
  ) {
    // What base along our traversal of this node should we be marking?
    let indexIntoVisitToMark = position - indexOfFirstBaseInNode;

    // What offset into the node should we mark at, relative to its forward-strand start?
    let offsetIntoNodeForward = currentNodeIsReverse
      ? // If going in reverse, take off bases of the node we use from the right side
        currentNode.sequenceLength - 1 - indexIntoVisitToMark
      : // Otherwise, add them to the left side
        indexIntoVisitToMark;

    if (config.nodeWidthOption !== 0 && !is_region) {
      // Actually always mark at an edge of the node, if we are scaling the node nonlinearly
      // and if we are not highlighting the input region
      offsetIntoNodeForward = currentNodeIsReverse
        ? currentNode.sequenceLength - 1
        : 0;
    }

    // Where should we mark in the visualization?
    let xCoordOfMarking = getXCoordinateOfBaseWithinNode(
      currentNode,
      offsetIntoNodeForward
    );
    return xCoordOfMarking;
  }

  let start_region = Number(inputRegion[0]);
  let end_region = Number(inputRegion[1]);
  for (let i = 0; i < rulerTrack.indexSequence.length; i++) {
    // Walk along the ruler track in ascending coordinate order.
    const nodeIndex =
      rulerTrack.indexSequence[
        rulerTrack.isCompletelyReverse
          ? rulerTrack.indexSequence.length - 1 - i
          : i
      ];
    const currentNode = nodes[Math.abs(nodeIndex)];
    // Each node may actually have the track's coordinates go through it
    // backward. In fact, the whole track may be laid out backward.
    // So xor the reverse flags, which we assume to be bools
    const currentNodeIsReverse =
      isReverse(rulerTrack.sequence[i]) !== rulerTrack.isCompletelyReverse;

    // For some displayus we want to mark each node only once.
    let alreadyMarkedNode = false;

    if (
      start_region >= indexOfFirstBaseInNode &&
      start_region < indexOfFirstBaseInNode + currentNode.sequenceLength
    ) {
      // add start "region" tick
      let xCoordOfMarking = getCorrectXCoordinateOfBaseWithinNode(
        start_region,
        currentNode,
        currentNodeIsReverse,
        true
      );
      ticks_region.push([start_region, xCoordOfMarking]);
    }
    if (
      end_region >= indexOfFirstBaseInNode &&
      end_region < indexOfFirstBaseInNode + currentNode.sequenceLength
    ) {
      // add end "region" tick
      let xCoordOfMarking = getCorrectXCoordinateOfBaseWithinNode(
        end_region,
        currentNode,
        currentNodeIsReverse,
        true
      );
      ticks_region.push([end_region, xCoordOfMarking]);
    }

    while (
      nextUnmarkedIndex <
      indexOfFirstBaseInNode + currentNode.sequenceLength
    ) {
      // We are thinking of marking a position on this node.

      // Where should we mark in the visualization?
      let xCoordOfMarking = getCorrectXCoordinateOfBaseWithinNode(
        nextUnmarkedIndex,
        currentNode,
        currentNodeIsReverse
      );

      if (config.nodeWidthOption === 0 || !alreadyMarkedNode) {
        // This is a mark we are not filtering due to node compression.
        // Make the mark
        ticks.push([nextUnmarkedIndex, xCoordOfMarking]);
        alreadyMarkedNode = true;
      }

      // Think about the next place along the path we care about.
      nextUnmarkedIndex += markingInterval;
    }
    // Advance to the next node
    indexOfFirstBaseInNode += currentNode.sequenceLength;
  }

  // Sort ticks on X coordinate
  ticks.sort(([bp1, x1], [bp2, x2]) => x1 > x2);

  // Filter ticks for a minimum X separartion
  let separatedTicks = [];
  ticks.forEach((tick) => {
    if (
      separatedTicks.length === 0 ||
      tick[1] - separatedTicks[separatedTicks.length - 1][1] >= markingClearance
    ) {
      // Take only the first tick or ticks far enough from the previous tick taken.
      separatedTicks.push(tick);
    }
  });
  ticks = separatedTicks;

  // plot ticks highlighting the region
  ticks_region.forEach((tick) => drawRulerMarkingRegion(tick[0], tick[1]));

  // draw horizontal line
  svg
    .append("line")
    .attr("x1", 0)
    .attr("y1", minYCoordinate - 10)
    .attr("x2", maxXCoordinate)
    .attr("y2", minYCoordinate - 10)
    .attr("stroke-width", 1)
    .attr("stroke", "black");

  // Plot all the ticks
  ticks.forEach((tick) => drawRulerMarking(tick[0], tick[1]));
}

function drawRulerMarking(sequencePosition, xCoordinate) {
  svg
    .append("text")
    .attr("x", xCoordinate)
    .attr("y", minYCoordinate - 13)
    .text(`|${sequencePosition}`)
    .attr("font-family", fonts)
    .attr("font-size", "12px")
    .attr("fill", "black")
    .style("pointer-events", "none");
}

function drawRulerMarkingRegion(sequencePosition, xCoordinate) {
  svg
    .append("circle")
    .attr("cx", xCoordinate + 3)
    .attr("cy", minYCoordinate - 13)
    .attr("r", 10)
    .attr("opacity", 0.5)
    .attr("fill", "yellow")
    .style("pointer-events", "none");
}

function filterObjectByAttribute(attribute, value) {
  return (item) => item[attribute] === value;
}

function drawTrackRectangles(rectangles, type, groupTrack) {
  rectangles = rectangles.filter(filterObjectByAttribute("type", type));

  groupTrack
    .selectAll("trackRectangles")
    .data(rectangles)
    .enter()
    .append("rect")
    .attr("x", (d) => d.xStart)
    .attr("y", (d) => d.yStart)
    .attr("width", (d) => d.xEnd - d.xStart + 1)
    .attr("height", (d) => d.yEnd - d.yStart + 1)
    .style("fill", (d) => d.color)
    .attr("trackID", (d) => d.id)
    .attr("trackName", (d) => d.name)
    .attr("class", (d) => `track${d.id}`)
    .attr("color", (d) => d.color)
    .on("mouseover", trackMouseOver)
    .on("mouseout", trackMouseOut)
    .on("dblclick", trackDoubleClick)
    .on("click", trackSingleClick)
    .append("svg:title")
    .text((d) => getPopUpTrackText(d.name));
}

function compareCurvesByLineChanges(a, b) {
  if (a[6] < b[6]) return -1;
  else if (a[6] > b[6]) return 1;
  return 0;
}

function defineSVGPatterns() {
  const defs = svg.append("defs");
  let pattern = defs.append("pattern").attrs({
    id: "patternA",
    width: "7",
    height: "7",
    patternUnits: "userSpaceOnUse",
    patternTransform: "rotate(45)",
  });

  pattern
    .append("rect")
    .attrs({ x: "0", y: "0", width: "7", height: "7", fill: "#FFFFFF" });
  pattern
    .append("rect")
    .attrs({ x: "0", y: "0", width: "3", height: "3", fill: "#505050" });
  pattern
    .append("rect")
    .attrs({ x: "0", y: "4", width: "3", height: "3", fill: "#505050" });
  pattern
    .append("rect")
    .attrs({ x: "4", y: "0", width: "3", height: "3", fill: "#505050" });
  pattern
    .append("rect")
    .attrs({ x: "4", y: "4", width: "3", height: "3", fill: "#505050" });

  pattern = defs.append("pattern").attrs({
    id: "patternB",
    width: "8",
    height: "8",
    patternUnits: "userSpaceOnUse",
    patternTransform: "rotate(45)",
  });
  pattern
    .append("rect")
    .attrs({ x: "0", y: "0", width: "8", height: "8", fill: "#FFFFFF" });
  pattern
    .append("rect")
    .attrs({ x: "0", y: "0", width: "3", height: "3", fill: "#1f77b4" });
  pattern
    .append("rect")
    .attrs({ x: "0", y: "5", width: "3", height: "3", fill: "#1f77b4" });
  pattern
    .append("rect")
    .attrs({ x: "5", y: "0", width: "3", height: "3", fill: "#1f77b4" });
  pattern
    .append("rect")
    .attrs({ x: "5", y: "5", width: "3", height: "3", fill: "#1f77b4" });

  pattern = defs.append("pattern").attrs({
    id: "plaid0",
    width: "6",
    height: "6",
    patternUnits: "userSpaceOnUse",
    patternTransform: "rotate(45)",
  });
  pattern
    .append("rect")
    .attrs({ x: "0", y: "0", width: "6", height: "6", fill: "#FFFFFF" });
  pattern
    .append("rect")
    .attrs({ x: "0", y: "0", width: "2", height: "2", fill: "#1f77b4" });
  pattern
    .append("rect")
    .attrs({ x: "0", y: "4", width: "2", height: "2", fill: "#1f77b4" });
  pattern
    .append("rect")
    .attrs({ x: "4", y: "0", width: "2", height: "2", fill: "#1f77b4" });
  pattern
    .append("rect")
    .attrs({ x: "4", y: "4", width: "2", height: "2", fill: "#1f77b4" });

  pattern = defs.append("pattern").attrs({
    id: "plaid1",
    width: "6",
    height: "6",
    patternUnits: "userSpaceOnUse",
    patternTransform: "rotate(45)",
  });
  pattern
    .append("rect")
    .attrs({ x: "0", y: "0", width: "6", height: "6", fill: "#FFFFFF" });
  pattern
    .append("rect")
    .attrs({ x: "0", y: "0", width: "2", height: "2", fill: "#ff7f0e" });
  pattern
    .append("rect")
    .attrs({ x: "0", y: "4", width: "2", height: "2", fill: "#ff7f0e" });
  pattern
    .append("rect")
    .attrs({ x: "4", y: "0", width: "2", height: "2", fill: "#ff7f0e" });
  pattern
    .append("rect")
    .attrs({ x: "4", y: "4", width: "2", height: "2", fill: "#ff7f0e" });

  pattern = defs.append("pattern").attrs({
    id: "plaid2",
    width: "6",
    height: "6",
    patternUnits: "userSpaceOnUse",
    patternTransform: "rotate(45)",
  });
  pattern
    .append("rect")
    .attrs({ x: "0", y: "0", width: "6", height: "6", fill: "#FFFFFF" });
  pattern
    .append("rect")
    .attrs({ x: "0", y: "0", width: "2", height: "2", fill: "#2ca02c" });
  pattern
    .append("rect")
    .attrs({ x: "0", y: "4", width: "2", height: "2", fill: "#2ca02c" });
  pattern
    .append("rect")
    .attrs({ x: "4", y: "0", width: "2", height: "2", fill: "#2ca02c" });
  pattern
    .append("rect")
    .attrs({ x: "4", y: "4", width: "2", height: "2", fill: "#2ca02c" });

  pattern = defs.append("pattern").attrs({
    id: "plaid3",
    width: "6",
    height: "6",
    patternUnits: "userSpaceOnUse",
    patternTransform: "rotate(45)",
  });
  pattern
    .append("rect")
    .attrs({ x: "0", y: "0", width: "6", height: "6", fill: "#FFFFFF" });
  pattern
    .append("rect")
    .attrs({ x: "0", y: "0", width: "2", height: "2", fill: "#d62728" });
  pattern
    .append("rect")
    .attrs({ x: "0", y: "4", width: "2", height: "2", fill: "#d62728" });
  pattern
    .append("rect")
    .attrs({ x: "4", y: "0", width: "2", height: "2", fill: "#d62728" });
  pattern
    .append("rect")
    .attrs({ x: "4", y: "4", width: "2", height: "2", fill: "#d62728" });

  pattern = defs.append("pattern").attrs({
    id: "plaid4",
    width: "6",
    height: "6",
    patternUnits: "userSpaceOnUse",
    patternTransform: "rotate(45)",
  });
  pattern
    .append("rect")
    .attrs({ x: "0", y: "0", width: "6", height: "6", fill: "#FFFFFF" });
  pattern
    .append("rect")
    .attrs({ x: "0", y: "0", width: "2", height: "2", fill: "#9467bd" });
  pattern
    .append("rect")
    .attrs({ x: "0", y: "4", width: "2", height: "2", fill: "#9467bd" });
  pattern
    .append("rect")
    .attrs({ x: "4", y: "0", width: "2", height: "2", fill: "#9467bd" });
  pattern
    .append("rect")
    .attrs({ x: "4", y: "4", width: "2", height: "2", fill: "#9467bd" });

  pattern = defs.append("pattern").attrs({
    id: "plaid5",
    width: "6",
    height: "6",
    patternUnits: "userSpaceOnUse",
    patternTransform: "rotate(45)",
  });
  pattern
    .append("rect")
    .attrs({ x: "0", y: "0", width: "6", height: "6", fill: "#FFFFFF" });
  pattern
    .append("rect")
    .attrs({ x: "0", y: "0", width: "2", height: "2", fill: "#8c564b" });
  pattern
    .append("rect")
    .attrs({ x: "0", y: "4", width: "2", height: "2", fill: "#8c564b" });
  pattern
    .append("rect")
    .attrs({ x: "4", y: "0", width: "2", height: "2", fill: "#8c564b" });
  pattern
    .append("rect")
    .attrs({ x: "4", y: "4", width: "2", height: "2", fill: "#8c564b" });
}

function drawTrackCurves(type, groupTrack) {
  const myTrackCurves = trackCurves.filter(
    filterObjectByAttribute("type", type)
  );

  myTrackCurves.sort(compareCurvesByLineChanges);

  myTrackCurves.forEach((curve) => {
    const xMiddle = (curve.xStart + curve.xEnd) / 2;
    let d = `M ${curve.xStart} ${curve.yStart}`;
    d += ` C ${xMiddle} ${curve.yStart} ${xMiddle} ${curve.yEnd} ${curve.xEnd} ${curve.yEnd}`;
    d += ` V ${curve.yEnd + curve.width}`;
    d += ` C ${xMiddle} ${curve.yEnd + curve.width} ${xMiddle} ${
      curve.yStart + curve.width
    } ${curve.xStart} ${curve.yStart + curve.width}`;
    d += " Z";
    curve.path = d;
  });

  groupTrack
    .selectAll("trackCurves")
    .data(trackCurves)
    .enter()
    .append("path")
    .attr("d", (d) => d.path)
    .style("fill", (d) => d.color)
    .attr("trackID", (d) => d.id)
    .attr("trackName", (d) => d.name)
    .attr("class", (d) => `track${d.id}`)
    .attr("color", (d) => d.color)
    .on("mouseover", trackMouseOver)
    .on("mouseout", trackMouseOut)
    .on("dblclick", trackDoubleClick)
    .on("click", trackSingleClick)
    .append("svg:title")
    .text((d) => getPopUpTrackText(d.name));
}

function drawTrackCorners(corners, type, groupTrack) {
  corners = corners.filter(filterObjectByAttribute("type", type));

  groupTrack
    .selectAll("trackCorners")
    .data(corners)
    .enter()
    .append("path")
    .attr("d", (d) => d.path)
    .style("fill", (d) => d.color)
    .attr("trackID", (d) => d.id)
    .attr("trackName", (d) => d.name)
    .attr("class", (d) => `track${d.id}`)
    .attr("color", (d) => d.color)
    .on("mouseover", trackMouseOver)
    .on("mouseout", trackMouseOut)
    .on("dblclick", trackDoubleClick)
    .on("click", trackSingleClick)
    .append("svg:title")
    .text((d) => getPopUpTrackText(d.name));
}

function drawLegend() {
  let content = '<button id="selectall">Select all</button>';
  content += '<button id="deselectall">Deselect all</button>';
  content +=
    '<table class="table-sm table-condensed table-nonfluid"><thead><tr><th>Color</th><th>Trackname</th><th>Show Track</th></tr></thead>';
  const listeners = [];
  for (let i = 0; i < tracks.length; i += 1) {
    if (tracks[i].type === "haplo") {
      content += `<tr><td style="text-align:right"><div class="color-box" style="background-color: ${generateTrackColor(
        tracks[i],
        "exon"
      )};"></div></td>`;
      if (tracks[i].hasOwnProperty("name")) {
        content += `<td>${tracks[i].name}</td>`;
      } else {
        content += `<td>${tracks[i].id}</td>`;
      }
      content += `<td><input type="checkbox" checked=true id="showTrack${i}"></td>`;
      listeners.push(i);
    }
  }
  content += "</table";
  // $('#legendDiv').html(content);
  document.getElementById("legendDiv").innerHTML = content;
  listeners.forEach((i) => {
    document
      .getElementById(`showTrack${i}`)
      .addEventListener("click", () => changeTrackVisibility(i), false);
  });
  document
    .getElementById("selectall")
    .addEventListener("click", () => changeAllTracksVisibility(true), false);
  document
    .getElementById("deselectall")
    .addEventListener("click", () => changeAllTracksVisibility(false), false);
}

// Get a non-read input track index by the ID stored in ther d3 objects.
function getInputTrackIndexByID(trackID) {
  let index = 0;
  while (
    index < inputTracks.length &&
    inputTracks[index].id !== Number(trackID)
  ) {
    index += 1;
  }
  // There might not be a track
  if (index >= inputTracks.length) return;
  return index;
}

// Get any track object by ID.
// Because of reordering of input tracks, the ID doesn't always match the index.
function getTrackByID(trackID) {
  if (typeof trackID !== "number") {
    throw new Error("Track IDs must be numbers");
  }
  // We just do a scan.
  // TODO: index!
  for (let i = 0; i < tracks.length; i++) {
    if (tracks[i].id === trackID) {
      console.log("Found track with ID ", trackID, " at index ", i);
      return tracks[i];
    }
  }
}

// Highlight track on mouseover
function trackMouseOver() {
  /* jshint validthis: true */
  const trackID = d3.select(this).attr("trackID");
  d3.selectAll(`.track${trackID}`).style("fill", "url(#patternA)").raise();
}

// Highlight node on mouseover
function nodeMouseOver() {
  /* jshint validthis: true */
  d3.select(this).style("stroke-width", "4px");
}

// Restore original track appearance on mouseout
function trackMouseOut() {
  /* jshint validthis: true */
  const trackID = d3.select(this).attr("trackID");
  d3.selectAll(`.track${trackID}`).each(function clearTrackHighlight() {
    const c = d3.select(this).attr("color");
    d3.select(this).style("fill", c).lower();
  });
}

// Restore original node appearance on mouseout
function nodeMouseOut() {
  /* jshint validthis: true */
  d3.select(this).style("stroke-width", "2px");
}

// Move clicked track to first position
function trackDoubleClick() {
  /* jshint validthis: true */
  const trackID = d3.select(this).attr("trackID");
  const index = getInputTrackIndexByID(trackID);
  if (index === undefined) {
    // Must be a read. Skip it.
    return;
  }
  if (DEBUG) console.log(`moving index: ${index}`);
  moveTrackToFirstPosition(index);
  createTubeMap();
}

// Takes a track and returns a string describing the nodes it passes through
// In the format of >1>2<3>4, with the intergers being nodeIDs
function getPathInfo(track) {
  let result = [];
  if (!track.sequence) {
    return result;
  }

  for (const nodeID of track.sequence) {
    // Node is approached backwards if "-" is present
    if (nodeID.startsWith("-")) {
      result.push("<", nodeID.substring(1));
    } else {
      result.push(">", nodeID);
    }
  }
  
  return result.join("");
}

function trackSingleClick() {
  /* jshint validthis: true */
  // Get the track ID as a number
  const trackID = Number(d3.select(this).attr("trackID"));
  let current_track = getTrackByID(trackID);
  console.log("Track ", trackID, " is ", current_track);
  if (current_track === undefined) {
    console.error("Missing track: ", trackID);
    return;
  }
  let track_attributes = [];
  track_attributes.push(["Name", current_track.name]);
  if (current_track.type === "read") {
    track_attributes.push(["Sample Name", current_track.sample_name]);
    track_attributes.push([
      "Primary Alignment?",
      current_track.is_secondary ? "Secondary" : "Primary",
    ]);
    track_attributes.push(["Read Group", current_track.read_group]);
    track_attributes.push(["Score", current_track.score]);
    track_attributes.push(["CIGAR string", current_track.cigar_string]);
    track_attributes.push(["Mapping Quality", current_track.mapping_quality]);
    track_attributes.push(["Path Info", getPathInfo(current_track)]);
  }
  console.log("Single Click");
  console.log("read path");
  config.showInfoCallback(track_attributes);
}

// show track name when hovering mouse
function getPopUpTrackText(trackid) {
  return trackid;
}

// Redraw with current node moved to beginning
function nodeDoubleClick() {
  /* jshint validthis: true */
  const nodeID = d3.select(this).attr("id");
  if (config.clickableNodesFlag) {
    if (reads && config.showReads) {
      document.getElementById("hgvmNodeID").value = nodeID;
      document.getElementById("hgvmPostButton").click();
    } else {
      document.getElementById("nodeID").value = nodeID;
      document.getElementById("postButton").click();
    }
  }
}

// extract info about nodes from vg-json
export function vgExtractNodes(vg) {
  const result = [];
  vg.node.forEach((node) => {
    result.push({
      name: `${node.id}`,
      sequenceLength: node.sequence.length,
      seq: node.sequence,
    });
  });
  return result;
}

// calculate node widths depending on sequence lengths and chosen calculation method
function generateNodeWidth() {
  nodes.forEach((node) => {
    if (!node.hasOwnProperty("sequenceLength")) {
      node.sequenceLength = node.seq.length;
    }
  });

  switch (config.nodeWidthOption) {
    case 1:
      nodes.forEach((node) => {
        node.width = 1 + Math.log(node.sequenceLength) / Math.log(2);
        node.pixelWidth = Math.round((node.width - 1) * 8.401);
      });
      break;
    case 2:
      nodes.forEach((node) => {
        node.width = node.sequenceLength / 100;
        node.pixelWidth = Math.round((node.width - 1) * 8.401);
      });
      break;
    default:
      nodes.forEach((node) => {
        node.width = node.sequenceLength;

        // get width of node's text label by writing label, measuring it and removing label
        svg
          .append("text")
          .attr("x", 0)
          .attr("y", 100)
          .attr("id", "dummytext")
          .text(node.seq.substr(1))
          .attr("font-family", fonts)
          .attr("font-size", "14px")
          .attr("fill", "black")
          .style("pointer-events", "none");
        // TODO: This assumes that svg is in the document.
        let element = document.getElementById("dummytext");
        if (element.getComputedTextLength) {
          // We are on a platform where text length computation is possible (i.e. a real browser)
          node.pixelWidth = Math.round(element.getComputedTextLength());
        }
        document.getElementById("dummytext").remove();
      });
  }
}

// extract track info from vg-json
export function vgExtractTracks(vg, pathSourceTrackId, haplotypeSourceTrackID) {
  const result = [];
  vg.path.forEach((path, index) => {
    const sequence = [];
    let isCompletelyReverse = true;
    path.mapping.forEach((pos) => {
      if (
        pos.position.hasOwnProperty("is_reverse") &&
        pos.position.is_reverse === true
      ) {
        // Visit this node in reverse
        sequence.push(reverse(`${pos.position.node_id}`));
      } else {
        // Visit this node forward
        sequence.push(`${pos.position.node_id}`);
        // Remember that we visit at least one node in its local forward orientation
        isCompletelyReverse = false;
      }
    });
    if (isCompletelyReverse) {
      // Give the sequence in a reverse order for layout
      sequence.reverse();
      sequence.forEach((node, index2) => {
        sequence[index2] = forward(node);
      });
    }
    const track = {};
    track.id = index;
    track.sequence = sequence;
    track.isCompletelyReverse = isCompletelyReverse;
    // Even non-haplotype paths will be assigned a "freq" field by vg. See
    // <https://github.com/vgteam/vg/blob/6b34cd50e851eb9a91be3a605e040c9be1d4b78e/src/haplotype_extracter.cpp#L52-L55>.
    // We want to copy those through so that non-haplotype paths have a normal width.
    track.freq = path.freq;
    // But haplotypes will have names starting with "thread_".
    if (path.name && path.name.startsWith("thread_")) {
      // This is a haplotype
      track.sourceTrackID = haplotypeSourceTrackID;
    } else {
      // This is a path
      track.sourceTrackID = pathSourceTrackId;
    }
    if (path.hasOwnProperty("name")) track.name = path.name;
    if (path.hasOwnProperty("indexOfFirstBase")) {
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

  if (isReverse(a.sequence[0])) {
    if (isReverse(a.sequence[a.sequence.length - 1])) {
      leftNodeA = forward(a.sequence[a.sequence.length - 1]);
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

  if (isReverse(b.sequence[0])) {
    if (isReverse(b.sequence[b.sequence.length - 1])) {
      leftNodeB = forward(b.sequence[b.sequence.length - 1]);
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
  if (
    nodes[Math.abs(a.indexSequence[0])].order <
    nodes[Math.abs(b.indexSequence[0])].order
  ) {
    return -1;
  } else if (
    nodes[Math.abs(a.indexSequence[0])].order >
    nodes[Math.abs(b.indexSequence[0])].order
  ) {
    return 1;
  }

  // compare by first base within first node
  if (a.firstNodeOffset < b.firstNodeOffset) return -1;
  else if (a.firstNodeOffset > b.firstNodeOffset) return 1;

  // compare by order of last node
  if (
    nodes[Math.abs(a.indexSequence[a.indexSequence.length - 1])].order <
    nodes[Math.abs(b.indexSequence[b.indexSequence.length - 1])].order
  ) {
    return -1;
  } else if (
    nodes[Math.abs(a.indexSequence[a.indexSequence.length - 1])].order >
    nodes[Math.abs(b.indexSequence[b.indexSequence.length - 1])].order
  ) {
    return 1;
  }

  // compare by last base withing last node
  if (a.finalNodeCoverLength < b.finalNodeCoverLength) return -1;
  else if (a.finalNodeCoverLength > b.finalNodeCoverLength) return 1;

  return 0;
}

// converts readPath, a vg Path object expressed as a JS object, to a CIGAR string
export function cigar_string(readPath) {
  if (DEBUG) {
    console.log("readPath mapping:", readPath.mapping);
  }
  let cigar = [];
  for (let i = 0; i < readPath.mapping.length; i += 1) {
    let mapping = readPath.mapping[i];
    for (let j = 0; j < mapping.edit.length; j += 1) {
      let edit = mapping.edit[j];
      // from_length is not 0, and from_length = to_length, this indicates a match
      if (edit.from_length && edit.from_length === edit.to_length) {
        cigar = append_cigar_operation(edit.from_length, "M", cigar);
      } else {
        // from_length can be 0, and from_length = to_length, this indicates a match
        if (edit.from_length === edit.to_length) {
          cigar = append_cigar_operation(edit.from_length, "M", cigar);
        }
        // if from_length > to_length, this indicates a deletion
        else if (edit.from_length > edit.to_length) {
          const del = edit.from_length - edit.to_length;
          const eq = edit.to_length;
          if (eq) {
            cigar = append_cigar_operation(eq, "M", cigar);
          }
          cigar = append_cigar_operation(del, "D", cigar);
        }
        // if from_length < to_length, this indicates an insertion
        else if (edit.from_length < edit.to_length) {
          const ins = edit.to_length - edit.from_length;
          const eq = edit.from_length;
          if (eq) {
            cigar = append_cigar_operation(eq, "M", cigar);
          }
          cigar = append_cigar_operation(ins, "I", cigar);
        }
        // if to_length is undefined, this indicates a deletion
        else if (edit.from_length && edit.to_length === undefined) {
          const del = edit.from_length;
          cigar = append_cigar_operation(del, "D", cigar);
        }
        // if from_length is undefined, this indicates an insertion
        else if (edit.from_length === undefined && edit.to_length) {
          const ins = edit.to_length;
          cigar = append_cigar_operation(ins, "I", cigar);
        }
      }
    }
  }
  if (DEBUG) {
    console.log("cigar string:", cigar.join(""));
  }
  return cigar.join("");
}

function append_cigar_operation(length, operator, cigar) {
  let last_operation = cigar[cigar.length - 1];
  let last_length = cigar[cigar.length - 2];
  // if duplicate operations, add the two operations and replace the most recent operation with this
  if (last_operation === operator) {
    let newLength = last_length + length;
    cigar[cigar.length - 2] = newLength;
  } else {
    cigar.push(length);
    cigar.push(operator);
  }
  return cigar;
}

// Pull out reads from a server response into tube map internal format.
// Use myTracks, and idOffset to compute IDs for each read.
// Assign each read the given sourceTrackID.
export function vgExtractReads(
  myNodes,
  myTracks,
  myReads,
  idOffset,
  sourceTrackID
) {
  if (DEBUG) {
    console.log("Reads:");
    console.log(myReads);
  }
  const extracted = [];

  const nodeNames = [];
  myNodes.forEach((node) => {
    nodeNames.push(node.name, 10); // TODO: why 10?
  });

  for (let i = 0; i < myReads.length; i += 1) {
    const read = myReads[i];

    if (!read.path) {
      // Read does not have a path assigned, this is an unmapped read.
      continue;
    }

    const sequence = [];
    const sequenceNew = [];
    let firstIndex = -1; // index within mapping of the first node id contained in nodeNames
    let lastIndex = -1; // index within mapping of the last node id contained in nodeNames
    read.path.mapping.forEach((pos, j) => {
      if (nodeNames.indexOf(pos.position.node_id) > -1) {
        const edit = {};
        let offset = 0;
        if (
          pos.position.hasOwnProperty("is_reverse") &&
          pos.position.is_reverse === true
        ) {
          sequence.push(reverse(`${pos.position.node_id}`));
          edit.nodeName = reverse(`${pos.position.node_id}`);
        } else {
          sequence.push(`${pos.position.node_id}`);
          edit.nodeName = pos.position.node_id.toString();
        }
        if (firstIndex < 0) {
          firstIndex = j;
          if (pos.position.hasOwnProperty("offset")) {
            pos.position.offset = parseInt(pos.position.offset, 10);
            offset = pos.position.offset;
          }
        }
        lastIndex = j;

        const mismatches = [];
        let posWithinNode = offset;
        pos.edit.forEach((element) => {
          if (
            element.hasOwnProperty("to_length") &&
            !element.hasOwnProperty("from_length")
          ) {
            // insertion
            mismatches.push({
              type: "insertion",
              pos: posWithinNode,
              seq: element.sequence,
            });
          } else if (
            !element.hasOwnProperty("to_length") &&
            element.hasOwnProperty("from_length")
          ) {
            // deletion
            mismatches.push({
              type: "deletion",
              pos: posWithinNode,
              length: element.from_length,
            });
          } else if (element.hasOwnProperty("sequence")) {
            // substitution
            if (element.sequence.length > 1) {
              if (DEBUG) {
                console.log(
                  `found substitution at read ${i}, node ${j} = ${pos.position.node_id}, seq = ${element.sequence}`
                );
              }
            }
            mismatches.push({
              type: "substitution",
              pos: posWithinNode,
              seq: element.sequence,
            });
          }
          if (element.hasOwnProperty("from_length")) {
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
      track.id = myTracks.length + extracted.length + idOffset;
      track.sourceTrackID = sourceTrackID;
      track.sequence = sequence;
      track.sequenceNew = sequenceNew;
      track.type = "read";
      if (read.path.hasOwnProperty("freq")) track.freq = read.path.freq;
      if (read.hasOwnProperty("name")) track.name = read.name;

      // where within node does read start
      track.firstNodeOffset = 0;
      if (read.path.mapping[firstIndex].position.hasOwnProperty("offset")) {
        track.firstNodeOffset = read.path.mapping[firstIndex].position.offset;
      }

      // where within node does read end
      const finalNodeEdit = read.path.mapping[lastIndex].edit;
      track.finalNodeCoverLength = 0;
      if (read.path.mapping[lastIndex].position.hasOwnProperty("offset")) {
        track.finalNodeCoverLength +=
          read.path.mapping[lastIndex].position.offset;
      }
      finalNodeEdit.forEach((edit) => {
        if (edit.hasOwnProperty("from_length")) {
          track.finalNodeCoverLength += edit.from_length;
        }
      });

      track.mapping_quality = read.mapping_quality || 0;
      track.is_secondary = read.is_secondary || false;
      track.sample_name = read.sample_name || null;
      track.read_group = read.read_group || null;
      track.cigar_string = cigar_string(read.path);
      track.score = read.score || 0;
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

  tracksAndReads.forEach((track) => {
    for (let i = 0; i < track.sequence.length; i += 1) {
      if (!isReverse(track.sequence[i])) {
        // forward Node
        if (i > 0) {
          nodeName = track.sequence[i - 1];
          pred[nodeMap.get(track.sequence[i])].add(nodeName);
          if (isReverse(nodeName)) {
            // add 2 predecessors, to make sure there is no node merging in this case
            pred[nodeMap.get(track.sequence[i])].add(forward(nodeName));
          }
        } else if (track.type === "haplo") {
          pred[nodeMap.get(track.sequence[i])].add("None");
        }
        if (i < track.sequence.length - 1) {
          nodeName = track.sequence[i + 1];
          succ[nodeMap.get(track.sequence[i])].add(nodeName);
          if (isReverse(nodeName)) {
            // add 2 successors, to make sure there is no node merging in this case
            succ[nodeMap.get(track.sequence[i])].add(forward(nodeName));
          }
        } else if (track.type === "haplo") {
          succ[nodeMap.get(track.sequence[i])].add("None");
        }
      } else {
        // reverse Node
        nodeName = forward(track.sequence[i]);
        if (i > 0) {
          nodeName2 = track.sequence[i - 1];
          if (isReverse(nodeName2)) {
            succ[nodeMap.get(nodeName)].add(forward(nodeName2));
          } else {
            // add 2 successors, to make sure there is no node merging in this case
            succ[nodeMap.get(nodeName)].add(nodeName2);
            succ[nodeMap.get(nodeName)].add(reverse(nodeName2));
          }
        } else if (track.type === "haplo") {
          succ[nodeMap.get(nodeName)].add("None");
        }
        if (i < track.sequence.length - 1) {
          nodeName2 = track.sequence[i + 1];
          if (isReverse(nodeName2)) {
            pred[nodeMap.get(nodeName)].add(forward(nodeName2));
          } else {
            pred[nodeMap.get(nodeName)].add(nodeName2);
            pred[nodeMap.get(nodeName)].add(reverse(nodeName2));
          }
        } else if (track.type === "haplo") {
          pred[nodeMap.get(nodeName)].add("None");
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
    sortedNodes.forEach((node) => {
      const predecessor = mergeableWithPred(nodeMap.get(node.name), pred, succ);
      if (predecessor) {
        mergeOffset.set(
          node.name,
          mergeOffset.get(predecessor) +
            nodes[nodeMap.get(predecessor)].sequenceLength
        );
        mergeOffset.set(
          "-" + node.name,
          mergeOffset.get(predecessor) +
            nodes[nodeMap.get(predecessor)].sequenceLength
        );
        mergeOrigin.set(node.name, mergeOrigin.get(predecessor));
        mergeOrigin.set(reverse(node.name), mergeOrigin.get(predecessor));
      } else {
        mergeOffset.set(node.name, 0);
        mergeOffset.set(reverse(node.name), 0);
        mergeOrigin.set(node.name, node.name);
        mergeOrigin.set(reverse(node.name), node.name);
      }
    });

    reads.forEach((read) => {
      read.firstNodeOffset += mergeOffset.get(read.sequence[0]);
      read.finalNodeCoverLength += mergeOffset.get(
        read.sequence[read.sequence.length - 1]
      );
      for (let i = read.sequence.length - 1; i >= 0; i -= 1) {
        const nodeName = forward(read.sequence[i]);
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
              read.sequenceNew[i].mismatches.forEach((mismatch) => {
                mismatch.pos += nodes[nodeMap.get(predecessor)].sequenceLength;
              });
              // append mismatches to previous entry's mismatches
              read.sequenceNew[i - 1].mismatches = read.sequenceNew[
                i - 1
              ].mismatches.concat(read.sequenceNew[i].mismatches);
              read.sequenceNew.splice(i, 1);
            } else {
              read.sequence[0] = mergeOrigin.get(read.sequence[0]);
              read.sequenceNew[i].mismatches.forEach((mismatch) => {
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
        donor = forward(succ[donor][0]);
        donor = nodeMap.get(donor);
        if (nodes[i].hasOwnProperty("sequenceLength")) {
          nodes[i].sequenceLength += nodes[donor].sequenceLength;
        } else {
          nodes[i].width += nodes[donor].width;
        }
        nodes[i].seq += nodes[donor].seq;
      }
    }
  }

  // actually merge the nodes by removing the corresponding nodes from track data
  tracks.forEach((track) => {
    for (let i = track.sequence.length - 1; i >= 0; i -= 1) {
      nodeName = forward(track.sequence[i]);
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
  if (pred[index][0] === "None") return false;
  let predecessor = forward(pred[index][0]);
  const predecessorIndex = nodeMap.get(predecessor);
  if (succ[predecessorIndex].length !== 1) return false;
  if (succ[predecessorIndex][0] === "None") return false;
  return predecessor;
}

function mergeableWithSucc(index, pred, succ) {
  if (succ[index].length !== 1) return false;
  if (succ[index][0] === "None") return false;
  let successor = forward(succ[index][0]);
  const successorIndex = nodeMap.get(successor);
  if (pred[successorIndex].length !== 1) return false;
  if (pred[successorIndex][0] === "None") return false;
  return true;
}

function drawMismatches() {
  tracks.forEach((read, trackIdx) => {
    if (read.type === "read") {
      read.sequenceNew.forEach((element, i) => {
        element.mismatches.forEach((mm) => {
          const nodeName = forward(element.nodeName);
          const nodeIndex = nodeMap.get(nodeName);
          const node = nodes[nodeIndex];
          const x = getXCoordinateOfBaseWithinNode(node, mm.pos);
          let pathIndex = i;
          while (read.path[pathIndex].node !== nodeIndex) {
            pathIndex += 1;
          }
          const y = read.path[pathIndex].y;
          if (mm.type === "insertion") {
            if (
              config.showSoftClips ||
              ((mm.pos !== read.firstNodeOffset || i !== 0) &&
                (mm.pos !== read.finalNodeCoverLength ||
                  i !== read.sequenceNew.length - 1))
            ) {
              drawInsertion(x - 3, y + READ_WIDTH, mm.seq, node.y);
            }
          } else if (mm.type === "deletion") {
            const x2 = getXCoordinateOfBaseWithinNode(node, mm.pos + mm.length);
            drawDeletion(x, x2, y + 4, node.y);
          } else if (mm.type === "substitution") {
            const x2 = getXCoordinateOfBaseWithinNode(
              node,
              mm.pos + mm.seq.length
            );
            drawSubstitution(x + 1, x2, y + READ_WIDTH, node.y, mm.seq);
          }
        });
      });
    }
  });
}

function drawInsertion(x, y, seq, nodeY) {
  svg
    .append("text")
    .attr("x", x)
    .attr("y", y)
    .text("*")
    .attr("font-family", fonts)
    .attr("font-size", "12px")
    .attr("fill", "black")
    .attr("nodeY", nodeY)
    .on("mouseover", insertionMouseOver)
    .on("mouseout", insertionMouseOut)
    .append("svg:title")
    .text(seq);
}

function drawSubstitution(x1, x2, y, nodeY, seq) {
  svg
    .append("text")
    .attr("x", x1)
    .attr("y", y)
    .text(seq)
    .attr("font-family", fonts)
    .attr("font-size", "12px")
    .attr("fill", "black")
    .attr("nodeY", nodeY)
    .attr("rightX", x2)
    .on("mouseover", substitutionMouseOver)
    .on("mouseout", substitutionMouseOut);
}

function drawDeletion(x1, x2, y, nodeY) {
  // draw horizontal block
  svg
    .append("line")
    .attr("x1", x1)
    .attr("y1", y - 1)
    .attr("x2", x2)
    .attr("y2", y - 1)
    .attr("stroke-width", READ_WIDTH)
    .attr("stroke", "grey")
    .attr("nodeY", nodeY)
    .on("mouseover", deletionMouseOver)
    .on("mouseout", deletionMouseOut);
}

function insertionMouseOver() {
  /* jshint validthis: true */
  d3.select(this).attr("fill", "red");
  const x = Number(d3.select(this).attr("x"));
  const y = Number(d3.select(this).attr("y"));
  const yTop = Number(d3.select(this).attr("nodeY"));
  svg
    .append("line")
    .attr("class", "insertionHighlight")
    .attr("x1", x + 4)
    .attr("y1", y - 10)
    .attr("x2", x + 4)
    .attr("y2", yTop + 5)
    .attr("stroke-width", 1)
    .attr("stroke", "black");
}

function deletionMouseOver() {
  /* jshint validthis: true */
  d3.select(this).attr("stroke", "red");
  const x1 = Number(d3.select(this).attr("x1"));
  const x2 = Number(d3.select(this).attr("x2"));
  const y = Number(d3.select(this).attr("y1"));
  const yTop = Number(d3.select(this).attr("nodeY"));
  svg
    .append("line")
    .attr("class", "deletionHighlight")
    .attr("x1", x1)
    .attr("y1", y - 3)
    .attr("x2", x1)
    .attr("y2", yTop + 5)
    .attr("stroke-width", 1)
    .attr("stroke", "black");
  svg
    .append("line")
    .attr("class", "deletionHighlight")
    .attr("x1", x2)
    .attr("y1", y - 3)
    .attr("x2", x2)
    .attr("y2", yTop + 5)
    .attr("stroke-width", 1)
    .attr("stroke", "black");
}

function substitutionMouseOver() {
  /* jshint validthis: true */
  d3.select(this).attr("fill", "red");
  const x1 = Number(d3.select(this).attr("x"));
  const x2 = Number(d3.select(this).attr("rightX"));
  const y = Number(d3.select(this).attr("y"));
  const yTop = Number(d3.select(this).attr("nodeY"));
  svg
    .append("line")
    .attr("class", "substitutionHighlight")
    .attr("x1", x1 - 1)
    .attr("y1", y - READ_WIDTH)
    .attr("x2", x1 - 1)
    .attr("y2", yTop + 5)
    .attr("stroke-width", 1)
    .attr("stroke", "black");
  svg
    .append("line")
    .attr("class", "substitutionHighlight")
    .attr("x1", x2 + 1)
    .attr("y1", y - READ_WIDTH)
    .attr("x2", x2 + 1)
    .attr("y2", yTop + 5)
    .attr("stroke-width", 1)
    .attr("stroke", "black");
}

function insertionMouseOut() {
  /* jshint validthis: true */
  d3.select(this).attr("fill", "black");
  d3.selectAll(".insertionHighlight").remove();
}

function deletionMouseOut() {
  /* jshint validthis: true */
  d3.select(this).attr("stroke", "grey");
  d3.selectAll(".deletionHighlight").remove();
}

function substitutionMouseOut() {
  /* jshint validthis: true */
  d3.select(this).attr("fill", "black");
  d3.selectAll(".substitutionHighlight").remove();
}

function filterReads(reads) {
  if (!reads) return reads;
  return reads.filter(
    (read) =>
      !read.is_secondary && read.mapping_quality >= config.mappingQualityCutoff
  );
}
