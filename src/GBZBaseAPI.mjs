import { APIInterface } from "./APIInterface.mjs";

// TODO: The Webpack way to get the WASM would be something like:
//import QueryWasm from "gbz-base/target/wasm32-wasi/release/query.wasm";
// if the export mapping is broken, or
//import QueryWasm from "gbz-base/query.wasm";
// if it is working. In Jest, not only is the export mapping not working, but
// also it can't get us a fetch-able string from the import like Webpack does.
// So we will need some fancy Jest config to mock the WASM file into a js
// module that does *something*, and also to mock fetch() into something that
// can fetch it. Or else we need to hide that all behind something that can
// fetch the WASM on either Webpack or Jest with its own strategies/by being
// swapped out.

/**
 * API implementation that uses tools compiled to WebAssembly, client-side.
 */
export class GBZBaseAPI extends APIInterface {
  constructor() {
    super();

    // We can take user uploads, in which case we need to hold on to them somewhere.
    // This holds all the file objects.
    this.files = [];

    // We need to index all their names by type.
    this.filesByType = {};

    // We need to set up our WASM
  }

  async getChunkedData(viewTarget, cancelSignal) {
    return {
      graph: {},
      gam: {},
      region: null,
      coloredNodes: [],
    };
  }

  async getFilenames(cancelSignal) {
    // Set up an empty response.
    let response = {
      files: [],
      bedFiles: [],
    };

    for (let type of this.filesByType) {
      if (type == "bed") {
        // Just send all these files in bedFiles.
        response.bedFiles = this.filesByType[type];
      } else {
        for (let fileName of this.filesByType[type]) {
          // We sens a name/type record for each non-BED file
          response.files.push({ name: fileName, type: type });
        }
      }
    }

    return response;
  }

  subscribeToFilenameChanges(handler, cancelSignal) {
    return {};
  }

  async putFile(fileType, file, cancelSignal) {
    // We track files just by array index.
    let fileName = this.files.length.toString();
    // Just hang on to the File object.
    this.files.push(file);

    if (this.filesByType[fileType] === undefined) {
      this.filesByType[fileType] = [];
    }
    // Index the name we produced by type.
    this.filesByType[fileType].push(fileName);

    return fileName;
  }

  async getBedRegions(bedFile, cancelSignal) {
    return {
      bedRegions: [],
    };
  }

  async getPathNames(graphFile, cancelSignal) {
    return {
      pathNames: [],
    };
  }

  async getChunkTracks(bedFile, chunk, cancelSignal) {
    return {
      tracks: [],
    };
  }
}

export default GBZBaseAPI;
