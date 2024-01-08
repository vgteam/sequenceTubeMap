import { APIInterface } from "./APIInterface.mjs";

/**
 * API implementation that uses tools compiled to WebAssembly, client-side.
 */
export class GBZBaseAPI extends APIInterface {
  constructor() {
    super();
  }

  async getChunkedData(viewTarget, cancelSignal) {
    return {};
  }

  async getFilenames(cancelSignal) {
    return [];
  }

  async getBedRegions(bedFile, cancelSignal) {
    return [];
  }

  async getPathNames(graphFile, cancelSignal) {
    return [];
  }

  async getChunkTracks(bedFile, chunk, cancelSignal) {
    return [];
  }
}

export default GBZBaseAPI;
