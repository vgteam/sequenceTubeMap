// End to end tests that test the frontend against a backend over HTTP

import server from './server'
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from "react-dom/test-utils";
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
    ReactDOM.render(<App />, root);
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
    serverState.close();
    serverState = undefined;
  } catch (e) {
    console.error(e);
  }
}

beforeEach(async (done) => {
  await setUp();
  done();
})

afterEach(() => {
  tearDown();
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
    // Make sure we still do the global set up
    //await setUp();
    
    // Wait for the loader to go away the new way.
    // See https://jasmine.github.io/2.0/upgrading.html#section-9
    // Note that Jest imposes a 5000 ms timeout for being done.
    const MAX_TRIES = 30;
    let tries = 0;
    
    function waitAround() {
      let loader = document.getElementById('loader');
      if (loader) {
        tries++;
        if (tries >= MAX_TRIES) {
          throw new Error('Loader never went away: ' + loader.outerHTML);
        }
        // We are still loading
        console.log('Waiting for loader to go away: ' + loader.outerHTML);
        setTimeout(waitAround, 100);
      } else {
        // We are now ready to move on
        done();
      }
    }
    waitAround();
  });
  
  afterEach(() => {
    //tearDown();
  })

  it('eventually stops rendering as loading', () => {
    // Wait for the loader to go away.
    // See http://www.hackingwithreact.com/read/1/36/time-for-ajax-using-jest-with-asynchronous-tests
    let loader = document.getElementById('loader');
    expect(loader).toBeFalsey();
  });
});

// TODO: this all needs to add a wait like the not-loading-anymore test
/*
it('renders the vg small example to be rendered', () => {
  act(() => {
    let dropdown = document.getElementById('dataSourceSelect');
    expect(dropdown).toBeTruthy();
    dropdown.value = 'vg "small" example';
  });
  act(() => {
    let start = document.getElementById('nodeID');
    expect(start).toBeTruthy();
    start.value = '1';
  });
  act(() => {
    let distance = document.getElementById('distance');
    expect(distance).toBeTruthy();
    distance.value = '10';
  });
  act(() => {
    let units = document.getElementById('byNode');
    expect(units).toBeTruthy();
    units.value = 'true';
  });
  act(() => {
    let go = document.getElementById('goButton');
    expect(go).toBeTruthy();
    go.dispatchEvent(new MouseEvent('click', {bubbles: true}));
  });
  
  
  let container = document.getElementById('tubeMapContainer');
  console.log(container.outerHTML);
  
  let svgHolder = document.getElementById('tubeMapSVG');
  expect(svgHolder).toBeTruthy();
  
  // Wait around for the server to reply 
  waitsFor(() => {
    console.log('In waitFor: ' + svgHolder);
    return svgHolder.childNodes.length > 0;
  }, 'tube map to render', 2000);

  // And after the waiting is done
  runs(() => {
    let svg = document.getElementById('svg');
    expect(svg).toBeTruthy();
    expect(svg.childNodes.length).toEqual(1);
    // When I do this manually I get a 77 item SVG.
    expect(svg.childNodes[0].childNodes.length).toEqual(77);
  });
  
  
});
*/
