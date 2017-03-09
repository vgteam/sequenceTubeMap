/*jshint loopfunc:true */

var sequenceTubeMap = (function () {
'use strict';

  var DEBUG = false;
  var offsetY = 0;
  var color = d3.scale.category10().domain([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  var numberOfColors = 10;
  var svgID; //the (html-tag) ID of the svg
  var svg; //the svg
  var inputNodes = [];
  var inputTracks = [];
  var numberOfNodes;
  var numberOfTracks;
  var nodeMap; //maps node names to node indices
  var assignment = []; //contains info about lane assignments sorted by order
  var extraLeft = []; //info whether nodes have to be moved further apart because of multiple 180° directional changes at the same horizontal order
  var extraRight = []; //info whether nodes have to be moved further apart because of multiple 180° directional changes at the same horizontal order
  var maxOrder; //horizontal order of the rightmost node
  var mergeNodesFlag = true;
  var clickableNodesFlag = false;

  // 0...scale node width linear with number of bases within node
  // 1...scale node width with log2 of number of bases within node
  // 2...scale node width with log10 of number of bases within node
  var nodeWidthOption = 0;

  //Variables for storing info which can be directly translated into drawing instructions
  var trackRectangles = [];
  var trackCurves = [];
  var trackCorners = [];
  var trackVerticalRectangles = []; //stored separately from horizontal rectangles. This allows drawing them in a separate step -> avoids issues with wrong overlapping

  var maxYCoordinate = 0;
  var minYCoordinate = 0;

  //public function to fill the svg with a visualization of the data contained in nodes and tracks variables
  function create(inputSvg, nodes, tracks, clickableNodes) {
    if (typeof(clickableNodes)==='undefined') clickableNodesFlag = false;
    else clickableNodesFlag = clickableNodes;
    svgID = inputSvg;
    svg = d3.select(inputSvg);
    inputNodes = (JSON.parse(JSON.stringify(nodes))); //deep copy
    inputTracks = (JSON.parse(JSON.stringify(tracks)));
    var tr = createTubeMap();
    drawLegend(tr);
  }

  //moves a specific track to the top, un-inverts all its inversions and starts the redrawing
  function moveTrackToFirstPosition(index) {
    var i, j;
    var nodesToInvert = [];
    var currentSequence;
    var nodeName;

    inputTracks.unshift(inputTracks[index]); //add element to beginning
    inputTracks.splice(index + 1, 1); //remove 1 element from the middle

    //the first track should have as few inversions as possible
    //find out which nodes should be inverted
    currentSequence = inputTracks[0].sequence;
    for (i = 0; i < currentSequence.length; i++) {
      if (currentSequence[i].charAt(0) === '-') {
        nodeName = currentSequence[i].substr(1);
        if ((currentSequence.indexOf(nodeName) === -1) || (currentSequence.indexOf(nodeName) > i)) { //only if this inverted node is no repeat
          nodesToInvert.push(currentSequence[i].substr(1));
        }
      }
    }

    //invert nodes
    for (i = 0; i < inputTracks.length; i++) {
      currentSequence = inputTracks[i].sequence;
      for (j = 0; j < currentSequence.length; j++) {
        if (currentSequence[j].charAt(0) !== '-') {
          if (nodesToInvert.indexOf(currentSequence[j]) !== -1) {
            currentSequence[j] = '-' + currentSequence[j];
          }
        } else {
          if (nodesToInvert.indexOf(currentSequence[j].substr(1)) !== -1) {
            currentSequence[j] = currentSequence[j].substr(1);
          }
        }
      }
    }
    createTubeMap();
  }

  function changeTrackVisibility(trackID) {
    var i = 0;
    while ((i < inputTracks.length) && (inputTracks[i].id !== trackID)) i++;
    if (i < inputTracks.length) {
      if (inputTracks[i].hasOwnProperty('hidden')) {
        inputTracks[i].hidden = !inputTracks[i].hidden;
      } else {
        inputTracks[i].hidden = true;
      }
    }
    createTubeMap();
  }

  //sets the flag for whether redundant nodes should be automatically removed or not
  function setMergeNodesFlag(value) {
    if (mergeNodesFlag !== value) {
      mergeNodesFlag = value;
      svg = d3.select(svgID);
      createTubeMap();
    }
  }

  //sets which option should be used for calculating the node width from its sequence length
  function setNodeWidthOption(value) {
    if ((value === 0) || (value === 1) || (value ===2)) {
      if (nodeWidthOption !== value) {
        nodeWidthOption = value;
        if (svg !== undefined) {
          svg = d3.select(svgID);
          createTubeMap();
        }
      }
    }
  }

  //main
  function createTubeMap() {
    var nodes = (JSON.parse(JSON.stringify(inputNodes))); //deep copy (can add stuff to copy and leave original unchanged)
    var tracks = (JSON.parse(JSON.stringify(inputTracks)));

    for (var i = tracks.length - 1; i >= 0; i--) {
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
    assignment = [];
    extraLeft = [];
    extraRight = [];
    maxYCoordinate = 0;
    minYCoordinate = 0;
    svg = d3.select(svgID);
    svg.selectAll('*').remove(); //clear svg for (re-)drawing

    if (mergeNodesFlag) {
      var NodesAndTracks = mergeNodes(nodes, tracks);
      nodes = NodesAndTracks.nodes;
      tracks = NodesAndTracks.tracks;
    }

    numberOfNodes = nodes.length;
    numberOfTracks = tracks.length;
    nodeMap = generateNodeMap(nodes);
    generateNodeSuccessors(nodes, tracks);
    generateNodeWidth(nodes);
    generateNodeDegree(nodes, tracks);
    generateNodeOrder(nodes, tracks);
    maxOrder = getMaxOrder(nodes);
    switchNodeOrientation(nodes, tracks);
    calculateTrackWidth(tracks);
    generateLaneAssignment(nodes, tracks);
    generateNodeXCoords(nodes, tracks);
    generateSVGShapesFromPath(nodes, tracks);
    removeUnusedNodes(nodes);
    console.log('tracks:');
    console.log(tracks);
    console.log('Nodes:');
    console.log(nodes);
    console.log('Lane assignment:');
    console.log(assignment);
    alignSVG(nodes, tracks);
    defineSVGPatterns();
    drawTrackRectangles(trackRectangles);
    drawTrackCurves(trackCurves);
    drawReversalsByColor(trackCorners, trackVerticalRectangles);
    drawNodes(nodes);
    if (nodeWidthOption === 0) drawLabels(nodes);

    if (DEBUG) {
      console.log('number of tracks: ' + numberOfTracks);
      console.log('number of nodes: ' + numberOfNodes);
    }

    return tracks;
  }

  //remove nodes with no tracks moving through them to avoid d3.js errors
  function removeUnusedNodes(nodes) {
    var i;

    for (i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].degree === 0) {
        nodes.splice(i, 1);
      }
    }
    numberOfNodes = nodes.length;
  }

  //align visualization to the top and left within svg and resize svg to correct size
  function alignSVG(nodes, tracks) {
    var maxX = -9007199254740991;

    nodes.forEach(function(node) {
      if (node.hasOwnProperty('x')) {
        maxX = Math.max(maxX, node.x + 20 + node.pixelWidth);
      }
    });

    //enable Pan + Zoom
    var zoom = d3.behavior.zoom().scaleExtent([0.1, 5]).on("zoom", function () {
        svg.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
      });
    svg = svg.call(zoom).on('dblclick.zoom', null).append('g');

    //translate so that top of drawing is visible
    zoom.translate([0, - minYCoordinate + 15]);
    zoom.event(svg);

    //resize svg depending on drawing size
    //this feels dirty, but changing the attributes of the 'svg'-Variable does not have the desired effect
    var svg2 = d3.select(svgID);
    svg2.attr('height', maxYCoordinate - minYCoordinate + 30);
    svg2.attr('width', Math.max(maxX, $(svgID).parent().width()));
  }

  //map node names to node indices
  function generateNodeMap(nodes) {
    var nodeMap = new Map();

    nodes.forEach(function(node, index) {
      nodeMap.set(node.name, index);
    });
    return nodeMap;
  }

  //adds a successor-array to each node containing the names of the nodes coming directly after the current node
  function generateNodeSuccessors(nodes, tracks) {
    var i;
    var currentNode;
    var followerID;
    var modifiedSequence = [];

    nodes.forEach(function(node) {
      node.successors = [];
      node.predecessors = [];
    });

    tracks.forEach(function(track) {
      modifiedSequence = uninvert(track.sequence);
      for(i = 0; i < modifiedSequence.length - 1; i++) {
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

  //calculates order values for all nodes along a single track
  function generateNodeOrderOfSingleTrack(sequence, nodes) {
    var currentOrder = 0;
    var currentNode;

    sequence.forEach(function(nodeName) {
      if (nodeName.charAt(0) === '-') nodeName = nodeName.substr(1);
      currentNode = nodes[nodeMap.get(nodeName)];
      if (! currentNode.hasOwnProperty('order')) {
        currentNode.order = currentOrder;
        currentOrder++;
      }
    });
  }

  //calculate the order-value of nodes contained in sequence which are to the left of the first node which already has an order-value
  function generateNodeOrderLeftEnd(sequence, nodes) {
    var anchorIndex = 0;
    var nodeNames = new Map();
    var currentOrder;
    var currentNode;
    var j;

    while (! nodes[nodeMap.get(sequence[anchorIndex])].hasOwnProperty('order')) anchorIndex++; //anchor = first node in common with existing graph

    for (j = anchorIndex - 1; j >= 0; j--) { //count number of nodes to the left of anchorIndex counting repeated nodes only once
      nodeNames.set(sequence[j], true);
    }

    currentOrder = nodes[nodeMap.get(sequence[anchorIndex])].order - nodeNames.size; //order of first node
    for (j = 0; j < anchorIndex; j++) { //assign order to nodes
      currentNode = nodes[nodeMap.get(sequence[j])];
      if (! currentNode.hasOwnProperty('order')) {
        currentNode.order = currentOrder;
        currentOrder++;
      }
    }

    if (nodes[nodeMap.get(sequence[0])].order < 0) {
      increaseOrderForAllNodes(nodes, -nodes[nodeMap.get(sequence[0])].order);
    }

    return anchorIndex;
  }

  //generate global sequence of nodes from left to right, starting with first track and adding other tracks sequentially
  function generateNodeOrder(nodes, tracks) {
    var modifiedSequence;
    var i;
    var j;
    var currentOrder;
    var currentNode;
    var rightIndex;
    var leftIndex;

    generateNodeOrderOfSingleTrack(tracks[0].sequence, nodes); //calculate order values for all nodes of the first track

    for (i = 1; i < tracks.length; i++) {
      if (DEBUG) console.log('generating order for track ' + (i + 1));
      modifiedSequence = uninvert(tracks[i].sequence);
      rightIndex = generateNodeOrderLeftEnd(modifiedSequence, nodes); //calculate order values for all nodes until the first anchor
      while (rightIndex < modifiedSequence.length) { //move right until the end of the sequence

        //find next anchor node
        leftIndex = rightIndex;
        rightIndex++;
        while ((rightIndex < modifiedSequence.length) && (! nodes[nodeMap.get(modifiedSequence[rightIndex])].hasOwnProperty('order'))) rightIndex++;

        if (rightIndex < modifiedSequence.length) { //middle segment between two anchors
          currentOrder = nodes[nodeMap.get(modifiedSequence[leftIndex])].order + 1; //start with order value of leftAnchor + 1
          for (j = leftIndex + 1; j < rightIndex; j++) {
            nodes[nodeMap.get(modifiedSequence[j])].order = currentOrder; //assign order values
            currentOrder++;
          }

          if (nodes[nodeMap.get(modifiedSequence[rightIndex])].order > nodes[nodeMap.get(modifiedSequence[leftIndex])].order) { //if order-value of left anchor < order-value of right anchor
            if (nodes[nodeMap.get(modifiedSequence[rightIndex])].order < currentOrder) { //and the right anchor now has a lower order-value than our newly added nodes
              increaseOrderForSuccessors(nodes, nodes[nodeMap.get(modifiedSequence[rightIndex])], modifiedSequence[rightIndex - 1], currentOrder);
            }
          } else { //potential node reversal: check for ordering conflict, if no conflict found move node at rightIndex further to the right in order to not create a track reversal
            if (! isSuccessor(nodes[nodeMap.get(modifiedSequence[rightIndex])], nodes[nodeMap.get(modifiedSequence[leftIndex])], nodes)) { //no real reversal
              increaseOrderForSuccessors(nodes, nodes[nodeMap.get(modifiedSequence[rightIndex])],  modifiedSequence[rightIndex - 1], currentOrder);
            } else { //real reversal
              if ((tracks[i].sequence[leftIndex].charAt(0) === '-') || ((nodes[nodeMap.get(modifiedSequence[leftIndex + 1])].degree < 2) && (nodes[nodeMap.get(modifiedSequence[rightIndex])].order < nodes[nodeMap.get(modifiedSequence[leftIndex])].order))) {
                currentOrder = nodes[nodeMap.get(modifiedSequence[leftIndex])].order - 1; //start with order value of leftAnchor + 1
                for (j = leftIndex + 1; j < rightIndex; j++) {
                  nodes[nodeMap.get(modifiedSequence[j])].order = currentOrder; //assign order values
                  currentOrder--;
                }
              }
            }
          }
        } else { //right segment to the right of last anchor
          currentOrder = nodes[nodeMap.get(modifiedSequence[leftIndex])].order + 1;
          for (j = leftIndex + 1; j < modifiedSequence.length; j++) {
            currentNode = nodes[nodeMap.get(modifiedSequence[j])];
            if (! currentNode.hasOwnProperty('order')) {
              currentNode.order = currentOrder;
              currentOrder++;
            }
          }
        }
      }
    }
  }

  //checks if second is a successor of first
  function isSuccessor(first, second, nodes) {
    var visitedNodes = [];

    return isSuccessorRecursive(first, second, visitedNodes, nodes);
  }

  function isSuccessorRecursive(first, second, visitedNodes, nodes) {
    var i;

    if (first.name === second.name) return true;

    for (i = 0; i < first.successors.length; i++) {
      if (visitedNodes.indexOf(first.successors[i]) === -1) {
        visitedNodes.push(first.successors[i]);
        if (isSuccessorRecursive(nodes[nodeMap.get(first.successors[i])], second, visitedNodes, nodes)) {
          return true;
        }
      }
    }

    return false;
  }

  //get order number of the rightmost node
  function getMaxOrder(nodes) {
    var max = -1;

    nodes.forEach(function(node) {
      if ((node.hasOwnProperty('order')) && (node.order > max)) max = node.order;
    });

    return max;
  }

  //generates sequence keeping the order but removing all '-'s from nodes
  function uninvert(sequence) {
    var result = [];
    var i;

    for (i = 0; i < sequence.length; i++) {
      if (sequence[i].charAt(0) !== '-') {
        result.push(sequence[i]);
      } else {
        result.push(sequence[i].substr(1));
      }
    }
    return result;
  }

  //increases the order-value of all nodes by amount
  function increaseOrderForAllNodes(nodes, amount) {
    nodes.forEach(function(node) {
      if (node.hasOwnProperty('order')) node.order += amount;
    });
  }

  //increases the order-value for currentNode and (if necessary) successor nodes recursively
  function increaseOrderForSuccessors(nodes, startingNode, tabuNode, order) {
    var increasedOrders = {};
    var queue = [];
    queue.push([startingNode, order]);

    while (queue.length > 0) {
      var current = queue.shift();
      var currentNode = current[0];
      order = current[1];

      if ((currentNode.hasOwnProperty('order')) && (currentNode.order < order)) {
        if ((! increasedOrders.hasOwnProperty(currentNode.name)) || (increasedOrders[currentNode.name] < order)) {
          increasedOrders[currentNode.name] = order;
          currentNode.successors.forEach(function(successor) {
            if ((nodes[nodeMap.get(successor)].order > currentNode.order) && (successor !== tabuNode)) { //only increase order of successors if they lie to the right of the currentNode (not for repeats/translocations)
              queue.push([nodes[nodeMap.get(successor)], order + 1]);
            }
          });
          if (currentNode !== startingNode) {
            currentNode.predecessors.forEach(function(predecessor) {
              if ((nodes[nodeMap.get(predecessor)].order > currentNode.order) && (predecessor !== tabuNode)) { //only increase order of predecessors if they lie to the right of the currentNode (not for repeats/translocations)
                queue.push([nodes[nodeMap.get(predecessor)], order + 1]);
              }
            });
          }
        }
      }
    }

    for (var nodeName in increasedOrders) {
      if (increasedOrders.hasOwnProperty(nodeName)) {
        nodes[nodeMap.get(nodeName)].order = increasedOrders[nodeName];
      }
    }
  }

  //calculates the node degree: the number of tracks passing through the node / the node height
  function generateNodeDegree(nodes, tracks) {
    nodes.forEach(function(node) { node.tracks = []; });

    tracks.forEach(function(track) {
      track.sequence.forEach(function(nodeName) {
      var noMinusName = nodeName;
      if (noMinusName.charAt(0) === '-') noMinusName = noMinusName.substr(1);
      nodes[nodeMap.get(noMinusName)].tracks.push(track.id);
      });
    });

    nodes.forEach(function(node) {
      if (node.hasOwnProperty('tracks')) node.degree = node.tracks.length;
    });
  }

  //if more tracks pass through a specific node in reverse direction than in
  //regular direction, switch its orientation
  //(does not apply to the first track's nodes, these are always oriented as
  //dictated by the first track)
  function switchNodeOrientation(nodes, tracks) {
    var toSwitch = {};
    var i, j;
    var nodeName, prevNode, nextNode, currentNode;

    for (i = 1; i < tracks.length; i++) {
      for (j = 0; j < tracks[i].sequence.length; j++) {
        nodeName = tracks[i].sequence[j];
        if (nodeName.charAt(0) === '-') nodeName = nodeName.substr(1);
        currentNode = nodes[nodeMap.get(nodeName)];
        if (tracks[0].sequence.indexOf(nodeName) === -1) { //do not change orientation for nodes which are part of the pivot track

          if (j > 0) {
            if (tracks[i].sequence[j - 1].charAt(0) !== '-') prevNode = nodes[nodeMap.get(tracks[i].sequence[j - 1])];
            else prevNode = nodes[nodeMap.get(tracks[i].sequence[j - 1].substr(1))];
          }

          if (j < tracks[i].sequence.length - 1) {
            if (tracks[i].sequence[j + 1].charAt(0) !== '-') nextNode = nodes[nodeMap.get(tracks[i].sequence[j + 1])];
            else nextNode = nodes[nodeMap.get(tracks[i].sequence[j + 1].substr(1))];
          }

          if (((j === 0) || (prevNode.order < currentNode.order)) && ((j === tracks[i].sequence.length - 1) || (currentNode.order < nextNode.order))) {
            if (! toSwitch.hasOwnProperty(nodeName)) toSwitch[nodeName] = 0;
            if (tracks[i].sequence[j].charAt(0) === '-') toSwitch[nodeName] += 1;
            else toSwitch[nodeName] -= 1;
          }

          if (((j === 0) || (prevNode.order > currentNode.order)) && ((j === tracks[i].sequence.length - 1) || (currentNode.order > nextNode.order))) {
            if (! toSwitch.hasOwnProperty(nodeName)) toSwitch[nodeName] = 0;
            if (tracks[i].sequence[j].charAt(0) === '-') toSwitch[nodeName] -= 1;
            else toSwitch[nodeName] += 1;
          }
        }
      }
    }

    tracks.forEach(function(track, trackIndex) {
      track.sequence.forEach(function(node, nodeIndex) {
        nodeName = node;
        if (nodeName.charAt(0) === '-') nodeName = nodeName.substr(1);
        if ((toSwitch.hasOwnProperty(nodeName)) && (toSwitch[nodeName] > 0)) {
          if (node.charAt(0) === '-') tracks[trackIndex].sequence[nodeIndex] = node.substr(1);
          else tracks[trackIndex].sequence[nodeIndex] = '-' + node;
        }
      });
    });
  }

  //calculates the concrete values for the nodes' x-coordinates
  function generateNodeXCoords(nodes, tracks) {
    var currentX = 0;
    var nextX = 20;
    var currentOrder = -1;
    var extra;

    nodes.sort(compareNodesByOrder);
    nodeMap = generateNodeMap(nodes);
    extra = calculateExtraSpace(nodes, tracks);

    nodes.forEach(function(node, index) {
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

  //calculates additional horizontal space needed between two nodes
  //two neighboring nodes have to be moved further apart if there is a lot going on in between them
  //-> edges turning to vertical orientation should not overlap
  function calculateExtraSpace(nodes, tracks) {
    var i;
    var leftSideEdges = [];
    var rightSideEdges = [];
    var extra = [];

    for (i = 0; i <= maxOrder; i++) {
      leftSideEdges.push(0);
      rightSideEdges.push(0);
    }

    tracks.forEach(function(track, trackID) {
      for (i = 1; i < track.path.length; i++) {
        if (track.path[i].order === track.path[i - 1].order) { //repeat or translocation
          if (track.path[i].isForward === true) leftSideEdges[track.path[i].order]++;
          else rightSideEdges[track.path[i].order]++;
        }
      }
    });

    extra.push(Math.max(0, leftSideEdges[0] - 1));
    for (i = 1; i <= maxOrder; i++) {
      extra.push(Math.max(0, leftSideEdges[i] - 1) + Math.max(0, rightSideEdges[i - 1] - 1));
    }

    return extra;
  }

  //create and fill assignment-variable, which contains info about tracks and lanes for each order-value
  function generateLaneAssignment(nodes, tracks) {
    var i;
    var j;
    var segmentNumber;
    var currentNodeId;
    var currentNodeIsForward;
    var currentNode;
    var previousNode;
    var previousNodeIsForward;
    var prevSegmentPerOrderPerTrack = [];

    for (i = 0; i <= maxOrder; i++) {
      assignment[i] = [];
      prevSegmentPerOrderPerTrack[i] = [];
      for (j = 0; j < numberOfTracks; j++) {
        prevSegmentPerOrderPerTrack[i][j] = null;
      }
    }

    tracks.forEach(function(track, trackNo) {
      //add info for start of track
      currentNodeId = track.sequence[0];
      if (currentNodeId.charAt(0) != '-') {
        currentNodeIsForward = true;
      } else {
        currentNodeId = currentNodeId.substr(1);
        currentNodeIsForward = false;
      }
      currentNode = nodes[nodeMap.get(currentNodeId)];

      track.path = [];
      track.path.push({order: currentNode.order, lane: null, isForward: currentNodeIsForward, node: currentNodeId});
      addToAssignment(currentNode.order, currentNodeId, trackNo, 0, prevSegmentPerOrderPerTrack);

      segmentNumber = 1;
      for (i = 1; i < track.sequence.length; i++) {
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
          if (! previousNodeIsForward) {
            track.path.push({order: previousNode.order, lane: null, isForward: true, node: null});
            addToAssignment(previousNode.order, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
          }
          for (j = previousNode.order + 1; j < currentNode.order; j++) {
            track.path.push({order: j, lane: null, isForward: true, node: null});
            addToAssignment(j, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
          }
          if (! currentNodeIsForward) {
            track.path.push({order: currentNode.order, lane: null, isForward: true, node: null});
            addToAssignment(currentNode.order, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
            track.path.push({order: currentNode.order, lane: null, isForward: false, node: currentNodeId});
            addToAssignment(currentNode.order, currentNodeId, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
          } else {
            track.path.push({order: currentNode.order, lane: null, isForward: true, node: currentNodeId});
            addToAssignment(currentNode.order, currentNodeId, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
          }
        } else if (currentNode.order < previousNode.order) {
          if (previousNodeIsForward) {
            track.path.push({order: previousNode.order, lane: null, isForward: false, node: null});
            addToAssignment(previousNode.order, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
          }
          for (j = previousNode.order - 1; j > currentNode.order; j--) {
            track.path.push({order: j, lane: null, isForward: false, node: null});
            addToAssignment(j, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
          }
          if (currentNodeIsForward) {
            track.path.push({order: currentNode.order, lane: null, isForward: false, node: null});
            addToAssignment(currentNode.order, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
            track.path.push({order: currentNode.order, lane: null, isForward: true, node: currentNodeId});
            addToAssignment(currentNode.order, currentNodeId, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
          } else {
            track.path.push({order: currentNode.order, lane: null, isForward: false, node: currentNodeId});
            addToAssignment(currentNode.order, currentNodeId, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
          }
        } else { //currentNode.order === previousNode.order
          if (currentNodeIsForward !== previousNodeIsForward) {
            track.path.push({order: currentNode.order, lane: null, isForward: currentNodeIsForward, node: currentNodeId});
            addToAssignment(currentNode.order, currentNodeId, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
          } else {
            track.path.push({order: currentNode.order, lane: null, isForward: !currentNodeIsForward, node: null});
            addToAssignment(currentNode.order, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
            track.path.push({order: currentNode.order, lane: null, isForward: currentNodeIsForward, node: currentNodeId});
            addToAssignment(currentNode.order, currentNodeId, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
          }
        }
      }
    });

    for (i = 0; i <= maxOrder; i++) {
      generateSingleLaneAssignment(assignment[i], i, nodes, tracks); //this is where the lanes get assigned
    }
  }

  function addToAssignment(order, nodeID, trackNo, segmentID, prevSegmentPerOrderPerTrack) {
    var compareToFromSame;
    var i;

    compareToFromSame = null;
    if (prevSegmentPerOrderPerTrack[order][trackNo] !== null) {
      compareToFromSame = prevSegmentPerOrderPerTrack[order][trackNo];
    }

    if (nodeID === null) {
      assignment[order].push({type: 'single', name: null, tracks: [{trackID: trackNo, segmentID: segmentID, compareToFromSame: compareToFromSame}]});
      prevSegmentPerOrderPerTrack[order][trackNo] = assignment[order][assignment[order].length - 1].tracks[0];
    } else {
      for (i = 0; i < assignment[order].length; i++) {
        if (assignment[order][i].name === nodeID) { //add to existing node in assignment
          assignment[order][i].type = 'multiple';
          assignment[order][i].tracks.push({trackID: trackNo, segmentID: segmentID, compareToFromSame: compareToFromSame});
          prevSegmentPerOrderPerTrack[order][trackNo] = assignment[order][i].tracks[assignment[order][i].tracks.length - 1];
          return;
        }
      }
      //create new node in assignment
      assignment[order].push({type: 'single', name: nodeID, tracks: [{trackID: trackNo, segmentID: segmentID, compareToFromSame: compareToFromSame}]});
      prevSegmentPerOrderPerTrack[order][trackNo] = assignment[order][assignment[order].length - 1].tracks[0];
    }
  }

  //looks at assignment and sets idealY and idealLane by looking at where the tracks come from
  function getIdealLanesAndCoords(assignment, order, tracks) {
    var index;

    assignment.forEach(function(node) {
      node.idealLane = 0;
      node.tracks.forEach(function(track) {
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
            while ((index >=0 ) && (tracks[track.trackID].path[index].order !== order - 1)) index--;
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

  //assigns the optimal lanes for a single horizontal position (=order)
  //first an ideal lane is calculated for each track (which is ~ the lane of its predecessor)
  //then the nodes are sorted by their average ideal lane
  //and the whole construct is then moved up or down if necessary
  function generateSingleLaneAssignment(assignment, order, nodes, tracks) {
    var i, j;
    var currentLane = 0;
    var sumOfLaneChanges = 0;
    var potentialAdjustmentValues = new Set();
    var totalLanes = 0;
    var currentY = offsetY + 20;
    var prevNameIsNull = false;
    var prevTrack = -1;

    getIdealLanesAndCoords(assignment, order, tracks);
    assignment.sort(compareByIdealLane);

    assignment.forEach(function(node) {
      if (node.name !== null) {
        nodes[nodeMap.get(node.name)].topLane = currentLane;
        if (prevNameIsNull) currentY -= 10;
        nodes[nodeMap.get(node.name)].y = currentY;
        nodes[nodeMap.get(node.name)].contentHeight = 0;

        prevNameIsNull = false;
      } else {
        if (prevNameIsNull) currentY -= 25;
        else if (currentY > offsetY + 20) currentY -= 10;
        prevNameIsNull = true;
      }

      node.tracks.sort(compareByIdealLane);
      node.tracks.forEach(function(track) {
        track.lane = currentLane;
        if ((track.trackID == prevTrack) && (node.name === null) && (prevNameIsNull)) currentY += 10;
        tracks[track.trackID].path[track.segmentID].lane = currentLane;
        tracks[track.trackID].path[track.segmentID].y = currentY;
        sumOfLaneChanges += currentLane - track.idealLane;
        if (track.idealY !== null) potentialAdjustmentValues.add(track.idealY - currentY);
        totalLanes++;
        currentLane++;
        currentY += tracks[track.trackID].width;
        if (node.name !== null) {
          nodes[nodeMap.get(node.name)].contentHeight += tracks[track.trackID].width;
        }
        prevTrack = track.trackID;
      });
      currentY += 25;
    });

    adjustVertically(assignment, potentialAdjustmentValues, tracks, nodes);
  }

  //moves all tracks at a single horizontal location (=order) up/down to minimize lane changes
  function adjustVertically(assignment, potentialAdjustmentValues, tracks, nodes) {
    var verticalAdjustment = 0;
    var minAdjustmentCost = Number.MAX_SAFE_INTEGER;

    potentialAdjustmentValues.forEach(function(moveBy) {
      if (getVerticalAdjustmentCost(tracks, assignment, moveBy) < minAdjustmentCost) {
        minAdjustmentCost = getVerticalAdjustmentCost(tracks, assignment, moveBy);
        verticalAdjustment = moveBy;
      }
    });

    assignment.forEach(function(node) {
      if (node.name !== null) {
        nodes[nodeMap.get(node.name)].y += verticalAdjustment;
      }
      node.tracks.forEach(function(track) {
        tracks[track.trackID].path[track.segmentID].y += verticalAdjustment;
      });
    });
  }

  //calculates cost of vertical adjustment as vertical distance * width of track
  function getVerticalAdjustmentCost(tracks, assignment, moveBy) {
    var result = 0;
    assignment.forEach(function(node) {
      node.tracks.forEach(function(track) {
        if (track.idealY !== null) {
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
        else return 0;
      } else return -1;
    } else {
      if (b.hasOwnProperty('idealLane')) return 1;
      else return 0;
    }
  }

  function compareNodesByOrder(a, b) {
    if (a.hasOwnProperty('order')) {
      if (b.hasOwnProperty('order')) {
        if (a.order < b.order) return -1;
        else if (a.order > b.order) return 1;
        else return 0;
      } else return -1;
    } else {
      if (b.hasOwnProperty('order')) return 1;
      else return 0;
    }
  }

  function calculateTrackWidth(tracks) {
    tracks.forEach(function(track) {
      if (track.hasOwnProperty('freq')) { //custom track width
        //track.width = track.freq;
        track.width = Math.round((Math.log(track.freq) + 1) * 4);
        //track.width = Math.round((Math.log(track.freq) + 1));

      } else { //default track width
        track.width = 7;
      }
    });
  }

  //transforms the info in the tracks' path attribute into actual coordinates
  //and saves them in trackRectangles and trackCurves
  function generateSVGShapesFromPath(nodes, tracks) {
    var i;
    var xStart;
    var xEnd;
    var yStart;
    var yEnd;

    for (i = 0; i <= maxOrder; i++) {
      extraLeft.push(0);
      extraRight.push(0);
    }

    //generate x coords where each order starts and ends
    var orderStartX = [];
    var orderEndX = [];
    nodes.forEach(function(node) {
      if (node.hasOwnProperty('order')) {
        orderStartX[node.order] = node.x;
        if (orderEndX[node.order] === undefined) orderEndX[node.order] = node.x + node.pixelWidth;
        else orderEndX[node.order] = Math.max(orderEndX[node.order], node.x + node.pixelWidth);
      }
    });

    tracks.forEach(function(track, trackID) {
      var trackColor = track.id % numberOfColors;

      //start of path
      yStart = track.path[0].y;
      if (track.sequence[0].charAt(0) === '-') { //The track starts with an inversed node
        xStart = orderEndX[track.path[0].order] + 20;
      } else { //The track starts with a forward node
        xStart = orderStartX[track.path[0].order] - 20;
      }

      //middle of path
      for (i = 1; i < track.path.length; i++) {

        if  (track.path[i].y === track.path[i - 1].y) continue;
        if (track.path[i - 1].isForward) {
          xEnd = orderEndX[track.path[i - 1].order];
        } else {
          xEnd = orderStartX[track.path[i - 1].order];
        }
        if (xEnd !== xStart) {
          trackRectangles.push([Math.min(xStart, xEnd), yStart, Math.max(xStart, xEnd), yStart + track.width - 1, trackColor, track.id]);
        }

        if (track.path[i].order - 1 === track.path[i - 1].order) { //regular forward connection
          xStart = xEnd;
          xEnd = orderStartX[track.path[i].order];
          yEnd = track.path[i].y;
          trackCurves.push([xStart, yStart, xEnd + 1, yEnd, track.width, trackColor, Math.abs(track.path[i].lane - track.path[i - 1].lane), track.id]);
          xStart = xEnd;
          yStart = yEnd;
        } else if (track.path[i].order + 1 === track.path[i - 1].order) { //regular backward connection
          xStart = xEnd;
          xEnd = orderEndX[track.path[i].order];
          yEnd = track.path[i].y;
          trackCurves.push([xStart + 1, yStart, xEnd, yEnd, track.width, trackColor, Math.abs(track.path[i].lane - track.path[i - 1].lane), track.id]);
          xStart = xEnd;
          yStart = yEnd;
        } else { //change of direction
          if (track.path[i - 1].isForward) {
            yEnd = track.path[i].y;
            generateForwardToReverse(xEnd, yStart, yEnd, track.width, trackColor, track.id, track.path[i].order);
            xStart = orderEndX[track.path[i].order];
            yStart = track.path[i].y;
          } else {
            yEnd = track.path[i].y;
            generateReverseToForward(xEnd, yStart, yEnd, track.width, trackColor, track.id, track.path[i].order);
            xStart = orderStartX[track.path[i].order];
            yStart = track.path[i].y;
          }
        }
        maxYCoordinate = Math.max(maxYCoordinate, yStart + track.width);
        minYCoordinate = Math.min(minYCoordinate, yStart);
      }
      maxYCoordinate = Math.max(maxYCoordinate, yStart + track.width);
      minYCoordinate = Math.min(minYCoordinate, yStart);

      //ending edges
      if (!track.path[track.path.length - 1].isForward) { //The track ends with an inversed node
        xEnd = orderStartX[track.path[track.path.length - 1].order] - 20;
      } else { //The track ends with a forward node
        xEnd = orderEndX[track.path[track.path.length - 1].order] + 20;
      }
      trackRectangles.push([xStart, yStart, xEnd, yStart + track.width - 1, trackColor, track.id]);
    });
  }

  function addSVGLine(svgPath, x, y) {
    svgPath.d += ' L ' + x + ' ' + y;
  }

  function addSVGCurve(svgPath, xStart, yStart, xEnd, yEnd) {
    var xMiddle = (xStart + xEnd) / 2;
    svgPath.d += ' C ' + xMiddle + ' ' + yStart + ' ' + xMiddle + ' ' + yEnd + ' ' + xEnd + ' ' + yEnd;
  }

  function generateForwardToReverse(x, yStart, yEnd, trackWidth, trackColor, trackID, order) {
    x += 10 * extraRight[order];
    var yTop = Math.min(yStart, yEnd) ;
    var yBottom = Math.max(yStart, yEnd);
    var radius = 7;

    trackVerticalRectangles.push([x - 10 * extraRight[order], yStart, x + 5, yStart + trackWidth - 1, trackColor, trackID]); //elongate incoming rectangle a bit to the right
    trackVerticalRectangles.push([x + 5 + radius, yTop + trackWidth + radius - 1, x + 5 + radius + Math.min(7, trackWidth) - 1, yBottom - radius + 1, trackColor, trackID]); //vertical rectangle
    trackVerticalRectangles.push([x - 10 * extraRight[order], yEnd, x + 5, yEnd + trackWidth - 1, trackColor, trackID]); //elongate outgoing rectangle a bit to the right

    var d = 'M ' + (x + 5) + ' ' + yBottom;
    d += ' Q ' + (x + 5 + radius) + ' ' + yBottom + ' ' + (x + 5 + radius) + ' ' + (yBottom - radius);
    d += ' H ' + (x + 5 + radius + Math.min(7, trackWidth));
    d += ' Q ' + (x + 5 + radius + Math.min(7, trackWidth)) + ' ' + (yBottom + trackWidth) + ' ' + (x + 5) + ' ' + (yBottom + trackWidth);
    d += ' Z ';
    trackCorners.push([d, trackColor, trackID]);

    d = 'M ' + (x + 5) + ' ' + yTop;
    d += ' Q ' + (x + 5 + radius + Math.min(7, trackWidth)) + ' ' + yTop + ' ' + (x + 5 + radius + Math.min(7, trackWidth)) + ' ' + (yTop + trackWidth + radius);
    d += ' H ' + (x + 5 + radius);
    d += ' Q ' + (x + 5 + radius) + ' ' + (yTop + trackWidth) + ' ' + (x + 5) + ' ' + (yTop + trackWidth);
    d += ' Z ';
    trackCorners.push([d, trackColor, trackID]);
    extraRight[order]++;
  }

  function generateReverseToForward(x, yStart, yEnd, trackWidth, trackColor, trackID, order) {
    var yTop = Math.min(yStart, yEnd) ;
    var yBottom = Math.max(yStart, yEnd);
    var radius = 7;
    x -= 10 * extraLeft[order];

    trackVerticalRectangles.push([x - 6, yStart, x + 10 * extraLeft[order], yStart + trackWidth - 1, trackColor, trackID]); //elongate incoming rectangle a bit to the left
    trackVerticalRectangles.push([x - 5 - radius - Math.min(7, trackWidth), yTop + trackWidth + radius - 1, x - 5 - radius - 1, yBottom - radius + 1, trackColor, trackID]); //vertical rectangle
    trackVerticalRectangles.push([x - 6, yEnd, x + 10 * extraLeft[order], yEnd + trackWidth - 1, trackColor, trackID]); //elongate outgoing rectangle a bit to the left

    //Path for bottom 90 degree bend
    var d = 'M ' + (x - 5) + ' ' + yBottom;
    d += ' Q ' + (x - 5 - radius) + ' ' + yBottom + ' ' + (x - 5 - radius) + ' ' + (yBottom - radius);
    d += ' H ' + (x - 5 - radius -  Math.min(7, trackWidth));
    d += ' Q ' + (x - 5 - radius - Math.min(7, trackWidth)) + ' ' + (yBottom + trackWidth) + ' ' + (x - 5) + ' ' + (yBottom + trackWidth);
    d += ' Z ';
    trackCorners.push([d, trackColor, trackID]);

    //Path for top 90 degree bend
    d = 'M ' + (x - 5) + ' ' + yTop;
    d += ' Q ' + (x - 5 - radius - Math.min(7, trackWidth)) + ' ' + yTop + ' ' + (x - 5 - radius - Math.min(7, trackWidth)) + ' ' + (yTop + trackWidth + radius);
    d += ' H ' + (x - 5 - radius);
    d += ' Q ' + (x - 5 - radius) + ' ' + (yTop + trackWidth) + ' ' + (x - 5) + ' ' + (yTop + trackWidth);
    d += ' Z ';
    trackCorners.push([d, trackColor, trackID]);
    extraLeft[order]++;
  }

  //to avoid problems with wrong overlapping of tracks, draw them in order of their color
  function drawReversalsByColor(corners, rectangles) {
    var color;

    for (color = 0; color < numberOfColors; color++) {
      drawTrackRectangles(rectangles.filter(filterRectByColor(color)));
      drawTrackCorners(corners.filter(filterCornerByColor(color)));
    }
  }

  function filterRectByColor(color) {
    //console.log('c ' + color);
    return function(item) {
      return item[4] === color;
    };
  }

  function filterCornerByColor(color) {
    //console.log('c ' + color);
    return function(item) {
      return item[1] === color;
    };
  }

  //draws nodes by building svg-path for border and filling it with transparent white
  function drawNodes(nodes) {
    var x;
    var y;

    nodes.forEach(function(node, index) {
      //top left arc
      node.d = 'M ' + (node.x - 9) + ' ' + node.y + ' Q ' + (node.x - 9) + ' ' + (node.y - 9) + ' ' + node.x + ' ' + (node.y - 9);
      x = node.x;
      y = node.y - 9;

      //top straight
      if (node.width > 1) {
        x += node.pixelWidth;
        node.d += ' L ' + x + ' ' + y;
      }

      //top right arc
      node.d += ' Q ' + (x + 9) + ' ' + y + ' ' + (x + 9) + ' ' + (y + 9);
      x += 9;
      y += 9;

      //right straight
      if (node.contentHeight > 0) {
        //y += (node.degree - 1) * 22;
        y += node.contentHeight - 0;
        node.d += ' L ' + x + ' ' + y;
      }

      //bottom right arc
      node.d += ' Q ' + x + ' ' + (y + 9) + ' ' + (x - 9) + ' ' + (y + 9);
      x -= 9;
      y += 9;

      //bottom straight
      if (node.width > 1) {
        x -= node.pixelWidth;
        node.d += ' L ' + x + ' ' + y;
      }

      //bottom left arc
      node.d += ' Q ' + (x - 9) + ' ' + y + ' ' + (x - 9) + ' ' + (y - 9);
      x -= 9;
      y -= 9;

      //left straight
      //if (node.degree > 1) {
      if (node.contentHeight > 0) {
        //y -= (node.degree - 1) * 22;
        y -= node.contentHeight - 0;
        node.d += ' L ' + x + ' ' + y;
      }

    });

    svg.selectAll('.node')
      .data(nodes)
      .enter()
      .append('path')
      .attr('id', function(d) {return d.name; })
      .attr('d', function(d) { return d.d; })
      //.attr('title', function(d) { return d.name; })
      .on('mouseover', nodeMouseOver)
      .on('mouseout', nodeMouseOut)
      .on('dblclick', nodeDoubleClick)
      .style('fill', '#fff')
      .style('fill-opacity', '0.8')
      .style('stroke', 'black')
      .style('stroke-width', '2px')
      .append("svg:title")
          .text(function(d) { return d.name; });
  }

  //draw seqence labels for nodes
  function drawLabels(nodes) {
    if (nodeWidthOption === 0) {
      svg.selectAll('text')
        .data(nodes)
        .enter()
        .append('text')
        .attr('x', function(d) { return d.x - 4; })
        .attr('y', function(d) { return d.y + 4; })
        .text(function(d) { return d.seq; })
        .attr('font-family', 'Courier, "Lucida Console", monospace')
        .attr('font-size', '14px')
        .attr('fill', 'black')
        .style('pointer-events', 'none');
    }
  }

  function drawTrackRectangles(trackRectangles) {
    svg.selectAll('trackRectangles')
      .data(trackRectangles)
      .enter().append('rect')
      .attr("x", function(d) { return d[0]; })
      .attr("y", function(d) { return d[1]; })
      .attr("width", function(d) { return d[2] - d[0] + 1; })
      .attr("height", function(d) { return d[3] - d[1] + 1; })
      .style('fill', function(d) { return color(d[4]); })
      .attr('trackID', function(d) {return d[5]; })
      .attr('class', function(d) {return 'track' + d[5]; })
      .attr('color', function(d) { return d[4]; })
      .on('mouseover', trackMouseOver)
      .on('mouseout', trackMouseOut)
      .on('dblclick', trackDoubleClick);
  }

  function compareCurvesByLineChanges(a, b) {
    if (a[6] < b[6]) return -1;
    else if (a[6] > b[6]) return 1;
    else return 0;
  }

  function defineSVGPatterns() {
    var pattern = svg.append("defs")
	    .append("pattern")
		  .attr({ id:"pattern1", width:"7", height:"7", patternUnits:"userSpaceOnUse", patternTransform:"rotate(45)"});
    pattern.append("rect")
  	  .attr({ x:'0', y:'0', width:"7", height:"7", fill:"#FFFFFF" });
    pattern.append("rect")
	    .attr({ x:'0', y:'0', width:"3", height:"3", fill:"#505050" });
    pattern.append("rect")
	    .attr({ x:'0', y:'4', width:"3", height:"3", fill:"#505050" });
    pattern.append("rect")
		  .attr({ x:'4', y:'0', width:"3", height:"3", fill:"#505050" });
    pattern.append("rect")
  		.attr({ x:'4', y:'4', width:"3", height:"3", fill:"#505050" });
  }

  function drawTrackCurves(trackCurves) {
    trackCurves.sort(compareCurvesByLineChanges);

    trackCurves.forEach(function(curve) {
      var xMiddle = (curve[0] + curve[2]) / 2;
      var d = 'M ' + curve[0] + ' ' + curve[1];
      d += ' C ' + xMiddle + ' ' + curve[1] + ' ' + xMiddle + ' ' + curve[3] + ' ' + curve[2] + ' ' + curve[3];
      d += ' V ' + (curve[3] + curve[4]);
      d += ' C ' + xMiddle + ' ' + (curve[3] + curve[4]) + ' ' + xMiddle + ' ' + (curve[1] + curve[4]) + ' ' + curve[0] + ' ' + (curve[1] + curve[4]);
      d += ' Z';
      curve.push(d);
    });

    svg.selectAll('trackCurves')
      .data(trackCurves)
      .enter().append('path')
      .attr("d", function(d) { return d[8]; })
      .style('fill', function(d) { return color(d[5]); })
      .attr('trackID', function(d) {return d[7]; })
      .attr('class', function(d) {return 'track' + d[7]; })
      .attr('color', function(d) { return d[5]; })
      .on('mouseover', trackMouseOver)
      .on('mouseout', trackMouseOut)
      .on('dblclick', trackDoubleClick);
  }

  function drawTrackCorners(trackCorners) {
    svg.selectAll('trackCorners')
      .data(trackCorners)
      .enter().append('path')
      .attr("d", function(d) { return d[0]; })
      .style('fill', function(d) { return color(d[1]); })
      .attr('trackID', function(d) {return d[2]; })
      .attr('class', function(d) {return 'track' + d[2]; })
      .attr('color', function(d) { return d[1]; })
      .on('mouseover', trackMouseOver)
      .on('mouseout', trackMouseOut)
      .on('dblclick', trackDoubleClick);
  }

  function drawLegend(tracks) {
    var content = '<table class="table table-condensed table-nonfluid"><thead><tr><th>Color</th><th>Trackname</th><th>Show Track</th><th>Show Exons</th></tr></thead>';
    for (var i = 0; i < tracks.length; i++) {
      var trackColor = color(tracks[i].id % numberOfColors);
      content += '<tr><td><span style="color: ' + trackColor + '"><i class="fa fa-square" aria-hidden="true"></i></span></td>';
      if (tracks[i].hasOwnProperty('name')) {
        content += '<td>' + tracks[i].name + '</td>';
      } else {
        content += '<td>' + tracks[i].id + '</td>';
      }
      content += '<td><input type="checkbox" checked=true onclick="sequenceTubeMap.changeTrackVisibility(' + i + ');"></td>';
      content += '<td><input type="checkbox"></td></tr>';
    }
    content += '</table';
    $('#legendDiv').html(content);
  }

  // Highlight track on mouseover
  function trackMouseOver() {
    /* jshint validthis: true */
    var trackID = d3.select(this).attr('trackID');
    d3.selectAll('.track' + trackID).style('fill', 'url(#pattern1)');
  }

  // Highlight node on mouseover
  function nodeMouseOver() {
    /* jshint validthis: true */
    d3.select(this).style('stroke-width', '4px');
  }

  // Restore original track appearance on mouseout
  function trackMouseOut() {
    /* jshint validthis: true */
    var trackID = d3.select(this).attr('trackID');
    var col = d3.select(this).attr('color');
    d3.selectAll('.track' + trackID).style('fill', color(col));
  }

  // Restore original node appearance on mouseout
  function nodeMouseOut() {
    /* jshint validthis: true */
    d3.select(this).style('stroke-width', '2px');
  }

  // Move clicked track to first position
  function trackDoubleClick() { // Move clicked track to first position
    /* jshint validthis: true */
    var trackID = d3.select(this).attr('trackID');
    var index = 0;
    while (inputTracks[index].id != trackID) index++;
    console.log('moving index: ' + index);
    moveTrackToFirstPosition(index);
  }

  // Redraw with current node moved to beginning
  function nodeDoubleClick() { // Move clicked track to first position
    /* jshint validthis: true */
    var nodeID = d3.select(this).attr('id');
    if (clickableNodesFlag) {
      document.getElementById("nodeID").value = nodeID;
      document.getElementById("postButton").click();
    }
  }

  //extract info about nodes from vg-json
  function vgExtractNodes(vg) {
    var result = [];
    vg.node.forEach(function (node) {
      result.push({ name: '' + node.id, sequenceLength: node.sequence.length, seq: node.sequence});
    });
    return result;
  }

  //calculated node widths depending on sequence lengths and chosen calculation method
  function generateNodeWidth(nodes) {
    switch (nodeWidthOption) {
      case 1:
        nodes.forEach(function (node) {
          if (node.hasOwnProperty('sequenceLength')) node.width = (1 + Math.log(node.sequenceLength) / Math.log(2));
          node.pixelWidth = Math.round((node.width - 1) * 8.401);
        });
        break;
      case 2:
        nodes.forEach(function (node) {
          if (node.hasOwnProperty('sequenceLength')) node.width = (1 + Math.log(node.sequenceLength) / Math.log(10));
          node.pixelWidth = Math.round((node.width - 1) * 8.401);
        });
        break;
      default:
        nodes.forEach(function (node) {
          if (node.hasOwnProperty('sequenceLength')) node.width = node.sequenceLength;

          //get width of node's text label by writing label, measuring it and removing label
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

  //extract track info from vg-json
  function vgExtractTracks(vg) {
    var result =[];
    vg.path.forEach(function(path, index) {
      var sequence = [];
      var isCompletelyReverse = true;
      path.mapping.forEach(function(pos) {
        if ((pos.position.hasOwnProperty('is_reverse')) && (pos.position.is_reverse === true)) {
          sequence.push('-' + pos.position.node_id);
        } else {
          sequence.push('' + pos.position.node_id);
          isCompletelyReverse = false;
        }
      });
      if (isCompletelyReverse) {
          sequence.reverse();
          sequence.forEach(function(node, index2) {
            sequence[index2] = node.substr(1);
          });
      }
      var track = {};
      track.id = index;
      track.sequence = sequence;
      if (path.hasOwnProperty('freq')) track.freq = path.freq;
      if (path.hasOwnProperty('name')) track.name = path.name;
      result.push(track);
    });
    return result;
  }

  //remove redundant nodes
  //two nodes A and B can be merged if all tracks leaving A go directly into B
  //and all tracks entering B come directly from A
  //(plus no inversions involved)
  function mergeNodes(nodes, tracks) {
    var mergeForward = {};
    var i, index;
    var mergeBackward = {};
    var nodeName;
    var mergedIntoName;
    var mergedIntoNode;
    var nodeToBeMergedAway;

    tracks.forEach(function(track) {
      for (i = 0; i < track.sequence.length; i++) {
        if (track.sequence[i].charAt(0) !== '-') {  //forward Node
          if (!mergeForward.hasOwnProperty(track.sequence[i])) {
            if ((i < track.sequence.length - 1) && (track.sequence[i + 1].charAt(0) !== '-')) {
              mergeForward[track.sequence[i]] = {mergeWith: track.sequence[i + 1], isPossible: true};
            }
          } else {
            if ((i === track.sequence.length - 1) || (mergeForward[track.sequence[i]].mergeWith != track.sequence[i + 1])) {
              mergeForward[track.sequence[i]].isPossible = false;
            }
          }
        } else { //reverse Node
          nodeName = track.sequence[i].substr(1);
          if (!mergeForward.hasOwnProperty(nodeName)) {
            if ((i > 0) && (track.sequence[i - 1].charAt(0) === '-')) {
              mergeForward[nodeName] = {mergeWith: track.sequence[i - 1].substr(1), isPossible: true};
            }
          } else {
            if ((i === 0) || (mergeForward[nodeName].mergeWith != track.sequence[i - 1].substr(1))) {
              mergeForward[nodeName].isPossible = false;
            }
          }
        }
      }
    });

    for (var prop in mergeForward) {
      if (mergeForward.hasOwnProperty(prop)) {
        if (mergeForward[prop].isPossible === true) {
          mergeBackward[mergeForward[prop].mergeWith] = {mergeWith: prop, isPossible: true};
        }
      }
    }

    tracks.forEach(function(track) {
      for (i = 0; i < track.sequence.length; i++) {
        if (track.sequence[i].charAt(0) !== '-') {  //forward Node
          if (mergeBackward.hasOwnProperty(track.sequence[i])) {
            if ((i === 0) || (mergeBackward[track.sequence[i]].mergeWith !== track.sequence[i - 1])) {
              mergeBackward[track.sequence[i]].isPossible = false;
            }
          }
        } else { //reverse Node
          if (mergeBackward.hasOwnProperty(track.sequence[i].substr(1))) {
            if ((i === track.sequence.length - 1) || (mergeBackward[track.sequence[i].substr(1)].mergeWith !== track.sequence[i + 1].substr(1))) {
              mergeBackward[track.sequence[i].substr(1)].isPossible = false;
            }
          }
        }
      }
    });

    //actually merge the nodes by removing the corresponding nodes from track data
    tracks.forEach(function(track) {
      for (i = track.sequence.length - 1; i >= 0; i--) {
        nodeName = track.sequence[i];
        if (nodeName.charAt(0) === '-') nodeName = nodeName.substr(1);
        if ((mergeBackward.hasOwnProperty(nodeName)) && (mergeBackward[nodeName].isPossible === true)) {
          track.sequence.splice(i, 1);
        }
      }
    });

    //update sequenceLength property of the nodes which are increasing in size
    nodeMap = generateNodeMap(nodes);
    for (prop in mergeBackward) {
      if (mergeBackward.hasOwnProperty(prop)) {
        if (mergeBackward[prop].isPossible === true) {
          mergedIntoName = mergeBackward[prop].mergeWith;
          mergedIntoNode = nodes[nodeMap.get(mergedIntoName)];
          nodeToBeMergedAway = nodes[nodeMap.get(prop)];
          if (mergedIntoNode.hasOwnProperty('sequenceLength')) {
            mergedIntoNode.sequenceLength += nodeToBeMergedAway.sequenceLength;
          } else {
            mergedIntoNode.width += nodeToBeMergedAway.width;
          }
          mergedIntoNode.seq = mergedIntoNode.seq + nodeToBeMergedAway.seq;
          while ((mergeBackward.hasOwnProperty(mergedIntoName)) && (mergeBackward[mergedIntoName].isPossible === true)) {
            mergedIntoName = mergeBackward[mergedIntoName].mergeWith;
            mergedIntoNode = nodes[nodeMap.get(mergedIntoName)];
            if (mergedIntoNode.hasOwnProperty('sequenceLength')) {
              mergedIntoNode.sequenceLength += nodeToBeMergedAway.sequenceLength;
            } else {
              mergedIntoNode.width += nodeToBeMergedAway.width;
            }
            mergedIntoNode.seq = mergedIntoNode.seq + nodeToBeMergedAway.seq;
          }
        }
      }
    }

    //remove the nodes from node-array
    for (i = nodes.length - 1; i >= 0; i--) {
      if ((mergeBackward.hasOwnProperty(nodes[i].name)) && (mergeBackward[nodes[i].name].isPossible === true)) {
        nodes.splice(i, 1);
      }
    }

    return {nodes: nodes, tracks: tracks};
  }

  return {
    create: create,
    vgExtractNodes: vgExtractNodes,
    vgExtractTracks: vgExtractTracks,
    setMergeNodesFlag: setMergeNodesFlag,
    setNodeWidthOption: setNodeWidthOption,
    changeTrackVisibility: changeTrackVisibility
  };

})();
