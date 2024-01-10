import { GBZBaseAPI } from "./GBZBaseAPI.mjs";

import fs from "fs-extra";

it("can be constructed", () => {
  let api = new GBZBaseAPI();
});

it("can run the WASM blob", async () => {
  let api = new GBZBaseAPI();
  await api.callWasm(["query", "--help"]);
});

it("can have a file uploaded", async () => {
  let api = new GBZBaseAPI();

  // We need to make sure we make a jsdom File (which is a jsdom Blob), and not
  // a Node Blob, for our test file. Otherwise it doesn't work with jsdom's
  // upload machinery.
  // See for example <https://github.com/vitest-dev/vitest/issues/2078> for
  // background on the many flavors of Blob.
  const fileData = await fs.readFileSync("exampleData/cactus.vg");
  // Since a Node Buffer is an ArrayBuffer, we can use it to make a jsdom File.
  // We need to put the data block in an enclosing array, or else the block
  // will be iterated and each byte will be stringified and *those* bytes will
  // be uploaded.
  const file = new window.File([fileData], "cactus.vg", {
    type: "application/octet-stream",
  });

  // Set up for canceling the upload
  let controller = new AbortController();

  let uploadName = await api.putFile("graph", file, controller.signal);

  expect(uploadName).toBeTruthy();
});
