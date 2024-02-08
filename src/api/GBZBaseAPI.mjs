import "../config-client.js";
import { APIInterface } from "./APIInterface.mjs";
import { WASI, File, OpenFile, PreopenDirectory } from "@bjorn3/browser_wasi_shim";

import {
  parseRegion,
  convertRegionToRangeRegion,
  stringifyRegion
} from "../common.mjs";

// The Webpack way to get the WASM would be something like:
// 
// import QueryWasm from "gbz-base/query.wasm";
// 
// In Jest, not only is the export mapping not working, but also it can't get
// us a fetch-able string from the import like Webpack does.
//
// So we use this function to detect if we are on Jest and get the blob from
// the filesystem then, and to otherwise get ti with fetch.

// Resolve with the bytes or Response of the WASM query blob, on Jest or Webpack.
async function getWasmBytes() {
  if (getWasmBytes.cached) {
    return getWasmBytes.cached;
  }

  let blobBytes = null;

  if (!window["jest"]) {
    // Not running on Jest, we should be able to dynamic import a binary asset
    // by export name and get the bytes, and Webpack will handle it.
    try {
      let blobImport = await import("gbz-base/query.wasm");
      return fetch(blobImport.default);
    } catch (e) {
      console.error("Could not dynamically import WASM blob.", e);
      // Leave blobBytes unset to try a fallback method.
    }
  }

  if (!blobBytes) {
    // Either we're on Jest, or the dynamic import didn't work (maybe we're on
    // plain Node?).
    //
    // Try to open the file from the filesystem.
    //
    // Don't actually try and ship the filesystem module in the browser though:
    // see <https://webpack.js.org/api/module-methods/#webpackignore>
    let fs = await import(/* webpackIgnore: true */ "fs-extra");
    blobBytes = await fs.readFile("node_modules/gbz-base/target/wasm32-wasi/release/query.wasm");
  } 

  console.log("Got blob bytes: ", blobBytes);
  getWasmBytes.cached = blobBytes;
  return blobBytes;
}

/**
 * Get an ArrayBuffer from a Blob. Works in both the browser and in jsdom
 * (which doesn't actually implement .arrayBuffer(); see
 * <https://github.com/jsdom/jsdom/issues/2555>).
 */
export async function blobToArrayBuffer(blob) {
  try {
    // Browser blob has this method.
    return await blob.arrayBuffer()
  } catch {
    // jsdom blob needs to go through a FileReader
    return new Promise((resolve, reject) => {
      let reader = new FileReader();
      reader.addEventListener("load", () => { resolve(reader.result); });
      reader.addEventListener("error", () => { reject(reader.error); });
      reader.readAsArrayBuffer(blob);
    });
  }
}

/**
 * Convert a graph from GBZ-style JSON to vg-style JSON that matches the vg
 * protobuf schema. See
 * <https://github.com/vgteam/libvgio/blob/45d8ada05ee1d1405ef44d93f2ac00a5a097dd09/deps/vg.proto>
 *
 * Does not leave the input graph intact.
 */
function convertSchema(inGraph) {
  
  let outGraph = {};

  // "nodes" becomes "node"
  outGraph["node"] = inGraph["nodes"];

  // We have to track the node lengths to synthisize the path mappings.
  let nodeLength = new Map();
  for (let node of outGraph["node"]) {
    nodeLength.set(node["id"], node["sequence"].length);
  }

  // "edges" becomes "edge"
  outGraph["edge"] = inGraph["edges"];
  for (let edge of outGraph["edge"]) {
    // And the names for the reverse flags change.
    edge["from_start"] = edge["from_is_reverse"];
    delete edge["from_is_reverse"];
    edge["to_end"] = edge["to_is_reverse"];
    delete edge["to_is_reverse"];
  }

  // "paths" becomes "path"
  outGraph["path"] = inGraph["paths"];
  for (let path of outGraph["path"]) {
    path["mapping"] = [];
    for (let visit of path["path"]) {
      let length = nodeLength.get(visit["id"]);
      // Make a full-length perfect match mapping
      let mapping = {
        "position": {"node_id": visit["id"], "is_reverse": visit["is_reverse"]},
        "edit": [{"from_length": length, "to_length": length}]
      };
      path["mapping"].push(mapping);
    }

    delete path["path"];
  }
  return outGraph;
}

/**
 * API implementation that uses tools compiled to WebAssembly, client-side.
 *
 * Can operate either in the main thread or in a worker, but handles file
 * uploads differently depending on where you put it.
 */
export class GBZBaseAPI extends APIInterface {
  constructor() {
    super();

    // We can take user uploads, in which case we need to hold on to them somewhere.
    // This holds all the file objects.
    this.files = [];

    // We need to index all their names by type.
    this.filesByType = new Map();

    // This is a promise for the compiled WebAssembly blob.
    this.compiledWasm = undefined;
  }

  // Make sure our WASM backend is ready.
  async setUp() {
    if (this.compiledWasm === undefined) {
      // Kick off and save exactly one request to get and load the WASM bytes.
      this.compiledWasm = getWasmBytes().then((result) => {
        if (result instanceof Response) {
          // If a fetch request was made, compile as it streams in
          return WebAssembly.compileStreaming(result);
        } else {
          // We have all the bytes, so compile right away.
          // TODO: Put this logic in the function?
          return WebAssembly.compile(result);
        }
      });
    }

    // Wait for the bytes to be available.
    this.compiledWasm = await this.compiledWasm;
  }

  // Make a call into the WebAssembly code and return the result.
  //
  // If workingDirectory is set, it is an object from filename to blob to
  // present as the current directory.
  async callWasm(argv, workingDirectory) {
    if (argv.length < 1) {
      // We need at least one command line argument to be the program name.
      throw new Error("Not safe to invoke main() without program name");
    }
    
    // Make sure this.compiledWasm is set.
    // TODO: Change to an accessor method?
    await this.setUp();
    
    // Define the places to store program input and output
    let stdin = new File([]);
    let stdout = new File([]);
    let stderr = new File([]);

    // Environment variables as NAME=value strings
    const environment = ["RUST_BACKTRACE=full"];
    
    // File descriptors for the process in number order
    let fileDescriptors = [new OpenFile(stdin), new OpenFile(stdout), new OpenFile(stderr)];
    
    if (workingDirectory) {
      let nameToWASIFile = {};
      for (const [filename, blob] of Object.entries(workingDirectory)) {
        console.log(`Mount ${blob.size} byte blob:`, blob);
        // TODO: We need to get an ArrayBuffer or something from the blob so that the WASI shim can read it.
        // We want to do it in a way that doesn't read the whole file from disk when it's a browser File.
        // We also need to do it in a way that works when it's a jsdom File that doesn't implement the arrayBuffer() method.
        // For now we use the FIleReader workaround if we can't arrayBuffer().
        // Later we will need to use OpenSyncOPFSFile and implement an object with a handle that can sync read and write at offsets.
        // TODO: How will this be sync???
        // Maybe get into a worker and use https://developer.mozilla.org/en-US/docs/Web/API/FileReaderSync
        // Or hackily use a sync XHR like https://stackoverflow.com/a/76999249
        nameToWASIFile[filename] = new File(await blobToArrayBuffer(blob));
        console.log("Mount file:", nameToWASIFile[filename]);
      }
      // As shown in the browser_wasi_shim examples, if we provide a
      // PreopenDirectory at FD 4 it is shown to the process.
      fileDescriptors.push(new PreopenDirectory(".", nameToWASIFile));
    }

    // Set up the WASI interface
    let wasi = new WASI(argv, environment, fileDescriptors);
    
    // Set up the WebAssembly run
    let instantiation = await WebAssembly.instantiate(this.compiledWasm, {
        "wasi_snapshot_preview1": wasi.wasiImport,
    });
    
    console.log("Running WASM with arguments:", argv)
    console.log("Running WASM with FDs:", fileDescriptors)

    let returnCode = null;
    let stdOutText = null;
    let stdErrText = null;

    try {
      // Make the WASI system call main
      returnCode = wasi.start(instantiation);
      // TODO: the shim logs loads of attempts to make/open the lock file, is it maybe not being allowed to be read back?
      // TODO: Our return code is undefined for some reason; it is supposed to come out of start.
      console.log("Execution finished with return code:", returnCode);
    } finally {
      // The WASM code can throw right out of the WASI shim if Rust panics.
      stdOutText = new TextDecoder().decode(stdout.data);
      stdErrText = new TextDecoder().decode(stderr.data);
      console.log("Standard Output:", stdOutText);
      console.log("Standard Error:", stdErrText);
    }

    return {returnCode, stdout: stdOutText, stderr: stdErrText}
  }
  
  // Return true if the WASM setup is working, and false otherwise.
  async available() {
    try {
      await this.callWasm(["query", "--help"]);
      return true;
    } catch {
      return false;
    }
  }

  /////////
  // Tube Map API implementation
  /////////

  async getChunkedData(viewTarget, cancelSignal) {
  
    console.log("Got view target:", viewTarget)

    // Find the graph track
    let graphTrack = null
    // TODO: We need to handle object tracks; move to array tracks only!
    for (let trackKey in viewTarget.tracks) {
      let track = viewTarget.tracks[trackKey];
      if (track.trackType === "graph") {
        graphTrack = track;
      }
    }
    if (!graphTrack) {
      throw new Error("No graph track selected");
    }

    // Since all the names are numbers, parse it and get the real file blob
    let graphFileBlob = this.files[parseInt(graphTrack.trackFile)];

    if (graphFileBlob === undefined) {
      throw new Error("Graph file " + graphTrack.trackFile + " does not exist");
    }

    // Find the region
    let region = convertRegionToRangeRegion(parseRegion(viewTarget.region));

    if (!region.contig.includes("#")) {
      // This isn't PanSN already so adjust to ask for a generic path.
      region.contig = "_gbwt_ref#" + region.contig;
    }

    let parts = region.contig.split("#");

    let {stdout} = await this.callWasm(["query", "--sample", parts[0], "--contig", parts[parts.length - 1], "--interval", `${region.start}..${region.end}`, "--format", "json", "--distinct", "graph.gbz.db"], {"graph.gbz.db": graphFileBlob});

    let result = convertSchema(JSON.parse(stdout));

    return {
      graph: result,
      gam: [],
      region: stringifyRegion(region),
      coloredNodes: [],
    };
  }

  async getFilenames(cancelSignal) {
    // Set up an empty response.
    let response = {
      files: [],
      bedFiles: [],
    };

    for (let [type, files] of this.filesByType) {
      if (type === "bed") {
        // Just send all these files in bedFiles.
        response.bedFiles = files;
      } else {
        for (let fileName of files) {
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

    console.log(`Store ${file.size} byte upload:`, file);

    if (!this.filesByType.has(fileType)) {
      this.filesByType.set(fileType, []);
    }
    // Index the name we produced by type.
    this.filesByType.get(fileType).push(fileName);

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
