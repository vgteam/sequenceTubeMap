// config-client.js: Must be run on the client before config-global.mjs will work.

import config from "./config.json";

const GLOBAL_NAME = "__sequence_tube_map_config";
// Tell eslint that globalThis might exist.
/*global globalThis*/
const GLOBAL_HOME = globalThis || window || global;

// Hide the config in the globals object when we run.
GLOBAL_HOME[GLOBAL_NAME] = config;
