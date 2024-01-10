// Configure Jest environment for all tests.
//
// create-react-app auto-magically executes this file by name for all the test
// suites. See <https://github.com/facebook/create-react-app/issues/9706>.

// Make TextEncoder and TextDecoder available. Browsers and Node both have them
// but jsdom refuses to let us use them. See
// <https://stackoverflow.com/a/68468204>
import { TextEncoder, TextDecoder } from "util";
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
