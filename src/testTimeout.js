// Test timeouts that respect Jest's configured default.
//
// A per-test timeout passed to it() or test() replaces Jest's default (from
// --testTimeout or the 5000 ms built-in) rather than combining with it. Pass
// atLeast(ms) instead of a bare number so that a slow environment can raise
// every limit from the command line.

// Jest's built-in default per-test timeout.
const JEST_BUILTIN_TIMEOUT = 5000;

// Get the default per-test timeout Jest is running with.
//
// Jest has no public API for this. jest-circus keeps it as testTimeout on a
// state object stored on the global under an unregistered symbol.
// TODO: This is Jest-internal and may break on a Jest upgrade, in which case
// we fall back to the built-in default and command-line increases are ignored.
function configuredTimeout() {
  const stateSymbol = Object.getOwnPropertySymbols(globalThis).find(
    (s) => s.description === "JEST_STATE_SYMBOL"
  );
  const timeout = stateSymbol && globalThis[stateSymbol]?.testTimeout;
  return typeof timeout === "number" ? timeout : JEST_BUILTIN_TIMEOUT;
}

// Get a timeout of at least ms, or longer if Jest's default is longer.
//
// Must be called while tests are being defined, after Jest has applied its
// configuration, which is the case when used as an it()/test() argument.
export function atLeast(ms) {
  return Math.max(ms, configuredTimeout());
}
