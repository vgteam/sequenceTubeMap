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
  // Jest gives the code under test its own isolated module registry, so we
  // can't get at the real Jest state by importing jest-circus. See:
  // https://github.com/jestjs/jest/blob/67c1aa20c5fec31366d733e901fee2b981cb1850/packages/jest-runtime/src/index.ts#L803-L811
  // https://github.com/jestjs/jest/blob/67c1aa20c5fec31366d733e901fee2b981cb1850/packages/jest-runtime/src/index.ts#L849-L870
  const stateSymbol = Object.getOwnPropertySymbols(globalThis).find(
    (s) => s.description === "JEST_STATE_SYMBOL"
  );
  return stateSymbol && globalThis[stateSymbol];
}

// Get a per-test timeout of at least ms, or longer if Jest's default is
// longer.
export function timeoutAtLeast(ms) {
  // Use the configured Jest test timeout, or a default value if it is
  // unavailable.
  return Math.max(ms, findJestState()?.testTimeout || JEST_BUILTIN_TIMEOUT);
}
