import { fetchAndParse } from "../fetchAndParse";

export class APIInterface {
    constructor(apiUrl, cancelSignal) {
        this.apiUrl = apiUrl;
        this.cancelSignal = cancelSignal;
    }

    async getChunkedData(viewTarget) {
        try {
            const json = await fetchAndParse(`${this.apiUrl}/getChunkedData`, {
                signal: this.cancelSignal, // (so we can cancel the fetch request if we will unmount component)
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify(viewTarget),
            });
            return json;
        } catch(error) {
            throw error;
        }
    }

    async getFilenames() {
        try {
            const json = await fetchAndParse(`${this.apiUrl}/getFilenames`, {
                signal: this.cancelSignal, // (so we can cancel the fetch request if we will unmount component)
                method: "GET",
                headers: {
                "Content-Type": "application/json",
                },
            });
            return json;
        } catch (error) {
            throw error;
        }
    }

    async getBedRegions(bedFile) {
        try {
            const json = await fetchAndParse(`${this.apiUrl}/getBedRegions`, {
                signal: this.cancelSignal, // (so we can cancel the fetch request if we will unmount component)
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify({ bedFile }),
            });
            return json;
        } catch (error) {
            throw error;
        }
    }

    async getPathNames(graphFile) {
        try {
            const json = await fetchAndParse(`${this.apiUrl}/getPathNames`, {
                signal: this.cancelSignal, // (so we can cancel the fetch request if we will unmount component)
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify({ graphFile }),
            });
            return json
        } catch (error) {
            throw error;
        }
    }

    async getChunkTracks(bedFile, chunk) {
        try {
            const json = await fetchAndParse(`${this.apiUrl}/getChunkTracks`, {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify({ bedFile: bedFile, chunk: chunk }),
            });
            return json;
        } catch (error) {
            throw error;
        }
    }
}

export default APIInterface;