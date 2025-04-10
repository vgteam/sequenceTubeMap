// Configure the React development server to proxy both normal API calls and web socket requests.
const { createProxyMiddleware } = require("http-proxy-middleware");

const config = require("./config.json");

const process = require("process");

// Determine the host part of the URL to use for a given address
function addressToHost(address) {
  if (address === undefined) {
    return "localhost";
  }
  if (address.includes(":")) {
    // It's IPv6
    return "[" + address + "]";
  }
  return address;
}

module.exports = function (app) {
  try {
    let serverBase =
      "http://" +
      addressToHost(config.serverBindAddress) +
      ":" +
      (process.env.SERVER_PORT || config.serverPort || "3000");
    app.use(createProxyMiddleware(serverBase + "/api"));
    // Websockets don't seem to get through unless we ask for them explicitly.
    // They can just go to the root because the server ignores websocket paths.
    app.use(createProxyMiddleware("/api/v0", { ws: true, target: serverBase }));
  } catch (e) {
    // If this function fails, the React dev server won't listen on its port,
    // but also the error won't be reported; it's an unhandled rejection that
    // gets swallowed somehow. So make sure to actually stop.
    console.error("Error setting up proxy configuration", e);
    process.exit(1);
  }
};
