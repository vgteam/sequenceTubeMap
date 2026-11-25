// Helpers shared by test files.

// Jest's built-in default per-test timeout.
const JEST_BUILTIN_TIMEOUT = 5000;

// Find jest-circus's internal state object, or undefined if it can't be found.
//
// jest-circus stores this on the test file's global under an unregistered
// symbol named JEST_STATE_SYMBOL, and applies the Jest configuration to it
// before loading setup and test files. See Jest v27.5.1:
// https://github.com/jestjs/jest/blob/67c1aa20c5fec31366d733e901fee2b981cb1850/packages/jest-circus/src/types.ts#L12-L14
// https://github.com/jestjs/jest/blob/67c1aa20c5fec31366d733e901fee2b981cb1850/packages/jest-circus/src/state.ts#L33-L46
// https://github.com/jestjs/jest/blob/67c1aa20c5fec31366d733e901fee2b981cb1850/packages/jest-circus/src/legacy-code-todo-rewrite/jestAdapterInit.ts#L67-L69
// https://github.com/jestjs/jest/blob/67c1aa20c5fec31366d733e901fee2b981cb1850/packages/jest-circus/src/legacy-code-todo-rewrite/jestAdapter.ts#L26-L85
// TODO: This is not a public Jest API and may break on a Jest upgrade.
export function findJestState() {
  const stateSymbol = Object.getOwnPropertySymbols(globalThis).find(
    (s) => s.description === "JEST_STATE_SYMBOL"
  );
  return stateSymbol && globalThis[stateSymbol];
}

// Get the default per-test timeout Jest is running with, from --testTimeout
// or the built-in default.
//
// Jest has no public API for this. If Jest's internal state can't be found,
// return the built-in default, ignoring any --testTimeout.
function configuredTimeout() {
  const timeout = findJestState()?.testTimeout;
  return typeof timeout === "number" ? timeout : JEST_BUILTIN_TIMEOUT;
}

// Get a per-test timeout of at least ms, or longer if Jest's default is
// longer.
//
// Pass this to it() or test() instead of a bare number. A bare number replaces
// Jest's default instead of combining with it, so --testTimeout could not
// raise it for a slow environment.
export function timeoutAtLeast(ms) {
  return Math.max(ms, configuredTimeout());
}
