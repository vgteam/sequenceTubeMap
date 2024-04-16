import { cigar_string, coverage, axisIntervals } from "./tubemap";

// cigar string test
describe("cigar_string", () => {
  // TEST 1
  it("it can handle an edit that is a match and deletion", async () => {
    const readPath = {
      mapping: [
        {
          edit: [
            {
              from_length: 6,
              to_length: 4,
            },
          ],
        },
      ],
    };
    expect(cigar_string(readPath)).toBe("4M2D");
  });
  // TEST 2
  it("it can handle an edit that is a match and insertion", async () => {
    const readPath = {
      mapping: [
        {
          edit: [
            {
              from_length: 4,
              to_length: 6,
            },
          ],
        },
      ],
    };
    expect(cigar_string(readPath)).toBe("4M2I");
  });
  // TEST 3
  it("it can handle edit with double-digit length values", async () => {
    const readPath = {
      mapping: [
        {
          edit: [
            {
              from_length: 11,
              to_length: 11,
            },
            {
              from_length: 21,
              to_length: 22,
              sequence: "AA",
            },
            {
              to_length: 13,
              sequence: "A",
            },
            {
              from_length: 12,
              to_length: 10,
            },
            {
              from_length: 22,
            },
          ],
        },
        {
          edit: [
            {
              from_length: 16,
            },
          ],
        },
      ],
    };
    expect(cigar_string(readPath)).toBe("32M14I10M40D");
  });
  // TEST 4
  it("it can handle a mapping with multiple edits", async () => {
    const readPath = {
      mapping: [
        {
          edit: [
            {
              from_length: 8,
              to_length: 9,
            },
          ],
        },
        {
          edit: [
            {
              from_length: 2,
              to_length: 1,
            },
          ],
        },
        {
          edit: [
            {
              from_length: 4,
              to_length: 4,
            },
          ],
        },
        {
          edit: [
            {
              from_length: 18,
              to_length: 11,
            },
          ],
        },
        {
          edit: [
            {
              from_length: 15,
              sequence: "C",
            },
          ],
        },
        {
          edit: [
            {
              from_length: 3,
              to_length: 4,
              sequence: "G",
            },
          ],
        },
        {
          edit: [
            {
              from_length: 8,
              to_length: 9,
              sequence: "C",
            },
          ],
        },
        {
          edit: [
            {
              from_length: 10,
              to_length: 10,
              sequence: "ATCG",
            },
          ],
        },
        {
          edit: [
            {
              from_length: 15,
              to_length: 14,
              sequence: "G",
            },
          ],
        },
        {
          edit: [
            {
              to_length: 9,
              sequence: "AAAA",
            },
          ],
        },
      ],
    };
    expect(cigar_string(readPath)).toBe("8M1I1M1D15M22D3M1I8M1I24M1D9I");
  });
  // TEST 5
  it("it can handle multiple edits with lengths of 0", async () => {
    const readPath = {
      mapping: [
        {
          edit: [
            {
              from_length: 0,
              to_length: 0,
            },
          ],
        },
        {
          edit: [
            {
              from_length: 0,
              to_length: 0,
            },
          ],
        },
        {
          edit: [
            {
              from_length: 0,
              to_length: 0,
            },
          ],
        },
        {
          edit: [
            {
              from_length: 0,
              to_length: 0,
            },
          ],
        },
        {
          edit: [
            {
              from_length: 0,
              sequence: "C",
            },
          ],
        },
      ],
    };
    expect(cigar_string(readPath)).toBe("0M");
  });
});

// Test to make sure that a node and a set of reads make sense together.
function checkNodeExample(node, reads) {
  let nodeName = null;
  // Set or check node name for the given visit of the given read
  function checkNodeName(read, visitIndex) {
    let visit = read.sequenceNew[visitIndex];
    if (nodeName) {
      if (nodeName !== visit.nodeName) {
        throw new Error(
          "Different visits to this node have different node names! " +
            nodeName +
            " vs. " +
            visit.nodeName
        );
      }
    } else {
      // See if we can pick up a node name
      nodeName = visit.nodeName;
    }
  }
  for (let [readNum, visitIndex] of node.incomingReads) {
    if (readNum >= reads.length) {
      throw new Error("Incoming read " + readNum + " doesn't exist");
    }
    let read = reads[readNum];
    if (visitIndex >= read.sequenceNew.length) {
      throw new Error(
        "Incoming read " + readNum + " visit " + visitIndex + " doesn't exist"
      );
    }
    if (visitIndex == 0) {
      // This shouldn't happen a lot because it means the read started before the first node in the region.
      if (read.firstNodeOffset !== undefined && read.firstNodeOffset !== 0) {
        // This shouldn't happen ever; we can't enter this first node anywhere but the start.
        throw new Error(
          "Read is entering a node first but has a nonzero first node offset!"
        );
      }
    }
    checkNodeName(read, visitIndex);
    if (visitIndex == read.sequenceNew.length - 1) {
      // Read ends here
      if (read.finalNodeCoverLength > node.sequenceLength) {
        throw new Error("Final node cover length too long");
      }
    }
  }
  for (let readNum of node.internalReads) {
    if (readNum >= reads.length) {
      throw new Error("Internal read " + readNum + " doesn't exist");
    }
    let read = reads[readNum];
    // Internal reads can only have one visit
    let visitIndex = 0;
    if (read.sequenceNew.length !== 1) {
      throw new Error(
        "Internal reads can only visit one node, but read" +
          readNum +
          " doesn't"
      );
    }
    checkNodeName(read, visitIndex);
  }

  for (let [readNum, visitIndex] of node.outgoingReads) {
    if (readNum >= reads.length) {
      throw new Error("Outgoing read " + readNum + " doesn't exist");
    }
    let read = reads[readNum];
    if (visitIndex >= read.sequenceNew.length) {
      throw new Error(
        "Outgoing read " + readNum + " visit " + visitIndex + " doesn't exist"
      );
    }
    if (visitIndex !== 0) {
      throw new Error(
        "Outgoing read did not start at the node it is outgoing for"
      );
    }
    checkNodeName(read, visitIndex);
    if (visitIndex === 0) {
      // Read starts here
      if (read.firstNodeOffset > node.sequenceLength) {
        throw new Error("First node offset too long");
      }
    }
  }
}

// Node coverage test
describe("coverage", () => {
  // TEST #1
  it("can handle zero-length node without reads", async () => {
    const node = {
      sequenceLength: 0,
      incomingReads: [],
      internalReads: [],
      outgoingReads: [],
    };
    const reads = [];
    expect(checkNodeExample(node, reads)).toBe(undefined);
    expect(coverage(node, reads)).toBe(0.0);
  });
  // TEST #2
  it("can handle node of length 1 with 1 incoming read", async () => {
    const node = {
      sequenceLength: 1,
      incomingReads: [[1, 1]],
      internalReads: [],
      outgoingReads: [],
    };
    const reads = [
      {
        id: 1,
        type: "read",
        firstNodeOffset: 0,
        finalNodeCoverLength: 1,
        sequenceNew: [
          {
            nodeName: "1",
            mismatches: [],
          },
          {
            nodeName: "11",
            mismatches: [],
          },
          {
            nodeName: "13",
            mismatches: [],
          },
        ],
      },
      {
        id: 2,
        sequenceNew: [
          {
            nodeName: "1",
            mismatches: [],
          },
          {
            nodeName: "12",
            mismatches: [],
          },
          {
            nodeName: "13",
            mismatches: [],
          },
        ],
        firstNodeOffset: 0,
        finalNodeCoverLength: 1,
      },
    ];
    expect(checkNodeExample(node, reads)).toBe(undefined);
    expect(coverage(node, reads)).toBe(1.0);
  });
  // TEST #3
  it("can handle node of length of 6 with 2 outgoing reads and 2 internal reads", async () => {
    const node = {
      nodename: "3",
      sequenceLength: 6,
      incomingReads: [],
      internalReads: [0, 1],
      outgoingReads: [
        [2, 0],
        [3, 0],
      ],
    };
    const reads = [
      {
        id: 1,
        sequenceNew: [
          {
            nodeName: "1",
            mismatches: [
              {
                type: "insertion",
                pos: 0,
                seq: "CACAG",
              },
            ],
          },
        ],
        firstNodeOffset: 0,
        finalNodeCoverLength: 3,
      },
      {
        id: 2,
        sequenceNew: [
          {
            nodeName: "1",
            mismatches: [
              {
                type: "insertion",
                pos: 0,
                seq: "TCAAGAACAGTCATTCATG",
              },
            ],
          },
        ],
        firstNodeOffset: 1,
        finalNodeCoverLength: 5,
      },
      {
        id: 3,
        sequenceNew: [
          {
            nodeName: "1",
            mismatches: [],
          },
          {
            nodeName: "11",
            mismatches: [],
          },
          {
            nodeName: "13",
            mismatches: [],
          },
        ],
        firstNodeOffset: 2,
        finalNodeCoverLength: 6,
      },
      {
        id: 4,
        sourceTrackID: "1",
        sequence: ["1", "12", "13"],
        sequenceNew: [
          {
            nodeName: "1",
            mismatches: [],
          },
          {
            nodeName: "12",
            mismatches: [],
          },
          {
            nodeName: "13",
            mismatches: [],
          },
        ],
        firstNodeOffset: 4,
        finalNodeCoverLength: 6,
      },
    ];
    expect(checkNodeExample(node, reads)).toBe(undefined);
    expect(coverage(node, reads)).toBe(2.17);
  });
  // TEST #4
  it("can handle node of length of 30 with 2 incoming reads, 4 internal reads, and 3 outgoing reads", async () => {
    const node = {
      nodename: "4",
      sequenceLength: 30,
      incomingReads: [
        [0, 1],
        [1, 1],
      ],
      internalReads: [2, 3, 4, 5],
      outgoingReads: [
        [6, 0],
        [7, 0],
        [8, 0],
      ],
    };
    const reads = [
      {
        id: 1,
        sequenceNew: [
          {
            nodeName: "12",
            mismatches: [],
          },
          {
            nodeName: "4",
            mismatches: [],
          },
          {
            nodeName: "13",
            mismatches: [],
          },
        ],
        firstNodeOffset: 0,
        finalNodeCoverLength: 5,
      },
      {
        id: 2,
        sequenceNew: [
          {
            nodeName: "12",
            mismatches: [],
          },
          {
            nodeName: "4",
            mismatches: [],
          },
          {
            nodeName: "13",
            mismatches: [],
          },
        ],
        firstNodeOffset: 3,
        finalNodeCoverLength: 7,
      },
      {
        id: 3,
        sequenceNew: [
          {
            nodeName: "4",
            mismatches: [],
          },
        ],
        firstNodeOffset: 16,
        finalNodeCoverLength: 28,
      },
      {
        id: 4,
        sourceTrackID: "1",
        sequenceNew: [
          {
            nodeName: "4",
            mismatches: [],
          },
        ],
        firstNodeOffset: 7,
        finalNodeCoverLength: 27,
      },
      {
        id: 5,
        sourceTrackID: "1",
        sequenceNew: [
          {
            nodeName: "4",
            mismatches: [],
          },
        ],
        firstNodeOffset: 3,
        finalNodeCoverLength: 20,
      },
      {
        id: 6,
        sourceTrackID: "1",
        sequenceNew: [
          {
            nodeName: "4",
            mismatches: [],
          },
        ],
        firstNodeOffset: 20,
        finalNodeCoverLength: 29,
      },
      {
        id: 7,
        sourceTrackID: "1",
        sequenceNew: [
          {
            nodeName: "4",
            mismatches: [],
          },
          {
            nodeName: "7",
            mismatches: [],
          },
          {
            nodeName: "9",
            mismatches: [],
          },
        ],
        firstNodeOffset: 1,
        finalNodeCoverLength: 29,
      },
      {
        id: 8,
        sourceTrackID: "1",
        sequenceNew: [
          {
            nodeName: "4",
            mismatches: [],
          },
          {
            nodeName: "13",
            mismatches: [],
          },
          {
            nodeName: "12",
            mismatches: [],
          },
        ],
        firstNodeOffset: 7,
        finalNodeCoverLength: 30,
      },
      {
        id: 9,
        sourceTrackID: "1",
        sequenceNew: [
          {
            nodeName: "4",
            mismatches: [],
          },
          {
            nodeName: "10",
            mismatches: [],
          },
          {
            nodeName: "11",
            mismatches: [],
          },
        ],
        firstNodeOffset: 3,
        finalNodeCoverLength: 29,
      },
    ];
    expect(checkNodeExample(node, reads)).toBe(undefined);
    expect(coverage(node, reads)).toBe(6.57);
  });
  // TEST #5
  it("it can handle nodes with deletions in 1 read", async () => {
    const node = {
      nodename: "3",
      sequenceLength: 6,
      incomingReads: [],
      internalReads: [0, 1],
      outgoingReads: [
        [2, 0],
        [3, 0],
      ],
    };
    const reads = [
      {
        id: 1,
        sequenceNew: [
          {
            nodeName: "1",
            mismatches: [
              {
                type: "deletion",
                pos: 0,
                length: 2,
              },
            ],
          },
        ],
        firstNodeOffset: 0,
        finalNodeCoverLength: 3,
      },
      {
        id: 2,
        sequenceNew: [
          {
            nodeName: "1",
            mismatches: [
              {
                type: "insertion",
                pos: 0,
                seq: "TCAAGAACAGTCATTCATG",
              },
            ],
          },
        ],
        firstNodeOffset: 1,
        finalNodeCoverLength: 5,
      },
      {
        id: 3,
        sequenceNew: [
          {
            nodeName: "1",
            mismatches: [],
          },
          {
            nodeName: "11",
            mismatches: [],
          },
          {
            nodeName: "13",
            mismatches: [],
          },
        ],
        firstNodeOffset: 2,
        finalNodeCoverLength: 6,
      },
      {
        id: 4,
        sourceTrackID: "1",
        sequence: ["1", "12", "13"],
        sequenceNew: [
          {
            nodeName: "1",
            mismatches: [],
          },
          {
            nodeName: "12",
            mismatches: [],
          },
          {
            nodeName: "13",
            mismatches: [],
          },
        ],
        firstNodeOffset: 4,
        finalNodeCoverLength: 6,
      },
    ];
    //expect(checkNodeExample(node, reads)).toBe(undefined);
    //console.log("coverage(node, reads) for test 5:", coverage(node, reads))
    expect(coverage(node, reads)).toBe(1.83);
  });
  // TEST #6
  it("it can handle larger node with deletions in all reads", async () => {
    const node = {
      nodename: "3",
      sequenceLength: 24,
      incomingReads: [[0, 1]],
      internalReads: [1, 2],
      outgoingReads: [
        [3, 0],
        [4, 0],
      ],
    };
    const reads = [
      {
        id: 1,
        sequenceNew: [
          {
            nodeName: "1",
            mismatches: [
              {
                type: "deletion",
                pos: 0,
                length: 1,
              },
            ],
          },
        ],
        firstNodeOffset: 1,
        finalNodeCoverLength: 10,
      },
      {
        id: 2,
        sequenceNew: [
          {
            nodeName: "1",
            mismatches: [
              {
                type: "deletion",
                pos: 0,
                length: 1,
              },
            ],
          },
        ],
        firstNodeOffset: 4,
        finalNodeCoverLength: 15,
      },
      {
        id: 3,
        sequenceNew: [
          {
            nodeName: "1",
            mismatches: [
              {
                type: "deletion",
                pos: 0,
                length: 1,
              },
            ],
          },
          {
            nodeName: "11",
            mismatches: [
              {
                type: "deletion",
                pos: 0,
                length: 2,
              },
            ],
          },
          {
            nodeName: "13",
            mismatches: [
              {
                type: "deletion",
                pos: 0,
                length: 1,
              },
            ],
          },
        ],
        firstNodeOffset: 2,
        finalNodeCoverLength: 8,
      },
      {
        id: 4,
        sourceTrackID: "1",
        sequence: ["1", "12", "13"],
        sequenceNew: [
          {
            nodeName: "1",
            mismatches: [
              {
                type: "deletion",
                pos: 0,
                length: 1,
              },
            ],
          },
          {
            nodeName: "12",
            mismatches: [
              {
                type: "deletion",
                pos: 0,
                length: 1,
              },
            ],
          },
          {
            nodeName: "13",
            mismatches: [
              {
                type: "deletion",
                pos: 0,
                length: 1,
              },
            ],
          },
        ],
        firstNodeOffset: 9,
        finalNodeCoverLength: 12,
      },
      {
        id: 5,
        sequenceNew: [
          {
            nodeName: "1",
            mismatches: [
              {
                type: "deletion",
                pos: 0,
                length: 2,
              },
            ],
          },
        ],
        firstNodeOffset: 2,
        finalNodeCoverLength: 14,
      },
    ];
    expect(coverage(node, reads)).toBe(2.79);
  });
});


describe("axisIntervals", () => {
  // TEST 1
  it("can handle an empty array", async () => {
    let nodePixelCoordinates = [];
    let threshold = 1;
    expect(axisIntervals(nodePixelCoordinates, threshold)).toStrictEqual([]);
  });
  // TEST 2
  it("can handle an array of one interval", async () => {
    let nodePixelCoordinates = [[0, 1]];
    let threshold = 1;
    expect(axisIntervals(nodePixelCoordinates, threshold)).toStrictEqual([[0, 1]]);
  });
  // TEST 3
  it("can handle an array of two interval where the difference between the intervals is less than the threshold", async () => {
    let nodePixelCoordinates = [[0, 1], [1, 2]];
    let threshold = 2;
    expect(axisIntervals(nodePixelCoordinates, threshold)).toStrictEqual([[0, 1], [1, 2]]);
  });
  // TEST 4
  it("can handle an array of two interval where the difference between the intervals is greater than the threshold", async () => {
    let nodePixelCoordinates = [[0, 1], [3, 4]];
    let threshold = 1;
    expect(axisIntervals(nodePixelCoordinates, threshold)).toStrictEqual([[0, 1], [3, 4]]);
  });
  // TEST 5
  it("can handle an array of two interval where the difference between the intervals is equal to the threshold", async () => {
    let nodePixelCoordinates = [[0, 1], [2, 3]];
    let threshold = 1;
    expect(axisIntervals(nodePixelCoordinates, threshold)).toStrictEqual([[0, 1], [2, 3]]);
  });
  // TEST 6
  it("can handle an array of repeating intervals", async () => {
    let nodePixelCoordinates = [[0, 1], [2, 3], [2, 3], [2, 3], [2, 3], [2, 3], [4, 5]];
    let threshold = 1;
    expect(axisIntervals(nodePixelCoordinates, threshold)).toStrictEqual([[0, 1], [2, 3], [4, 5]]);
  });
  // TEST 7
  it("can handle an array of out of order intervals", async () => {
    let nodePixelCoordinates = [[2, 3], [0, 1], [5, 6], [2, 4]];
    let threshold = 1;
    expect(axisIntervals(nodePixelCoordinates, threshold)).toStrictEqual([[0, 1], [2, 4], [5, 6]]);
  });
  it("can handle an array of larger, more spaced out intervals, with a larger threshold", async () => {
    let nodePixelCoordinates = [[0, 10], [12, 15], [0, 10], [18, 29], [53, 117]];
    let threshold = 20;
    expect(axisIntervals(nodePixelCoordinates, threshold)).toStrictEqual([[0, 29], [53, 117]]);
  });
});