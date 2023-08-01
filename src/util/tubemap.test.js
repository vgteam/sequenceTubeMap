import { cigar_string } from "./tubemap";
import { coverage } from "./tubemap";

// cigar string test
describe('cigar_string', () => {
    // TEST 1
    it('it can handle an edit that is a match and deletion', async () => {
      const readPath = {
        mapping: [
          {
            edit: [
              {
                from_length: 6,
                to_length: 4
              }
            ]
          }
        ]
      }
      expect(cigar_string(readPath)).toBe("4M2D");
    });
    // TEST 2
    it('it can handle an edit that is a match and insertion', async () => {
      const readPath = {
        mapping: [
          {
            edit: [
              {
                from_length: 4,
                to_length: 6
              }
            ]
          }
        ]
      };
      expect(cigar_string(readPath)).toBe("4M2I");
    });
    // TEST 3
    it('it can handle edit with double-digit length values', async () => {
      const readPath = {
        mapping: [
          {
            edit: [
              {
                from_length: 11,
                to_length: 11
              },
              {
                from_length: 21,
                to_length: 22,
                sequence: "AA"
              },
              {
                to_length: 13,
                sequence: "A"
              },
              {
                from_length: 12,
                to_length: 10
              },
              {
                from_length: 22
              }
            ]
          },
          {
            edit: [
              {
                from_length: 16
              }
            ]
          }
        ]
      };
      expect(cigar_string(readPath)).toBe("32M14I10M40D");
    });
    // TEST 4
    it('it can handle a mapping with multiple edits', async () => {
      const readPath = {
        mapping: [
          {
            edit: [
              {
                from_length: 8,
                to_length: 9
              }
            ]
          },
          {
            edit: [
              {
                from_length: 2,
                to_length: 1
              }
            ]
          },
          {
            edit: [
              {
                from_length: 4,
                to_length: 4
              }
            ]
          },
          {
            edit: [
              {
                from_length: 18,
                to_length: 11
              }
            ]
          },
          {
            edit: [
              {
                from_length: 15,
                sequence: "C"
              }
            ]
          },
          {
            edit: [
              {
                from_length: 3,
                to_length: 4,
                sequence: "G"
              }
            ]
          }, 
          {
            edit: [
              {
                from_length: 8,
                to_length: 9,
                sequence: "C"
              }
            ]
          }, 
          {
            edit: [
              {
                from_length: 10,
                to_length: 10,
                sequence: "ATCG"
              }
            ]
          },
          {
            edit: [
              {
                from_length: 15,
                to_length: 14,
                sequence: "G"
              }
            ]
          },
          {
            edit: [
              {
                to_length: 9,
                sequence: "AAAA"
              }
            ]
          }
        ]
      };
      expect(cigar_string(readPath)).toBe("8M1I1M1D15M22D3M1I8M1I24M1D9I");
    });
    // TEST 5
    it('it can handle multiple edits with lengths of 0', async () => {
      const readPath = {
        mapping: [
          {
            edit: [
              {
                from_length: 0,
                to_length: 0
              }
            ]
          },
          {
            edit: [
              {
                from_length: 0,
                to_length: 0
              }
            ]
          },
          {
            edit: [
              {
                from_length: 0,
                to_length: 0
              }
            ]
          },
          {
            edit: [
              {
                from_length: 0,
                to_length: 0
              }
            ]
          },
          {
            edit: [
              {
                from_length: 0,
                sequence: "C"
              }
            ]
          }
        ]
      };
      expect(cigar_string(readPath)).toBe("0M");
    });
  });

  
// Node coverage test
describe('coverage', () => {
  // TEST #1
  it('can handle zero-length node without reads', async () => {
    const node = {
      sequenceLength: 0,
      incomingReads: [],
      internalReads: [],
      outgoingReads: [],
    }
    const reads = [];
    expect(coverage(node, reads)).toBe(0.00);
  })
  // TEST #2
  it('can handle node of length 1 with 1 incoming read', async () => {
    const node = {        
      sequenceLength: 1,
      incomingReads: [[1, 1]],
      internalReads: [],
      outgoingReads: [],
    }
    const reads = [
      {
        "id": 1,
        "type": "read",
        "firstNodeOffset": 0,
        "finalNodeCoverLength": 1,
        "sequenceNew":
          [
            {
                "nodeName": "1",
                "mismatches": []
            },
            {
                "nodeName": "11",
                "mismatches": []
            },
            {
                "nodeName": "13",
                "mismatches": []
            }
          ]
      }, 
      {
        "id": 2,
        "sequenceNew": [
            {
                "nodeName": "1",
                "mismatches": []
            },
            {
                "nodeName": "12",
                "mismatches": []
            },
            {
                "nodeName": "13",
                "mismatches": []
            }
        ],
        "firstNodeOffset": 0,
        "finalNodeCoverLength": 1,
      }
    ];
    expect(coverage(node, reads)).toBe(1.00);
  })
  // TEST #3
  it('can handle node of length of 6 with 2 outgoing reads and 2 internal reads', async () => {
    const node = {        
      sequenceLength: 6,
      incomingReads: [],
      internalReads: [0, 1],
      outgoingReads: [[2, 1], [3, 1]],
    }
    const reads = [
      {
        "id": 1,
        "sequenceNew": [
          {
            "nodeName": "1",
            "mismatches": [
              {
                "type": "insertion",
                "pos": 0,
                "seq": "CACAGTGAAAAGGCTCTGAGAAAGTCGGCTGGCCTAAGTCTCAAGAACAGTCATTCATG"
              }
            ]
          }
        ],
        "firstNodeOffset": 0,
        "finalNodeCoverLength": 3,
      },
      {
        "id": 2,
        "sequenceNew": [
          {
            "nodeName": "1",
            "mismatches": [
              {
                "type": "insertion",
                "pos": 0,
                "seq": "TCAAGAACAGTCATTCATG"
              }
            ]
          }
        ],
        "firstNodeOffset": 1,
        "finalNodeCoverLength": 5,
      }, 
      {
        "id": 3,
        "sequenceNew": [
            {
              "nodeName": "1",
              "mismatches": []
            },
            {
              "nodeName": "11",
              "mismatches": []
            },
            {
              "nodeName": "13",
              "mismatches": []
            }
        ],
        "firstNodeOffset": 2,
        "finalNodeCoverLength": 6,
      },
      {
        "id": 4,
        "sourceTrackID": "1",
        "sequence": [
          "1",
          "12",
          "13"
        ],
        "sequenceNew": [
            {
              "nodeName": "1",
              "mismatches": []
            },
            {
              "nodeName": "12",
              "mismatches": []
            },
            {
              "nodeName": "13",
              "mismatches": []
            }
        ],
        "firstNodeOffset": 4,
        "finalNodeCoverLength": 6,
      }
    ];
    expect(coverage(node, reads)).toBe(2.17);
  })
  // TEST #4
  it('can handle node of length of 30 with 2 incoming reads, 4 internal reads, and 3 outgoing reads', async () => {
    const node = {        
      sequenceLength: 30,
      incomingReads: [[0, 2], [1, 2]],
      internalReads: [2, 3, 4, 5],
      outgoingReads: [[6, 2], [7, 2], [8, 2]],
    }
    const reads = [
      {
        "id": 1,
        "sequenceNew": [
          {
            "nodeName": "1",
            "mismatches": [
              {
                "type": "insertion",
                "pos": 0,
                "seq": "CACAG"
              }
            ]
          }
        ],
        "firstNodeOffset": 2,
        "finalNodeCoverLength": 5,
      },
      {
        "id": 2,
        "sequenceNew": [
          {
            "nodeName": "1",
            "mismatches": [
              {
                "type": "insertion",
                "pos": 0,
                "seq": "TCACATG"
              }
            ]
          }
        ],
        "firstNodeOffset": 3,
        "finalNodeCoverLength": 7,
      }, 
      {
        "id": 3,
        "sequenceNew": [
            {
              "nodeName": "1",
              "mismatches": []
            },
            {
              "nodeName": "13",
              "mismatches": []
            }
        ],
        "firstNodeOffset": 16,
        "finalNodeCoverLength": 28,
      },
      {
        "id": 4,
        "sourceTrackID": "1",
        "sequenceNew": [
            {
              "nodeName": "1",
              "mismatches": []
            },
        ],
        "firstNodeOffset": 7,
        "finalNodeCoverLength": 27,
      },
      {
        "id": 5,
        "sourceTrackID": "1",
        "sequenceNew": [
            {
              "nodeName": "13",
              "mismatches": []
            },
        ],
        "firstNodeOffset": 3,
        "finalNodeCoverLength": 20,
      }, 
      {
        "id": 6,
        "sourceTrackID": "1",
        "sequenceNew": [
            {
              "nodeName": "12",
              "mismatches": []
            },
        ],
        "firstNodeOffset": 20,
        "finalNodeCoverLength": 29,
      },
      {
        "id": 7,
        "sourceTrackID": "1",
        "sequenceNew": [
            {
              "nodeName": "1",
              "mismatches": []
            },
        ],
        "firstNodeOffset": 1,
        "finalNodeCoverLength": 29,
      },
      {
        "id": 15,
        "sourceTrackID": "1",
        "sequenceNew": [
            {
              "nodeName": "1",
              "mismatches": []
            },
        ],
        "firstNodeOffset": 7,
        "finalNodeCoverLength": 30,
      },
      {
        "id": 9,
        "sourceTrackID": "1",
        "sequenceNew": [
            {
              "nodeName": "1",
              "mismatches": []
            },
        ],
        "firstNodeOffset": 3,
        "finalNodeCoverLength": 29,
      },
    ];
    expect(coverage(node, reads)).toBe(6.57);
  })
})