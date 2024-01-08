// Interface for handling function called from the tubemap frontend
// Abstract class expecting different implmentations of the following functions
// Substituting different subclasses should allow the functions to give the same result
export class APIInterface {
  // Takes in and process a tube map view(viewTarget) from the tubemap container.
  // Expects a object to be returned with the necessary information to draw a tubemap from vg
  // object should contain keys: graph, gam, region, coloredNodes.
  // cancelSignal is an AbortSignal that can be used to cancel the request.
  async getChunkedData(viewTarget, cancelSignal) {
    throw new Error("getChunkedData function not implemented");
  }

  // Returns files used to determine what options are available in the track picker.
  // Returns object with keys: files, bedFiles.
  // cancelSignal is an AbortSignal that can be used to cancel the request.
  async getFilenames(cancelSignal) {
    throw new Error("getFilenames function not implemented");
  }

  // Takes in a bedfile path or a url pointing to a raw bed file.
  // Returns object with key: bedRegions.
  // bedRegions contains information extrapolated from each line of the bedfile.
  // cancelSignal is an AbortSignal that can be used to cancel the request.
  async getBedRegions(bedFile, cancelSignal) {
    throw new Error("getBedRegions function not implemented");
  }

  // Takes in a graphFile path.
  // Returns object with key: pathNames.
  // Returns pathnames available in a graphfile.
  // cancelSignal is an AbortSignal that can be used to cancel the request.
  async getPathNames(graphFile, cancelSignal) {
    throw new Error("getPathNames function not implemented");
  }

  // Expects a bed file(or url) and a chunk name.
  // Attempts to download tracks associated with the chunk name from the bed file if it is a URL.
  // Returns object with key: tracks.
  // Returns tracks found from local directories as a tracks object.
  // cancelSignal is an AbortSignal that can be used to cancel the request.
  async getChunkTracks(bedFile, chunk, cancelSignal) {
    throw new Error("getChunkTracks function not implemented");
  }
}

export default APIInterface;
