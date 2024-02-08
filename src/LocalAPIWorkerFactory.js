/**
 * Make a new LocalAPIWorker worker in a way that only works on Webpack, outside of Jest.
 * Returns the worker object.
 */
export default function makeWorker() { 
  return new Worker(new URL('./LocalAPIWorker.mjs', import.meta.url));
}
