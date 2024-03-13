/**
 * This file needs to be .js so Jest can mock it properly. And it needs to be
 * imported without extension.
 */

/**
 * Make a new worker in a way that only works on Webpack, outside of Jest.
 * Returns the worker object. On Jest, this will be replaced with a mock that
 * runs the worker in-process.
 */
export function makeWorker() {
  // Jest will crash if it ever sees "import.meta" in a source file, but
  // Webpack keys on this exact
  // 
  // new Worker(new URL(literal string, import.meta.url))
  // 
  // syntactic construction to know to actually pack up a
  // worker JS file.
  return new Worker(new URL('./Worker.mjs', import.meta.url));
}
