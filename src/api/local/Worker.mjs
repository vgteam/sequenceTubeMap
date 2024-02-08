/**
 * Web Worker entry point for the local API implementation.
 *
 * Doesn't actually do any work, just hooks the guts of the implementation up
 * to the real Web Worker in the browser. Under Jest, we bypass this and
 * polyfill some event emitters around the implementation instead. See
 * WorkerFactory.js and its mock.
 */

import { setUpWorker } from "./WorkerImplementation.mjs";

setUpWorker(self);
