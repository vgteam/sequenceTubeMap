import { fetchAndParse } from "../fetchAndParse.js";
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
    let subscription = {};

    // We make a function to connect the websocket, which we can call to reconnect.
    let connect = () => {
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
    };

    connect();

    // Give the subscription back to the caller to hold.
    // TODO: Do we really need to hold the web socket in scope?
    // TODO: How does the user close the socket without a message arriving after cancelation?
    return subscription;
  }

  async putFile(fileType, file, cancelSignal) {
    // Prepare the form data for upload
    const formData = new FormData();
    // If the file is anything other than a Blob, it will be turned into a
    // string and added as a normal form value. If it is a Blob it will
    // become a file upload. Note that a File is a kind of Blob. See
    // <https://developer.mozilla.org/en-US/docs/Web/API/FormData/append#value>
    //
    // But in jsdom in the test environment there are two Blob types: Node's
    // and jdsom's, and only jsdom's will work. Node's will turn into a
    // string. And it seems hard to get at both types in a way that makes
    // sense in a browser. So we will add the file and make sure it added OK
    // and didn't stringify.

    // According to <https://stackoverflow.com/a/43914175>, we *must* set a filename for uploads.
    // In jsdom it turns on jsdom's own type checking support.
    let fileName = file.name || "upload.dat";
    formData.append("trackFile", file, fileName);
    if (typeof formData.get("trackFile") == "string") {
      // Catch stringification in case jsdom didn't.
      console.error(
        "Cannot upload file because it is not the appropriate type:",
        file
      );
      throw new Error("File is not an appropriate type to upload");
    }
    // Make sure server can identify a Read file
    formData.append("fileType", fileType);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.responseType = "json";
      xhr.onreadystatechange = () => {
        if (cancelSignal.aborted && xhr.readyState !== 0) {
          // First time we have noticed we are aborted. Stop the request.
          xhr.abort();
          reject(new Error("Upload aborted"));
          return;
        }

        if (xhr.readyState === 4) {
          if (xhr.status === 200 && xhr.response.path) {
            // Every thing ok, file uploaded, and we got a path.
            resolve(xhr.response.path);
          } else {
            // Something weird happened.
            reject(
              new Error(
                "Failed to upload file: status " +
                  xhr.status +
                  " and response: " +
                  xhr.response
              )
            );
          }
        }
      };

      console.log("Uploading file", file);
      console.log("Sending form data", formData);
      console.log("Form file is a " + typeof formData.get("trackFile"));
      xhr.open("POST", `${this.apiUrl}/trackFileSubmission`, true);
      xhr.send(formData);
    });
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
