import { APIInterface } from "./APIInterface.mjs";
import { readFile } from "fs-extra";
import { WASI, File, OpenFile, PreopenDirectory } from "@bjorn3/browser_wasi_shim";

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

// Resolve with the bytes of the WASM query blob, on Jest or Webpack.
async function getWasmBytes() {
  let blobBytes = null;

  if (!jest) {
    // Not running on Jest, we should be able to dynamic import a binary asset and get the bytes, and Webpack will handle it.
    try {
      blobBytes = await import("gbz-base/target/wasm32-wasi/release/query.wasm");
    } catch (e) {
      console.error("Could not dynamically import WASM blob.", e);
      // Leave blobBytes unset to try a fallback method.
    }
  }

  if (!blobBytes) {
    // Either we're on Jest, or the dynamic import didn't work (maybe we're on plain Node?).
    // Try to open the file from the filesystem.
    blobBytes = await readFile("node_modules/gbz-base/target/wasm32-wasi/release/query.wasm");
  } 

  console.log("Got blob bytes: ", blobBytes);
  return blobBytes;
}

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

    // This is a promise for the compiled WebAssembly blob.
    this.compiledWasm = undefined;
  }

  // Make sure our WASM backend is ready.
  async setUp() {
    if (this.compiledWasm === undefined) {
      // Kick off and save exactly one request to get and load the WASM bytes.
      this.compiledWasm = WebAssembly.compile(await getWasmBytes());
    }

    // Wait for the bytes to be available.
    this.compiledWasm = await this.compiledWasm;
  }

  // Make a call into the WebAssembly code and return the result.
  async callWasm(argv) {
    if (argv.length < 1) {
      // We need at least one command line argument to be the program name.
      throw new Error("Not safe to invoke main() without program name");
    }

    await this.setUp();
    let wasm = this.compiledWasm;

    // Define the places to store program input and output
    let stdin = new File([]);
    let stdout = new File([]);
    let stderr = new File([]);

    // Environment variables as NAME=value strings
    const environment = ["RUST_BACKTRACE=full"];
    
    // File descriptors for the process in number order
    let file_descriptors = [new OpenFile(stdin), new OpenFile(stdout), new OpenFile(stderr)];
   
    // Set up the WASI interface
    let wasi = new WASI(argv, environment, file_descriptors);
    
    // Set up the WebAssembly run
    let instantiation = await WebAssembly.instantiate(this.compiledWasm, {
        "wasi_snapshot_preview1": wasi.wasiImport,
    });
    
    try {
      // Make the WASI system call main
      let returnCode = wasi.start(instantiation);
      console.log("Return code:", returnCode);
    } finally {
      // The WASM code can throw right out of the WASI shim if Rust panics.
      console.log("Standard Output:", new TextDecoder().decode(stdout.data));
      console.log("Standard Error:", new TextDecoder().decode(stderr.data));
    }
  }

  /////////
  // Tube Map API implementation
  /////////

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
