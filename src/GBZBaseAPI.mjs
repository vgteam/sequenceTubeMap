import { APIInterface } from "./APIInterface.mjs";

/**
 * API implementation that uses tools compiled to WebAssembly, client-side.
 */
export class GBZBaseAPI extends APIInterface {
  constructor() {
    super();
  }

  async getChunkedData(viewTarget, cancelSignal) {
    return {
      graph: {},
      gam: {},
      region: null,
      coloredNodes: []
    };
  }

  async getFilenames(cancelSignal) {
    return {
      files: [],
      bedFiles: []
    };
  }

  subscribeToFilenameChanges(handler, cancelSignal) {
    return {};
  }

  async getBedRegions(bedFile, cancelSignal) {
    return {
      bedRegions: []
    };
  }

  async getPathNames(graphFile, cancelSignal) {
    return {
      pathNames: []
    };
  }

  async getChunkTracks(bedFile, chunk, cancelSignal) {
    return {
      tracks: []
    };
  }
}

export default GBZBaseAPI;
