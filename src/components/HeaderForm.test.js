import { regionStringFromRegionIndex } from "./HeaderForm";
import { parseRegion } from "../common.mjs";

const determineRegionIndexTest = (regionString, regionInfo) => {
  let parsedRegion;
  try {
    parsedRegion = parseRegion(regionString);
  } catch(error) {
    return null;
  }
  if (!regionInfo["chr"]){
    return null;
  }
  for (let i = 0; i < regionInfo["chr"].length; i++){
    if ((parseInt(regionInfo["start"][i]) === parsedRegion.start) 
        && (parseInt(regionInfo["end"][i]) === parsedRegion.end)
        && (regionInfo["chr"][i] === parsedRegion.contig)){
          return i;
    }
  }
  return null;
}

// const regionStringFromRegionIndex = (regionString, regionInfo) => {

// test for determineRegionIndex and regionStringFromRegionIndex
describe("determine regionIndex and corresponding strings for various region inputs", () => {
  // TEST #1
  it("determine regionIndex and regionString for input of ref:2000-3000", async () => {
    let regionInfo = {
      chr: [ 'ref', 'ref' ],
      start: [ '1000', '2000' ],
      end: [ '2000', '3000' ],
      desc: [ '17_1_100', 'ref_2000_3000' ],
      chunk: [ '', '' ],
      tracks: [ null, null ]
    }
    let regionString = "ref:2000-3000";
    let regionIndex = determineRegionIndexTest(regionString, regionInfo);
    expect(regionIndex).toBe(1);
    //console.log("regionStringFromRegionIndex(1): ", regionStringFromRegionIndex(regionIndex));
    //expect(regionStringFromRegionIndex(regionIndex)).toBe("ref:2000-3000");
  })
  // TEST #2
  it("determine regionIndex and regionString for input of ref:4000-5000", async () => {
    let regionInfo = {
      chr: [ '17', 'ref', '17', 'ref', '17', 'ref' ],
      start: [ '100', '200', '2000', '3000', '4000', '5000' ],
      end: [ '200', '300', '3000', '4000', '5000', '6000' ],
      desc: [ '17_100_200', '17_200_300', 'ref_2000_3000', 'ref_3000_4000', 'ref_4000_5000', 'ref_5000_6000' ],
      chunk: [ '', '', '', '', '', '', '' ],
      tracks: [ null, null, null, null, null, null ]
    }
    let regionString = "17:4000-5000";
    let regionIndex = determineRegionIndexTest(regionString, regionInfo);
    expect(regionIndex).toBe(4);
    //console.log("regionStringFromRegionIndex(1): ", regionStringFromRegionIndex(regionIndex));
    //expect(regionStringFromRegionIndex(regionIndex)).toBe("ref:2000-3000");
  })
});


// test for determineRegionIndex and regionStringFromRegionIndex
describe("determine regionIndex for input of ref:2000-3000", () => {
  
});