// Configure the React development server to proxy both normal API calls and web socket requests.
const proxy = require('http-proxy-middleware');

module.exports = function(app) {
  // When we set up the proxy this way we don't have to do anything special for the websockets.
  app.use(proxy('http://localhost:3000/api'));
};

