// End to end tests that test the frontend against a backend over HTTP

import server from './server'
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from "react-dom/test-utils";
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

// TODO: Also bring the component in and out of the DOM safely in setup and
// teardown as in https://reactjs.org/docs/testing-recipes.html#rendering

it('populates the available example dropdown', () => {
  const div = document.createElement('div');
  // To get things by ID we need to attach to the DOM
  document.body.appendChild(div);
  act(() => {
    ReactDOM.render(<App />, div);
  });
  
  // Make sure the dropdown exists in the div
  let dropdown = document.getElementById('dataSourceSelect');
  expect(dropdown).toBeTruthy();

  // Make sure it has a particular example value
  let wantedEntry = undefined;
  for (let item of dropdown.getElementsByTagName('option')) {
    // Note that we don't have innerText in React's jsdom:
    // https://github.com/jsdom/jsdom/issues/1245
    if (item.textContent == 'snp1kg-BRCA1') {
      // Scan for this particular option.
      wantedEntry = item;
    }
  }
  expect(wantedEntry).toBeTruthy();

  ReactDOM.unmountComponentAtNode(div);
  div.remove();
});

