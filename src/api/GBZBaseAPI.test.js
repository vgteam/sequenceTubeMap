import { GBZBaseAPI, blobToArrayBuffer } from "./GBZBaseAPI.mjs";

import fs from "fs-extra";

it("can be constructed", () => {
  let api = new GBZBaseAPI();
});

it("can self-test its WASM setup", async () => {
  let api = new GBZBaseAPI();
  let working = await api.available();
  expect(working).toBeTruthy();
});

it("can have a file uploaded", async () => {
  let api = new GBZBaseAPI();

  // We need to make sure we make a jsdom File (which is a jsdom Blob), and not
  // a Node Blob, for our test file. Otherwise it doesn't work with jsdom's
  // upload machinery.
  // See for example <https://github.com/vitest-dev/vitest/issues/2078> for
  // background on the many flavors of Blob.
  const fileData = await fs.readFileSync("exampleData/x.gbz.db");
  // Since a Node Buffer is an ArrayBuffer, we can use it to make a jsdom File.
  // We need to put the data block in an enclosing array, or else the block
  // will be iterated and each byte will be stringified and *those* bytes will
  // be uploaded.
  const file = new window.File([fileData], "x.gbz.db", {
    type: "application/octet-stream",
  });

  // Set up for canceling the upload
  let controller = new AbortController();

  let uploadName = await api.putFile("graph", file, controller.signal);

  expect(uploadName).toBeTruthy();
});

describe("when a file is uploaded", () => {
  let uploadName = null;
  const api = new GBZBaseAPI();

  beforeAll(async () => {
    const fileData = await fs.readFileSync("exampleData/x.gbz.db");
    const file = new window.File([fileData], "x.gbz.db", {
      type: "application/octet-stream",
    });

    // Make sure the file actually is readable
    let fileDataRetrieved = await blobToArrayBuffer(file);
    if (fileDataRetrieved.byteLength != fileData.length) {
      throw new Error("Can't put data into and out of jsdom File");
    }

    let controller = new AbortController();
    uploadName = await api.putFile("graph", file, controller.signal);
  });

  it("should show up in the list of files", async () => {
    let fileNames = await api.getFilenames();
    let found = false;
    for (let file of fileNames.files) {
      if (file.name === uploadName) {
        expect(file.type).toEqual("graph");
        found = true;
      }
    }
    expect(found).toBeTruthy();
  });

  it("can be asked for a view", async () => {
    const region = "_gbwt_ref#x:1-10";
    const viewTarget = {
      "dataType": "mounted files",
      "tracks": [
        {"trackFile": uploadName, "trackType": "graph"}
      ],
      "region": "x:1-10"
    };
    let controller = new AbortController();
    let view = await api.getChunkedData(viewTarget, controller.signal);

    expect(view.graph).toBeTruthy();
    expect(view.graph.node).toBeTruthy();
  });
});
