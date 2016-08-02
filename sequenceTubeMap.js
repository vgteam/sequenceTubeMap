/*jshint loopfunc: true */
/*jshint esversion: 6*/

var sequenceTubeMap = (function () {

  const offsetX = 10;
  const offsetY = 40;
  const color = d3.scale.category10().domain([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

  var svg;
  var inputNodes = [];
  var inputTracks = [];
  var numberOfNodes;
  var numberOfTracks;
  var nodeMap; //maps node names to node indices
  var edges = []; //contains concrete coordinate info about the different tracks
  var arcs = [[], [], [], []]; //contains coords if the edges' 90° angles
  var assignment = []; //contains info about lane assignments sorted by order
  var extraLeft = []; //info whether nodes have to be moved further apart because of multiple 180° directional changes at the same horizontal order
  var extraRight = []; //info whether nodes have to be moved further apart because of multiple 180° directional changes at the same horizontal order
  var maxOrder; //horizontal order of the rightmost node

  function create(inputSvg, nodes, tracks) {
    svg = inputSvg;
    //inputNodes = nodes.slice(0); //no deep copy necessary because inner stuff does not change
    //inputTracks = tracks.slice(0);
    inputNodes = (JSON.parse(JSON.stringify(nodes))); //deep copy
    inputTracks = (JSON.parse(JSON.stringify(tracks)));
    createTubeMap();
  }

  function moveTrackToFirstPosition(index) {
    var i, j;
    var nodesToInvert = [];
    var currentSequence;

    inputTracks.unshift(inputTracks[index]); //add element to beginning
    inputTracks.splice(index + 1, 1); //remove 1 element from the middle

    currentSequence = inputTracks[0].sequence;
    for (i = 0; i < currentSequence.length; i++) {
      if (currentSequence[i].charAt(0) === '-') {
        currentSequence[i] = currentSequence[i].substr(1);
        nodesToInvert.push(currentSequence[i]);
      }
    }

    console.log("nodes to invert:");
    console.log(nodesToInvert);

    for (i = 1; i < inputTracks.length; i++) {
      currentSequence = inputTracks[i].sequence;
      for (j = 0; j < currentSequence.length; j++) {
        if (currentSequence[j].charAt(0) !== '-') {
          if (nodesToInvert.indexOf(currentSequence[j]) !== -1) {
            currentSequence[j] = "-" + currentSequence[j];
            console.log("Track " + i + "[" + j + "] CHANGED TO " + currentSequence[j]);
          }
        } else {
          if (nodesToInvert.indexOf(currentSequence[j].substr(1)) !== -1) {
            currentSequence[j] = currentSequence[j].substr(1);
          }
        }
      }
    }
    console.log(inputTracks);
    createTubeMap();
  }

  function createTubeMap() {
    //clear svg for (re-)drawing
    var nodes = (JSON.parse(JSON.stringify(inputNodes))); //deep copy (can add stuff to copy and leave original unchanged)
    var tracks = (JSON.parse(JSON.stringify(inputTracks)));
    svg.selectAll("*").remove();
    edges = [];
    arcs = [[], [], [], []];
    assignment = [];
    extraLeft = [];
    extraRight = [];

    numberOfNodes = nodes.length;
    numberOfTracks = tracks.length;
    //console.log("number of tracks: " + numberOfTracks);
    nodeMap = generateNodeMap(nodes);
    generateNodeSuccessors(nodes, tracks);
    generateNodeOrder(nodes, tracks);
    maxOrder = getMaxOrder(nodes);
    generateNodeDegree(nodes, tracks);
    generateLaneAssignment(nodes, tracks);
    generateNodeXCoords(nodes, tracks);
    generateEdgesFromPath(nodes, tracks, edges);

    console.log("Assignment:");
    console.log(assignment);
    console.log("Tracks:");
    console.log(tracks);
    console.log("Nodes:");
    console.log(nodes);
    console.log("Arcs:");
    console.log(arcs);
    console.log("Edges:");
    console.log(edges);

    drawEdges(edges);
    if (arcs[0].length > 0) drawTopLeftEdgeArcs(arcs[0]);
    if (arcs[1].length > 0) drawTopRightEdgeArcs(arcs[1]);
    if (arcs[2].length > 0) drawBottomRightEdgeArcs(arcs[2]);
    if (arcs[3].length > 0) drawBottomLeftEdgeArcs(arcs[3]);
    drawNodes(nodes);
  }

  function generateNodeMap(nodes) { //map node names to node indices
    var nodeMap = new Map();
    nodes.forEach(function(node, index) {
      nodeMap.set(node.name, index);
    });
    return nodeMap;
  }

  function generateNodeSuccessors(nodes, tracks) { //adds a successor-array to each node containing the names of the nodes coming directly after the current node
    var i;
    var currentNode;
    var followerID;
    var modifiedSequence = [];

    nodes.forEach(function(node) {
      node.successors = [];
    });

    tracks.forEach(function(track) {
      modifiedSequence = uninvert(track.sequence);
      for(i = 0; i < modifiedSequence.length - 1; i++) {
        currentNode = nodes[nodeMap.get(modifiedSequence[i])];
        followerID = modifiedSequence[i + 1];
        if (currentNode.successors.indexOf(followerID) === -1) {
          currentNode.successors.push(followerID);
        }
      }
    });
  }

  function generateNodeOrderOfSingleTrack(sequence, nodes) { //calculates order values for all nodes along a single track
    currentOrder = 0;
    sequence.forEach(function(nodeName) {
      currentNode = nodes[nodeMap.get(nodeName)];
      if (! currentNode.hasOwnProperty("order")) { //default case
        currentNode.order = currentOrder;
        currentOrder++;
      } else { //track has a repeat revisiting a node
        //currentOrder = currentNode.order + 1;
      }
    });
  }

  function generateNodeOrderLeftEnd(sequence, nodes) { //calculate the order-value of nodes contained in sequence which are to the left of the first node which already has an order-value
    var anchorIndex = 0;
    var nodeNames = new Map();
    var currentOrder;
    var currentNode;

    while (! nodes[nodeMap.get(sequence[anchorIndex])].hasOwnProperty("order")) anchorIndex++; //anchor = first node in common with existing graph
    for (j = anchorIndex - 1; j >= 0; j--) { //count number of nodes to the left of anchorIndex counting repeated nodes only once
      nodeNames.set(sequence[j], true);
    }
    currentOrder = nodes[nodeMap.get(sequence[anchorIndex])].order - nodeNames.size; //order of first node
    for (j = 0; j < anchorIndex; j++) { //assign order to nodes
      currentNode = nodes[nodeMap.get(sequence[j])];
      if (! currentNode.hasOwnProperty("order")) {
        currentNode.order = currentOrder;
        currentOrder++;
      }
    }
    if (nodes[nodeMap.get(sequence[0])].order < 0) {
      increaseOrderForAllNodes(nodes, -nodes[nodeMap.get(sequence[0])].order);
    }
    return anchorIndex;
  }

  function generateNodeOrder(nodes, tracks) { //generate global sequence of nodes from left to right, starting with first track and adding other tracks sequentially
    var modifiedSequence;
    var i;
    var j;
    var currentOrder;
    var currentNode;
    var rightIndex;
    var leftIndex;

    generateNodeOrderOfSingleTrack(uninvert(tracks[0].sequence), nodes); //calculate order values for all nodes of the first track
    for (i = 1; i < tracks.length; i++) {
      //console.log("Node order for track " + i + " " + tracks[i].id);
      modifiedSequence = uninvert(tracks[i].sequence);
      rightIndex = generateNodeOrderLeftEnd(modifiedSequence, nodes); //calculate order values for all nodes until the first anchor
      while (rightIndex < modifiedSequence.length) { //move right until the end of the sequence
        //find next anchor node
        leftIndex = rightIndex;
        rightIndex++;
        while ((rightIndex < modifiedSequence.length) && (! nodes[nodeMap.get(modifiedSequence[rightIndex])].hasOwnProperty("order"))) rightIndex++;

        if (rightIndex < modifiedSequence.length) { //middle segment between two anchors
          currentOrder = nodes[nodeMap.get(modifiedSequence[leftIndex])].order + 1; //start with order value of leftAnchor + 1
          for (j = leftIndex + 1; j < rightIndex; j++) {
            nodes[nodeMap.get(modifiedSequence[j])].order = currentOrder; //assign order values
            currentOrder++;
          }
          if (nodes[nodeMap.get(modifiedSequence[rightIndex])].order > nodes[nodeMap.get(modifiedSequence[leftIndex])].order) { //if order-value of left anchor < order-value of right anchor
            if (nodes[nodeMap.get(modifiedSequence[rightIndex])].order < currentOrder) { //and the right anchor now has a lower order-value than our newly added nodes
              increaseOrderForSuccessors(nodes, nodes[nodeMap.get(modifiedSequence[rightIndex])], currentOrder);
            }
          } else { //potential node reversal: check for ordering conflict, if no conflict found move node at rightIndex further to the right in order to not create a track reversal
            if (! isSuccessor(nodes[nodeMap.get(modifiedSequence[rightIndex])], nodes[nodeMap.get(modifiedSequence[leftIndex])], nodes)) {
              //console.log("hier");
              //console.log(isSuccessor(nodes[nodeMap.get(modifiedSequence[rightIndex])], nodes[nodeMap.get(modifiedSequence[leftIndex])], nodes));
              increaseOrderForSuccessors(nodes, nodes[nodeMap.get(modifiedSequence[rightIndex])], currentOrder);
            }
          }
        } else { //right segment to the right of last anchor
          currentOrder = nodes[nodeMap.get(modifiedSequence[leftIndex])].order + 1;
          for (j = leftIndex + 1; j < modifiedSequence.length; j++) {
            currentNode = nodes[nodeMap.get(modifiedSequence[j])];
            if (! currentNode.hasOwnProperty("order")) {
              currentNode.order = currentOrder;
              currentOrder++;
            }
          }
        }
      }
    }
  }

  function isSuccessor(first, second, nodes) { //checks if second is a successor of first
    var visitedNodes = [];
    return isSuccessorRecursive(first, second, visitedNodes, nodes);
  }

  function isSuccessorRecursive(first, second, visitedNodes, nodes) {
    var i;

    if (first.name === second.name) {
      return true;
    }
    for (i = 0; i < first.successors.length; i++) {
      //if(first.successors[i] === second.name) return true;
      if (visitedNodes.indexOf(first.successors[i]) === -1) {
        visitedNodes.push(first.successors[i]);
        if (isSuccessorRecursive(nodes[nodeMap.get(first.successors[i])], second, visitedNodes, nodes)) {
          return true;
        }
      }
    }
    return false;
  }

  function getMaxOrder(nodes) { //get order number of the rightmost node
    var max = -1;
    nodes.forEach(function(node) {
      if ((node.hasOwnProperty("order")) && (node.order > max)) max = node.order;
    });
    return max;
  }

  function uninvert(sequence) { //generates sequence "corrected" for inversions i.e. A B C -D -E -F G H becomes A B C F E D G H
                                //the univerted sequence is how the nodes are arranged from left to right in the display
    var result = [];
    var i;
    var stack = [];

    for (i = 0; i < sequence.length; i++) {
      if (sequence[i].charAt(0) !== '-') {
        while (stack.length > 0) result.push(stack.pop());
        result.push(sequence[i]);
      } else {
        stack.push(sequence[i].substr(1));
      }
    }
    while (stack.length > 0) result.push(stack.pop());
    return result;
  }

  function increaseOrderForAllNodes(nodes, amount) { //increases the order-value of all nodes by amount
    nodes.forEach(function(node) {
      if (node.hasOwnProperty("order")) node.order += amount;
    });
  }

  function increaseOrderForSuccessors(nodes, currentNode, order) { //increases the order-value for currentNode and (if necessary) successor nodes recursively
    //console.log("increasing orders from " + currentNode.name + " to " + order);
    var increasedOrders = {};
    increaseOrderForSuccessorsRecursive(nodes, currentNode, order, increasedOrders);
    //console.log(increasedOrders);
    for (var nodeName in increasedOrders) {
      if (increasedOrders.hasOwnProperty(nodeName)) {
        nodes[nodeMap.get(nodeName)].order = increasedOrders[nodeName];
      }
    }
  }

  function increaseOrderForSuccessorsRecursive(nodes, currentNode, order, increasedOrders) {
    if ((currentNode.hasOwnProperty("order")) && (currentNode.order < order)) {
      if ((! increasedOrders.hasOwnProperty(currentNode.name)) || (increasedOrders[currentNode.name] < order)) {
        increasedOrders[currentNode.name] = order;
        currentNode.successors.forEach(function(successor) {
          if (nodes[nodeMap.get(successor)].order > currentNode.order) { //only increase order of successors if they lie to the right of the currentNode (not for repeats/translocations)
            increaseOrderForSuccessorsRecursive(nodes, nodes[nodeMap.get(successor)], order + 1, increasedOrders);
          }
        });
      }
    }
  }

  function generateNodeDegree(nodes, tracks) { //calculates the node degree: the number of tracks passing through the node / the node height
    nodes.forEach(function(node) { node.tracks = []; });

    tracks.forEach(function(track) {
      //console.log(track.id);
      track.sequence.forEach(function(nodeName) {
      //nodes[nodeMap.get(nodeName)].tracks=[];
      var noMinusName = nodeName;
      if (noMinusName.charAt(0) === '-') noMinusName = noMinusName.substr(1);
      nodes[nodeMap.get(noMinusName)].tracks.push(track.id);
      });
    });

    nodes.forEach(function(node) {
      if (node.hasOwnProperty("tracks")) node.degree = node.tracks.length;
    });
  }

  function generateNodeXCoords(nodes, tracks) { //calculates the concrete values for the nodes' x-coordinates
    var extra;
    var currentX;
    var nextX;
    var currentOrder;

    nodes.sort(compareNodesByOrder);
    nodeMap = generateNodeMap(nodes);
    extra = calculateExtraSpace(nodes, tracks);

    currentX = 0;
    nextX = offsetX + 40;
    currentOrder = -1;
    nodes.forEach(function(node, index) {
      if (node.hasOwnProperty("order")) {
        if (node.order > currentOrder) {
          currentOrder = node.order;
          currentX = nextX + 10 * extra[node.order];
        }
        node.x = currentX;
        nextX = Math.max(nextX, currentX + 20 + 20 * node.width);
      } else {
        console.log("Node " + node.name + " has no order property");
      }
    });
  }

  function calculateExtraSpace(nodes, tracks) { //calculates additional horizontal space needed between two nodes
    //two neighboring nodes have to be moved further apart if there is a lot going on in between them
    //-> edges turning to vertical orientation should not overlap
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

    /*console.log("left side edges:");
    console.log(leftSideEdges);
    console.log("right side edges:");
    console.log(rightSideEdges);*/

    extra.push(Math.max(0, leftSideEdges[0] - 1));
    for (i = 1; i <= maxOrder; i++) {
      extra.push(Math.max(0, leftSideEdges[i] - 1) + Math.max(0, rightSideEdges[i - 1] - 1));
    }

    return extra;
  }

  function generateLaneAssignment(nodes, tracks) { //create and fill assignment-variable, which contains info about tracks and lanes for each order-value
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
      //assignment[currentNode.order].push({trackNo: trackNo, segmentNo: 0, node: currentNodeId, isForward: currentNodeIsForward, lane: null});
      addToAssignment(currentNode.order, currentNodeId, trackNo, 0, prevSegmentPerOrderPerTrack);

      segmentNumber = 1;
      for (i = 1; i < track.sequence.length; i++) {
        previousNode = currentNode;
        previousNodeIsForward = currentNodeIsForward;

        currentNodeId = track.sequence[i];
        currentNodeIsForward = true;
        if (currentNodeId.charAt(0) == '-') {
          currentNodeId = currentNodeId.substr(1);
          currentNodeIsForward = false;
        }
        currentNode = nodes[nodeMap.get(currentNodeId)];

        if (currentNode.order > previousNode.order) {
          if (! previousNodeIsForward) {
            track.path.push({order: previousNode.order, lane: null, isForward: true, node: null});
            //assignment[previousNode.order].push({trackNo: trackNo, segmentNo: segmentNumber, node: null, isForward: true, lane: null});
            addToAssignment(previousNode.order, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
          }
          for (j = previousNode.order + 1; j < currentNode.order; j++) {
            track.path.push({order: j, lane: null, isForward: true, node: null});
            //assignment[j].push({trackNo: trackNo, segmentNo: segmentNumber, node: null, isForward: true, lane: null});
            addToAssignment(j, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
          }
          if (! currentNodeIsForward) {
            track.path.push({order: currentNode.order, lane: null, isForward: true, node: null});
            //assignment[currentNode.order].push({trackNo: trackNo, segmentNo: segmentNumber, node: null, isForward: true, lane: null});
            addToAssignment(currentNode.order, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
            track.path.push({order: currentNode.order, lane: null, isForward: false, node: currentNodeId});
            //assignment[currentNode.order].push({trackNo: trackNo, segmentNo: segmentNumber, node: currentNodeId, isForward: false, lane: null});
            addToAssignment(currentNode.order, currentNodeId, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
          } else {
            track.path.push({order: currentNode.order, lane: null, isForward: true, node: currentNodeId});
            //assignment[currentNode.order].push({trackNo: trackNo, segmentNo: segmentNumber, node: currentNodeId, isForward: true, lane: null});
            addToAssignment(currentNode.order, currentNodeId, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
          }
        } else if (currentNode.order < previousNode.order) {
          if (previousNodeIsForward) {
            track.path.push({order: previousNode.order, lane: null, isForward: false, node: null});
            //assignment[previousNode.order].push({trackNo: trackNo, segmentNo: segmentNumber, node: null, isForward: false, lane: null});
            addToAssignment(previousNode.order, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
          }
          for (j = previousNode.order - 1; j > currentNode.order; j--) {
            track.path.push({order: j, lane: null, isForward: false, node: null});
            //assignment[j].push({trackNo: trackNo, segmentNo: segmentNumber, node: null, isForward: false, lane: null});
            addToAssignment(j, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
          }
          if (currentNodeIsForward) {
            track.path.push({order: currentNode.order, lane: null, isForward: false, node: null});
            //assignment[currentNode.order].push({trackNo: trackNo, segmentNo: segmentNumber, node: null, isForward: false, lane: null});
            addToAssignment(currentNode.order, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
            track.path.push({order: currentNode.order, lane: null, isForward: true, node: currentNodeId});
            //assignment[currentNode.order].push({trackNo: trackNo, segmentNo: segmentNumber, node: currentNodeId, isForward: true, lane: null});
            addToAssignment(currentNode.order, currentNodeId, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
          } else {
            track.path.push({order: currentNode.order, lane: null, isForward: false, node: currentNodeId});
            //assignment[currentNode.order].push({trackNo: trackNo, segmentNo: segmentNumber, node: currentNodeId, isForward: false, lane: null});
            addToAssignment(currentNode.order, currentNodeId, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
          }
        } else { //currentNode.order == previousNode.order
          if (currentNodeIsForward !== previousNodeIsForward) {
            track.path.push({order: currentNode.order, lane: null, isForward: currentNodeIsForward, node: currentNodeId});
            //assignment[currentNode.order].push({trackNo: trackNo, segmentNo: segmentNumber, node: currentNodeId, isForward: currentNodeIsForward, lane: null});
            addToAssignment(currentNode.order, currentNodeId, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
          } else {
            track.path.push({order: currentNode.order, lane: null, isForward: !currentNodeIsForward, node: null});
            //assignment[currentNode.order].push({trackNo: trackNo, segmentNo: segmentNumber, node: null, isForward: !currentNodeIsForward, lane: null});
            addToAssignment(currentNode.order, null, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
            track.path.push({order: currentNode.order, lane: null, isForward: currentNodeIsForward, node: currentNodeId});
            //assignment[currentNode.order].push({trackNo: trackNo, segmentNo: segmentNumber, node: currentNodeId, isForward: currentNodeIsForward, lane: null});
            addToAssignment(currentNode.order, currentNodeId, trackNo, segmentNumber, prevSegmentPerOrderPerTrack);
            segmentNumber++;
          }
        }
      }
    });

    for (i = 0; i <= maxOrder; i++) {
    //for (i = 0; i <= 3; i++) {
    //console.log("order " + i + ":");
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
      assignment[order].push({type: "single", name: null, tracks: [{trackID: trackNo, segmentID: segmentID, compareToFromSame: compareToFromSame}]});
      //console.log("HIER: " + assignment[order][assignment[order].length - 1].tracks[0]);
      prevSegmentPerOrderPerTrack[order][trackNo] = assignment[order][assignment[order].length - 1].tracks[0];
    } else {
      for (i = 0; i < assignment[order].length; i++) {
        if (assignment[order][i].name === nodeID) { //add to existing node in assignment
          assignment[order][i].type = "multiple";
          assignment[order][i].tracks.push({trackID: trackNo, segmentID: segmentID, compareToFromSame: compareToFromSame});
          prevSegmentPerOrderPerTrack[order][trackNo] = assignment[order][i].tracks[assignment[order][i].tracks.length - 1];
          return;
        }
      }
      //create new node in assignment
      assignment[order].push({type: "single", name: nodeID, tracks: [{trackID: trackNo, segmentID: segmentID, compareToFromSame: compareToFromSame}]});
      prevSegmentPerOrderPerTrack[order][trackNo] = assignment[order][assignment[order].length - 1].tracks[0];
    }
  }

  function generateSingleLaneAssignment(assignment, order, nodes, tracks) {
    var i, j, index, currentLane;

    //for (i = 0; i < assignment.length; i++) {
    assignment.forEach(function(node) {
      node.idealLane = 0;
      //for (j = 0: j < assignment[i].tracks.length) {
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
            //while (! ((tracks[track.trackID].path[index].order === order) && (tracks[track.trackID].path[index].hasOwnProperty("lane")))) index--;
            //while (! ((tracks[track.trackID].path[index].order === order) && (tracks[track.trackID].path[index].lane !== null))) index--;
            while (tracks[track.trackID].path[index].order !== order - 1) index--;
            track.idealLane = tracks[track.trackID].path[index].lane;
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
      //node.yCoord = assignment[i][j].lane;
      //node.y = offsetY + 110 + 22 * node.yCoord;
      //console.log(node.name + "HIER " + nodeMap.get(node.name));
      if (node.name !== null) {
        nodes[nodeMap.get(node.name)].yCoord2 = currentLane;
        nodes[nodeMap.get(node.name)].y = offsetY + 110 + 22 * currentLane;
      }

      node.tracks.sort(compareByIdealLane);
      node.tracks.forEach(function(track) {
        //console.log("Track " + track.trackID + " (" + track.segmentID + ") --> Lane " + currentLane);
        track.lane = currentLane;
        tracks[track.trackID].path[track.segmentID].lane = currentLane;
        sumOfLaneChanges += currentLane - track.idealLane;
        totalLanes++;
        currentLane++;
      });
    });

    var moveBy = Math.round(sumOfLaneChanges / totalLanes - 0.000001);
    if ((moveBy !== 0) && (totalLanes > numberOfTracks)) {
      //console.log("move by " + moveBy);
      assignment.forEach(function(node) {
        if (node.name !== null) {
          nodes[nodeMap.get(node.name)].yCoord2 -= moveBy;
          nodes[nodeMap.get(node.name)].y -= 22 * moveBy;
        }
        node.tracks.forEach(function(track) {
          //console.log("Track " + track.trackID + " (" + track.segmentID + ") --> Lane " + currentLane);
          track.lane -= moveBy;
          tracks[track.trackID].path[track.segmentID].lane -= moveBy;
        });
      });
    }
  }

  function compareByIdealLane(a, b) {
    if (a.hasOwnProperty("idealLane")) {
      if (b.hasOwnProperty("idealLane")) {
        if (a.idealLane < b.idealLane) return -1;
        else if (a.idealLane > b.idealLane) return 1;
        else return 0;
      } else return -1;
    } else {
      if (b.hasOwnProperty("idealLane")) return 1;
      else return 0;
    }
  }

  function sortNumber(a,b) { return a - b; }

  function swap(array, i, j) {
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }

  function compareNodesByOrder(a, b) {
    if (a.hasOwnProperty("order")) {
      if (b.hasOwnProperty("order")) {
        if (a.order < b.order) return -1;
        else if (a.order > b.order) return 1;
        else return 0;
      } else return -1;
    } else {
      if (b.hasOwnProperty("order")) return 1;
      else return 0;
    }
  }

  /*function compareNodesByDegree(a, b) {
    if (a.hasOwnProperty("degree")) {
      if (b.hasOwnProperty("degree")) {
        if (a.degree < b.degree) return -1;
        else if (a.degree > b.degree) return 1;
        else return 0;
      } else return -1;
    } else {
      if (b.hasOwnProperty("degree")) return 1;
      else return 0;
    }
  }*/

  function generateEdgesFromPath(nodes, tracks, edges) {
    var i;
    var xStart;
    var xEnd;
    var y;
    var yEnd;

    for (i = 0; i <= maxOrder; i++) {
      extraLeft.push(0);
      extraRight.push(0);
    }

    //generate x coords where each order starts and ends
    var orderStartX = [];
    var orderEndX = [];
    nodes.forEach(function(node) {
      if (node.hasOwnProperty("order")) {
        orderStartX[node.order] = node.x;
        if (orderEndX[node.order] === undefined) orderEndX[node.order] = node.x + 20 * (node.width - 1);
        else orderEndX[node.order] = Math.max(orderEndX[node.order], node.x + 20 * (node.width - 1));
      }
    });

    tracks.forEach(function(track, trackID) {

      //start of path
      if (track.sequence[0].charAt(0) === '-') { //The track starts with an inversed node (TODO: change to isForward)
        //TODO: ADD STUFF HERE
      } else { //The track starts with a forward node
        xStart = orderStartX[track.path[0].order] - 20;
        xEnd = orderEndX[track.path[0].order];
        y = offsetY + 110 + 22 * track.path[0].lane;
        edges.push({source: {x: xStart, y: y}, target: {x: xEnd, y: y}, color: track.id});
      }

      //middle of path
      for (i = 1; i < track.path.length; i++) {

        if (track.path[i].order - 1 === track.path[i - 1].order) { //regular forward connection
          xStart = orderEndX[track.path[i - 1].order];
          xEnd = orderStartX[track.path[i].order];
          y = offsetY + 110 + 22 * track.path[i - 1].lane;
          yEnd = offsetY + 110 + 22 * track.path[i].lane;
          edges.push({source: {x: xStart, y: y}, target: {x: xEnd, y: yEnd}, color: track.id});
        } else if (track.path[i].order + 1 === track.path[i - 1].order) { //regular backward connection
          xStart = orderEndX[track.path[i].order];
          xEnd = orderStartX[track.path[i - 1].order];
          y = offsetY + 110 + 22 * track.path[i].lane;
          yEnd = offsetY + 110 + 22 * track.path[i - 1].lane;
          edges.push({source: {x: xStart, y: y}, target: {x: xEnd, y: yEnd}, color: track.id});
        } else { //change of direction
          if (track.path[i - 1].isForward) {
            generateForwardToReverse(track.path[i].order, track.path[i].lane, track.path[i - 1].lane, track.id, orderEndX);
          } else {
            generateReverseToForward(track.path[i].order, track.path[i].lane, track.path[i - 1].lane, track.id, orderStartX);
          }
        }

        //edge within node
        xStart = orderStartX[track.path[i].order];
        xEnd = orderEndX[track.path[i].order];
        y = offsetY + 110 + 22 * track.path[i].lane;
        edges.push({source: {x: xStart, y: y}, target: {x: xEnd, y: y}, color: track.id});

      }

      //ending edges
      if (!track.path[track.path.length - 1].isForward) { //The track ends with an inversed node
        //TODO: ADD STUFF HERE
      } else { //The track endss with a forward node
        xStart = orderEndX[track.path[track.path.length - 1].order];
        xEnd = xStart + 20;
        y = offsetY + 110 + 22 * track.path[track.path.length - 1].lane;
        edges.push({source: {x: xStart, y: y}, target: {x: xEnd, y: y}, color: track.id});
      }
    });
  }

  function generateForwardToReverse(order, lane1, lane2, trackID, orderEndX) {
    var temp;
    var x;
    var y;
    var y2;

    x = orderEndX[order] + 5 + 10 * extraRight[order];
    if (lane1 > lane2) {
      temp = lane1;
      lane1 = lane2;
      lane2 = temp;
    }
    y = offsetY + 110 + 22 * lane1 + 10;
    y2 = offsetY + 110 + 22 * lane2 + 10;
    //console.log("order: " + order + ", lane1: " + lane1 + ", lane2: " + lane2);
    edges.push({source: {x: x - 5 - 10 * extraRight[order], y: y - 10}, target: {x: x, y: y - 10}, color: trackID}); //right (elongate edge within node)
    arcs[1].push({ x: x, y: y, color: trackID}); //from right to down
    edges.push({source: {x: x + 10, y: y}, target: {x: x + 10, y: y2 - 20}, color: trackID}); //down
    arcs[2].push({ x: x, y: y2 - 20, color: trackID});
    edges.push({source: {x: x - 5 - 10 * extraRight[order], y: y2 - 10}, target: {x: x, y: y2 - 10}, color: trackID}); //right (elongate edge within node)
    extraRight[order]++;
  }

  function generateReverseToForward(order, lane1, lane2, trackID, orderStartX) {
    var temp;
    var x;
    var y;
    var y2;

    if (lane1 > lane2) {
      temp = lane1;
      lane1 = lane2;
      lane2 = temp;
    }
    y = offsetY + 110 + 22 * lane1 + 10;
    y2 = offsetY + 110 + 22 * lane2 + 10;
    x = orderStartX[order] - 35 - 10 * extraLeft[order];
    edges.push({source: {x: x + 30, y: y - 10}, target: {x: x + 35 + 10 * extraLeft[order], y: y - 10}, color: trackID}); //left
    arcs[0].push({ x: x + 30, y: y, color: trackID}); //from left to down
    edges.push({source: {x: x + 20, y: y}, target: {x: x + 20, y: y2 - 20}, color: trackID}); //down
    arcs[3].push({ x: x + 30, y: y2 - 20, color: trackID}); //from down to right
    edges.push({source: {x: x + 30, y: y2 - 10}, target: {x: x + 35 + 10 * extraLeft[order], y: y2 - 10}, color: trackID}); //right
    extraLeft[order]++;
  }

  function drawNodes(nodes) {
    //Draw central white rectangle for node background
    svg.selectAll(".nodeBackgroundRect")
      .data(nodes)
      .enter()
      .append("rect")
      .attr("class", "backgr")
      .attr("x", function(d) { return d.x - 10; })
      .attr("y", function(d) { return d.y; })
      .attr("width", function(d) { return 20 * d.width; })
      .attr("height", function(d) { return (d.degree - 1) * 22; });

    //Draw top white rectangle for node background
    svg.selectAll(".nodeBackgroundRect")
      .data(nodes)
      .enter()
      .append("rect")
      .attr("class", "backgr")
      .attr("x", function(d) { return d.x; })
      .attr("y", function(d) { return d.y - 10; })
      .attr("width", function(d) { return (d.width - 1) * 20; })
      .attr("height", 10);

    //Draw bottom white rectangle for node background
    svg.selectAll(".nodeBackgroundRect")
      .data(nodes)
      .enter()
      .append("rect")
      .attr("class", "backgr")
      .attr("x", function(d) { return d.x; })
      .attr("y", function(d) { return (d.y + (22 * (d.degree - 1))); })
      .attr("width", function(d) { return (d.width - 1) * 20; })
      .attr("height", 8);

    //Draw top-left circle segment (white background) for nodes
    var topLeftSegment = d3.svg.arc()
      .innerRadius(0)
      .outerRadius(10)
      .startAngle(-0.5 * Math.PI)
      .endAngle(0 * Math.PI);

    svg.selectAll(".nodeBackgroundTopLeft")
      .data(nodes)
      .enter()
      .append("path")
      .attr("class", "backgr")
      .attr("d", topLeftSegment)
      .attr("transform", function(d) {return "translate(" + d.x + ", " + d.y + ")"; });

    //Draw top-right circle segment (white background) for nodes
    var topRightSegment = d3.svg.arc()
      .innerRadius(0)
      .outerRadius(10)
      .startAngle(0 * Math.PI)
      .endAngle(0.5 * Math.PI);

    svg.selectAll(".nodeBackgroundTopRight")
      .data(nodes)
      .enter()
      .append("path")
      .attr("class", "backgr")
      .attr("d", topRightSegment)
      .attr("transform", function(d) {return "translate(" + (d.x + 20 * (d.width -1)) + ", " + d.y + ")"; });

    //Draw bottom-left circle segment (white background) for nodes
    var bottomLeftSegment = d3.svg.arc()
      .innerRadius(0)
      .outerRadius(10)
      .startAngle(1 * Math.PI)
      .endAngle(1.5 * Math.PI);

    svg.selectAll(".nodeBackgroundBottomLeft")
      .data(nodes)
      .enter()
      .append("path")
      .attr("class", "backgr")
      .attr("d", bottomLeftSegment)
      .attr("transform", function(d) {return "translate(" + d.x + ", " + (d.y + (22 * (d.degree - 1))) + ")"; });

    //Draw bottom-right circle segment (white background) for nodes
    var bottomRightSegment = d3.svg.arc()
      .innerRadius(0)
      .outerRadius(10)
      .startAngle(0.5 * Math.PI)
      .endAngle(1 * Math.PI);

    svg.selectAll(".nodeBackgroundBottomRight")
      .data(nodes)
      .enter()
      .append("path")
      .attr("class", "backgr")
      .attr("d", bottomRightSegment)
      .attr("transform", function(d) {return "translate(" + (d.x + 20 * (d.width -1)) + ", " + (d.y + (22 * (d.degree - 1))) + ")"; });

    //Draw top-left arc for nodes
    var topLeftArc = d3.svg.arc()
      .innerRadius(8)
      .outerRadius(10)
      .startAngle(-0.5 * Math.PI)
      .endAngle(0 * Math.PI);

    svg.selectAll(".topLeftArc")
      .data(nodes)
      .enter()
      .append("path")
      .attr("class", "arc")
      .attr("d", topLeftArc)
      .attr("transform", function(d) {return "translate(" + d.x + ", " + d.y + ")"; });

    //Draw top-right arc for nodes
    var topRightArc = d3.svg.arc()
      .innerRadius(8)
      .outerRadius(10)
      .startAngle(0 * Math.PI)
      .endAngle(0.5 * Math.PI);

    svg.selectAll(".topRightArc")
      .data(nodes)
      .enter()
      .append("path")
      .attr("class", "arc")
      .attr("d", topRightArc)
      .attr("transform", function(d) {return "translate(" + (d.x + 20 * (d.width -1)) + ", " + d.y + ")"; });

    //Draw bottom-left arc for nodes
    var bottomLeftArc = d3.svg.arc()
      .innerRadius(8)
      .outerRadius(10)
      .startAngle(1 * Math.PI)
      .endAngle(1.5 * Math.PI);

    svg.selectAll(".bottomLeftArc")
      .data(nodes)
      .enter()
      .append("path")
      .attr("class", "arc")
      .attr("d", bottomLeftArc)
      .attr("transform", function(d) {return "translate(" + d.x + ", " + (d.y + (22 * (d.degree - 1))) + ")"; });

    //Draw bottom-right arc for nodes
    var bottomRightArc = d3.svg.arc()
      .innerRadius(8)
      .outerRadius(10)
      .startAngle(0.5 * Math.PI)
      .endAngle(1 * Math.PI);

    svg.selectAll(".bottomRightArc")
      .data(nodes)
      .enter()
      .append("path")
      .attr("class", "arc")
      .attr("d", bottomRightArc)
      .attr("transform", function(d) {return "translate(" + (d.x + 20 * (d.width -1)) + ", " + (d.y + (22 * (d.degree - 1))) + ")"; });

    svg.selectAll(".arcLinkLeft") //linke Verbindung zw. Halbkreisen
      .data(nodes)
      .enter()
      .append("rect")
      .attr("class", "arc")
      .attr("x", function(d) { return d.x - 10; })
      .attr("y", function(d) { return d.y; })
      .attr("width", 2)
      .attr("height", function(d) { return (d.degree - 1) * 22; });

    svg.selectAll(".arcLinkRight") //rechte Verbindung zw. Halbkreisen
      .data(nodes)
      .enter()
      .append("rect")
      .attr("class", "arc")
      .attr("x", function(d) { return d.x + 8 + 20 * (d.width -1); })
      .attr("y", function(d) { return d.y; })
      .attr("width", 2)
      .attr("height", function(d) { return (d.degree - 1) * 22; });

    svg.selectAll(".arcLinkTop") //top Verbindung zw. Halbkreisen
      .data(nodes)
      .enter()
      .append("rect")
      .attr("class", "arc")
      .attr("x", function(d) { return d.x; })
      .attr("y", function(d) { return d.y - 10; })
      .attr("width", function(d) { return (d.width - 1) * 20; })
      .attr("height", 2);

    svg.selectAll(".arcLinkBottom") //bottom Verbindung zw. Halbkreisen
      .data(nodes)
      .enter()
      .append("rect")
      .attr("class", "arc")
      .attr("x", function(d) { return d.x; })
      .attr("y", function(d) { return (d.y + 8 + (22 * (d.degree - 1))); })
      .attr("width", function(d) { return (d.width - 1) * 20; })
      .attr("height", 2);
  }

  function drawEdges(edges) {
    //Create Paths for edges
    var diagonal = d3.svg.diagonal()
      .source(function(d) { return {"x":d.source.y, "y":d.source.x}; })
  	  .target(function(d) { return {"x":d.target.y, "y":d.target.x}; })
  	  .projection(function(d) { return [d.y, d.x]; });

    //Draw edges
    var link = svg.selectAll(".link")
      .data(edges)
  	  .enter().append("path")
  	  //.attr("class", "link")
      .attr("class", function(d) {return "link track" + d.color; })
  	  .attr("d", diagonal)
      .on("mouseover", handleMouseOver)
      .on("mouseout", handleMouseOut)
      .on("click", handleMouseClick)
  	  //.style("stroke", function(d, i) { return color(i); });
      .style("stroke", function(d) { return color(d.color); });
  }

  function drawTopRightEdgeArcs(arcs) {
    var topRightEdgeArc = d3.svg.arc()
      .innerRadius(6)
      .outerRadius(13)
      .startAngle(0 * Math.PI)
      .endAngle(0.5 * Math.PI);

    svg.selectAll(".topRightArc")
      .data(arcs)
      .enter()
      .append("path")
      .attr("class", function(d) {return "link topRightArctrack" + d.color; })
      .attr("d", topRightEdgeArc)
      //.style("stroke", function(d) { return color(d.color); })
      .on("mouseover", handleMouseOver)
      .on("mouseout", handleMouseOut)
      .on("click", handleMouseClick)
      .style("fill", function(d) { return color(d.color); })
      .attr("transform", function(d) {return "translate(" + d.x + ", " + d.y + ")"; });
  }

  function drawTopLeftEdgeArcs(arcs) {
    var topLeftEdgeArc = d3.svg.arc()
      .innerRadius(6)
      .outerRadius(13)
      .startAngle(0 * Math.PI)
      .endAngle(-0.5 * Math.PI);

    svg.selectAll(".topLeftArc")
      .data(arcs)
      .enter()
      .append("path")
      .attr("class", function(d) {return "link topLeftArctrack" + d.color; })
      .attr("d", topLeftEdgeArc)
      //.style("stroke", function(d) { return color(d.color); })
      .on("mouseover", handleMouseOver)
      .on("mouseout", handleMouseOut)
      .on("click", handleMouseClick)
      .style("fill", function(d) { return color(d.color); })
      .attr("transform", function(d) {return "translate(" + d.x + ", " + d.y + ")"; });
  }

  function drawBottomRightEdgeArcs(arcs) {
    var bottomRightEdgeArc = d3.svg.arc()
      .innerRadius(6)
      .outerRadius(13)
      .startAngle(0.5 * Math.PI)
      .endAngle(1 * Math.PI);

    svg.selectAll(".bottomRightArc")
      .data(arcs)
      .enter()
      .append("path")
      .attr("class", function(d) {return "link bottomRightArctrack" + d.color; })
      .attr("d", bottomRightEdgeArc)
      //.style("stroke", function(d) { return color(d.color); })
      .on("mouseover", handleMouseOver)
      .on("mouseout", handleMouseOut)
      .on("click", handleMouseClick)
      .style("fill", function(d) { return color(d.color); })
      .attr("transform", function(d) {return "translate(" + d.x + ", " + d.y + ")"; });
  }

  function drawBottomLeftEdgeArcs(arcs) {
    var bottomLeftEdgeArc = d3.svg.arc()
      .innerRadius(6)
      .outerRadius(13)
      .startAngle(1 * Math.PI)
      .endAngle(1.5 * Math.PI);

    svg.selectAll(".bottomLeftArc")
      .data(arcs)
      .enter()
      .append("path")
      .attr("class", function(d) {return "link bottomLeftArctrack" + d.color; })
      .attr("d", bottomLeftEdgeArc)
      //.style("stroke", function(d) { return color(d.color); })
      .on("mouseover", handleMouseOver)
      .on("mouseout", handleMouseOut)
      .on("click", handleMouseClick)
      .style("fill", function(d) { return color(d.color); })
      .attr("transform", function(d) {return "translate(" + d.x + ", " + d.y + ")"; });
  }

  function handleMouseOver() {  // Highlight track on mouseover
    var currentClass = d3.select(this).attr("class");
    currentClass = /track[0-9]*/.exec(currentClass);
    //console.log(currentClass[0]);

    svg.selectAll("." + currentClass)
      //.style("stroke", "#000000")
      .style("stroke-width",  "10px");

    var topRightArc = d3.svg.arc()
      .innerRadius(5)
      .outerRadius(15)
      .startAngle(0 * Math.PI)
      .endAngle(0.5 * Math.PI);

    svg.selectAll(".topRightArc" + currentClass)
      .attr("d", topRightArc);

    var topLeftArc = d3.svg.arc()
      .innerRadius(5)
      .outerRadius(15)
      .startAngle(0 * Math.PI)
      .endAngle(-0.5 * Math.PI);

    svg.selectAll(".topLeftArc" + currentClass)
      .attr("d", topLeftArc);

    var bottomRightArc = d3.svg.arc()
      .innerRadius(5)
      .outerRadius(15)
      .startAngle(0.5 * Math.PI)
      .endAngle(1 * Math.PI);

    svg.selectAll(".bottomRightArc" + currentClass)
      .attr("d", bottomRightArc);

    var bottomLeftArc = d3.svg.arc()
      .innerRadius(5)
      .outerRadius(15)
      .startAngle(1 * Math.PI)
      .endAngle(1.5 * Math.PI);

    svg.selectAll(".bottomLeftArc" + currentClass)
      .attr("d", bottomLeftArc);
  }

  function handleMouseOut() {  // Restore original appearance on mouseout
    var currentClass = d3.select(this).attr("class");
    currentClass = /track[0-9]*/.exec(currentClass);

    svg.selectAll("." + currentClass)
      //.style("stroke", function(d) { return color(d.color); });
      .style("stroke-width",  "7px");

    var topRightArc = d3.svg.arc()
      .innerRadius(6)
      .outerRadius(13)
      .startAngle(0 * Math.PI)
      .endAngle(0.5 * Math.PI);

    svg.selectAll(".topRightArc" + currentClass)
      .attr("d", topRightArc);

    var topLeftArc = d3.svg.arc()
      .innerRadius(6)
      .outerRadius(13)
      .startAngle(0 * Math.PI)
      .endAngle(-0.5 * Math.PI);

    svg.selectAll(".topLeftArc" + currentClass)
      .attr("d", topLeftArc);

    var bottomRightArc = d3.svg.arc()
      .innerRadius(6)
      .outerRadius(13)
      .startAngle(0.5 * Math.PI)
      .endAngle(1 * Math.PI);

    svg.selectAll(".bottomRightArc" + currentClass)
      .attr("d", bottomRightArc);

    var bottomLeftArc = d3.svg.arc()
      .innerRadius(6)
      .outerRadius(13)
      .startAngle(1 * Math.PI)
      .endAngle(1.5 * Math.PI);

    svg.selectAll(".bottomLeftArc" + currentClass)
      .attr("d", bottomLeftArc);
  }

  function handleMouseClick() { // Move clicked track to first position
    var trackNo = d3.select(this).attr("class");
    trackNo = /[0-9]+/.exec(trackNo);
    var index = 0;
    //console.log("trackno: " + trackNo);
    while ((index < 10) && (inputTracks[index].id != trackNo)) index++;
    //console.log("index: " + index);
    moveTrackToFirstPosition(index);
  }

  return {
    create: create
  };

})();
