// config-global.mjs: Provide access to the config, assuming config-client.js or config-server.mjs has been imported already.
// Import this instead of config.json! This is the One True Way to get the config!

const GLOBAL_NAME = "__sequence_tube_map_config";
// Tell eslint that globalThis might exist.
/*global globalThis*/
const GLOBAL_HOME = globalThis || window || global;



// Find the config in the globals.
export const config = GLOBAL_HOME[GLOBAL_NAME];

if (!config) {
  throw new Error("config-global.mjs loaded before either config-client.js or config-server.mjs");
}

export default config;


