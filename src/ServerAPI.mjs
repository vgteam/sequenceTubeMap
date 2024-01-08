import { fetchAndParse } from "./fetchAndParse.js";
import { APIInterface } from "./APIInterface.mjs";

/**
 * API implementation that uses vg running on the server to manipulate files.
 */
export class ServerAPI extends APIInterface {
  constructor(apiUrl) {
    super();
    this.apiUrl = apiUrl;
  }

  // Each function takes a cancelSignal to cancel the fetch request if we will unmount component

  async getChunkedData(viewTarget, cancelSignal) {
    const json = await fetchAndParse(`${this.apiUrl}/getChunkedData`, {
      signal: cancelSignal,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(viewTarget),
    });
    return json;
  }

  async getFilenames(cancelSignal) {
    const json = await fetchAndParse(`${this.apiUrl}/getFilenames`, {
      signal: cancelSignal,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return json;
  }

  subscribeToFilenameChanges(handler, cancelSignal) {
    // We need something to hold the one currently active websocket.
    subscription = {};

    // We make a function to connect the websocket, which we can call to reconnect.
    function connect() {
      subscription.ws = new WebSocket(this.apiUrl.replace(/^http/, "ws"));
      subscription.ws.onmessage = (message) => {
        if (!cancelSignal.aborted) {
          // Tell the user that something changed
          handler();
        } else {
          subscription.ws.close();
        }
      };
      subscription.ws.onclose = (event) => {
        if (!cancelSignal.aborted) {
          // Reconnect if the socket closed
          setTimeout(connect, 1000);
        }
      };
      subscription.ws.onerror = (event) => {
        // Close the socket if something went wrong
        subscription.ws.close();
      };
    }

    connect();

    // Give the subscription back to the caller to hold.
    // TODO: Do we really need to hold the web socket in scope?
    // TODO: How does the user close the socket without a message arriving after cancelation?
    return subscription;
  }

  async getBedRegions(bedFile, cancelSignal) {
    const json = await fetchAndParse(`${this.apiUrl}/getBedRegions`, {
      signal: cancelSignal,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bedFile }),
    });
    return json;
  }

  async getPathNames(graphFile, cancelSignal) {
    const json = await fetchAndParse(`${this.apiUrl}/getPathNames`, {
      signal: cancelSignal,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ graphFile }),
    });
    return json;
  }

  async getChunkTracks(bedFile, chunk, cancelSignal) {
    const json = await fetchAndParse(`${this.apiUrl}/getChunkTracks`, {
      signal: cancelSignal,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bedFile: bedFile, chunk: chunk }),
    });
    return json;
  }
}

export default ServerAPI;
