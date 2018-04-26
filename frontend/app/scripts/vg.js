/* eslint no-param-reassign: "off" */
/* eslint no-lonely-if: "off" */
/* eslint no-prototype-builtins: "off" */
/* eslint no-console: "off" */

/* eslint max-len: "off" */
/* eslint no-loop-func: "off" */
/* eslint no-unused-vars: "off" */

// extract info about nodes from vg-json
export function vgExtractNodes(vg) {
  const result = [];
  vg.node.forEach((node) => {
    result.push({ name: `${node.id}`, sequenceLength: node.sequence.length, seq: node.sequence });
    // console.log('name: ' + node.id + ', length: ' + node.sequence.length);
  });
  return result;
}

export function vgExtractTracks(vg) {
  const result = [];
  vg.path.forEach((path, index) => {
    const sequence = [];
    let isCompletelyReverse = true;
    path.mapping.forEach((pos) => {
      if ((pos.position.hasOwnProperty('is_reverse')) && (pos.position.is_reverse === true)) {
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
    if (path.hasOwnProperty('indexOfFirstBase')) track.indexOfFirstBase = Number(path.indexOfFirstBase);
    result.push(track);
  });
  return result;
}

export function vgExtractReads(myNodes, myTracks, myReads) {
  console.log(myReads);
  const extracted = [];

  const nodeNames = [];
  myNodes.forEach((node) => {
    nodeNames.push(parseInt(node.name, 10));
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
        if ((pos.position.hasOwnProperty('is_reverse')) && (pos.position.is_reverse === true)) {
          sequence.push(`-${pos.position.node_id}`);
          // console.log(`read ${i} is reverse`);
          edit.nodeName = `-${pos.position.node_id}`;
        } else {
          sequence.push(`${pos.position.node_id}`);
          edit.nodeName = pos.position.node_id.toString();
        }
        if (firstIndex < 0) {
          firstIndex = j;
          if (pos.position.hasOwnProperty('offset')) {
            offset = pos.position.offset;
          }
        }
        lastIndex = j;

        const mismatches = [];
        let posWithinNode = offset;
        pos.edit.forEach((element) => {
          if (element.hasOwnProperty('to_length') && !element.hasOwnProperty('from_length')) { // insertion
            // console.log(`found insertion at read ${i}, node ${j} = ${pos.position.node_id}`);
            mismatches.push({ type: 'insertion', pos: posWithinNode, seq: element.sequence });
          } else if (!element.hasOwnProperty('to_length') && element.hasOwnProperty('from_length')) { // deletion
            // console.log(`found deletion at read ${i}, node ${j} = ${pos.position.node_id}`);
            mismatches.push({ type: 'deletion', pos: posWithinNode, length: element.from_length });
          } else if (element.hasOwnProperty('sequence')) { // substitution
            // console.log(`found substitution at read ${i}, node ${j} = ${pos.position.node_id}`);
            if (element.sequence.length > 1) {
              console.log(`found substitution at read ${i}, node ${j} = ${pos.position.node_id}, seq = ${element.sequence}`);
            }
            mismatches.push({ type: 'substitution', pos: posWithinNode, seq: element.sequence });
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
      console.log(`read ${i} is empty`);
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
        track.finalNodeCoverLength += read.path.mapping[lastIndex].position.offset;
      }
      finalNodeEdit.forEach((edit) => {
        if (edit.hasOwnProperty('from_length')) {
          track.finalNodeCoverLength += edit.from_length;
        }
      });

      extracted.push(track);
    }
  }
  return extracted;
}
