/* eslint no-param-reassign: "off" */
/* eslint no-lonely-if: "off" */
/* eslint no-prototype-builtins: "off" */
/* eslint no-console: "off" */

/* eslint max-len: "off" */
/* eslint no-loop-func: "off" */
/* eslint no-unused-vars: "off" */

const config = {
  includeBadAlignFlag: true,
  showPositions: false,
  useRefSequence: true,
  useRefSequenceLong: false,
  readColors: 'mapping',
  readOpacity: 'mapq',
};

export function setIncludeBadAlign(inc) {
  config.includeBadAlignFlag = inc;
}

export function setShowPositions(show) {
  config.showPositions = show;
}

export function setUseRefSequence(ref) {
  config.useRefSequence = ref;
}

export function setUseRefSequenceLong(ref) {
  config.useRefSequenceLong = ref;
}

export function setReadColoring(rc) {
  config.readColors = rc;
}

export function setReadOpacity(ro) {
  config.readOpacity = ro;
}

export function paragraphExtractNodes(pg) {
  const result = [];
  const nodeIndexMap = {};
  pg.nodes.forEach((node, index) => {
    const newName = `${index}:${node.name}`;
    nodeIndexMap[node.name] = index;
    const translatedNode = {
      name: `${index}`,
      fullname: newName,
      originalname: node.name,
      preds: [],
      succs: [],
    };
    if (config.showPositions) {
      translatedNode.indexOfFirstBase = 0;
    }
    if (!node.sequence && node.reference) {
      const ref = node.reference.split(':')[0];
      const posArray = node.reference.split(':')[1];
      const start = parseInt(posArray.split('-')[0], 10);
      const end = parseInt(posArray.split('-')[1], 10);
      translatedNode.sequenceLength = end - start + 1;
      translatedNode.custom_stroke = '#2fd647';
      if (!config.useRefSequenceLong &&
          !(config.useRefSequence && translatedNode.sequenceLength < 15)) {
        translatedNode.seq = node.reference;
      } else {
        if (node.hasOwnProperty('reference_sequence')) {
          translatedNode.seq = node.reference_sequence;
        } else {
          translatedNode.seq = new Array(translatedNode.sequenceLength + 1).join('R');
        }
      }
      if (config.showPositions) {
        translatedNode.indexOfFirstBase = start;
      }
    } else if (node.sequence && !node.reference) {
      if (node.name === 'source' || node.name === 'sink') {
        translatedNode.seq = node.name;
        translatedNode.sequenceLength = node.sequence.length;
      } else {
        translatedNode.seq = node.sequence;
        translatedNode.sequenceLength = node.sequence.length;
      }
    } else {
      console.log('invalid node: ', node);
    }
    result[index] = translatedNode;
  });

  pg.edges.forEach((edge) => {
    result[nodeIndexMap[edge.from]].succs.push(result[nodeIndexMap[edge.to]].name);
    result[nodeIndexMap[edge.to]].preds.push(result[nodeIndexMap[edge.from]].name);
  });

  return result;
}

export function paragraphExtractTracks(pg, nodes) {
  const result = [];
  const nodeIndex = {};
  const nodeCounts = {};
  pg.nodes.forEach((node, index) => {
    nodeIndex[node.name] = index;
  });

  // create covering paths first. This is necessary in case we have paths below which don't overlap
  // with any other path
  const fadj = {};
  const edgesCovered = {};
  pg.edges.forEach((edge, index) => {
    if (fadj.hasOwnProperty(edge.from)) {
      fadj[edge.from].push(edge.to);
    } else {
      fadj[edge.from] = [edge.to];
    }
    edgesCovered[`${edge.from}_${edge.to}`] = false;
  });

  // add paths from start to end until all nodes are covered
  let pathAdded = true;
  while (pathAdded) {
    pathAdded = false;
    const current = ['0'];
    let thisNode = pg.nodes[0].name;
    while (thisNode) {
      let next;
      if (fadj[thisNode]) {
        Object.values(fadj[thisNode]).forEach((nodeName) => {
          if (!next || !edgesCovered[`${thisNode}_${nodeName}`]) {
            next = nodeName;
            if (!edgesCovered[`${thisNode}_${nodeName}`]) {
              pathAdded = true;
              edgesCovered[`${thisNode}_${nodeName}`] = true;
            }
          }
        });
        if (next) {
          current.push(`${nodeIndex[next]}`);
        }
      }
      thisNode = next;
    }

    if (pathAdded) {
      const track = {};
      track.id = result.length;
      track.sequence = current;
      track.name = `AUTO_${track.id}`;
      result.push(track);
    }
  }

  pg.paths.forEach((path, index) => {
    const sequence = [];
    const sequenceIx = [];
    path.nodes.forEach((nodename, i) => {
      const iNode = `${nodeIndex[nodename]}`;
      sequence.push(iNode);
      if (nodeCounts.hasOwnProperty(iNode)) {
        nodeCounts[iNode] += 1;
      } else {
        nodeCounts[iNode] = 1;
      }
    });
    const track = {};
    track.id = result.length;
    track.sequence = sequence;
    if (track.sequence.length === 1 && nodes[track.sequence[0]].preds.length === 1 && nodes[track.sequence[0]].succs.length === 1) {
      track.sequence.unshift(nodes[track.sequence[0]].preds[0]);
      track.sequence.push(nodes[track.sequence[1]].succs[0]);
    }

    track.name = path.path_id;
    if (config.showPositions &&
        nodes[Math.abs(sequence[0])].hasOwnProperty('indexOfFirstBase')) {
      track.indexOfFirstBase = nodes[Math.abs(sequence[0])].indexOfFirstBase;
    }
    result.push(track);
  });
  return result;
}

function decomposeCigar(cigar) {
  const ops = [];
  let qpos = 0;
  let rpos = 0;
  while (cigar !== '') {
    let count = '';
    while (cigar !== '' && cigar[0] >= '0' && cigar[0] <= '9') {
      count += cigar[0];
      cigar = cigar.substr(1);
    }
    count = parseInt(count, 10);
    if (isNaN(count)) {
      console.log(`invalid cigar: ${cigar}`);
      break;
    }
    if (cigar[0] === 'S' ||
        cigar[0] === 'I' ||
        cigar[0] === 'D' ||
        cigar[0] === 'X' ||
        cigar[0] === 'M' ||
        cigar[0] === '=' ||
        cigar[0] === 'N') {
      const thisop = {
        op: cigar[0],
        length: count,
        qpos,
        rpos,
      };
      const op = cigar[0];
      ops.push(thisop);
      if (op === 'S' ||
        op === 'I' ||
        op === 'X' ||
        op === 'M' ||
        op === '=' ||
        op === 'N'
      ) {
        qpos += count;
      }

      if (op === 'D' ||
        op === 'X' ||
        op === 'M' ||
        op === '=' ||
        op === 'N'
      ) {
        rpos += count;
      }

      cigar = cigar.substr(1);
    } else {
      console.log(`invalid cigar: ${cigar}`);
      break;
    }
  }
  return ops;
}

function decomposeGraphCigar(nodes, query, graphcigar) {
  const result = [];
  let qpos = 0;
  while (graphcigar !== '') {
    let gnodestr = '';
    while (graphcigar !== '' && graphcigar[0] !== '[') {
      gnodestr += graphcigar[0];
      graphcigar = graphcigar.substr(1);
    }
    const gnodeid = parseInt(gnodestr, 10);
    if (graphcigar[0] !== '[' || isNaN(gnodeid) || gnodeid >= nodes.length) {
      console.log(`Invalid graph cigar string: ${graphcigar}`);
      break;
    }
    graphcigar = graphcigar.substr(1);
    let nodecigar = '';
    while (graphcigar !== '' && graphcigar[0] !== ']') {
      nodecigar += graphcigar[0];
      graphcigar = graphcigar.substr(1);
    }
    if (graphcigar[0] !== ']' || nodecigar === '') {
      console.log(`Invalid graph cigar string: ${graphcigar}`);
      break;
    }
    graphcigar = graphcigar.substr(1);
    const ops = decomposeCigar(nodecigar);
    if (ops.length === 0) {
      console.log(`Invalid graph cigar string: ${graphcigar}`);
      break;
    }
    let scleft = 0;
    let scright = 0;
    if (ops[0].op === 'S') { scleft = ops[0].length; }
    if (ops.length > 1 && ops[ops.length - 1].op === 'S') { scright = ops[ops.length - 1].length; }
    let refspan = 0;
    let queryspan = 0;
    ops.forEach((op) => {
      if (op.op === 'S' ||
          op.op === 'I' ||
          op.op === 'X' ||
          op.op === 'M' ||
          op.op === '=' ||
          op.op === 'N'
      ) {
        queryspan += op.length;
        op.qseq = query.substr(op.qpos, op.length);
      }

      if (op.op === 'D' ||
          op.op === 'X' ||
          op.op === 'M' ||
          op.op === '=' ||
          op.op === 'N'
      ) {
        refspan += op.length;
      }
      op.qpos += qpos;
    });
    result.push({
      node: gnodeid,
      nodename: nodes[gnodeid].name,
      cigar: nodecigar,
      cigarOps: ops,
      softClipLeft: scleft,
      softClipRight: scright,
      refSpan: refspan,
      querySpan: queryspan,
    });
    qpos += queryspan;
  }
  return result;
}

export function paragraphExtractReads(pg) {
  const result = [];
  if (!pg.alignments) {
    return result;
  }
  const nodeIndex = {};
  pg.nodes.forEach((node, index) => {
    nodeIndex[node.name] = `${index}`;
  });

  pg.alignments.forEach((read, index) => {
    if (!config.includeBadAlignFlag && read.graphMappingStatus !== 'MAPPED') {
      return;
    }
    const gcOps = decomposeGraphCigar(pg.nodes, read.bases, read.graphCigar);
    if (gcOps.length === 0) {
      console.log(`Empty mapping for read ${read}`);
      return;
    }
    const sequence = [];
    const sequenceNew = [];
    gcOps.forEach((nodeOp, i) => {
      sequence.push(nodeIndex[nodeOp.nodename]);
      const mismatches = [];
      nodeOp.cigarOps.forEach((op) => {
        if (op.op === 'I' || op.op === 'S') {
          mismatches.push({
            type: 'insertion',
            pos: op.rpos + (i === 0 ? read.graphPos : 0),
            seq: op.qseq ? op.qseq : 'I',
          });
        } else if (op.op === 'X') {
          mismatches.push({
            type: 'substitution',
            pos: op.rpos + (i === 0 ? read.graphPos : 0),
            seq: op.qseq ? op.qseq : (new Array(op.length + 1)).join('X'),
          });
        } else if (op.op === 'D') {
          mismatches.push({
            type: 'deletion',
            pos: op.rpos + (i === 0 ? read.graphPos : 0),
            length: op.length,
          });
        }
      });
      sequenceNew.push({
        nodeName: nodeIndex[nodeOp.nodename],
        mismatches,
      });
    });
    const track = {};
    track.id = pg.nodes.length + index;
    track.sequence = sequence;
    track.sequenceNew = sequenceNew;
    track.type = 'read';
    track.name = read.fragmentId;
    track.firstNodeOffset = (read.graphPos || 0);
    track.finalNodeCoverLength = gcOps[gcOps.length - 1].refSpan;
    if (sequence.length === 1) {
      track.finalNodeCoverLength += track.firstNodeOffset;
    }
    if (config.readColors[0] === '#') {
      track.custom_color = config.readColors;
    } else if (config.readColors === 'strand') {
      track.is_reverse = read.isGraphReverseStrand;
    } else if (config.readColors === 'mapping') {
      if (read.graphMappingStatus === 'MAPPED') {
        track.custom_color = '#47d15a';
      } else if (read.error === 'nonuniq') {
        track.custom_color = '#ff7b68';
      } else if (read.error === 'bad_align') {
        track.custom_color = '#988965';
      } else if (read.error.startsWith('kmer')) {
        track.custom_color = '#88217d';
      } else {
        track.custom_color = '#a6a6a6';
      }
    }
    if (config.readOpacity) {
      const readpq = Math.min(60, Math.max(0, Number(read[config.readOpacity])));
      track.opacity = 0.2 + (0.8 * readpq / 60.0);
    }
    track.fullRecord = read;
    track.clickTarget = '#readinfo';
    result.push(track);
  });
  return result;
}
