/**
 * Fake a new LocalAPIWorker worker in a way that works on Jest. This is used
 * under Jest to mock LocalAPIWorkerFactory.mjs with something that can run on
 * Jest.
 */

import { setUpWorker } from "../LocalAPIWorkerImplementation.mjs"

import { EventEmitter } from "events";

export default function makeWorker() { 

  // Make a couple EventEmmitters, chrome them up to look more browser-y, and
  // cross-connect their message events and postMessage functions.
  let workerSide = new EventEmitter();
  workerSide.addEventListener = workerSide.on;

  let userSide = new EventEmitter();
  userSide.addEventListener = userSide.on;

  workerSide.postMessage = (message, options) => {
    setImmediate(() => {
      userSide.emit("message", {data: message});
    });
  }

  userSide.postMessage = (message, options) => {
    setImmediate(() => {
      workerSide.emit("message", {data: message});
    });
  }

  setUpWorker(workerSide);

  // Hide the one side in the other.
  userSide.actualWorker = workerSide;

  return userSide;
 
}
