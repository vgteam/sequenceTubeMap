/**
 * Web Worker entry point for the local API implementation.
 *
 * Doesn't actually do any work, just hooks the guts of the implementation up
 * to the real Web Worker in the browser. Under Jest, we bypass this and
 * polyfill some event emitters around the implementation instead. See
 * WorkerFactory.js and its mock.
 */

import { setUpWorker } from "./WorkerImplementation.mjs";

// Because of Create React App's Opinions, we can't use the idiomatic "self"
// here without fiddling with the linter. See
// <https://github.com/facebook/create-react-app/issues/12847>. Supposedly
// there's a way to get at the service worker with "this", but "this" right now
// appears undefined in the browser.
/* eslint-disable no-restricted-globals */
setUpWorker(self);
