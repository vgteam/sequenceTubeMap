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
  // When we set up the proxy this way we don't have to do anything special for the websockets.
  app.use(proxy('http://' + addressToHost(config.serverBindAddress) + ':' + (config.serverPort || '3000') + '/api'));
};

