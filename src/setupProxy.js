// Configure the React development server to proxy both normal API calls and web socket requests.
const proxy = require('http-proxy-middleware');

const config = require('./config.json');

// Determine the host part of the URL to use for a given address
function addressToHost(address) {
  if (address === undefined) {
    return 'localhost';
  }
  if (address.includes(':')) {
    // It's IPv6
    return '[' + address + ']';
  }
  return address;
}

module.exports = function(app) {
  let serverBase = 'http://' + addressToHost(config.serverBindAddress) + ':' + (config.serverPort || '3000');
  app.use(proxy(serverBase + '/api'));
  // Websockets don't seem to get through unless we ask for them explicitly.
  // They can just go to the root because the server ignores websocket paths.
  app.use(proxy('/api/v0', {ws: true, target: serverBase}));
};

