// End to end tests that test the frontend against a backend over HTTP

import server from './server'
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

// This holds the running server for the duration of each test.
let serverState = undefined;

beforeEach(async () => {
  serverState = await server.start();
})

afterEach(() => {
  serverState.close();
  serverState = undefined;
})

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);
  ReactDOM.unmountComponentAtNode(div);
});

