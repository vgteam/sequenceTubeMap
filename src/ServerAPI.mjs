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
        return json
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
