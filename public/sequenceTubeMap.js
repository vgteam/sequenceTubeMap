/*jshint loopfunc:true */

var sequenceTubeMap = (function () {
'use strict';

  var DEBUG = false;
  var offsetY = 0;
  var color = d3.scale.category10().domain([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  var svgID; //the (html-tag) ID of the svg
  var svg; //the svg
  var inputNodes = [];
  var inputTracks = [];
  var numberOfNodes;
  var numberOfTracks;
  var nodeMap; //maps node names to node indices
  var svgPaths = []; //contains coordinates for the paths through the graph
  var assignment = []; //contains info about lane assignments sorted by order
  var extraLeft = []; //info whether nodes have to be moved further apart because of multiple 180° directional changes at the same horizontal order
  var extraRight = []; //info whether nodes have to be moved further apart because of multiple 180° directional changes at the same horizontal order
  var maxOrder; //horizontal order of the rightmost node
  var mergeNodesFlag = true;
  var stepX = 8.401; //node width in pixels increases by this amount per base; actual value chosen empirically to match node label's text width
  var clickableNodesFlag = false;

  // 0...scale node width linear with number of bases within node
  // 1...scale node width with log2 of number of bases within node
  // 2...scale node width with log10 of number of bases within node
  var nodeWidthOption = 0;

  //public function to fill the svg with a visualization of the data in nodes and tracks
  function create(inputSvg, nodes, tracks, clickableNodes) {
    if (typeof(clickableNodes)==='undefined') clickableNodesFlag = false;
    else clickableNodesFlag = clickableNodes;
    svgID = inputSvg;
    svg = d3.select(inputSvg);
    inputNodes = (JSON.parse(JSON.stringify(nodes))); //deep copy
    inputTracks = (JSON.parse(JSON.stringify(tracks)));
    createTubeMap();
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

  //sets the flag for whether redundant nodes should be automatically removed or not
  function setMergeNodesFlag(value) {
    if (mergeNodesFlag !== value) {
      mergeNodesFlag = value;
      createTubeMap();
    }
  }

  //sets which option should be used for calculating the node width from its sequence length
  function setNodeWidthOption(value) {
    if ((value === 0) || (value === 1) || (value ===2)) {
      if (nodeWidthOption !== value) {
        nodeWidthOption = value;
        if (svg !== undefined) createTubeMap();
      }
    }
  }

  //main
  function createTubeMap() {
    var nodes = (JSON.parse(JSON.stringify(inputNodes))); //deep copy (can add stuff to copy and leave original unchanged)
    var tracks = (JSON.parse(JSON.stringify(inputTracks)));

    svgPaths = [];
    assignment = [];
    extraLeft = [];
    extraRight = [];
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
    generateLaneAssignment(nodes, tracks);
    generateNodeXCoords(nodes, tracks);
    //console.log(numberOfNodes);
    //console.log(nodes.length);
    //console.log(nodes[12]);
    //console.log(nodes[13]);
    alignSVG(nodes, tracks);
    calculateTrackWidth(tracks);
    generateEdgesFromPath(nodes, tracks);
    removeUnusedNodes(nodes);
    drawEdges(svgPaths);
    drawNodes(nodes);
    if (nodeWidthOption === 0) drawLabels(nodes);

    if (DEBUG) {
      console.log('number of tracks: ' + numberOfTracks);
      console.log('number of nodes: ' + numberOfNodes);
    }
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
    var minLane = 9007199254740991;
    var maxLane = -9007199254740991;
    var maxX = -9007199254740991;

    tracks.forEach(function (track) {
      track.path.forEach(function (node) {
        if (node.lane < minLane) minLane = node.lane;
        if (node.lane > maxLane) maxLane = node.lane;
      });
    });

    offsetY = 12 - 22 * minLane;
    nodes.forEach(function(node) {
      if (node.hasOwnProperty('topLane')) {
        node.y = offsetY + 22 * node.topLane;
      }
      if (node.hasOwnProperty('x')) {
        maxX = Math.max(maxX, node.x + 20 + Math.round(stepX * (node.width - 1)));
      }
    });

    //enable Pan + Zoom
    /*svg = svg.call(d3.behavior.zoom().scaleExtent([0.1, 5]).on("zoom", function () {
        svg.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
      }))
      .append("g");*/
    svg = svg.call(d3.behavior.zoom().scaleExtent([0.1, 5]).on("zoom", function () {
        svg.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
      })).on('dblclick.zoom', null)
      .append("g");

    //this feels dirty, but changing the attributes of the 'svg'-Variable does not have the desired effect
    var svg2 = d3.select(svgID);
    svg2.attr('height', 24 + 22 * (maxLane - minLane));
    svg2.attr('width', maxX);
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
        nextX = Math.max(nextX, currentX + 40 + Math.round(stepX * (node.width - 1)));
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

  //assigns the optimal lanes for a single horizontal position (=order)
  //first an ideal lane is calculated for each track (which is ~ the lane of its predecessor)
  //then the nodes are sorted by their average ideal lane
  //and the whole construct is then moved up or down if necessary
  function generateSingleLaneAssignment(assignment, order, nodes, tracks) {
    var i, j, index, currentLane;

    assignment.forEach(function(node) {
      node.idealLane = 0;
      node.tracks.forEach(function(track) {
        if (track.segmentID === 0) {
          track.idealLane = track.trackID;
        } else {
          if (tracks[track.trackID].path[track.segmentID - 1].order === order - 1) {
            track.idealLane = tracks[track.trackID].path[track.segmentID - 1].lane;
          } else if ((track.segmentID < tracks[track.trackID].path.length - 1) && (tracks[track.trackID].path[track.segmentID + 1].order === order - 1)) {
            track.idealLane = tracks[track.trackID].path[track.segmentID + 1].lane;
          } else {
            index = track.segmentID - 1;
            while ((index >=0 ) && (tracks[track.trackID].path[index].order !== order - 1)) index--;
            if (index < 0) track.idealLane = track.trackID;
            else track.idealLane = tracks[track.trackID].path[index].lane;
          }
        }
        node.idealLane += track.idealLane;
      });
      node.idealLane /= node.tracks.length;
    });

    currentLane = 0;
    var sumOfLaneChanges = 0;
    var totalLanes = 0;
    assignment.sort(compareByIdealLane);
    assignment.forEach(function(node) {
      if (node.name !== null) {
        nodes[nodeMap.get(node.name)].topLane = currentLane;
        nodes[nodeMap.get(node.name)].y = offsetY + 22 * currentLane;
      }

      node.tracks.sort(compareByIdealLane);
      node.tracks.forEach(function(track) {
        track.lane = currentLane;
        tracks[track.trackID].path[track.segmentID].lane = currentLane;
        sumOfLaneChanges += currentLane - track.idealLane;
        totalLanes++;
        currentLane++;
      });
    });

    var moveBy = Math.round(sumOfLaneChanges / totalLanes - 0.000001);
    if ((moveBy !== 0) && (totalLanes > numberOfTracks)) {
      assignment.forEach(function(node) {
        if (node.name !== null) {
          nodes[nodeMap.get(node.name)].topLane -= moveBy;
          nodes[nodeMap.get(node.name)].y -= 22 * moveBy;
        }
        node.tracks.forEach(function(track) {
          track.lane -= moveBy;
          tracks[track.trackID].path[track.segmentID].lane -= moveBy;
        });
      });
    }
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
        track.width = (Math.log(track.freq) + 1) * 2;
      } else { //default track width
        track.width = 7;
      }
    });
  }

  //transforms the info in the tracks' path attribute into actual coordinates
  //and saves them in 'svgPaths'
  function generateEdgesFromPath(nodes, tracks) {
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
        if (orderEndX[node.order] === undefined) orderEndX[node.order] = node.x + Math.round(stepX * (node.width - 1));
        else orderEndX[node.order] = Math.max(orderEndX[node.order], node.x + Math.round(stepX * (node.width - 1)));
      }
    });

    tracks.forEach(function(track, trackID) {

      //start of path
      yStart = offsetY + 22 * track.path[0].lane;
      if (track.sequence[0].charAt(0) === '-') { //The track starts with an inversed node
        xStart = orderEndX[track.path[0].order] + 20;
      } else { //The track starts with a forward node
        xStart = orderStartX[track.path[0].order] - 20;
      }
      svgPaths.push({d: 'M ' + xStart + ' ' + yStart, color: (track.id % 10), width: track.width, id: track.id});

      //middle of path
      for (i = 1; i < track.path.length; i++) {

        if  (track.path[i].lane === track.path[i - 1].lane) continue;
        if (track.path[i - 1].isForward) {
          xEnd = orderEndX[track.path[i - 1].order];
        } else {
          xEnd = orderStartX[track.path[i - 1].order];
        }
        if (xEnd !== xStart) {
          addSVGLine(svgPaths[trackID], xEnd, yStart);
        }

        if (track.path[i].order - 1 === track.path[i - 1].order) { //regular forward connection
          xStart = xEnd;
          xEnd = orderStartX[track.path[i].order];
          yEnd = offsetY + 22 * track.path[i].lane;
          addSVGCurve(svgPaths[trackID], xStart, yStart, xEnd, yEnd);
          xStart = xEnd;
          yStart = yEnd;
        } else if (track.path[i].order + 1 === track.path[i - 1].order) { //regular backward connection
          xStart = xEnd;
          xEnd = orderEndX[track.path[i].order];
          yEnd = offsetY + 22 * track.path[i].lane;
          addSVGCurve(svgPaths[trackID], xStart, yStart, xEnd, yEnd);
          xStart = xEnd;
          yStart = yEnd;
        } else { //change of direction
          if (track.path[i - 1].isForward) {
            generateForwardToReverse(track.path[i].order, track.path[i - 1].lane, track.path[i].lane, trackID, orderEndX, track.width);
            xStart = orderEndX[track.path[i].order];
            yStart = offsetY + 22 * track.path[i].lane;
          } else {
            generateReverseToForward(track.path[i].order, track.path[i - 1].lane, track.path[i].lane, trackID, orderStartX, track.width);
            xStart = orderStartX[track.path[i].order];
            yStart = offsetY + 22 * track.path[i].lane;
          }
        }
      }

      //ending edges
      if (!track.path[track.path.length - 1].isForward) { //The track ends with an inversed node
        xEnd = orderStartX[track.path[track.path.length - 1].order] - 20;
      } else { //The track ends with a forward node
        xEnd = orderEndX[track.path[track.path.length - 1].order] + 20;
      }
      addSVGLine(svgPaths[trackID], xEnd, yStart);
    });
  }

  function addSVGLine(svgPath, x, y) {
    svgPath.d += ' L ' + x + ' ' + y;
  }

  function addSVGCurve(svgPath, xStart, yStart, xEnd, yEnd) {
    var xMiddle = (xStart + xEnd) / 2;
    svgPath.d += ' C ' + xMiddle + ' ' + yStart + ' ' + xMiddle + ' ' + yEnd + ' ' + xEnd + ' ' + yEnd;
  }

  //calculates coordinates for first type of track reversal
  function generateForwardToReverse(order, lane1, lane2, trackID, orderEndX, width) {
    var x;
    var y;
    var y2;

    x = orderEndX[order] + 5 + 10 * extraRight[order];
    y = offsetY + 22 * lane1 + 10;
    y2 = offsetY + 22 * lane2 + 10;

    addSVGLine(svgPaths[trackID], x, y - 10);

    if (lane2 > lane1) {
      svgPaths[trackID].d = svgPaths[trackID].d + ' Q ' + (x + 10) + ' ' + (y - 10) + ' ' + (x + 10) + ' ' + y;
      addSVGLine(svgPaths[trackID], x + 10, y2 - 20);
      svgPaths[trackID].d = svgPaths[trackID].d + ' Q ' + (x + 10) + ' ' + (y2 - 10) + ' ' + x + ' ' + (y2 - 10);
    } else {
      svgPaths[trackID].d = svgPaths[trackID].d + ' Q ' + (x + 10) + ' ' + (y - 10) + ' ' + (x + 10) + ' ' + (y - 20);
      addSVGLine(svgPaths[trackID], x + 10, y2);
      svgPaths[trackID].d = svgPaths[trackID].d + ' Q ' + (x + 10) + ' ' + (y2 - 10) + ' ' + x + ' ' + (y2 - 10);
    }

    addSVGLine(svgPaths[trackID], x, y2 - 10);
    extraRight[order]++;
  }

  //calculates coordinates for second type of track reversal
  function generateReverseToForward(order, lane1, lane2, trackID, orderStartX, width) {
    var x;
    var y;
    var y2;

    y = offsetY + 22 * lane1 + 10;
    y2 = offsetY + 22 * lane2 + 10;
    x = orderStartX[order] - 35 - 10 * extraLeft[order];

    addSVGLine(svgPaths[trackID], x + 30, y - 10);

    if (lane2 > lane1) {
      svgPaths[trackID].d = svgPaths[trackID].d + ' Q ' + (x + 20) + ' ' + (y - 10) + ' ' + (x + 20) + ' ' + y;
      addSVGLine(svgPaths[trackID], x + 20, y2 - 20);
      svgPaths[trackID].d = svgPaths[trackID].d + ' Q ' + (x + 20) + ' ' + (y2 - 10) + ' ' + (x + 30) + ' ' + (y2 - 10);
    } else {
      svgPaths[trackID].d = svgPaths[trackID].d + ' Q ' + (x + 20) + ' ' + (y - 10) + ' ' + (x + 20) + ' ' + (y - 20);
      addSVGLine(svgPaths[trackID], x + 20, y2);
      svgPaths[trackID].d = svgPaths[trackID].d + ' Q ' + (x + 20) + ' ' + (y2 - 10) + ' ' + (x + 30) + ' ' + (y2 - 10);
    }

    addSVGLine(svgPaths[trackID], x + 35 + 10 * extraLeft[order], y2 - 10);
    extraLeft[order]++;
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
        x += Math.round((node.width - 1) * stepX);
        node.d += ' L ' + x + ' ' + y;
      }

      //top right arc
      node.d += ' Q ' + (x + 9) + ' ' + y + ' ' + (x + 9) + ' ' + (y + 9);
      x += 9;
      y += 9;

      //right straight
      if (node.degree > 1) {
        y += (node.degree - 1) * 22;
        node.d += ' L ' + x + ' ' + y;
      }

      //bottom right arc
      node.d += ' Q ' + x + ' ' + (y + 9) + ' ' + (x - 9) + ' ' + (y + 9);
      x -= 9;
      y += 9;

      //bottom straight
      if (node.width > 1) {
        x -= Math.round((node.width - 1) * stepX);
        node.d += ' L ' + x + ' ' + y;
      }

      //bottom left arc
      node.d += ' Q ' + (x - 9) + ' ' + y + ' ' + (x - 9) + ' ' + (y - 9);
      x -= 9;
      y -= 9;

      //left straight
      if (node.degree > 1) {
        y -= (node.degree - 1) * 22;
        node.d += ' L ' + x + ' ' + y;
      }

    });

    svg.selectAll('.node')
      .data(nodes)
      .enter()
      .append('path')
      .attr('id', function(d) {return d.name; })
      .attr('d', function(d) { return d.d; })
      .on('mouseover', nodeMouseOver)
      .on('mouseout', nodeMouseOut)
      .on('dblclick', nodeDoubleClick)
      .style('fill', '#fff')
      .style('fill-opacity', '0.8')
      .style('stroke', 'black')
      .style('stroke-width', '2px');
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
        .attr('fill', 'black');
    }
  }

  //function drawEdges(edges, co) {
  function drawEdges(svgPaths) {
    svg.selectAll('highlights')
      .data(svgPaths)
  	  .enter().append('path')
      .attr('class', function(d) {return 'track' + d.id + 'Highlight'; })
  	  .attr('d', function(d) { return d.d; })
      .style('fill', 'none')
      .style('stroke', 'black')
      .style('stroke-opacity', '0')
      .style('stroke-width', function(d) { return (d.width + 4) + 'px'; });

    svg.selectAll('tracks')
      .data(svgPaths)
  	  .enter().append('path')
      .attr('class', function(d) {return 'track' + d.id; })
  	  .attr('d', function(d) { return d.d; })
      .attr('trackID', function(d) {return d.id; })
      .on('mouseover', trackMouseOver)
      .on('mouseout', trackMouseOut)
      .on('dblclick', trackDoubleClick)
      .style('fill', 'none')
      .style('stroke', function(d) { return color(d.color); })
      .style('stroke-width', function(d) { return d.width + 'px'; });
  }

  // Highlight track on mouseover
  function trackMouseOver() {
    /* jshint validthis: true */
    var trackID = d3.select(this).attr('trackID');
    d3.select('.track' + trackID + 'Highlight').style('stroke-opacity', '1');
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
    d3.select('.track' + trackID + 'Highlight').style('stroke-opacity', '0');
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
        });
        break;
      case 2:
        nodes.forEach(function (node) {
          if (node.hasOwnProperty('sequenceLength')) node.width = (1 + Math.log(node.sequenceLength) / Math.log(10));
        });
        break;
      default:
        nodes.forEach(function (node) {
          if (node.hasOwnProperty('sequenceLength')) node.width = node.sequenceLength;
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
      result.push({id: index, sequence: sequence, freq: path.freq});
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
    setNodeWidthOption: setNodeWidthOption
  };

})();
