// End to end tests that test the frontend against a backend over HTTP

import server from './server'
import React from 'react';
// testing-library provides a render() that auto-cleans-up from the global DOM.
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// This holds the running server for the duration of each test.
let serverState = undefined;

// This holds the root element of the app
let root = undefined;

// This needs to be called by global and per-scope beforeEach
async function setUp() {
  // Start the server
  serverState = await server.start();
  
  // Create the application.
  render(<App apiUrl={serverState.getApiUrl()} />)
}

// This needs to be called by global and per-scope afterEach
async function tearDown() {
  try {
    // Shut down the server
    await serverState.close();
    serverState = undefined;
  } catch (e) {
    console.error(e);
  }
}

// Wait for the loading throbber to appear
async function waitForLoadStart() {
  return new Promise((resolve, reject) => {
    function waitAround() {
      let loader = document.getElementById('loader');
      if (!loader) {
        setTimeout(waitAround, 100);
      } else {
        resolve();
      }
    }
    waitAround();
  })
}

// Wait for the loading throbber to disappear
async function waitForLoadEnd() {
  return new Promise((resolve, reject) => {
    function waitAround() {
      let loader = document.getElementById('loader');
      if (loader) {
        setTimeout(waitAround, 100);
      } else {
        resolve();
      }
    }
    waitAround();
  })
}

beforeEach(async () => {
  await setUp();
})

afterEach(async () => {
  await tearDown();
})

it('initially renders as loading', () => {
  let loader = document.getElementById('loader');
  expect(loader).toBeTruthy();
});

it('populates the available example dropdown', () => {
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
});

describe('When we wait for it to load', () => {
  beforeEach(async () => {
    // Wait for the loader to go away the new way.
    // See https://jasmine.github.io/2.0/upgrading.html#section-9
    // Note that Jest imposes a 5000 ms timeout for being done.
    await waitForLoadEnd();
  });
  
  it('eventually stops rendering as loading', () => {
    let loader = document.getElementById('loader');
    expect(loader).toBeFalsy();
  });
  
  it('does not reload if we click the go button without changing settings', () => {
    let loader = document.getElementById('loader');
    expect(loader).toBeFalsy();
  
    act(() => {
      let go = document.getElementById('goButton');
      userEvent.click(go);
    });
      
    loader = document.getElementById('loader');
    expect(loader).toBeFalsy();
  });

  
  it('draws the right SVG for vg "small"', async () => {
  
    await act(async () => {
      let dropdown = document.getElementById('dataSourceSelect');
      let start = document.getElementById('nodeID');
      let distance = document.getElementById('distance');
      let units = document.getElementById('byNode');
      
      await userEvent.selectOptions(screen.getByLabelText(/Data/i), 'vg "small" example');
      await userEvent.clear(screen.getByLabelText(/Start/i));
      await userEvent.type(screen.getByLabelText(/Start/i), '1');
      await userEvent.clear(screen.getByLabelText(/Length/i));
      await userEvent.type(screen.getByLabelText(/Length/i), '10');
      await userEvent.selectOptions(screen.getByLabelText(/Unit/i), screen.getByText('Nodes'))
      
      console.log(dropdown.value); 
      console.log(dropdown.outerHTML); 
      console.log(start.outerHTML);
      console.log(distance.outerHTML);
      console.log(units.value);
      console.log(units.outerHTML);
    
      let go = document.getElementById('goButton');
      console.log('Clicking button for small');
      await userEvent.click(go);
    });
    
    let loader = document.getElementById('loader');
    expect(loader).toBeTruthy();
    
    await waitForLoadEnd();
  
    let svg = document.getElementById('svg');
    expect(svg).toBeTruthy();
    expect(svg.getElementsByTagName('title').length).toEqual(17);
  });
});
