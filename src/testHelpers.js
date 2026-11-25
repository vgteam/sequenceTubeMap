// Helpers shared by test files.

// Jest's built-in default per-test timeout.
const JEST_BUILTIN_TIMEOUT = 5000;

// Find jest-circus's internal state object, or undefined if it can't be found.
export function findJestState() {
  // jest-circus stores this on the test file's global under an unregistered
  // symbol named JEST_STATE_SYMBOL, and applies the Jest configuration to it
  // before loading setup and test files. See Jest v27.5.1:
  // https://github.com/jestjs/jest/blob/67c1aa20c5fec31366d733e901fee2b981cb1850/packages/jest-circus/src/types.ts#L12-L14
  // https://github.com/jestjs/jest/blob/67c1aa20c5fec31366d733e901fee2b981cb1850/packages/jest-circus/src/state.ts#L33-L46
  // https://github.com/jestjs/jest/blob/67c1aa20c5fec31366d733e901fee2b981cb1850/packages/jest-circus/src/legacy-code-todo-rewrite/jestAdapterInit.ts#L67-L69
  // https://github.com/jestjs/jest/blob/67c1aa20c5fec31366d733e901fee2b981cb1850/packages/jest-circus/src/legacy-code-todo-rewrite/jestAdapter.ts#L26-L85
  // TODO: This is not a public Jest API and may break on a Jest upgrade.
  //
  // Importing getState() from jest-circus would get the wrong state. Jest
  // loads its own copy of jest-circus from an internal module registry, and
  // test code that imports jest-circus gets a second copy from the normal
  // registry, which makes its own symbol and state with none of the Jest
  // configuration applied. The runner's symbol is found here because it is
  // added to the global first. See:
  // https://github.com/jestjs/jest/blob/67c1aa20c5fec31366d733e901fee2b981cb1850/packages/jest-runtime/src/index.ts#L803-L811
  // https://github.com/jestjs/jest/blob/67c1aa20c5fec31366d733e901fee2b981cb1850/packages/jest-runtime/src/index.ts#L849-L870
  const stateSymbol = Object.getOwnPropertySymbols(globalThis).find(
    (s) => s.description === "JEST_STATE_SYMBOL"
  );
  return stateSymbol && globalThis[stateSymbol];
}

// Get the configured Jest test timeout, or a default value if it is
// unavailable.
function configuredTimeout() {
  const timeout = findJestState()?.testTimeout;
  return typeof timeout === "number" ? timeout : JEST_BUILTIN_TIMEOUT;
}

// Get a per-test timeout of at least ms, or longer if Jest's default is
// longer.
export function timeoutAtLeast(ms) {
  return Math.max(ms, configuredTimeout());
}
