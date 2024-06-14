export const inputNodes = [
  { sourceTrackID: 0, name: "A", width: 1, seq: "A" },
  { sourceTrackID: 0, name: "B", width: 2, seq: "AA" },
  { sourceTrackID: 0, name: "C", width: 1, seq: "T" },
  { sourceTrackID: 0, name: "D", width: 3, seq: "GGG" },
  { sourceTrackID: 0, name: "E", width: 1, seq: "A" },
  { sourceTrackID: 0, name: "F", width: 1, seq: "G" },
  { sourceTrackID: 0, name: "G", width: 3, seq: "ATG" },
  { sourceTrackID: 0, name: "H", width: 1, seq: "T" },
  { sourceTrackID: 0, name: "I", width: 1, seq: "C" },
  { sourceTrackID: 0, name: "J", width: 3, seq: "TAA" },
  { sourceTrackID: 0, name: "K", width: 1, seq: "C" },
  { sourceTrackID: 0, name: "L", width: 1, seq: "G" },
  { sourceTrackID: 0, name: "M", width: 1, seq: "C" },
  { sourceTrackID: 0, name: "N", width: 1, seq: "A" },
  { sourceTrackID: 0, name: "O", width: 1, seq: "C" },
  { sourceTrackID: 0, name: "P", width: 2, seq: "AA" },
  { sourceTrackID: 0, name: "Q", width: 1, seq: "T" },
  { sourceTrackID: 0, name: "R", width: 3, seq: "CG" },
  { sourceTrackID: 0, name: "S", width: 2, seq: "GA" },
  { sourceTrackID: 0, name: "T", width: 3, seq: "GTT" },
  { sourceTrackID: 0, name: "U", width: 1, seq: "A" },
  { sourceTrackID: 0, name: "V", width: 1, seq: "G" },
  { sourceTrackID: 0, name: "W", width: 8, seq: "TTGTCTCT" },
  { sourceTrackID: 0, name: "X", width: 1, seq: "T" },
  { sourceTrackID: 0, name: "Y", width: 1, seq: "C" },
  { sourceTrackID: 0, name: "Z", width: 1, seq: "A" },
  { sourceTrackID: 0, name: "AA", width: 3, seq: "CGA" },
  { sourceTrackID: 0, name: "AB", width: 1, seq: "T" },
  { sourceTrackID: 0, name: "AC", width: 1, seq: "G" },
  { sourceTrackID: 0, name: "AD", width: 1, seq: "A" },
  { sourceTrackID: 0, name: "AE", width: 1, seq: "G" },
  { sourceTrackID: 0, name: "AF", width: 1, seq: "T" },
  { sourceTrackID: 0, name: "AG", width: 3, seq: "GTG" },
];

// prettier-ignore
export const inputTracks1 = [
  { id: 0, sourceTrackID: 0, name: 'Track A', indexOfFirstBase: 1, sequence: ['A', 'B', 'D', 'E', 'G', 'H', 'J', 'K', 'M', 'N', 'P', 'Q', 'S', 'U', 'W', 'X', 'Z', 'AA', 'AE', 'AG'], freq: 3000 },
  { id: 1, sourceTrackID: 0, name: 'Track B', sequence: ['A', 'B', 'D', 'E', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'S', 'U', 'AA', 'AE', 'AG'], freq: 15 },
  { id: 2, sourceTrackID: 0, name: 'Track C', sequence: ['A', 'B', 'D', 'E', 'G', 'H', 'J', 'K', 'M', 'N', 'P', 'Q', 'S', 'V', 'W', 'X', 'Z', 'AB', 'AE', 'AG'], freq: 300 },
  { id: 3, sourceTrackID: 0, name: 'Track D', sequence: ['B', 'C', 'D', 'E', 'G', 'H', 'J', 'L', 'M', 'N', 'P', 'R', 'S', 'U', 'W', 'Y', 'Z', 'AC', 'AF', 'AG'], freq: 4 },
  { id: 4, sourceTrackID: 0, name: 'Track E', sequence: ['B', 'D', 'F', 'G', 'I', 'J', 'L', 'M', 'O', 'P', 'Q', 'S', 'T', 'V', 'W', 'Y', 'Z', 'AD', 'AF', 'AG'], freq: 2 },
];

// prettier-ignore
export const inputTracks2 = [
  { id: 0, sourceTrackID: 0, name: 'Track A', indexOfFirstBase: 1, sequence: ['A', 'B', 'D', 'E', 'G', 'H', 'J', 'K', 'M', 'N', 'P', 'Q', 'S', 'U', 'W', 'X', 'Z', 'AA', 'AG'], freq: 4000 },
  { id: 1, sourceTrackID: 0, name: 'Track B', sequence: ['A', 'B', 'D', 'E', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'S', 'U', 'AA', 'AG'], freq: 150 },
  { id: 2, sourceTrackID: 0, name: 'Track C', sequence: ['A', 'B', 'D', 'F', '-H', '-G', '-E', 'J', 'K', 'M', 'N', 'P', 'Q', 'S', 'AB', 'V', 'W', 'X', '-AA', '-Z', 'AG'], freq: 30 },
  { id: 3, sourceTrackID: 0, name: 'Track D', sequence: ['B', 'C', 'D', 'E', 'G', 'H', 'J', 'L', '-P', '-N', '-M', 'R', 'S', 'U', 'W', 'Y', 'Z', 'AC', 'AF', 'AG'], freq: 10 },
  { id: 4, sourceTrackID: 0, name: 'Track E', sequence: ['B', 'D', 'F', '-J', '-I', '-G', 'L', 'M', 'O', 'P', 'Q', 'S', 'T', 'V', 'W', 'Y', 'Z', 'AD', 'AF', 'AG'], freq: 3 },
];

// prettier-ignore
export const inputTracks3 = [
  { id: 0, sourceTrackID: 0, name: 'Track A', indexOfFirstBase: 1, sequence: ['A', 'B', 'D', 'E', 'G', 'H', 'J', 'K', 'M', 'N', 'P', 'Q', 'S', 'U', 'W', 'X', 'Z', 'AA', 'AE', 'AG'] },
  { id: 1, sourceTrackID: 0, name: 'Track B', sequence: ['A', 'B', 'D', 'E', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'S', 'U', 'AA', 'AE', 'AG'] },
  { id: 2, sourceTrackID: 0, name: 'Track C', sequence: ['A', 'B', 'D', '-H', 'G', '-E', 'J', 'K', 'M', 'N', 'P', 'Q', 'S', 'AB', 'V', 'W', 'X', '-AE', '-AA', '-Z', 'AG'] },
  { id: 3, sourceTrackID: 0, name: 'Track D', sequence: ['B', 'C', 'D', 'E', 'G', 'H', 'J', 'L', '-P', '-N', '-M', 'R', 'S', 'U', 'W', 'Y', 'Z', 'AC', 'AF', 'AG'] },
  { id: 4, sourceTrackID: 0, name: 'Track E', sequence: ['B', 'D', 'F', 'G', 'I', 'J', 'L', 'M', 'O', 'P', 'Q', 'S', 'T', 'V', 'W', 'Y', 'Z', 'AD', 'AF', 'AG'] },
];

// prettier-ignore
export const inputTracks4 = [
  { id: 0, sourceTrackID: 0, name: 'Track A', indexOfFirstBase: 1, sequence: ['A', 'B', 'D', 'E', 'G', 'H', 'J', 'K', 'M', 'N', 'P', 'Q', 'S', 'U', 'W', 'X', 'Z', 'AA', 'AE', 'AG'] },
  { id: 1, sourceTrackID: 0, name: 'Track B', sequence: ['A', 'B', 'D', 'E', 'G', 'H', 'J', 'K', 'M', 'J', 'N', 'Q', 'S', 'U', 'AA', 'AE', 'AG'] },
  { id: 2, sourceTrackID: 0, name: 'Track C', sequence: ['A', 'B', 'D', 'E', 'G', 'H', 'J', 'K', 'M', 'N', 'P', 'Q', 'S', 'V', 'W', 'X', 'Z', 'AB', 'AE', 'AG'] },
  { id: 3, sourceTrackID: 0, name: 'Track D', sequence: ['B', 'C', 'D', 'E', 'D', 'E', 'G', 'H', 'J', 'L', 'M', 'N', 'P', 'R', 'S', 'U', 'W', 'Y', 'Z', 'AC', 'AF', 'AG'] },
  { id: 4, sourceTrackID: 0, name: 'Track E', sequence: ['B', 'D', 'F', 'G', 'I', 'J', 'L', 'M', 'O', 'P', 'Q', 'S', 'T', 'V', 'W', 'Y', 'Z', 'AD', 'AF', 'AG'] },
];

// prettier-ignore
export const inputTracks5 = [
  { id: 0, sourceTrackID: 0, name: 'Track A', indexOfFirstBase: 1, sequence: ['A', 'B', 'D', 'E', 'G', 'H', 'J', 'K', 'M', 'N', 'P', 'Q', 'S', 'U', 'W', 'X', 'Z', 'AA', 'AE', 'AG'] },
  { id: 1, sourceTrackID: 0, name: 'Track B', sequence: ['A', 'B', 'D', 'E', 'G', 'H', 'J', 'Q', 'K', 'M', 'N', 'S', 'U', 'AA', 'AE', 'AG'] },
  { id: 2, sourceTrackID: 0, name: 'Track C', sequence: ['A', 'B', 'D', 'E', 'G', 'H', 'J', 'K', 'M', 'N', 'P', 'Q', 'S', 'V', 'W', 'X', 'Z', 'AB', 'AE', 'AG'] },
  { id: 3, sourceTrackID: 0, name: 'Track D', sequence: ['B', 'C', 'D', 'H', 'E', 'G', 'J', 'L', 'M', 'N', 'P', 'R', 'S', 'U', 'W', 'Y', 'Z', 'AC', 'AF', 'AG'] },
  { id: 4, sourceTrackID: 0, name: 'Track E', sequence: ['B', 'D', 'F', 'G', 'I', 'J', 'L', 'M', 'O', 'P', 'Q', 'S', 'T', 'V', 'W', 'Y', 'Z', 'AD', 'AF', 'AG'] },
];

export const k3138 = `
{"node": [{"sequence": "G", "id": 1},
{"sequence": "AGGT", "id": 2},
{"sequence": "T", "id": 3},
{"sequence": "A", "id": 4},
{"sequence": "CCCACTCCATAAGGTA", "id": 5},
{"sequence": "G", "id": 6},
{"sequence": "T", "id": 7},
{"sequence": "TTCAGCACCG", "id": 8},
{"sequence": "CCGTGTCCCGGCCGGGTCGCGGGGAGCCC", "id": 9},
{"sequence": "C", "id": 10}, {"sequence": "G", "id": 11}, {"sequence": "GG", "id": 12}, {"sequence": "TACATCGCAGTGGGCTACGTGGACGACACGCA", "id": 13}, {"sequence": "GTTCGTGCGGTTCGACAGCGACGCGGCGACTC", "id": 14}, {"sequence": "CGAGGA", "id": 15}, {"sequence": "T", "id": 16}, {"sequence": "C", "id": 17}, {"sequence": "GTAGCCGCAG", "id": 18}, {"sequence": "G", "id": 19}, {"sequence": "T", "id": 20}, {"sequence": "CGC", "id": 21}, {"sequence": "A", "id": 22}, {"sequence": "C", "id": 23}, {"sequence": "GTGGTTGGAG", "id": 24}, {"sequence": "CAGGA", "id": 25}, {"sequence": "G", "id": 26}, {"sequence": "T", "id": 27}, {"sequence": "GGACCGGAGTATTGGGACCGGAGCAC", "id": 28}, {"sequence": "AC", "id": 29}, {"sequence": "G", "id": 30}, {"sequence": "C", "id": 31}, {"sequence": "GAACATCAGGCCCGCGCACAGACTGACAA", "id": 32}, {"sequence": "GAGTGAACCTGCCCATGCCGCGCCGCTACTAC", "id": 33}, {"sequence": "CACCAGAGCTAGGCCGGTGAATGACCCCGGCC", "id": 34}, {"sequence": "TGGGGCGAAGGTCACGACCCCTCCTCATCCCC", "id": 35}, {"sequence": "CACGGACG", "id": 36}, {"sequence": "T", "id": 37}, {"sequence": "C", "id": 38}, {"sequence": "CCCGGGTCCCCCCCGCGAGTCTC", "id": 39}, {"sequence": "CGGCTCC", "id": 40}],
"edge": [{"from": 2, "to": 3}, {"from": 2, "to": 4}, {"from": 3, "to": 5}, {"from": 4, "to": 5}, {"from": 5, "to": 6}, {"from": 5, "to": 7}, {"from": 6, "to": 8}, {"from": 7, "to": 8}, {"from": 8, "to": 9}, {"from": 9, "to": 10}, {"from": 9, "to": 11}, {"from": 10, "to": 12}, {"from": 11, "to": 12}, {"from": 12, "to": 13}, {"from": 13, "to": 14}, {"from": 14, "to": 15}, {"from": 15, "to": 16}, {"from": 15, "to": 17}, {"from": 16, "to": 18}, {"from": 17, "to": 18}, {"from": 18, "to": 19}, {"from": 18, "to": 20}, {"from": 19, "to": 21}, {"from": 20, "to": 21}, {"from": 21, "to": 22}, {"from": 21, "to": 23}, {"from": 22, "to": 24}, {"from": 23, "to": 24}, {"from": 24, "to": 25}, {"from": 25, "to": 26}, {"from": 25, "to": 27}, {"from": 26, "to": 28}, {"from": 27, "to": 28}, {"from": 28, "to": 29}, {"from": 29, "to": 30}, {"from": 29, "to": 31}, {"from": 30, "to": 32}, {"from": 31, "to": 32}, {"from": 32, "to": 33}, {"from": 33, "to": 34}, {"from": 34, "to": 35}, {"from": 35, "to": 36}, {"from": 36, "to": 37}, {"from": 36, "to": 38}, {"from": 37, "to": 39}, {"from": 38, "to": 39}, {"from": 39, "to": 40}],

 "path": [
 {"name": "gi|157734152:29694183-29697368", "mapping": [{"position": {"node_id": 2}, "edit": [{"to_length": 4, "from_length": 4}]}, {"position": {"node_id": 3}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 5}, "edit": [{"to_length": 16, "from_length": 16}]}, {"position": {"node_id": 6}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 8}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 9}, "edit": [{"to_length": 29, "from_length": 29}]}, {"position": {"node_id": 10}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 12}, "edit": [{"to_length": 2, "from_length": 2}]}, {"position": {"node_id": 13}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 14}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 15}, "edit": [{"to_length": 6, "from_length": 6}]}, {"position": {"node_id": 16}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 18}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 19}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 21}, "edit": [{"to_length": 3, "from_length": 3}]}, {"position": {"node_id": 22}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 24}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 25}, "edit": [{"to_length": 5, "from_length": 5}]}, {"position": {"node_id": 26}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 28}, "edit": [{"to_length": 26, "from_length": 26}]}, {"position": {"node_id": 29}, "edit": [{"to_length": 2, "from_length": 2}]}, {"position": {"node_id": 30}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 32}, "edit": [{"to_length": 29, "from_length": 29}]}, {"position": {"node_id": 33}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 34}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 35}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 36}, "edit": [{"to_length": 8, "from_length": 8}]}, {"position": {"node_id": 37}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 39}, "edit": [{"to_length": 23, "from_length": 23}]}, {"position": {"node_id": 40}, "edit": [{"to_length": 7, "from_length": 7}]} ]},
 {"name": "gi|528476637:29896324-29899509", "mapping": [{"position": {"node_id": 2}, "edit": [{"to_length": 4, "from_length": 4}]}, {"position": {"node_id": 3}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 5}, "edit": [{"to_length": 16, "from_length": 16}]}, {"position": {"node_id": 6}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 8}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 9}, "edit": [{"to_length": 29, "from_length": 29}]}, {"position": {"node_id": 11}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 12}, "edit": [{"to_length": 2, "from_length": 2}]}, {"position": {"node_id": 13}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 14}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 15}, "edit": [{"to_length": 6, "from_length": 6}]}, {"position": {"node_id": 16}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 18}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 19}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 21}, "edit": [{"to_length": 3, "from_length": 3}]}, {"position": {"node_id": 23}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 24}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 25}, "edit": [{"to_length": 5, "from_length": 5}]}, {"position": {"node_id": 26}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 28}, "edit": [{"to_length": 26, "from_length": 26}]}, {"position": {"node_id": 29}, "edit": [{"to_length": 2, "from_length": 2}]}, {"position": {"node_id": 30}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 32}, "edit": [{"to_length": 29, "from_length": 29}]}, {"position": {"node_id": 33}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 34}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 35}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 36}, "edit": [{"to_length": 8, "from_length": 8}]}, {"position": {"node_id": 37}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 39}, "edit": [{"to_length": 23, "from_length": 23}]}, {"position": {"node_id": 40}, "edit": [{"to_length": 7, "from_length": 7}]}]},
 {"name": "gi|568815454:1186335-1189520", "mapping": [{"position": {"node_id": 2}, "edit": [{"to_length": 4, "from_length": 4}]}, {"position": {"node_id": 4}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 5}, "edit": [{"to_length": 16, "from_length": 16}]}, {"position": {"node_id": 7}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 8}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 9}, "edit": [{"to_length": 29, "from_length": 29}]}, {"position": {"node_id": 10}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 12}, "edit": [{"to_length": 2, "from_length": 2}]}, {"position": {"node_id": 13}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 14}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 15}, "edit": [{"to_length": 6, "from_length": 6}]}, {"position": {"node_id": 16}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 18}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 19}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 21}, "edit": [{"to_length": 3, "from_length": 3}]}, {"position": {"node_id": 22}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 24}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 25}, "edit": [{"to_length": 5, "from_length": 5}]}, {"position": {"node_id": 27}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 28}, "edit": [{"to_length": 26, "from_length": 26}]}, {"position": {"node_id": 29}, "edit": [{"to_length": 2, "from_length": 2}]}, {"position": {"node_id": 30}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 32}, "edit": [{"to_length": 29, "from_length": 29}]}, {"position": {"node_id": 33}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 34}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 35}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 36}, "edit": [{"to_length": 8, "from_length": 8}]}, {"position": {"node_id": 37}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 39}, "edit": [{"to_length": 23, "from_length": 23}]}, {"position": {"node_id": 40}, "edit": [{"to_length": 7, "from_length": 7}]}]},
 {"name": "gi|568815529:1408009-1411194", "mapping": [{"position": {"node_id": 2}, "edit": [{"to_length": 4, "from_length": 4}]}, {"position": {"node_id": 4}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 5}, "edit": [{"to_length": 16, "from_length": 16}]}, {"position": {"node_id": 7}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 8}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 9}, "edit": [{"to_length": 29, "from_length": 29}]}, {"position": {"node_id": 10}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 12}, "edit": [{"to_length": 2, "from_length": 2}]}, {"position": {"node_id": 13}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 14}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 15}, "edit": [{"to_length": 6, "from_length": 6}]}, {"position": {"node_id": 16}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 18}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 19}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 21}, "edit": [{"to_length": 3, "from_length": 3}]}, {"position": {"node_id": 22}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 24}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 25}, "edit": [{"to_length": 5, "from_length": 5}]}, {"position": {"node_id": 27}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 28}, "edit": [{"to_length": 26, "from_length": 26}]}, {"position": {"node_id": 29}, "edit": [{"to_length": 2, "from_length": 2}]}, {"position": {"node_id": 30}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 32}, "edit": [{"to_length": 29, "from_length": 29}]}, {"position": {"node_id": 33}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 34}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 35}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 36}, "edit": [{"to_length": 8, "from_length": 8}]}, {"position": {"node_id": 37}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 39}, "edit": [{"to_length": 23, "from_length": 23}]}, {"position": {"node_id": 40}, "edit": [{"to_length": 7, "from_length": 7}]}]},
 {"name": "gi|568815551:1183812-1186995", "mapping": [{"position": {"node_id": 2}, "edit": [{"to_length": 4, "from_length": 4}]}, {"position": {"node_id": 3}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 5}, "edit": [{"to_length": 16, "from_length": 16}]}, {"position": {"node_id": 6}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 8}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 9}, "edit": [{"to_length": 29, "from_length": 29}]}, {"position": {"node_id": 10}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 12}, "edit": [{"to_length": 2, "from_length": 2}]}, {"position": {"node_id": 13}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 14}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 15}, "edit": [{"to_length": 6, "from_length": 6}]}, {"position": {"node_id": 16}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 18}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 19}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 21}, "edit": [{"to_length": 3, "from_length": 3}]}, {"position": {"node_id": 23}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 24}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 25}, "edit": [{"to_length": 5, "from_length": 5}]}, {"position": {"node_id": 26}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 28}, "edit": [{"to_length": 26, "from_length": 26}]}, {"position": {"node_id": 29}, "edit": [{"to_length": 2, "from_length": 2}]}, {"position": {"node_id": 30}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 32}, "edit": [{"to_length": 29, "from_length": 29}]}, {"position": {"node_id": 33}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 34}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 35}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 36}, "edit": [{"to_length": 8, "from_length": 8}]}, {"position": {"node_id": 37}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 39}, "edit": [{"to_length": 23, "from_length": 23}]}, {"position": {"node_id": 40}, "edit": [{"to_length": 7, "from_length": 7}]}]},
 {"name": "gi|568815561:1183022-1186203", "mapping": [{"position": {"node_id": 2}, "edit": [{"to_length": 4, "from_length": 4}]}, {"position": {"node_id": 4}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 5}, "edit": [{"to_length": 16, "from_length": 16}]}, {"position": {"node_id": 7}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 8}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 9}, "edit": [{"to_length": 29, "from_length": 29}]}, {"position": {"node_id": 10}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 12}, "edit": [{"to_length": 2, "from_length": 2}]}, {"position": {"node_id": 13}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 14}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 15}, "edit": [{"to_length": 6, "from_length": 6}]}, {"position": {"node_id": 16}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 18}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 19}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 21}, "edit": [{"to_length": 3, "from_length": 3}]}, {"position": {"node_id": 23}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 24}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 25}, "edit": [{"to_length": 5, "from_length": 5}]}, {"position": {"node_id": 26}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 28}, "edit": [{"to_length": 26, "from_length": 26}]}, {"position": {"node_id": 29}, "edit": [{"to_length": 2, "from_length": 2}]}, {"position": {"node_id": 31}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 32}, "edit": [{"to_length": 29, "from_length": 29}]}, {"position": {"node_id": 33}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 34}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 35}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 36}, "edit": [{"to_length": 8, "from_length": 8}]}, {"position": {"node_id": 38}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 39}, "edit": [{"to_length": 23, "from_length": 23}]}, {"position": {"node_id": 40}, "edit": [{"to_length": 7, "from_length": 7}]}]},
 {"name": "gi|568815567:1183447-1186629", "mapping": [{"position": {"node_id": 2}, "edit": [{"to_length": 4, "from_length": 4}]}, {"position": {"node_id": 3}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 5}, "edit": [{"to_length": 16, "from_length": 16}]}, {"position": {"node_id": 6}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 8}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 9}, "edit": [{"to_length": 29, "from_length": 29}]}, {"position": {"node_id": 10}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 12}, "edit": [{"to_length": 2, "from_length": 2}]}, {"position": {"node_id": 13}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 14}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 15}, "edit": [{"to_length": 6, "from_length": 6}]}, {"position": {"node_id": 17}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 18}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 20}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 21}, "edit": [{"to_length": 3, "from_length": 3}]}, {"position": {"node_id": 23}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 24}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 25}, "edit": [{"to_length": 5, "from_length": 5}]}, {"position": {"node_id": 26}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 28}, "edit": [{"to_length": 26, "from_length": 26}]}, {"position": {"node_id": 29}, "edit": [{"to_length": 2, "from_length": 2}]}, {"position": {"node_id": 30}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 32}, "edit": [{"to_length": 29, "from_length": 29}]}, {"position": {"node_id": 33}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 34}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 35}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 36}, "edit": [{"to_length": 8, "from_length": 8}]}, {"position": {"node_id": 37}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 39}, "edit": [{"to_length": 23, "from_length": 23}]}, {"position": {"node_id": 40}, "edit": [{"to_length": 7, "from_length": 7}]}]},
 {"name": "gi|568815569:1226348-1229533", "mapping": [{"position": {"node_id": 2}, "edit": [{"to_length": 4, "from_length": 4}]}, {"position": {"node_id": 3}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 5}, "edit": [{"to_length": 16, "from_length": 16}]}, {"position": {"node_id": 6}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 8}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 9}, "edit": [{"to_length": 29, "from_length": 29}]}, {"position": {"node_id": 10}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 12}, "edit": [{"to_length": 2, "from_length": 2}]}, {"position": {"node_id": 13}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 14}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 15}, "edit": [{"to_length": 6, "from_length": 6}]}, {"position": {"node_id": 16}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 18}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 19}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 21}, "edit": [{"to_length": 3, "from_length": 3}]}, {"position": {"node_id": 23}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 24}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 25}, "edit": [{"to_length": 5, "from_length": 5}]}, {"position": {"node_id": 26}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 28}, "edit": [{"to_length": 26, "from_length": 26}]}, {"position": {"node_id": 29}, "edit": [{"to_length": 2, "from_length": 2}]}, {"position": {"node_id": 30}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 32}, "edit": [{"to_length": 29, "from_length": 29}]}, {"position": {"node_id": 33}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 34}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 35}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 36}, "edit": [{"to_length": 8, "from_length": 8}]}, {"position": {"node_id": 37}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 39}, "edit": [{"to_length": 23, "from_length": 23}]}, {"position": {"node_id": 40}, "edit": [{"to_length": 7, "from_length": 7}]}]},
 {"name": "gi|568815592:29926658-29929838", "mapping": [{"position": {"node_id": 2}, "edit": [{"to_length": 4, "from_length": 4}]}, {"position": {"node_id": 4}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 5}, "edit": [{"to_length": 16, "from_length": 16}]}, {"position": {"node_id": 7}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 8}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 9}, "edit": [{"to_length": 29, "from_length": 29}]}, {"position": {"node_id": 12}, "edit": [{"to_length": 2, "from_length": 2}]}, {"position": {"node_id": 13}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 14}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 15}, "edit": [{"to_length": 6, "from_length": 6}]}, {"position": {"node_id": 16}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 18}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 20}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 21}, "edit": [{"to_length": 3, "from_length": 3}]}, {"position": {"node_id": 23}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 24}, "edit": [{"to_length": 10, "from_length": 10}]}, {"position": {"node_id": 25}, "edit": [{"to_length": 5, "from_length": 5}]}, {"position": {"node_id": 26}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 28}, "edit": [{"to_length": 26, "from_length": 26}]}, {"position": {"node_id": 29}, "edit": [{"to_length": 2, "from_length": 2}]}, {"position": {"node_id": 30}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 32}, "edit": [{"to_length": 29, "from_length": 29}]}, {"position": {"node_id": 33}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 34}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 35}, "edit": [{"to_length": 32, "from_length": 32}]}, {"position": {"node_id": 36}, "edit": [{"to_length": 8, "from_length": 8}]}, {"position": {"node_id": 37}, "edit": [{"to_length": 1, "from_length": 1}]}, {"position": {"node_id": 39}, "edit": [{"to_length": 23, "from_length": 23}]}, {"position": {"node_id": 40}, "edit": [{"to_length": 7, "from_length": 7}]}]}]}
`;

export const demoReads = `
{"sequence": "AGGTTCCCACTCCATAAGGTAGTTCAGCACCGCC", "path": {"name": "read 1", "mapping": [{"position": {"node_id": "2"}, "rank": 1, "edit": [{"from_length": 4, "to_length": 4}]},    {"position": {"node_id": "3"}, "rank": 2, "edit": [{"from_length": 1, "to_length": 1}]}, {"position": {"node_id": "5"}, "rank": 3, "edit": [{"from_length": 16, "to_length": 16}]},     {"position": {"node_id": "6"}, "rank": 4, "edit": [{"from_length": 1, "to_length": 1}]}, {"position": {"node_id": "8"}, "rank": 5, "edit": [{"from_length": 10, "to_length": 10}]}, {"position": {"node_id": "9"}, "rank": 6, "edit": [{"from_length": 5, "to_length": 5}]}]}, "score": 57, "identity": 1.0 }
{"sequence": "CCGGCCGGGTCGCGGGGAGCCCGGTACATCGCAGTGGGCTACGTGGACGA", "path": {"mapping": [{"rank": 1, "edit": [{"from_length": 22, "to_length": 22}], "position": {"offset": 7, "node_id": "9"}}, {"rank": 3, "edit": [{"from_length": 2, "to_length": 2}], "position": {"node_id": "12"}}, {"rank": 4, "edit": [{"from_length": 26, "to_length": 26}], "position": {"node_id": "13"}}]}, "score": 51, "identity": 1.0}
{"sequence": "GGTTCCCACTCCATAAGGTAGTTCAGCACCGCCGTGTCCCGGCCGGGTCGCGGGGAGCCCCGGTACATCGCAGTGGGCTACGTGGACGACACGCAGTTCGTGCGGTTCGACAGCGACGCGGCGACTCCGAGGATGTAGCCGCAGGCGCCGTGGTTGGAGCAGGAGGGACCGGAGTATTGGGACCGGAGCACACGGAACATCAGGCCCGCGCACAGACTGACAAGAGTGAACCTGCCCATGCCGCGCCGCTACTACCACCAGAGCTAGGCCGGTGAATGACCCCGGCCTGGGGCGAAGGTCACGACCCCTCCTCATCCCCCACGGACGTCCCGGGTCCCCCCCGCGAGTCTCCGGCTCC", "path": {"mapping": [{"position": {"node_id": "2", "offset": 1}, "edit": [{"from_length": 3, "to_length": 3}], "rank": 1}, {"position": {"node_id": "3"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 2}, {"position": {"node_id": "5"}, "edit": [{"from_length": 16, "to_length": 16}], "rank": 3}, {"position": {"node_id": "6"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 4}, {"position": {"node_id": "8"}, "edit": [{"from_length": 10, "to_length": 10}], "rank": 5}, {"position": {"node_id": "9"}, "edit": [{"from_length": 29, "to_length": 29}], "rank": 6}, {"position": {"node_id": "10"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 7}, {"position": {"node_id": "12"}, "edit": [{"from_length": 2, "to_length": 2}], "rank": 8}, {"position": {"node_id": "13"}, "edit": [{"from_length": 32, "to_length": 32}], "rank": 9}, {"position": {"node_id": "14"}, "edit": [{"from_length": 32, "to_length": 32}], "rank": 10}, {"position": {"node_id": "15"}, "edit": [{"from_length": 6, "to_length": 6}], "rank": 11}, {"position": {"node_id": "16"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 12}, {"position": {"node_id": "18"}, "edit": [{"from_length": 10, "to_length": 10}], "rank": 13}, {"position": {"node_id": "19"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 14}, {"position": {"node_id": "21"}, "edit": [{"from_length": 3, "to_length": 3}], "rank": 15}, {"position": {"node_id": "23"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 16}, {"position": {"node_id": "24"}, "edit": [{"from_length": 10, "to_length": 10}], "rank": 17}, {"position": {"node_id": "25"}, "edit": [{"from_length": 5, "to_length": 5}], "rank": 18}, {"position": {"node_id": "26"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 19}, {"position": {"node_id": "28"}, "edit": [{"from_length": 26, "to_length": 26}], "rank": 20}, {"position": {"node_id": "29"}, "edit": [{"from_length": 2, "to_length": 2}], "rank": 21}, {"position": {"node_id": "30"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 22}, {"position": {"node_id": "32"}, "edit": [{"from_length": 29, "to_length": 29}], "rank": 23}, {"position": {"node_id": "33"}, "edit": [{"from_length": 32, "to_length": 32}], "rank": 24}, {"position": {"node_id": "34"}, "edit": [{"from_length": 32, "to_length": 32}], "rank": 25}, {"position": {"node_id": "35"}, "edit": [{"from_length": 32, "to_length": 32}], "rank": 26}, {"position": {"node_id": "36"}, "edit": [{"from_length": 8, "to_length": 8}], "rank": 27}, {"position": {"node_id": "37"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 28}, {"position": {"node_id": "39"}, "edit": [{"from_length": 23, "to_length": 23}], "rank": 29}, {"position": {"node_id": "40"}, "edit": [{"from_length": 7, "to_length": 7}], "rank": 30}]}, "score": 358, "identity": 1.0}
{"sequence": "GGTACCCACTCCATAAGGTATTCAGCACCGCCGTGTCCCGGCCGGGTCGCGGGGAGCCCCGGTACATCGCAGTGGGCTACGTGGACGACACGCAGTTCGTGCGGTTCGACAGCGACGCGGCGACTCCGAGGATGTAGCCGCAGGCGCCGTGGTTGGAGCAGGAGGGACCGGAGTATTGGGACCGGAGCACACGGAACATCAGGCCCGCGCACAGACTGACAAGAGTGAACCTGCCCATGCCGCGCCGCTACTACCACCAGAGCTAGGCCGGTGAATGACCCCGGCCTGGGGCGAAGGTCACGACCCCTCCTCATCCCCCACGGACGTCCCGGGTCCCCCCCGCGAGTCTCCGGCTCC", "path": {"mapping": [{"position": {"offset": 1, "node_id": "2"}, "edit": [{"from_length": 3, "to_length": 3}], "rank": 1}, {"position": {"node_id": "4"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 2}, {"position": {"node_id": "5"}, "edit": [{"from_length": 16, "to_length": 16}], "rank": 3}, {"position": {"node_id": "8"}, "edit": [{"from_length": 10, "to_length": 10}], "rank": 5}, {"position": {"node_id": "9"}, "edit": [{"from_length": 29, "to_length": 29}], "rank": 6}, {"position": {"node_id": "10"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 7}, {"position": {"node_id": "12"}, "edit": [{"from_length": 2, "to_length": 2}], "rank": 8}, {"position": {"node_id": "13"}, "edit": [{"from_length": 32, "to_length": 32}], "rank": 9}, {"position": {"node_id": "14"}, "edit": [{"from_length": 32, "to_length": 32}], "rank": 10}, {"position": {"node_id": "15"}, "edit": [{"from_length": 6, "to_length": 6}], "rank": 11}, {"position": {"node_id": "16"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 12}, {"position": {"node_id": "18"}, "edit": [{"from_length": 10, "to_length": 10}], "rank": 13}, {"position": {"node_id": "19"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 14}, {"position": {"node_id": "21"}, "edit": [{"from_length": 3, "to_length": 3}], "rank": 15}, {"position": {"node_id": "23"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 16}, {"position": {"node_id": "24"}, "edit": [{"from_length": 10, "to_length": 10}], "rank": 17}, {"position": {"node_id": "25"}, "edit": [{"from_length": 5, "to_length": 5}], "rank": 18}, {"position": {"node_id": "26"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 19}, {"position": {"node_id": "28"}, "edit": [{"from_length": 26, "to_length": 26}], "rank": 20}, {"position": {"node_id": "29"}, "edit": [{"from_length": 2, "to_length": 2}], "rank": 21}, {"position": {"node_id": "30"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 22}, {"position": {"node_id": "32"}, "edit": [{"from_length": 29, "to_length": 29}], "rank": 23}, {"position": {"node_id": "33"}, "edit": [{"from_length": 32, "to_length": 32}], "rank": 24}, {"position": {"node_id": "34"}, "edit": [{"from_length": 32, "to_length": 32}], "rank": 25}, {"position": {"node_id": "35"}, "edit": [{"from_length": 32, "to_length": 32}], "rank": 26}, {"position": {"node_id": "36"}, "edit": [{"from_length": 8, "to_length": 8}], "rank": 27}, {"position": {"node_id": "37"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 28}, {"position": {"node_id": "39"}, "edit": [{"from_length": 23, "to_length": 23}], "rank": 29}, {"position": {"node_id": "40"}, "edit": [{"from_length": 7, "to_length": 7}], "rank": 30}]}, "score": 358, "identity": 1.0}
{"sequence": "GGTTCCCACTCCATAAGGTAGTTCAGCACCGCCGTGTCCCGGCCGGGTCGCGGGGAGCCCCGGTACATCGCAGTGGGCTACGTGGACGACACGCAGTTCGTGCGGTTCGACAGCGACGCGGCGACTCCGAGGATGTAGCCGCAGGCGCCGTGGTTGGAGCAGGAGGGACCGGAGTATTGGGACCGGAGCACACGGAACATCAGGCCCGCGCACAGACTGACAAGAGTGAACCTGCCCATGCCGCGCCGCTACTACCACCAGAGCTAGGCCGGTGAATGACCCCGGCCTGGGGCGAAGGTCACGACCCCTCCTCATCCCCCACGGACGCCCCGGGTCCCCCCCGCGAGTCTCCGGCTCC", "path": {"mapping": [{"position": {"node_id": "3"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 2}, {"position": {"node_id": "5"}, "edit": [{"from_length": 16, "to_length": 16}], "rank": 3}, {"position": {"node_id": "6"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 4}, {"position": {"node_id": "8"}, "edit": [{"from_length": 10, "to_length": 10}], "rank": 5}, {"position": {"node_id": "9"}, "edit": [{"from_length": 29, "to_length": 29}], "rank": 6}, {"position": {"node_id": "10"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 7}, {"position": {"node_id": "12"}, "edit": [{"from_length": 2, "to_length": 2}], "rank": 8}, {"position": {"node_id": "13"}, "edit": [{"from_length": 32, "to_length": 32}], "rank": 9}, {"position": {"node_id": "14"}, "edit": [{"from_length": 32, "to_length": 32}], "rank": 10}, {"position": {"node_id": "15"}, "edit": [{"from_length": 6, "to_length": 6}], "rank": 11}, {"position": {"node_id": "16"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 12}, {"position": {"node_id": "18"}, "edit": [{"from_length": 10, "to_length": 10}], "rank": 13}, {"position": {"node_id": "19"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 14}, {"position": {"node_id": "21"}, "edit": [{"from_length": 3, "to_length": 3}], "rank": 15}, {"position": {"node_id": "23"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 16}, {"position": {"node_id": "24"}, "edit": [{"from_length": 10, "to_length": 10}], "rank": 17}, {"position": {"node_id": "25"}, "edit": [{"from_length": 5, "to_length": 5}], "rank": 18}, {"position": {"node_id": "26"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 19}, {"position": {"node_id": "28"}, "edit": [{"from_length": 26, "to_length": 26}], "rank": 20}, {"position": {"node_id": "29"}, "edit": [{"from_length": 2, "to_length": 2}], "rank": 21}, {"position": {"node_id": "30"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 22}, {"position": {"node_id": "32"}, "edit": [{"from_length": 29, "to_length": 29}], "rank": 23}, {"position": {"node_id": "33"}, "edit": [{"from_length": 32, "to_length": 32}], "rank": 24}, {"position": {"node_id": "34"}, "edit": [{"from_length": 32, "to_length": 32}], "rank": 25}, {"position": {"node_id": "35"}, "edit": [{"from_length": 32, "to_length": 32}], "rank": 26}, {"position": {"node_id": "36"}, "edit": [{"from_length": 8, "to_length": 8}], "rank": 27}, {"position": {"node_id": "38"}, "edit": [{"from_length": 1, "to_length": 1}], "rank": 28}, {"position": {"node_id": "39"}, "edit": [{"from_length": 23, "to_length": 23}], "rank": 29}, {"position": {"node_id": "40"}, "edit": [{"from_length": 7, "to_length": 7}], "rank": 30}]}, "score": 358, "identity": 1.0}
`;

export const cycleGraph = {
  edge: [
    {
      from: "60080783",
      from_start: true,
      to: "60080786",
      to_end: true,
    },
    {
      from: "60080783",
      from_start: true,
      to: "60080785",
    },
    {
      from: "60080783",
      to: "60080785",
    },
    {
      from: "60080786",
      to: "60080785",
    },
    {
      from: "60080786",
      to: "60080785",
      to_end: true,
    },
  ],
  node: [
    {
      id: "60080785",
      sequence: "AC",
    },
    {
      id: "60080783",
      sequence: "TT",
    },
    {
      id: "60080786",
      sequence: "GT",
    },
  ],
  path: [
    {
      mapping: [
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080786",
          },
          rank: "1",
        },
        {
          edit: [
            {
              from_length: 21,
              to_length: 21,
            },
          ],
          position: {
            node_id: "60080783",
          },
          rank: "2",
        },
      ],
      name: "GRCh38.chr14",
      indexOfFirstBase: "1",
    },
  ],
};


export const cycleReads = [
  {
    identity: 1,
    name: "Read0",
    path: {
      mapping: [
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080786",
          },
          rank: "1",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080785",
          },
          rank: "2",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080783",
          },
          rank: "3",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080786",
          },
          rank: "4",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080785",
          },
          rank: "5",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080783",
          },
          rank: "6",
        },
      ],
    },
    score: 110,
    sequence: "GTGTTT",
  },
  {
    identity: 1,
    name: "Read1",
    path: {
      mapping: [
        {
          edit: [
            {
              from_length: 1,
              to_length: 1,
            },
          ],
          position: {
            node_id: "60080786",
            offset: 1,
          },
          rank: "1",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080785",
          },
          rank: "2",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080783",
          },
          rank: "3",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080786",
          },
          rank: "4",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080785",
          },
          rank: "5",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 1,
            },
          ],
          position: {
            node_id: "60080783",
            offset: -2,
          },
          rank: "6",
        },
      ],
    },
    score: 110,
    sequence: "TGTTT",
  },
  {
    identity: 1,
    name: "Read2",
    path: {
      mapping: [
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080786",
          },
          rank: "1",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080785",
          },
          rank: "2",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080783",
          },
          rank: "3",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080786",
          },
          rank: "4",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080785",
          },
          rank: "5",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080783",
          },
          rank: "6",
        },
      ],
    },
    score: 110,
    sequence: "GTGTTT",
  },
  {
    identity: 1,
    name: "Read3",
    path: {
      mapping: [
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080786",
          },
          rank: "1",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080785",
          },
          rank: "2",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080783",
          },
          rank: "3",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080786",
          },
          rank: "4",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080785",
          },
          rank: "5",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 3,
            },
          ],
          position: {
            node_id: "60080783",
            offset: -1,
          },
          rank: "6",
        },
      ],
    },
    score: 110,
    sequence: "GTACTT",
  },
  {
    identity: 1,
    name: "Read4",
    path: {
      mapping: [
        {
          edit: [
            {
              from_length: 1,
              to_length: 1,
            },
          ],
          position: {
            node_id: "60080786",
            offset: 1,
          },
          rank: "1",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080785",
          },
          rank: "2",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080783",
          },
          rank: "3",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080786",
          },
          rank: "4",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080785",
          },
          rank: "5",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 1,
            },
          ],
          position: {
            node_id: "60080783",
          },
          rank: "6",
        },
      ],
    },
    score: 110,
    sequence: "TACTT",
  },
];

export const cycle2Graph = {
  edge: [
    {
      from: "60080783",
      from_start: true,
      to: "60080786",
      to_end: true,
    },
    {
      from: "60080783",
      from_start: true,
      to: "60080785",
    },
    {
      from: "60080783",
      to: "60080785",
    },
    {
      from: "60080786",
      to: "60080785",
    },
    {
      from: "60080786",
      to: "60080785",
      to_end: true,
    },
  ],
  node: [
    {
      id: "60080785",
      sequence: "AC",
    },
    {
      id: "60080783",
      sequence: "TT",
    },
    {
      id: "60080786",
      sequence: "GT",
    },
  ],
  path: [
    {
      mapping: [
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080786",
          },
          rank: "1",
        },
        {
          edit: [
            {
              from_length: 21,
              to_length: 21,
            },
          ],
          position: {
            node_id: "60080783",
          },
          rank: "2",
        },
      ],
      name: "GRCh38.chr14",
      indexOfFirstBase: "1",
    },
  ],
};


export const cycle2Reads = [
  {
    identity: 1,
    name: "Read0",
    path: {
      mapping: [
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080786",
          },
          rank: "1",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080785",
          },
          rank: "2",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080783",
          },
          rank: "3",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080786",
          },
          rank: "4",
        },
      ],
    },
    score: 110,
    sequence: "GTGTTT",
  },
  {
    identity: 1,
    name: "Read1",
    path: {
      mapping: [
        {
          edit: [
            {
              from_length: 1,
              to_length: 1,
            },
          ],
          position: {
            node_id: "60080786",
            offset: 1,
          },
          rank: "1",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080785",
          },
          rank: "2",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080783",
          },
          rank: "3",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080785",
          },
          rank: "5",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 1,
            },
          ],
          position: {
            node_id: "60080783",
            offset: -2,
          },
          rank: "6",
        },
      ],
    },
    score: 110,
    sequence: "TGTTT",
  },
  {
    identity: 1,
    name: "Read2",
    path: {
      mapping: [
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080786",
          },
          rank: "1",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080785",
          },
          rank: "2",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080783",
          },
          rank: "3",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080786",
          },
          rank: "4",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080785",
          },
          rank: "5",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080783",
          },
          rank: "6",
        },
      ],
    },
    score: 110,
    sequence: "GTGTTT",
  },
  {
    identity: 1,
    name: "Read3",
    path: {
      mapping: [
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080786",
          },
          rank: "1",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080785",
          },
          rank: "2",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080783",
          },
          rank: "3",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080786",
          },
          rank: "4",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080785",
          },
          rank: "5",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 3,
            },
          ],
          position: {
            node_id: "60080783",
            offset: -1,
          },
          rank: "6",
        },
      ],
    },
    score: 110,
    sequence: "GTACTT",
  },
  {
    identity: 1,
    name: "Read4",
    path: {
      mapping: [
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080785",
          },
          rank: "2",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080783",
          },
          rank: "3",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080786",
          },
          rank: "4",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080785",
          },
          rank: "5",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 1,
            },
          ],
          position: {
            node_id: "60080783",
          },
          rank: "6",
        },
      ],
    },
    score: 110,
    sequence: "TACTT",
  },
];

export const reverseAlignmentGraph = {
  edge: [
    {
      from: "60080783",
      from_start: true,
      to: "60080786",
      to_end: true,
    },
    {
      from: "60080783",
      from_start: true,
      to: "60080785",
    },
    {
      from: "60080783",
      to: "60080785",
    },
    {
      from: "60080786",
      to: "60080785",
    },
    {
      from: "60080786",
      to: "60080785",
      to_end: true,
    },
  ],
  node: [
    {
      id: "60080785",
      sequence: "AC",
    },
    {
      id: "60080783",
      sequence: "TT",
    },
    {
      id: "60080786",
      sequence: "GT",
    },
  ],
  path: [
    {
      mapping: [
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080786",
          },
          rank: "1",
        },
        {
          edit: [
            {
              from_length: 21,
              to_length: 21,
            },
          ],
          position: {
            node_id: "60080783",
          },
          rank: "2",
        },
      ],
      name: "GRCh38.chr14",
      indexOfFirstBase: "1",
    },
  ],
};

export const mixedAlignmentReads = [
  {
    identity: 1,
    name: "Read0",
    path: {
      mapping: [
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080786",
          },
          rank: "1",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            is_reverse: true,
            node_id: "60080785",
          },
          rank: "2",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080783",
          },
          rank: "3",
        },
      ],
    },
    score: 110,
    sequence: "GTGTTT",
  },
  {
    identity: 1,
    name: "Read1",
    path: {
      mapping: [
        {
          edit: [
            {
              from_length: 1,
              to_length: 1,
            },
          ],
          position: {
            node_id: "60080786",
            offset: 1,
          },
          rank: "1",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            is_reverse: true,
            node_id: "60080785",
          },
          rank: "2",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080783",
          },
          rank: "3",
        },
      ],
    },
    score: 110,
    sequence: "TGTTT",
  },
  {
    identity: 1,
    name: "Read2",
    path: {
      mapping: [
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080786",
          },
          rank: "1",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            is_reverse: true,
            node_id: "60080785",
          },
          rank: "2",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080783",
          },
          rank: "3",
        },
      ],
    },
    score: 110,
    sequence: "GTGTTT",
  },
  {
    identity: 1,
    name: "Read3",
    path: {
      mapping: [
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080786",
          },
          rank: "1",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080785",
          },
          rank: "2",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080783",
          },
          rank: "3",
        },
      ],
    },
    score: 110,
    sequence: "GTACTT",
  },
  {
    identity: 1,
    name: "Read4",
    path: {
      mapping: [
        {
          edit: [
            {
              from_length: 1,
              to_length: 1,
            },
          ],
          position: {
            node_id: "60080786",
            offset: 1,
          },
          rank: "1",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080785",
          },
          rank: "2",
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 2,
            },
          ],
          position: {
            node_id: "60080783",
          },
          rank: "3",
        },
      ],
    },
    score: 110,
    sequence: "TACTT",
  },
];
