// End to end tests that test the frontend against a backend over HTTP

import server from "./server";
import React from "react";
// testing-library provides a render() that auto-cleans-up from the global DOM.
import {
  render,
  fireEvent,
  getByTestId,
  screen,
  waitFor,
  act,
  within,
} from "@testing-library/react";
import { setCopyCallback, writeToClipboard } from "./components/CopyLink";
import "@testing-library/jest-dom/extend-expect";
import userEvent from "@testing-library/user-event";
import selectEvent from "react-select-event";
import App from "./App";

const getRegionInput = () => {
  // Helper function to select the Region input box
  return screen.getByRole("combobox", { name: /Region/i });
};
// This holds the running server for the duration of each test.
let serverState = undefined;

// This holds the root element of the app
let root = undefined;

// Mock clipboard (string)
let fakeClipboard = undefined;

// This needs to be called by global and per-scope beforeEach
async function setUp() {
  setCopyCallback((value) => (fakeClipboard = value));

  // Create the application.
  render(<App apiUrl={serverState.getApiUrl()} />);
}

// This needs to be called by global and per-scope afterEach
// Any mutations of the server (e.g. file uploads)
// or globals (e.g. the clipboard) should be undone here.
async function tearDown() {
  setCopyCallback(writeToClipboard);
}

beforeEach(async () => {
  await setUp();
});

afterEach(async () => {
  await tearDown();
});

// Starting the server once per test run will speed up tests
beforeAll(async () => {
  // Start the server
  serverState = await server.start();
});

afterAll(async () => {
  try {
    // Shut down the server
    await serverState.close();
    serverState = undefined;
  } catch (e) {
    console.error(e);
  }
});

// Wait for the loading throbber to appear
async function waitForLoadStart() {
  return new Promise((resolve, reject) => {
    function waitAround() {
      let loader = document.getElementById("loader");
      if (!loader) {
        setTimeout(waitAround, 100);
      } else {
        resolve();
      }
    }
    waitAround();
  });
}

// Wait for the loading throbber to disappear
async function waitForLoadEnd() {
  return new Promise((resolve, reject) => {
    function waitAround() {
      let loader = document.getElementById("loader");
      if (loader) {
        setTimeout(waitAround, 100);
      } else {
        resolve();
      }
    }
    waitAround();
  });
}

async function clickCopyLink() {
  // Click copy link button to test clipboard
  await act(async () => {
    let copyButton = document.getElementById("copyLinkButton");
    await userEvent.click(copyButton);
  });
}
function clickGoButton() {
  // Press go
  act(() => {
    let go = document.getElementById("goButton");
    userEvent.click(go);
  });
}

/// Return the option element in the given dropdown with the given displayed text.
/// Accepts only exact full matches.
/// Returns undefined if no option exists.
/// Only works on real select elements and not fancy React controls.
function findDropdownOption(dropdown, optionText) {
  let wantedEntry = undefined;
  for (let item of dropdown.getElementsByTagName("option")) {
    // Note that we don't have innerText in React's jsdom:
    // https://github.com/jsdom/jsdom/issues/1245
    if (item.textContent == optionText) {
      // Scan for this particular option.
      wantedEntry = item;
    }
  }
  return wantedEntry;
}

it("initially renders as loading", () => {
  let loader = document.getElementById("loader");
  expect(loader).toBeTruthy();
});

it("populates the available example dropdown", () => {
  // Make sure the dropdown exists in the div
  let dropdown = document.getElementById("dataSourceSelect");
  expect(dropdown).toBeTruthy();

  // Make sure it has a particular example value
  let wantedEntry = findDropdownOption(dropdown, "snp1kg-BRCA1");
  expect(wantedEntry).toBeTruthy();
});

describe("When we wait for it to load", () => {
  beforeEach(async () => {
    // Wait for the loader to go away the new way.
    // See https://jasmine.github.io/2.0/upgrading.html#section-9
    // Note that Jest imposes a 5000 ms timeout for being done.
    await waitForLoadEnd();
  });

  it("eventually stops rendering as loading", () => {
    let loader = document.getElementById("loader");
    expect(loader).toBeFalsy();
  });

  it("does not reload if we click the go button without changing settings", () => {
    let loader = document.getElementById("loader");
    expect(loader).toBeFalsy();

    act(() => {
      let go = document.getElementById("goButton");
      userEvent.click(go);
    });

    loader = document.getElementById("loader");
    expect(loader).toBeFalsy();
  });

  it("the regions from the BED files are loaded", async () => {
    let regionInput = getRegionInput();
    await act(async () => {
      userEvent.click(getRegionInput());
    });
    // Make sure that option in RegionInput dropdown (17_1_100) is visible
    expect(screen.getByText("17_1_100")).toBeInTheDocument()
  });
  it("the region options in autocomplete are cleared after selecting new data", async () => {
    // Input data dropdown
    await userEvent.selectOptions(
      screen.getByLabelText(/Data/i),
      'vg "small" example'
    );
    let regionInput = getRegionInput();
    await act(async () => {
      userEvent.click(getRegionInput());
    });
    // Make sure that old option in RegionInput dropdown (17_...) is not visible 
    expect(screen.queryByText('17_1_100')).not.toBeInTheDocument()
    await act(async () => {
      userEvent.click(regionInput);
    });

  });
  it("draws an SVG for synthetic data example 1", async () => {
    await act(async () => {
      let dropdown = document.getElementById("dataSourceSelect");
      await userEvent.selectOptions(
        screen.getByLabelText(/Data/i),
        "synthetic data examples"
      );
    });

    await act(async () => {
      let example1 = document.getElementById("example1");
      console.log("Clicking button for example 1");
      await userEvent.click(example1);
    });

    // We're agnostic as to whether we will see a loader when rendering the
    // example data.

    await waitForLoadEnd();

    let svg = document.getElementById("svg");
    expect(svg).toBeTruthy();
  });

  it('draws the right SVG for vg "small"', async () => {
    let dropdown = document.getElementById("dataSourceSelect");

    // Input data dropdown
    await userEvent.selectOptions(
      screen.getByLabelText(/Data/i),
      'vg "small" example'
    );
    const autocomplete = screen.getByTestId("autocomplete");
    const input = autocomplete.querySelector("input");

    await userEvent.clear(input);

    // Input region
    // using fireEvent because userEvent has no change
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "node:1+10" } });
    expect(input.value).toBe("node:1+10");
    fireEvent.keyDown(autocomplete, { key: "Enter" });

    // Wait for rendered response
    await waitFor(() => screen.getByTestId("autocomplete"));

    // Click go
    let go = document.getElementById("goButton");
    await userEvent.click(go);

    let loader = document.getElementById("loader");
    expect(loader).toBeTruthy();

    await waitForLoadEnd();

    // See if correct svg rendered
    let svg = document.getElementById("svg");
    expect(svg).toBeTruthy();
    expect(svg.getElementsByTagName("title").length).toEqual(65);
  });
});

it("produces correct link for view before & after go is pressed", async () => {
  // First test that after pressing go, the link reflects the dat form
  const expectedLinkBRCA1 =
    "http://localhost?name=snp1kg-BRCA1&graphFile=snp1kg-BRCA1.vg.xg&gamFile=NA12878-BRCA1.sorted.gam&dataPath=default&region=17%3A1-100&bedFile=snp1kg-BRCA1.bed&dataType=built-in";
  // Set up dropdown
  await act(async () => {
    let dropdown = document.getElementById("dataSourceSelect");
    await userEvent.selectOptions(
      screen.getByLabelText(/Data/i),
      "snp1kg-BRCA1"
    );
  });
  // Wait for server to load / avoid console yelling
  await waitForLoadEnd();

  clickGoButton();

  await clickCopyLink();
  // Ensure link reflects our selected data
  expect(fakeClipboard).toEqual(expectedLinkBRCA1);

  // Set up dropdown
  await act(async () => {
    let dropdown = document.getElementById("dataSourceSelect");
    await userEvent.selectOptions(screen.getByLabelText(/Data/i), "cactus");
  });
  // Wait for server to load
  await waitForLoadEnd();

  await clickCopyLink();
  // Make sure clipboard has not changed
  expect(fakeClipboard).toEqual(expectedLinkBRCA1);
  clickGoButton();
  await waitForLoadEnd();
  await clickCopyLink();

  const expectedLinkCactus =
    "http://localhost?name=cactus&region=ref%3A1-100&graphFile=cactus.vg.xg&gamFile=cactus-NA12879.sorted.gam&bedFile=cactus.bed&dataPath=mounted&dataType=built-in";
  // Make sure link has changed after pressing go
  expect(fakeClipboard).toEqual(expectedLinkCactus);
});

it("can retrieve the list of mounted graph files", async () => {
  // Wait for everything to settle so we don't stop the server while it is thinking
  await waitForLoadEnd();

  // Swap over to the mounted files mode
  await act(async () => {
    let dropdown = document.getElementById("dataSourceSelect");
    await userEvent.selectOptions(
      screen.getByLabelText(/Data/i),
      "custom (mounted files)"
    );
  });

  // Find the select box's input
  let graphSelectInput = screen.getByLabelText(/graph file:/i);
  expect(graphSelectInput).toBeTruthy();

  // We shouldn't see the option before we open the dropdown
  expect(screen.queryByText("cactus.vg.xg")).not.toBeInTheDocument();

  // Make sure the right entry eventually shows up (since we could be racing
  // the initial load from the component mounting)
  await waitFor(() => {
    // Open the selector and see if it is there
    selectEvent.openMenu(graphSelectInput);
    expect(screen.getByText("cactus.vg.xg")).toBeInTheDocument();
  });
});
