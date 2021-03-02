// End to end tests that test the frontend against a backend over HTTP

import server from './server'
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from "react-dom/test-utils";
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
  // See https://reactjs.org/docs/testing-recipes.html#rendering
  root = document.createElement('div');
  
  // To get things by ID we need to attach to the DOM
  document.body.appendChild(root);
  act(() => {
    ReactDOM.render(<App backendUrl={serverState.getUrl()} />, root);
  });
}

// This needs to be called by global and per-scope afterEach
async function tearDown() {
  // Shut down the client
  try {
    ReactDOM.unmountComponentAtNode(root);
    root.remove();
    root = undefined;
  } catch (e) {
    console.error(e);
  }

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

beforeEach(async (done) => {
  await setUp();
  done();
})

afterEach(async (done) => {
  await tearDown();
  done();
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
  beforeEach(async (done) => {
    // Wait for the loader to go away the new way.
    // See https://jasmine.github.io/2.0/upgrading.html#section-9
    // Note that Jest imposes a 5000 ms timeout for being done.
    await waitForLoadEnd();
    done();
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

  describe('When we draw the vg "small" example', () => {
    
    beforeEach(async (done) => {
      act(() => {
        let dropdown = document.getElementById('dataSourceSelect');
        userEvent.selectOptions(dropdown, 'vg "small" example');
      });
      act(() => {
        let start = document.getElementById('nodeID');
        userEvent.type(start, '{selectall}1');
      });
      act(() => {
        let units = document.getElementById('byNode');
        userEvent.selectOptions(units, 'true');
      });
      act(() => {
        let distance = document.getElementById('distance');
        userEvent.type(distance, '{selectall}10');
      });
      act(() => {
        let dropdown = document.getElementById('dataSourceSelect');
        let start = document.getElementById('nodeID');
        let distance = document.getElementById('distance');
        let units = document.getElementById('byNode');
        
        userEvent.type(distance, '{selectall}10');
        
        console.log(dropdown.value); 
        console.log(dropdown.outerHTML); 
        console.log(start.outerHTML);
        console.log(distance.outerHTML);
        console.log(units.value);
        console.log(units.outerHTML);
        
        let go = document.getElementById('goButton');
        console.log('Clicking button for small');
        userEvent.click(go);
      });
      
      await waitForLoadEnd();
      done();
    });
  
    it('draws the right SVG', () => {
      let svg = document.getElementById('svg');
      expect(svg).toBeTruthy();
      expect(svg.childNodes.length).toEqual(1);
      // When I do this manually I get a 77 item SVG.
      expect(svg.childNodes[0].childNodes.length).toEqual(77);
    });
  });
});
