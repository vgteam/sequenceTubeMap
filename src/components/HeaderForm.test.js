import { determineRegionIndex, regionStringFromRegionIndex } from "./HeaderForm.js";


// test for determineRegionIndex and regionStringFromRegionIndex
describe("determine regionIndex and corresponding region strings for various region inputs", () => {
  // TEST #1
  it("determine regionIndex and regionString for smaller regionInfo lists", async () => {
    let regionInfo = {
      chr: [ 'ref', 'ref' ],
      start: [ '1000', '2000' ],
      end: [ '2000', '3000' ],
      desc: [ '17_1_100', 'ref_2000_3000' ],
      chunk: [ '', '' ],
      tracks: [ null, null ]
    }
    let regionString = "ref:2000-3000";
    let regionIndex = determineRegionIndex(regionString, regionInfo);
    expect(regionIndex).toBe(1);
    expect(regionStringFromRegionIndex(regionIndex, regionInfo)).toBe("ref:2000-3000");
  })
  // TEST #2
  it("determine regionIndex and regionString for larger regionInfo lists", async () => {
    let regionInfo = {
      chr: [ '17', 'ref', '17', 'ref', '17', 'ref' ],
      start: [ '100', '200', '2000', '3000', '4000', '5000' ],
      end: [ '200', '300', '3000', '4000', '5000', '6000' ],
      desc: [ '17_100_200', '17_200_300', 'ref_2000_3000', 'ref_3000_4000', 'ref_4000_5000', 'ref_5000_6000' ],
      chunk: [ '', '', '', '', '', '', '' ],
      tracks: [ null, null, null, null, null, null ]
    }
    let regionString = "17:4000-5000";
    let regionIndex = determineRegionIndex(regionString, regionInfo);
    expect(regionIndex).toBe(4);
    expect(regionStringFromRegionIndex(regionIndex, regionInfo)).toBe("17:4000-5000");
  })
  // TEST #3
  it("determine regionIndex to be null for input of region not found in regionInfo", async () => {
    let regionInfo = {
      chr: [ '17', 'ref', '17', 'ref', '17', 'ref' ],
      start: [ '100', '200', '2000', '3000', '4000', '5000' ],
      end: [ '200', '300', '3000', '4000', '5000', '6000' ],
      desc: [ '17_100_200', '17_200_300', 'ref_2000_3000', 'ref_3000_4000', 'ref_4000_5000', 'ref_5000_6000' ],
      chunk: [ '', '', '', '', '', '', '' ],
      tracks: [ null, null, null, null, null, null ]
    }
    let regionString = "17:5000-7000";
    let regionIndex = determineRegionIndex(regionString, regionInfo);
    expect(regionIndex).toBe(null);
  })
  // TEST #4
  it("determine regionIndex and regionString to be null given empty regionInfo", async () => {
    let regionInfo = {
      chr: [],
      start: [],
      end: [],
      desc: [],
      chunk: [],
      tracks: []
    }
    let regionString = "17:5000-7000";
    let regionIndex = determineRegionIndex(regionString, regionInfo);
    expect(regionIndex).toBe(null);
  })
});
