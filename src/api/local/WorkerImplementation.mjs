/**
 * Guts of the local API Web Worker. Runs in a web worker in the browser and in the main thread in Jest.
 */

export function setUpWorker(self) {
  // Here we have access to the Web Worker self (or a good immitation)

  self.addEventListener("message", (message) => {
    // Message has a data field.
    // We can move objects back with transfer
    self.postMessage({foo: "bar"}, {transfer: []});
  })
}
