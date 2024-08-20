// config-server.mjs: Must be run on the server before config-global.mjs will work.

// This file needs to be valid for Node but also for Jest to load, so we still
// can't just import the config weith a filetype assert.

import { readFileSync } from "fs";
import dirname from "es-dirname";

// Now we want to load config.json.
//
// We *should* be able to import it, but that is not allowed by Node without
// 'assert { type: "json" }' at the end.
//
// But that syntax is in turn prohibited by Babel unless you add a flag to tell
// it to turn on its own ability to parse that "experimental" syntax.
//
// And the React setup prohibits you from setting the flag (unless you eject
// and take on the maintainance burden of all changes to react-scripts, or else
// you install one of the modules dedicated to hacking around this).
//
// We could go back to require for this, but then we'd have to say import.meta
// to get ahold of it, and we aren't allowed to say that with Jest's parser;
// it's a syntax error because React's Babel (?) turns all our code into
// non-module JS for Jest but doesn't handle that.
//
// So we try a filesystem load.
// See <https://stackoverflow.com/a/75705665>
// But we can't use top-level await, so it has to be synchronous.
//
// We also can't say "__dirname" or "import.meta" even to poll if those exist,
// or node and Babel (respectively) will yell at us.
// Luckily the es-dirname module exists which can find *our* directory by
// looking at the stack. See
// https://github.com/vdegenne/es-dirname/blob/master/es-dirname.js
const config = JSON.parse(readFileSync(dirname() + "/config.json"));

const GLOBAL_NAME = "__sequence_tube_map_config";
// Tell eslint that globalThis might exist.
/*global globalThis*/
const GLOBAL_HOME = globalThis || window || global;

// Hide the config in the globals object when we run.
GLOBAL_HOME[GLOBAL_NAME] = config;
