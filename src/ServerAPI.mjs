import { fetchAndParse } from "./fetchAndParse.js";
import { APIInterface } from "./APIInterface.mjs";

export class ServerAPI extends APIInterface {
    constructor(apiUrl) {
        super();
        this.apiUrl = apiUrl;
        this.fetchCanceler = new AbortController();
        this.cancelSignal = this.fetchCanceler.signal;
    }

    async getChunkedData(viewTarget) {
        const json = await fetchAndParse(`${this.apiUrl}/getChunkedData`, {
            signal: this.cancelSignal, // (so we can cancel the fetch request if we will unmount component)
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify(viewTarget),
        });
        return json;
    }

    async getFilenames() {
        const json = await fetchAndParse(`${this.apiUrl}/getFilenames`, {
            signal: this.cancelSignal, // (so we can cancel the fetch request if we will unmount component)
            method: "GET",
            headers: {
            "Content-Type": "application/json",
            },
        });
        return json;
    }

    async getBedRegions(bedFile) {
        const json = await fetchAndParse(`${this.apiUrl}/getBedRegions`, {
            signal: this.cancelSignal, // (so we can cancel the fetch request if we will unmount component)
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({ bedFile }),
        });
        return json;
    }

    async getPathNames(graphFile) {
        const json = await fetchAndParse(`${this.apiUrl}/getPathNames`, {
            signal: this.cancelSignal, // (so we can cancel the fetch request if we will unmount component)
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({ graphFile }),
        });
        return json
    }

    async getChunkTracks(bedFile, chunk) {
        const json = await fetchAndParse(`${this.apiUrl}/getChunkTracks`, {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({ bedFile: bedFile, chunk: chunk }),
        });
        return json;
    }

    abortRequests() {
        this.fetchCanceler.abort();
    }
}

export default ServerAPI;