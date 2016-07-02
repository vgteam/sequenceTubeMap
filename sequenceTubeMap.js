/*jshint loopfunc: true */
/*jshint esversion: 6*/

//Globals
const offsetX = 10;
const offsetY = 10;
var numberOfNodes;
var numberOfTracks;
var nodeMap;
const color = d3.scale.category10().domain([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

var edges = [];
var arcs = [[], [], [], []];
var maxLaneUsed = []; //remembers extra lanes that are being used by inversions, so that overlapping inversion doesn't use the same lane
var minLaneUsed = [];
var bestScore; //TODO: get rid of this as global variable
var assignment = [];

function createTubeMap(svg, iNodes, iTracks) {
  var inputNodes = (JSON.parse(JSON.stringify(iNodes)));
  var inputTracks = (JSON.parse(JSON.stringify(iTracks)));

  svg.selectAll("*").remove();
  edges = [];
  arcs = [[], [], [], []];
  maxLaneUsed = [];
  minLaneUsed = [];

  numberOfNodes = inputNodes.length;
  numberOfTracks = inputTracks.length;
  nodeMap = generateNodeMap(inputNodes);
  generateNodeSuccessors(inputNodes, inputTracks);
  generateNodeOrder(inputNodes, inputTracks);
  generateNodeDegree(inputNodes, inputTracks);
  generateLaneAssignment(inputNodes, inputTracks);
  generateNodeXCoords(inputNodes, inputTracks);
  generateNodeYCoords(inputNodes, assignment);
  generateEdgesFromPath(inputNodes, inputTracks, edges);

  console.log("Assignment:");
  console.log(assignment);
  console.log("Tracks:");
  console.log(inputTracks);
  console.log("Nodes:");
  console.log(inputNodes);
  console.log("Arcs:");
  console.log(arcs);

  drawEdges(edges);
  if (arcs[0].length > 0) drawTopLeftEdgeArcs(arcs[0]);
  if (arcs[1].length > 0) drawTopRightEdgeArcs(arcs[1]);
  if (arcs[2].length > 0) drawBottomRightEdgeArcs(arcs[2]);
  if (arcs[3].length > 0) drawBottomLeftEdgeArcs(arcs[3]);
  drawNodes(inputNodes);
}

function generateNodeMap(nodes) {   //map node names to node indices
  var nodeMap = new Map();
  nodes.forEach(function(node, index) {
    nodeMap.set(node.name, index);
  });
  return nodeMap;
}

function generateNodeSuccessors(nodes, tracks) { //OLD VERSION: the names of the nodes coming directly after the current node
  var i;
  var currentNode;
  var followerID;

  nodes.forEach(function(node) {
    node.successors = [];
  });

  tracks.forEach(function(track) {
    for(i = 0; i < track.sequence.length - 1; i++) {
      if (track.sequence[i].charAt(0) == '-') {
        currentNode = nodes[nodeMap.get(track.sequence[i].substr(1))];
      } else {
        currentNode = nodes[nodeMap.get(track.sequence[i])];
      }
      if (track.sequence[i + 1].charAt(0) == '-') {
        followerID = track.sequence[i + 1].substr(1);
      } else {
        followerID = track.sequence[i + 1];
      }

      //console.log("davor: " + currentNode.successors.indexOf(track.sequence[i + 1]));
      if (currentNode.successors.indexOf(followerID) === -1) {
        //console.log(currentNode.successors.indexOf(track.sequence[i + 1]));
        currentNode.successors.push(followerID);
        //console.log("pushing " + track.sequence[i+1] + " to node " + currentNode.name);
      }
    }
  });
}

function generateNodeOrder(nodes, tracks) { //generate global sequence of nodes from left to right, starting with first track and adding other tracks sequentially
  var modifiedSequence;
  var i;
  var j;
  var currentOrder;
  var currentNode;
  var rightIndex;
  var leftIndex;
  var nodeNames = new Map();

  //start with first track
  modifiedSequence = uninvert(tracks[0].sequence);
  currentOrder = 0;
  modifiedSequence.forEach(function(nodeName) {
    currentNode = nodes[nodeMap.get(nodeName)];
    if (! currentNode.hasOwnProperty("order")) { //default case
      currentNode.order = currentOrder;
      currentOrder++;
    } else { //track has a repeat revisiting a node
      currentOrder = currentNode.order + 1;
    }
  });

  for (i = 1; i < tracks.length; i++) {
    //console.log("Track " + i);
    rightIndex = 0;
    modifiedSequence = uninvert(tracks[i].sequence);
    //console.log("modSeq: " + modifiedSequence);

    //LEFT END
    while (! nodes[nodeMap.get(modifiedSequence[rightIndex])].hasOwnProperty("order")) rightIndex++; //rightIndex = first anchor = first common node with existing graph
    nodeNames = new Map();
    for (j = rightIndex - 1; j >= 0; j--) { //count number of nodes to the left of rightIndex counting repeated nodes only once
      nodeNames.set(modifiedSequence[j], true);
    }
    currentOrder = nodes[nodeMap.get(modifiedSequence[rightIndex])].order - nodeNames.size; //order of first node
    for (j = 0; j < rightIndex; j++) { //assign order to nodes
      currentNode = nodes[nodeMap.get(modifiedSequence[j])];
      if (! currentNode.hasOwnProperty("order")) {
        currentNode.order = currentOrder;
        currentOrder++;
      }
    }
    if (nodes[nodeMap.get(modifiedSequence[0])].order < 0) {
      increaseOrderForAllNodes(nodes, -nodes[nodeMap.get(modifiedSequence[0])].order);
    }

    while (rightIndex < modifiedSequence.length) {
      leftIndex = rightIndex;
      rightIndex++;
      //console.log(rightIndex);
      //if (rightIndex < modifiedSequence.length) console.log(nodes[nodeMap.get(modifiedSequence[rightIndex])].name);
      while ((rightIndex < modifiedSequence.length) && (! nodes[nodeMap.get(modifiedSequence[rightIndex])].hasOwnProperty("order"))) {
        //console.log("drin");
        //console.log(nodes[nodeMap.get(modifiedSequence[rightIndex])].name);
        rightIndex++;
      }
      if (rightIndex < modifiedSequence.length) { //middle segment between two anchors
        //standard case: anchors are in correct order
        //but also for repeats and reverse orderings
        //if (nodes[nodeMap.get(modifiedSequence[rightIndex])].order > nodes[nodeMap.get(modifiedSequence[leftIndex])].order) {
          currentOrder = nodes[nodeMap.get(modifiedSequence[leftIndex])].order + 1;
          for (j = leftIndex + 1; j < rightIndex; j++) {
            //console.log(modifiedSequence[j] + ": " + currentOrder + "; leftIndex: " + modifiedSequence[leftIndex]);
            nodes[nodeMap.get(modifiedSequence[j])].order = currentOrder;
            currentOrder++;
          }
          if (nodes[nodeMap.get(modifiedSequence[rightIndex])].order > nodes[nodeMap.get(modifiedSequence[leftIndex])].order) {
            if (nodes[nodeMap.get(modifiedSequence[rightIndex])].order < currentOrder) {
              increaseOrderForSuccessors(nodes, nodes[nodeMap.get(modifiedSequence[rightIndex])], currentOrder);
            }
          }
        //}
      } else { //right end to the right of last anchor
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

function uninvert(sequence) {
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

function increaseOrderForAllNodes(nodes, amount) {
  nodes.forEach(function(node) {
    if (node.hasOwnProperty("order")) node.order += amount;
  });
}

function increaseOrderForSuccessors(nodes, currentNode, order) {
  var oldOrder;

  if ((currentNode.hasOwnProperty("order")) && (currentNode.order < order)) {
    oldOrder = currentNode.order;
    currentNode.order = order;
    //console.log("order(" + currentNode.name + ") = " + order);
    currentNode.successors.forEach(function(successor) {
      if (nodes[nodeMap.get(successor)].order > oldOrder) { //only increase order of successors if they lie to the right of the currentNode (not for repeats/translocations)
        increaseOrderForSuccessors(nodes, nodes[nodeMap.get(successor)], order + 1);
      }
    });
  }
}

function generateNodeDegree(nodes, tracks) {
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

function generateNodeXCoords(nodes, tracks) {
  nodes.sort(compareNodesByOrder);
  nodeMap = generateNodeMap(nodes);

  var currentX = 0;
  var nextX = offsetX + 40;
  var currentOrder = -1;
  nodes.forEach(function(node) {
    if (node.hasOwnProperty("order")) {
      if (node.order > currentOrder) {
        currentX = nextX;
      }
      node.x = currentX;
      nextX = Math.max(nextX, currentX + 20 + 20 * node.width);
      currentOrder = node.order;
    } else {
      console.log("Node " + node.name + " has no order property");
    }
    //node.y = 120;
  });
}

function generateLaneAssignment(nodes, tracks) {
  var i;
  var maxOrder;
  var currentNodeId;
  var currentNode;
  var previousNode;
  //var assignment = [];
  var trackCode;
  var found;

  //get order number of the last node
  maxOrder = -1;
  nodes.forEach(function(node) {
    if ((node.hasOwnProperty("order")) && (node.order > maxOrder)) maxOrder = node.order;
  });

  //create objects to be filled
  for (i = 0; i <= maxOrder; i++) assignment[i] = {};
  tracks.forEach(function(track) {
  	 track.lanes = [];
  	 for (i = 0; i <= maxOrder; i++) track.lanes.push(-10);
  });

  //fill assignment object with info for each order number about which tracks run through which nodes and which tracks don't run through any node
  tracks.forEach(function(track, trackNo) {
    //add info for start of track
    currentNodeId = track.sequence[0];
    if (currentNodeId.charAt(0) == '-') currentNodeId = currentNodeId.substr(1);
    currentNode = nodes[nodeMap.get(currentNodeId)];
    if (!assignment[currentNode.order].hasOwnProperty(currentNodeId)) assignment[currentNode.order][currentNodeId] = [trackNo];
    else assignment[currentNode.order][currentNodeId].push(trackNo);

    //add info for rest of track
    trackCode = trackNo;
    for (i = 1; i < track.sequence.length; i++) {
      previousNode = currentNode;
      currentNodeId = track.sequence[i];
      if (currentNodeId.charAt(0) == '-') currentNodeId = currentNodeId.substr(1);
      currentNode = nodes[nodeMap.get(currentNodeId)];

      if (currentNode.order <= previousNode.order) trackCode += 1000;
      if (!assignment[currentNode.order].hasOwnProperty(currentNodeId)) assignment[currentNode.order][currentNodeId] = [trackCode];
      else assignment[currentNode.order][currentNodeId].push(trackCode);

      /*if (!assignment[currentNode.order].hasOwnProperty(currentNodeId)) assignment[currentNode.order][currentNodeId] = [trackNo];
      else {
        for (var prop in assignment[currentNode.order]) { //for duplications and translocations create new artificial track number by adding 1000
          if (assignment[currentNode.order][prop].indexOf(trackCode) !== -1) {
            trackCode += 1000;
          }
        }
        assignment[currentNode.order][currentNodeId].push(trackCode);
      }*/

      //add "assignment = none" for order numbers between previous and current node
      if ((currentNode.order > previousNode.order) && (track.sequence[i].charAt(0) !== '-') && (track.sequence[i - 1].charAt(0) !== '-')) {
        for (j = previousNode.order + 1; j < currentNode.order; j++) {
          if (!assignment[j].hasOwnProperty("none")) assignment[j].none = [trackCode];
          else assignment[j].none.push(trackCode);
        }
      }
    }
  });
  //console.log("Assignment");
  //console.log(assignment);

  //now generate the actual lane assignment for each order number
  generateSingleLaneAssignment(0, assignment[0], {}, tracks);
  for (i = 1; i <= maxOrder; i++) {
    generateSingleLaneAssignment(i, assignment[i], assignment[i - 1], tracks);
  }

  //translate the lane assignment into a path for each track
  tracks.forEach(function(track, trackNo) {
    track.path = [];
    trackCode = trackNo;

    var index = 0;
    var orientation;
    currentNodeId = track.sequence[index];
    if (currentNodeId.charAt(0) == '-') currentNodeId = currentNodeId.substr(1);
    currentNode = nodes[nodeMap.get(currentNodeId)];

    do {
      found = false;
      for (i = 0; i <= maxOrder; i++) {
        if (assignment[i].hasOwnProperty(trackCode)) {
          found = true;
          orientation = true;
          if (currentNode.order == i) {
            if (track.sequence[index].charAt(0) == '-') orientation = false;
            index++;
            if (index < track.sequence.length) {
              currentNodeId = track.sequence[index];
              if (currentNodeId.charAt(0) == '-') currentNodeId = currentNodeId.substr(1);
              currentNode = nodes[nodeMap.get(currentNodeId)];
            }
          }
          track.path.push({order: i, lane: assignment[i][trackCode], isForward: orientation});

        }
      }
      trackCode += 1000;
    } while (found === true);



    /*for (i = 0; i < track.sequence.length; i++) {
      track.path.push({order: track.sequence[i]});
    }
    var o = {order: track.sequence[0]};
    track.path.push(o);*/
  });
}

function generateNodeYCoords(nodes, assignment) {
  var i;
  for (i = 0; i < assignment.length; i++) {
    for (var property in assignment[i]) {
      if ((isNaN(property)) && (property !== "none")) { //property is the name of a node
        //console.log(property);
        var min = Number.MAX_SAFE_INTEGER;
        //console.log(assignment[i][property][0]);
        for (var j = 0; j < assignment[i][property].length; j++) {
          var trackID = assignment[i][property][j];
          if (assignment[i][trackID] < min) min = assignment[i][trackID];
        }
        nodes[nodeMap.get(property)].yCoord = min;
        nodes[nodeMap.get(property)].y = offsetY + 110 + 22 * min;
      }
    }
  }
}

//picks the lane assignment with minimal lane changes between the previous(order-wise) lane assignment and this lane assignment
function generateSingleLaneAssignment(currentOrder, assignment, previousAssignment, tracks) {
  //TODO: switch out brute force algorithm for something else
  var elements = [];
  var score;
  var minScore = Number.MAX_SAFE_INTEGER;
  var minArrangement = [];
  var i;

  for (var prop in assignment) {
    for (i = 0; i < assignment[prop].length; i++) {
      elements.push(assignment[prop][i]);
    }
  }
  elements.sort(sortNumber);
  //console.log(currentOrder + ": " + elements);

  do {
    //console.log(currentOrder + ": " + elements);
    score = calculateScore(elements, assignment, previousAssignment);
    if (score < minScore) {
      minScore = score;
      minArrangement = elements.slice(0);
    }
  } while (getNextPermutation(elements));

  //console.log("best arrangement (" + currentOrder + "): ");
  //console.log(minArrangement);
  //save best arrangement
  for (i = 0; i < minArrangement.length; i++) {
  	assignment[minArrangement[i]] = i;
  	//console.log("track: " + tracks[minArrangement[0]]);
  	//console.log("track: " + tracks);
  	//tracks[minArrangement[i]].lanes[currentOrder] = i;
  }
  //tracks[sortMe[i][j]].lanes[currentOrder] = sorted[i] + j;

  //init maxLaneUsed and minLaneUsed
  maxLaneUsed[currentOrder] = minArrangement.length - 1;
  minLaneUsed[currentOrder] = 0;

}

function sortNumber(a,b) {
    return a - b;
}

function modulo(x) {
  return function(element) {
    return element % 1000 === x;
  };
}

function calculateScore(elements, assignment2, previousAssignment) {
  var i;
  var score = 0;
  var assignedNode;
  var previousLaneNode;
  var lanesLeftInNode = 0;
  var nodeName;
  var j;
  var increasing;
  var decreasing;

  for (nodeName in assignment2) {
    if ((assignment2.hasOwnProperty(nodeName)) && (isNaN(nodeName))) { //for each node
      for (i = 0; i < numberOfTracks; i++) {
        var tracks = assignment2[nodeName].filter(modulo(i));
        if (tracks.length > 1) { //if a track runs through a node more than once
          //console.log(tracks);
          tracks.sort(sortNumber);
          increasing = true;
          decreasing = true;
          for (j = 1; j < tracks.length; j++) {
            if (elements.indexOf(tracks[j - 1]) + 1 !== elements.indexOf(tracks[j])) increasing = false;
            if (elements.indexOf(tracks[j - 1]) - 1 !== elements.indexOf(tracks[j])) decreasing = false;
          }
          if ((!increasing) && (!decreasing)) return Number.MAX_SAFE_INTEGER; //
          //console.log("found");
        }
      }

    }
  }

  for (i = 0; i < elements.length; i++) {
  	//possible regarding node assignment?
  	for (nodeName in assignment2) {
  	  if ((assignment2.hasOwnProperty(nodeName)) && (isNaN(nodeName))) {
  	  	if (assignment2[nodeName].indexOf(elements[i]) !== -1) {
  	  	  assignedNode = nodeName;
  	  	  break;
  	  	}
  	  }
  	}
  	if (lanesLeftInNode > 0) {
  	  if (previousLaneNode !== assignedNode) {
  	  	return Number.MAX_SAFE_INTEGER;
  	  } else {
 	    lanesLeftInNode--;
  	  }
  	} else {
  	  previousLaneNode = assignedNode;
  	  if (assignedNode !== "none") {
	    lanesLeftInNode = assignment2[assignedNode].length - 1;
  	  }
   }

  	//score
  	if (previousAssignment.hasOwnProperty(elements[i])) {
  	  score += Math.abs(previousAssignment[elements[i]] - i);
  	}
  }
  //console.log("Score: " + score);
  return score;
}

function getNextPermutation(array) {
  var i = array.length - 1;
  while ((i > 0) && (array[i - 1] >= array[i])) i--;
  if (i === 0) return false;
  //console.log("doing perm");
  var j = array.length;
  while (array[j - 1] < array[i - 1]) j--;
  swap(array, i - 1, j - 1);
  i++;
  j = array.length;
  while (i < j) {
    swap(array, i - 1, j - 1);
    i++;
    j--;
  }
  return true;
}

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

function compareNodesByDegree(a, b) {
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
}

function generateEdgesFromPath(nodes, tracks, edges) {
  var i;
  var xStart;
  var xEnd;
  var y;

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
      edges.push({source: {x: xStart, y: y}, target: {x: xEnd, y: y}, color: trackID});
    }

    //middle of path
    for (i = 1; i < track.path.length; i++) {

      if ((track.path[i].isForward) && (track.path[i - 1].isForward)) {
        if (track.path[i].order > track.path[i - 1].order) { //regular forward connection
          xStart = orderEndX[track.path[i - 1].order];
          xEnd = orderStartX[track.path[i].order];
          y = offsetY + 110 + 22 * track.path[i - 1].lane;
          yEnd = offsetY + 110 + 22 * track.path[i].lane;
          edges.push({source: {x: xStart, y: y}, target: {x: xEnd, y: yEnd}, color: track.id});
        } else { // repeat or translocation
          generateBackwardsForwardToForward(track.path[i - 1].order, track.path[i].order, track.path[i - 1].lane, track.path[i].lane, trackID, orderStartX, orderEndX);
        }
      } else if ((! track.path[i].isForward) && (! track.path[i - 1].isForward) && (track.path[i].order + 1 === track.path[i - 1].order)) { //regular backward connection
        xStart = orderEndX[track.path[i].order];
        xEnd = orderStartX[track.path[i - 1].order];
        y = offsetY + 110 + 22 * track.path[i].lane;
        yEnd = offsetY + 110 + 22 * track.path[i - 1].lane;
        edges.push({source: {x: xStart, y: y}, target: {x: xEnd, y: yEnd}, color: track.id});
      } else if ((! track.path[i].isForward) && (track.path[i - 1].isForward)) { //forward to reverse connection
        generateForwardToReverse(track.path[i - 1].order, track.path[i].order, track.path[i - 1].lane, track.path[i].lane, trackID, orderEndX);
      } else if ((track.path[i].isForward) && (! track.path[i - 1].isForward)) { //reverse to forward connection
        generateReverseToForward(track.path[i - 1].order, track.path[i].order, track.path[i - 1].lane, track.path[i].lane, trackID, orderStartX);
      }

      //edge within node
      xStart = orderStartX[track.path[i].order];
      xEnd = orderEndX[track.path[i].order];
      y = offsetY + 110 + 22 * track.path[i].lane;
      edges.push({source: {x: xStart, y: y}, target: {x: xEnd, y: y}, color: trackID});

    }

    //ending edges
    if (track.sequence[track.sequence.length - 1].charAt(0) === '-') { //The track ends with an inversed node
      //TODO: ADD STUFF HERE
    } else { //The track endss with a forward node
      xStart = orderEndX[track.path[track.path.length - 1].order];
      xEnd = xStart + 20;
      y = offsetY + 110 + 22 * track.path[track.path.length - 1].lane;
      edges.push({source: {x: xStart, y: y}, target: {x: xEnd, y: y}, color: trackID});
    }


  });
}

function generateForwardToReverse(order1, order2, lane1, lane2, trackID, orderEndX) {
  var temp;
  var lane3;
  var x;
  var x2;
  var y;
  var y2;
  var y3;

  if (order2 < order1) {
    temp = order1;
    order1 = order2;
    order2 = temp;
    temp = lane1;
    lane1 = lane2;
    lane2 = temp;
  }
  lane3 = getLane(order1 + 1, order2, lane1, lane2);
  //console.log("track " + trackID + " from " + order1 + " to " + order2 + ": lane " + lane3);
  x = orderEndX[order1] + 5;
  x2 = orderEndX[order2] + 5;
  y2 = offsetY + 110 + 22 * lane3 - 10;
  if (lane3 >= numberOfTracks) { //downwards
    y = offsetY + 110 + 22 * lane1 + 10;
    y3 = offsetY + 110 + 22 * lane2 + 10;
    edges.push({source: {x: x - 5, y: y - 10}, target: {x: x, y: y - 10}, color: trackID}); //right (elongate edge within node)
    arcs[1].push({ x: x, y: y, color: trackID}); //from right to down
    edges.push({source: {x: x + 10, y: y}, target: {x: x + 10, y: y2}, color: trackID}); //down
    arcs[3].push({ x: x + 20, y: y2, color: trackID}); //from down to right
    edges.push({source: {x: x + 20, y: y2 + 10}, target: {x: x2, y: y2 + 10}, color: trackID}); //right
    arcs[2].push({ x: x2, y: y2, color: trackID}); //from right to up
    edges.push({source: {x: x2 + 10, y: y3}, target: {x: x2 + 10, y: y2}, color: trackID}); //up
    arcs[1].push({ x: x2, y: y3, color: trackID}); //from up to left
    edges.push({source: {x: x2 - 5, y: y3 - 10}, target: {x: x2, y: y3 -10}, color: trackID}); //left (elongate edge within node)
  } else { //upwards
    y = offsetY + 110 + 22 * lane1 - 10;
    y3 = offsetY + 110 + 22 * lane2 - 10;
    edges.push({source: {x: x - 5, y: y + 10}, target: {x: x, y: y + 10}, color: trackID}); //right (elongate edge within node)
    arcs[2].push({ x: x, y: y, color: trackID}); //from right to up
    edges.push({source: {x: x + 10, y: y}, target: {x: x + 10, y: y2 + 20}, color: trackID}); //up
    arcs[0].push({ x: x + 20, y: y2 + 20, color: trackID}); //from up to right
    edges.push({source: {x: x + 20, y: y2 + 10}, target: {x: x2, y: y2 + 10}, color: trackID}); //right
    arcs[1].push({ x: x2, y: y2 + 20, color: trackID}); //from right to down
    edges.push({source: {x: x2 + 10, y: y3}, target: {x: x2 + 10, y: y2 + 20}, color: trackID}); //down
    arcs[2].push({ x: x2, y: y3, color: trackID}); //from down to left
    edges.push({source: {x: x2 - 5, y: y3 + 10}, target: {x: x2, y: y3 + 10}, color: trackID}); //left (elongate edge within node)
  }
}

function generateReverseToForward(order1, order2, lane1, lane2, trackID, orderStartX) {
  var temp;
  var lane3;
  var x;
  var x2;
  var y;
  var y2;
  var y3;

  if (order2 < order1) {
    temp = order1;
    order1 = order2;
    order2 = temp;
    temp = lane1;
    lane1 = lane2;
    lane2 = temp;
  }
  lane3 = getLane(order1, order2 - 1, lane1, lane2);
  //console.log("track " + trackID + " from " + order1 + " to " + order2 + ": lane " + lane3);
  x = orderStartX[order1] - 35;
  x2 = orderStartX[order2] - 35;
  y2 = offsetY + 110 + 22 * lane3 - 10;
  if (lane3 >= numberOfTracks) {
    y = offsetY + 110 + 22 * lane1 + 10;
    y3 = offsetY + 110 + 22 * lane2 + 10;
    edges.push({source: {x: x + 30, y: y - 10}, target: {x: x + 35, y: y - 10}, color: trackID}); //left
    arcs[0].push({ x: x + 30, y: y, color: trackID}); //from left to down
    edges.push({source: {x: x + 20, y: y}, target: {x: x + 20, y: y2}, color: trackID}); //down
    arcs[3].push({ x: x + 30, y: y2, color: trackID}); //from down to right
    edges.push({source: {x: x + 30, y: y2 + 10}, target: {x: x2 + 10, y: y2 + 10}, color: trackID}); //right
    arcs[2].push({ x: x2 + 10, y: y2, color: trackID}); //from right to up
    edges.push({source: {x: x2 + 20, y: y3}, target: {x: x2 + 20, y: y2}, color: trackID}); //up
    arcs[0].push({ x: x2 + 30, y: y3, color: trackID}); //from up to right
    edges.push({source: {x: x2 + 30, y: y3 - 10}, target: {x: x2 + 35, y: y3 - 10}, color: trackID}); //right
  } else {
    y = offsetY + 110 + 22 * lane1 - 10;
    y3 = offsetY + 110 + 22 * lane2 - 10;
    edges.push({source: {x: x + 30, y: y + 10}, target: {x: x + 35, y: y + 10}, color: trackID}); //left
    arcs[3].push({ x: x + 30, y: y, color: trackID}); //from left to up
    edges.push({source: {x: x + 20, y: y}, target: {x: x + 20, y: y2 + 20}, color: trackID}); //up
    arcs[0].push({ x: x + 30, y: y2 + 20, color: trackID}); //from up to right
    edges.push({source: {x: x + 30, y: y2 + 10}, target: {x: x2 + 10, y: y2 + 10}, color: trackID}); //right
    arcs[1].push({ x: x2 + 10, y: y2 + 20, color: trackID}); //from right to down
    edges.push({source: {x: x2 + 20, y: y3}, target: {x: x2 + 20, y: y2 + 20}, color: trackID}); //down
    arcs[3].push({ x: x2 + 30, y: y3, color: trackID}); //from down to right
    edges.push({source: {x: x2 + 30, y: y3 + 10}, target: {x: x2 + 35, y: y3 + 10}, color: trackID}); //right
  }
}

function generateBackwardsForwardToForward(order1, order2, lane1, lane2, trackID, orderStartX, orderEndX) {
  var temp;
  var lane3;
  var x;
  var x2;
  var y;
  var y2;
  var y3;

  lane3 = getLane(order2, order1, lane2, lane1);
  x = orderEndX[order1] + 5;
  x2 = orderStartX[order2] - 35;
  y2 = offsetY + 110 + 22 * lane3 - 10;
  if (lane3 >= numberOfTracks) { //downwards
    y = offsetY + 110 + 22 * lane1 + 10;
    y3 = offsetY + 110 + 22 * lane2 + 10;
    edges.push({source: {x: x - 5, y: y - 10}, target: {x: x, y: y - 10}, color: trackID}); //right (elongate edge within node)
    arcs[1].push({ x: x, y: y, color: trackID}); //from right to down
    edges.push({source: {x: x + 10, y: y}, target: {x: x + 10, y: y2}, color: trackID}); //down
    arcs[2].push({ x: x, y: y2, color: trackID}); //from down to left
    edges.push({source: {x: x2 + 30, y: y2 + 10}, target: {x: x, y: y2 + 10}, color: trackID}); //left
    arcs[3].push({ x: x2 + 30, y: y2, color: trackID}); //from left to up
    edges.push({source: {x: x2 + 20, y: y3}, target: {x: x2 + 20, y: y2}, color: trackID}); //up
    arcs[0].push({ x: x2 + 30, y: y3, color: trackID}); //from up to right
    edges.push({source: {x: x2 + 30, y: y3 - 10}, target: {x: x2 + 35, y: y3 - 10}, color: trackID});//right
  } else { //upwards
    y = offsetY + 110 + 22 * lane1 - 10;
    y3 = offsetY + 110 + 22 * lane2 - 10;
    edges.push({source: {x: x - 5, y: y + 10}, target: {x: x, y: y + 10}, color: trackID}); //right (elongate edge within node)
    arcs[2].push({ x: x, y: y, color: trackID}); //from right to up
    edges.push({source: {x: x + 10, y: y}, target: {x: x + 10, y: y2 + 20}, color: trackID}); //up
    arcs[1].push({ x: x, y: y2 + 20, color: trackID}); //from up to left
    edges.push({source: {x: x2 + 30, y: y2 + 10}, target: {x: x, y: y2 + 10}, color: trackID}); //left
    arcs[0].push({ x: x2 + 30, y: y2 + 20, color: trackID}); //from left to down
    edges.push({source: {x: x2 + 20, y: y3}, target: {x: x2 + 20, y: y2 + 20}, color: trackID}); //down
    arcs[3].push({ x: x2 + 30, y: y3, color: trackID}); //from down to right
    edges.push({source: {x: x2 + 30, y: y3 + 10}, target: {x: x2 + 35, y: y3 + 10}, color: trackID}); //left
  }
}

function getLane(order1, order2, lane1, lane2) {
  var i;
  var downLane = 0;
  var upLane = numberOfTracks;
  for (i = order1; i <= order2; i++) {
    if (maxLaneUsed[i] > downLane) downLane = maxLaneUsed[i];
    if (minLaneUsed[i] < upLane) upLane = minLaneUsed[i];
  }
  downLane++;
  upLane--;
  var scoreDown = (downLane - lane1) + (downLane - lane2);
  var scoreUp = (lane1 - upLane) + (lane2 - upLane);
  if (scoreDown <= scoreUp) {
    for (i = order1; i <= order2; i++) {
      maxLaneUsed[i] = downLane;
    }
    return downLane;
  } else {
    for (i = order1; i <= order2; i++) {
      minLaneUsed[i] = upLane;
    }
    return upLane;
  }
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
	  .attr("class", "link")
	  .attr("d", diagonal)
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
    .attr("class", "linkArc")
    .attr("d", topRightEdgeArc)
    //.style("stroke", function(d) { return color(d.color); })
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
    .attr("class", "linkArc")
    .attr("d", topLeftEdgeArc)
    //.style("stroke", function(d) { return color(d.color); })
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
    .attr("class", "linkArc")
    .attr("d", bottomRightEdgeArc)
    //.style("stroke", function(d) { return color(d.color); })
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
    .attr("class", "linkArc")
    .attr("d", bottomLeftEdgeArc)
    //.style("stroke", function(d) { return color(d.color); })
    .style("fill", function(d) { return color(d.color); })
    .attr("transform", function(d) {return "translate(" + d.x + ", " + d.y + ")"; });
}
