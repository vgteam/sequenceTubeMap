/**
 * Web Worker entry point for the local API implementation.
 *
 * Doesn't actually do any work, just hooks the guts of the implementation up to the real Web Worker in the browser.
 * Under Jest, we bypass this and polyfill some glue between the guts of the worker code and the main thread code.
 */

import { setUpWorker } from "./LocalAPIWorkerImplementation.mjs";

setUpWorker(self);
