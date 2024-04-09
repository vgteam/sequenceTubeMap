/**
 * Guts of the local API Web Worker. Runs in a web worker in the browser and in the main thread in Jest.
 */

import { RpcProvider } from "worker-rpc";

// We are actually a proxying wrapper around this actual implementation.
import { GBZBaseAPI } from "../GBZBaseAPI.mjs";

export function setUpWorker(self) {
  // Here we have access to the Web Worker self (or a good immitation)

  // Set up an RPC channel over the web worker message passing.
  // This one doesn't assume we're *really* using a worker, which is important
  // because sometimes it is mocked out.
  const rpc = new RpcProvider((message, transfer) => {
    return self.postMessage(message, transfer);
  });

  // Hook up the incoming messages to the provider.
  self.addEventListener("message", (e) => {
    return rpc.dispatch(e.data);
  });

  // Make an API implementation.
  // Really we just proxy between this in ther worker and a proxy object in the
  // page thread.
  const api = new GBZBaseAPI();
  
  // Now register RPC messages. The handlers can only take a sungle object, but
  // they can be async.
  
  // Because we can't get cancel signals themselves over the channel, we need to make new abort controllers here.
  let abortControllers = new Map();

  // Get a cancellation signal that will trip when the given request is
  // canceled. If the passed ID is undefined, returns undefined, and the
  // request cannot be canceled.
  function getSignal(requestID) {
    if (requestID === undefined) {
      return undefined;
    }
    abortControllers.set(requestID, new AbortController());
    return abortControllers.get(requestID).signal;
  }
  
  // When a request finishes, get rid of the AbortController for canceling it.
  function requestOver(requestID) {
    abortControllers.delete(requestID);
  }

  // When someone wants to cancel a request, flip its AbortController.
  function cancelRequest(requestID) {
    if (abortControllers.has(requestID)) {
      // If the request is still in flight, abort it.
      abortControllers.get(requestID).abort()
    }
  }

  // Instead of taking real cancel signals, we take unique IDs that can be canceled with another call.
  rpc.registerRpcHandler('getChunkedData', async ({viewTarget, cancelID}) => {
    try {
      return await api.getChunkedData(viewTarget, getSignal(cancelID));
    } finally {
      requestOver(cancelID);
    }
  });

  rpc.registerRpcHandler('getFilenames', async ({cancelID}) => {
    try {
      return await api.getFilenames(getSignal(cancelID));
    } finally {
      requestOver(cancelID);
    }
  });

  rpc.registerRpcHandler('putFile', async ({fileType, file, cancelID}) => {
    try {
      return await api.putFile(fileType, file, getSignal(cancelID));
    } finally {
      requestOver(cancelID);
    }
  });

  rpc.registerRpcHandler('getBedRegions', async ({bedFile, cancelID}) => {
    try {
      return await api.getBedRegions(bedFile, getSignal(cancelID));
    } finally {
      requestOver(cancelID);
    }
  });

  rpc.registerRpcHandler('getPathNames', async ({graphFile, cancelID}) => {
    try {
      return await api.getPathNames(graphFile, getSignal(cancelID));
    } finally {
      requestOver(cancelID);
    }
  });

  rpc.registerRpcHandler('getChunkTracks', async ({bedFile, chunk, cancelID}) => {
    try {
      return await api.getChunkTracks(bedFile, chunk, getSignal(cancelID));
    } finally {
      requestOver(cancelID);
    }
  });

  // Subscribe to file updates and always publish them over the link.
  // We don't ever actually abort the subscription.
  let subscriptionAbortController = new AbortController();
  api.subscribeToFilenameChanges(() => {
    rpc.rpc("_filename_change", {});
  }, subscriptionAbortController.signal);
  // TODO: Do we need to stash the returned subscription somewhere safe?

  // If a call is canceled, cancel it on this side.
  rpc.registerRpcHandler('_cancel', ({cancelID}) => {
    cancelRequest(cancelID);
  })
}
