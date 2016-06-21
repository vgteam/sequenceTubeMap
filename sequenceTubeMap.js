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
var bestScore; //todo: get rid of this as global variable

function createTubeMap(svg, inputNodes, inputTracks) {
  svg.selectAll("*").remove();
  edges = [];
  arcs = [[], [], [], []];
  maxLaneUsed = []; //remembers extra lanes that are being used by inversions, so that overlapping inversion doesn't use the same lane
  minLaneUsed = [];

  numberOfNodes = inputNodes.length;
  numberOfTracks = inputTracks.length;
  nodeMap = generateNodeMap(inputNodes);
  generateNodeSuccessors(inputNodes, inputTracks);
  generateNodeOrder(inputNodes, inputTracks);
  generateNodeDegree(inputNodes, inputTracks);
  generateLaneAssignment(inputNodes, inputTracks);
  generateNodeXCoords(inputNodes, inputTracks);
  generateNodeYCoords(inputNodes, inputTracks);
  generateEdges(inputNodes, inputTracks, edges);

  console.log(inputTracks);
  console.log(inputNodes);
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

function generateNodeSuccessors2(nodes, tracks) { //OLD VERSION: the names of the nodes coming directly after the current node
  nodes.forEach(function(node) {
    node.successors = [];
  });

  tracks.forEach(function(track) {
    for(var i = 0; i < track.sequence.length - 1; i++) {
      var currentNode = nodes[nodeMap.get(track.sequence[i])];
      //console.log("davor: " + currentNode.successors.indexOf(track.sequence[i + 1]));
      if (currentNode.successors.indexOf(track.sequence[i + 1]) === -1) {
        //console.log(currentNode.successors.indexOf(track.sequence[i + 1]));
        currentNode.successors.push(track.sequence[i + 1]);
        //console.log("pushing " + track.sequence[i+1] + " to node " + currentNode.name);
      }
    }
  });
}

function generateNodeSuccessors(nodes, tracks) { //the names of the nodes coming directly after the current node
  var i;
  var currentNode;

  nodes.forEach(function(node) {
    node.successors = [];
  });

  tracks.forEach(function(track) {
    for(i = 0; i < track.sequence.length - 1; i++) {
      if ((track.sequence[i].charAt(0) !== '-') && (track.sequence[i + 1].charAt(0) !== '-')) { //if both nodes are not inverted
        currentNode = nodes[nodeMap.get(track.sequence[i])];
        if (currentNode.successors.indexOf(track.sequence[i + 1]) === -1) { //if next node in sequence is not yet in successors[], add it
          currentNode.successors.push(track.sequence[i + 1]);
        }
      }
      if ((track.sequence[i].charAt(0) === '-') && (track.sequence[i + 1].charAt(0) === '-')) { //if both nodes are inverted
        currentNode = nodes[nodeMap.get(track.sequence[i + 1].substr(1))];
        if (currentNode.successors.indexOf(track.sequence[i].substr(1)) === -1) { //if next node in sequence is not yet in successors[], add it
          currentNode.successors.push(track.sequence[i].substr(1));
        }
      }
    }
  });
}

function generateNodeOrderALT(nodes, tracks) { //OLD VERSION
  tracks.forEach(function(track) {
    var currentOrder = 0;
    track.sequence.forEach(function(nodeName) {
      var currentNode = nodes[nodeMap.get(nodeName)];
      //console.log("order(" + currentNode.name + "): ");
      if (currentNode.hasOwnProperty("order")) {
        if (currentNode.order < currentOrder) {
          //currentNode.order = currentOrder;
          increaseOrderForSuccessors(nodes, currentNode, currentOrder);
          currentOrder++;
        } else {
          currentOrder = currentNode.order + 1;
        }
      } else {
        currentNode.order = currentOrder;
        //console.log("(basic) order(" + currentNode.name + ") = " + currentOrder);
        currentOrder++;
      }
    });
  });
}

//TODO: cannot handle reverse ordering and repeats of nodes yet
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
        if (nodes[nodeMap.get(modifiedSequence[rightIndex])].order > nodes[nodeMap.get(modifiedSequence[leftIndex])].order) {
          currentOrder = nodes[nodeMap.get(modifiedSequence[leftIndex])].order + 1;
          for (j = leftIndex + 1; j < rightIndex; j++) {
            nodes[nodeMap.get(modifiedSequence[j])].order = currentOrder;
            currentOrder++;
          }
          if (nodes[nodeMap.get(modifiedSequence[rightIndex])].order < currentOrder) {
            increaseOrderForSuccessors(nodes, nodes[nodeMap.get(modifiedSequence[rightIndex])], currentOrder);
          }
        }
        //TODO: repeats and reverse orderings

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
  if ((currentNode.hasOwnProperty("order")) && (currentNode.order < order)) {
    currentNode.order = order;
    //console.log("order(" + currentNode.name + ") = " + order);
    currentNode.successors.forEach(function(successor) {
      increaseOrderForSuccessors(nodes, nodes[nodeMap.get(successor)], order + 1);
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
  //get order number of the last node
  var maxOrder = -1;
  nodes.forEach(function(node) {
    if ((node.hasOwnProperty("order")) && (node.order > maxOrder)) maxOrder = node.order;
  });

  //assign preliminary lane numbers to each track (-1 for track does not exist at thís order number, trackID for all other order numbers)
  var empty = [];
  tracks.forEach(function(track, trackNo) {
    track.lanes = [];
    var modifiedSequence = uninvert(track.sequence);
    var firstNode = nodes[nodeMap.get(modifiedSequence[0])];
    var lastNode = nodes[nodeMap.get(modifiedSequence[modifiedSequence.length - 1])];
    //var firstNode = nodes[nodeMap.get(track.sequence[0])];
    //var lastNode = nodes[nodeMap.get(track.sequence[track.sequence.length - 1])];
    for (var i = 0; i <= maxOrder; i++) {
      if ((i < firstNode.order) || (i > lastNode.order)) track.lanes.push(-1);
      else track.lanes.push(trackNo);
    }
    empty.push(true);
  });

  for (var currentOrder = 0; currentOrder <= maxOrder; currentOrder++) {
  //for (var currentOrder = 0; currentOrder <= 0; currentOrder++) {
    var currentOrderNodes = nodes.filter(function (node) {
      return node.order == currentOrder;
    });
    currentOrderNodes.sort(compareNodesByDegree).reverse();
    var sortMe = [];
    var partOfANode = [];
    currentOrderNodes.forEach(function(node) {
      sortMe.push(node.tracks);
      node.tracks.forEach(function(trackName) {
        partOfANode.push(trackName);
      });
    });
    tracks.forEach(function(track) {
      if ((track.lanes[currentOrder] != -1) && (partOfANode.indexOf(track.id) === -1)) sortMe.push([track.id]);
    });
    //console.log(sortMe);
    bestScore = Number.MAX_SAFE_INTEGER;
    generateSingleLaneAssignment(sortMe, empty, [], tracks, currentOrder, Number.MAX_SAFE_INTEGER);
    //console.log(tracks);
  }
}

function generateSingleLaneAssignment(sortMe, empty, sorted, tracks, currentOrder) {
  var i;
  var j;

  //var score = Number.MAX_SAFE_INTEGER;
  if (sortMe.length > sorted.length) {
    for (i = 0; i <= numberOfTracks - sortMe[sorted.length].length; i++) {
      positionIsPossible = true;
      for (j = i; j < i + sortMe[sorted.length].length; j++) {
        if (!empty[j]) {
          positionIsPossible = false;
          break;
        }
      }
      if (positionIsPossible) {
        var newSorted = sorted.slice(0);
        newSorted.push(i);
        newEmpty = empty.slice(0);
        for (j = i; j < i + sortMe[sorted.length].length; j++) {
          newEmpty[j] = false;
        }
        generateSingleLaneAssignment(sortMe, newEmpty, newSorted, tracks, currentOrder);
      }
    }
  } else { //end recursion
    //calculate score
    var score = 0;
    //TODO: Start bei currentOrder = 0;
    for (i = 0; i < sorted.length; i++) {
      var prevPos = [];
      for (j = 0; j < sortMe[i].length; j++) {
        if (currentOrder > 0) {
          prevPos.push(tracks[sortMe[i][j]].lanes[currentOrder - 1]);
        } else {
          prevPos.push(sortMe[i][j]);
        }
      }
      prevPos.sort();
      prevPos.forEach(function(pos, index) {
        score += Math.abs(pos - (sorted[i] + index));
      });
    }

    //if new minimum, set lane assignment
    if (score < bestScore) {
      bestScore = score;
      //console.log("new best score: " + sortMe + "; " + sorted + "; " + score);
      for (i = 0; i < sorted.length; i++) {
        //var prevPos = [];
        for (j = 0; j < sortMe[i].length; j++) {
          //if (currentOrder > 0) {
          //  prevPos.push(tracks[sortMe[i][j]].lanes[currentOrder - 1]);
          //} else {
          //  prevPos.push(tracks[sortMe[i][j]]);
          //}
          tracks[sortMe[i][j]].lanes[currentOrder] = sorted[i] + j;
        }
        //prevPos.sort();
        //prevPos.forEach(function(pos, index) {
          //score += Math.abs(pos - (sorted[i] + index));
          //tracks[sortMe[i][j]].lanes[currentOrder] = (sorted[i] + index);
          //tracks[sortMe[i][j]].lanes[currentOrder] = (sorted[i] + index);
        //});
      }
    }
  }
}

function generateNodeYCoords(nodes, globalTracks) {
  nodes.forEach(function(node) {
    if (node.hasOwnProperty("order")) {
      var minLane = Number.MAX_SAFE_INTEGER;
      node.tracks.forEach(function(track) {
        globalTracks.forEach(function(globalTrack) {
          if ((globalTrack.id === track) && (globalTrack.lanes[node.order] < minLane)) {
            minLane = globalTrack.lanes[node.order];
          }
        });
      });
      node.yCoord = minLane;
      node.y = offsetY + 110 + 22 * minLane;
    }
  });
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

function generateEdges(nodes, tracks, edges) {
  //get order number of the last node
  var maxOrder = -1;
  nodes.forEach(function(node) {
    if ((node.hasOwnProperty("order")) && (node.order > maxOrder)) maxOrder = node.order;
  });

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

  //init maxLaneUsed and minLaneUsed
  for (var i = 0; i <= maxOrder; i++) maxLaneUsed[i] = tracks.length - 1;
  for (i = 0; i <= maxOrder; i++) minLaneUsed[i] = 0;

  generateStartingEdges(nodes, tracks, edges);
  generateEdgesWithinNodes(nodes, tracks, edges, orderStartX, orderEndX, maxOrder);
  generateEdgesBetweenNodes(nodes, tracks, edges, orderStartX, orderEndX);
  generateEndingEdges(nodes, tracks, edges);
}

function generateStartingEdges(nodes, tracks, edges) {
  //TODO: add changes caused by reversals of next node
  tracks.forEach(function(track, trackId) {
    if (track.sequence[0].charAt(0) === '-') { //The track starts with an inversed node
      //TODO: ADD STUFF HERE
    } else { //The track starts with a forward node
      var node = nodes[nodeMap.get(track.sequence[0])];
      var xStart = node.x - 20;
      var xEnd = node.x + 20 * (node.width - 1);
      var y = offsetY + 110 + 22 * track.lanes[node.order];
      edges.push({source: {x: xStart, y: y}, target: {x: xEnd, y: y}, color: trackId});
    }
  });
}

function generateEndingEdges(nodes, tracks, edges) {
  //TODO: add changes caused by reversals of next node
  tracks.forEach(function(track, trackId) {
    if (track.sequence[track.sequence.length - 1].charAt(0) === '-') { //The track ends with an inversed node
      //TODO: ADD STUFF HERE
    } else { //The track endss with a forward node
      var node = nodes[nodeMap.get(track.sequence[track.sequence.length - 1])];
      var xStart = node.x + 20 * (node.width - 1);
      var xEnd = xStart + 20;
      var y = offsetY + 110 + 22 * track.lanes[node.order];
      edges.push({source: {x: xStart, y: y}, target: {x: xEnd, y: y}, color: trackId});
    }
  });
}

function generateEdgesWithinNodes(nodes, tracks, edges, orderStartX, orderEndX, maxOrder) {
  tracks.forEach(function(track, trackId) {
    var currentOrder = 0;
    while (track.lanes[currentOrder] === -1) currentOrder++;

    while((currentOrder <= maxOrder) && (track.lanes[currentOrder] != -1)) {
      xStart = orderStartX[currentOrder];
      xEnd = orderEndX[currentOrder];
      y = offsetY + 110 + 22 * track.lanes[currentOrder];
      edges.push({source: {x: xStart, y: y}, target: {x: xEnd, y: y}, color: trackId});
      currentOrder++;
    }
  });
}

function generateEdgesBetweenNodes(nodes, tracks, edges, orderStartX, orderEndX) {
  var node1;
  var node2;
  var lane;

  tracks.forEach(function(track, trackId) {
    for (var i = 0; i < track.sequence.length - 1; i++) {
      if (track.sequence[i].charAt(0) !== '-') {
        if (track.sequence[i + 1].charAt(0) !== '-') {
          //standard forward link
          generateForwardConnection(track, nodes[nodeMap.get(track.sequence[i])].order, nodes[nodeMap.get(track.sequence[i + 1])].order, orderStartX, orderEndX);
        } else {
          //inversion link type 1
          node1 = nodes[nodeMap.get(track.sequence[i])];
          node2 = nodes[nodeMap.get(track.sequence[i + 1].substring(1))];
          if (node1.order > node2.order) {
            temp = node1;
            node1 = node2;
            node2 = temp;
          }
          lane = getLane(node1.order + 1, node2.order, track.lanes[node1.order], track.lanes[node2.order]);
          if (lane >= numberOfTracks) generateInversionConnectionType1Down(track, node1, node2, orderStartX, orderEndX, lane);
          else generateInversionConnectionType1Up(track, node1, node2, orderStartX, orderEndX, lane);
        }
      } else {
        if (track.sequence[i + 1].charAt(0) === '-') {
          //standard backward link -> same as forward link, only have to switch the 2 nodes
          //console.log(track.sequence2[i + 1].substring(1));
          node1 = nodes[nodeMap.get(track.sequence[i + 1].substring(1))];
          node2 = nodes[nodeMap.get(track.sequence[i].substring(1))];
          generateForwardConnection(track, node1.order, node2.order, orderStartX, orderEndX);
        } else {
          //inversion link type 2
          node2 = nodes[nodeMap.get(track.sequence[i + 1])];
          node1 = nodes[nodeMap.get(track.sequence[i].substring(1))];
          if (node1.order > node2.order) {
            temp = node1;
            node1 = node2;
            node2 = temp;
          }
          lane = getLane(node1.order, node2.order - 1, track.lanes[node1.order], track.lanes[node2.order]);
          if (lane >= numberOfTracks) generateInversionConnectionType2Down(track, node1, node2, orderStartX, orderEndX, lane);
          else generateInversionConnectionType2Up(track, node1, node2, orderStartX, orderEndX, lane);
        }
      }
    }
  });
}

function generateForwardConnection(track, startingOrder, endingOrder, orderStartX, orderEndX) {
  for (var i = startingOrder; i < endingOrder; i++) {
    xStart = orderEndX[i];
    xEnd = orderStartX[i + 1];
    y = offsetY + 110 + 22 * track.lanes[i];
    yEnd = offsetY + 110 + 22 * track.lanes[i +1];
    edges.push({source: {x: xStart, y: y}, target: {x: xEnd, y: yEnd}, color: track.id});
  }
}

function generateInversionConnectionType1Down(track, node1, node2, orderStartX, orderEndX, lane) {
  var x = orderEndX[node1.order] + 5;
  var y = offsetY + 110 + 22 * track.lanes[node1.order] + 10;
  var y2 = offsetY + 110 + 22 * lane - 10;
  var x2 = orderEndX[node2.order] + 5;
  var y3 = offsetY + 110 + 22 * track.lanes[node2.order] + 10;

  edges.push({source: {x: x - 5, y: y - 10}, target: {x: x, y: y - 10}, color: track.id}); //right (elongate edge within node)

  arcs[1].push({ x: x, y: y, color: track.id}); //from right to down

  edges.push({source: {x: x + 10, y: y}, target: {x: x + 10, y: y2}, color: track.id}); //down

  arcs[3].push({ x: x + 20, y: y2, color: track.id}); //from down to right

  edges.push({source: {x: x + 20, y: y2 + 10}, target: {x: x2, y: y2 + 10}, color: track.id}); //right

  arcs[2].push({ x: x2, y: y2, color: track.id}); //from right to up

  edges.push({source: {x: x2 + 10, y: y3}, target: {x: x2 + 10, y: y2}, color: track.id}); //up

  arcs[1].push({ x: x2, y: y3, color: track.id}); //from up to left

  edges.push({source: {x: x2 - 5, y: y3 - 10}, target: {x: x2, y: y3 -10}, color: track.id}); //left (elongate edge within node)
}

function generateInversionConnectionType1Up(track, node1, node2, orderStartX, orderEndX, lane) {
  var x = orderEndX[node1.order] + 5;
  var y = offsetY + 110 + 22 * track.lanes[node1.order] - 10;
  var y2 = offsetY + 110 + 22 * lane - 10;
  var x2 = orderEndX[node2.order] + 5;
  var y3 = offsetY + 110 + 22 * track.lanes[node2.order] - 10;

  edges.push({source: {x: x - 5, y: y + 10}, target: {x: x, y: y + 10}, color: track.id}); //right (elongate edge within node)

  arcs[2].push({ x: x, y: y, color: track.id}); //from right to up

  edges.push({source: {x: x + 10, y: y}, target: {x: x + 10, y: y2 + 20}, color: track.id}); //up

  arcs[0].push({ x: x + 20, y: y2 + 20, color: track.id}); //from up to right

  edges.push({source: {x: x + 20, y: y2 + 10}, target: {x: x2, y: y2 + 10}, color: track.id}); //right

  arcs[1].push({ x: x2, y: y2 + 20, color: track.id}); //from right to down

  edges.push({source: {x: x2 + 10, y: y3}, target: {x: x2 + 10, y: y2 + 20}, color: track.id}); //down

  arcs[2].push({ x: x2, y: y3, color: track.id}); //from down to left

  edges.push({source: {x: x2 - 5, y: y3 + 10}, target: {x: x2, y: y3 + 10}, color: track.id}); //left (elongate edge within node)
}

function generateInversionConnectionType2Down(track, node1, node2, orderStartX, orderEndX, lane) {
  var x = orderStartX[node1.order] - 35;
  var y = offsetY + 110 + 22 * track.lanes[node1.order] + 10;
  var y2 = offsetY + 110 + 22 * lane - 10;
  var x2 = orderStartX[node2.order] - 35;
  var y3 = offsetY + 110 + 22 * track.lanes[node2.order] + 10;

  edges.push({source: {x: x + 30, y: y - 10}, target: {x: x + 35, y: y - 10}, color: track.id}); //left

  arcs[0].push({ x: x + 30, y: y, color: track.id}); //from left to down

  edges.push({source: {x: x + 20, y: y}, target: {x: x + 20, y: y2}, color: track.id}); //down

  arcs[3].push({ x: x + 30, y: y2, color: track.id}); //from down to right

  edges.push({source: {x: x + 30, y: y2 + 10}, target: {x: x2 + 10, y: y2 + 10}, color: track.id}); //right

  arcs[2].push({ x: x2 + 10, y: y2, color: track.id}); //from right to up

  edges.push({source: {x: x2 + 20, y: y3}, target: {x: x2 + 20, y: y2}, color: track.id}); //up

  arcs[0].push({ x: x2 + 30, y: y3, color: track.id}); //from up to right

  edges.push({source: {x: x2 + 30, y: y3 - 10}, target: {x: x2 + 35, y: y3 - 10}, color: track.id}); //right
}

function generateInversionConnectionType2Up(track, node1, node2, orderStartX, orderEndX, lane) {
  var x = orderStartX[node1.order] - 35;
  var y = offsetY + 110 + 22 * track.lanes[node1.order] - 10;
  var y2 = offsetY + 110 + 22 * lane - 10;
  var x2 = orderStartX[node2.order] - 35;
  var y3 = offsetY + 110 + 22 * track.lanes[node2.order] - 10;

  edges.push({source: {x: x + 30, y: y + 10}, target: {x: x + 35, y: y + 10}, color: track.id}); //left

  arcs[3].push({ x: x + 30, y: y, color: track.id}); //from left to up

  edges.push({source: {x: x + 20, y: y}, target: {x: x + 20, y: y2 + 20}, color: track.id}); //up

  arcs[0].push({ x: x + 30, y: y2 + 20, color: track.id}); //from up to right

  edges.push({source: {x: x + 30, y: y2 + 10}, target: {x: x2 + 10, y: y2 + 10}, color: track.id}); //right

  arcs[1].push({ x: x2 + 10, y: y2 + 20, color: track.id}); //from right to down

  edges.push({source: {x: x2 + 20, y: y3}, target: {x: x2 + 20, y: y2 + 20}, color: track.id}); //down

  arcs[3].push({ x: x2 + 30, y: y3, color: track.id}); //from down to right

  edges.push({source: {x: x2 + 30, y: y3 + 10}, target: {x: x2 + 35, y: y3 + 10}, color: track.id}); //right
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
