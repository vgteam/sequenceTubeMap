import { bedRegions, pathNames, mountedFileNames, chunkedData } from "./data";

export const fetchAndParse = async (path) => {
  if (path.match(/getBedRegions/)) {
    console.log("sending mock bedRegions");
    return bedRegions;
  } else if (path.match(/getPathNames/)) {
    console.log("sending mock pathNames");
    return pathNames;
  } else if (path.match(/getFilenames/)) {
    console.log("sending mock filenames");
    return mountedFileNames;
  } else if (path.match(/getChunkedData/)) {
    console.log("sending mock chunckedData");
    return chunkedData;
  }
};
