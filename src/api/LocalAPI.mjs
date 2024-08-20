import { APIInterface } from "./APIInterface.mjs";

import { makeWorker } from "./local/WorkerFactory.js";

import { RpcProvider } from "worker-rpc";


/**
 * API implementation that uses a web worker to run a GBZBaseAPI.
 */
export class LocalAPI extends APIInterface {
  constructor() {
    super();

    // Make a worker
    this.worker = makeWorker();

    // Make an RPC channel to the worker
    this.rpc = new RpcProvider((message, transfer) => {
      this.worker.postMessage(message, transfer);
    });

    // Hook up the incoming messages to the provider.
    this.worker.addEventListener("message", (e) => {
      return this.rpc.dispatch(e.data);
    });

    // Each call that can be canceled gets an ID for canceling it over the
    // channel to the worker.
    this.nextID = 0;

    // File name change subscriptions go through this EventTarget
    this.nameChangeEvents = new EventTarget();

    this.rpc.registerRpcHandler("_filename_change", async () => {
      // If a filename change message comes in from the worker, tell our
      // subscribers.
      this.nameChangeEvents.dispatchEvent(new CustomEvent("change"));
    });
  }

  /// Get a fresh RPC cancelation ID that will be canceled if the given
  /// AbortSignal aborts. If no AbortSignal is passed, returns undefined.
  getCancelID(signal) {
    if (signal === undefined) {
      // We don't need an ID, this request is uncancelable.
      return undefined;
    }
    let cancelID = this.nextID;
    this.nextID++;
    signal.addEventListener("abort", () => {
      this.rpc.rpc("_cancel", {cancelID});
    });
    return cancelID
  }

  /////////
  // Tube Map API implementation
  /////////

  async getChunkedData(viewTarget, cancelSignal) {
    let cancelID = this.getCancelID(cancelSignal);
    return await this.rpc.rpc("getChunkedData", {viewTarget, cancelID});
  }

  async getFilenames(cancelSignal) {
    let cancelID = this.getCancelID(cancelSignal);
    return await this.rpc.rpc("getFilenames", {cancelID});
  }

  subscribeToFilenameChanges(handler, cancelSignal) {
    let eventHandler = () => {
      if (!cancelSignal.aborted) {
        // Protect the real handler from event arguments and also calls after
        // canceling.
        handler();
      }
    };
    let unsubscribe = () => {
      // When the signal aborts, clean up everything so we don't keep any
      // references to things.
      this.nameChangeEvents.removeEventListener("change", eventHandler);
      cancelSignal.removeEventListener("abort", unsubscribe);
    };
    this.nameChangeEvents.addEventListener("change", eventHandler);
    cancelSignal.addEventListener("abort", unsubscribe);
    return {};
  }

  async putFile(fileType, file, cancelSignal) {
    let cancelID = this.getCancelID(cancelSignal);
    // The RPC system magically takes care of transfering the file via transfer. Probably.
    return await this.rpc.rpc("putFile", {fileType, file, cancelID});
  }

  async getBedRegions(bedFile, cancelSignal) {
    let cancelID = this.getCancelID(cancelSignal);
    return await this.rpc.rpc("getBedRegions", {bedFile, cancelID});
  }

  async getPathNames(graphFile, cancelSignal) {
    let cancelID = this.getCancelID(cancelSignal);
    return await this.rpc.rpc("getPathNames", {graphFile, cancelID});
  }

  async getChunkTracks(bedFile, chunk, cancelSignal) {
    let cancelID = this.getCancelID(cancelSignal);
    return await this.rpc.rpc("getChunkTracks", {bedFile, chunk, cancelID});
  }
}

export default LocalAPI;
