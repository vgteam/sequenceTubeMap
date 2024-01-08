// Tests functionality without server

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import userEvent from "@testing-library/user-event";
import App from "./App";

import { fetchAndParse } from "./fetchAndParse";

// We want to be able to replace the `fetchAndParse` that *other* files see,
// and we want to use *different* implementations for different tests in this
// file. We can mock it with Jest, but Jest will move this call before the
// imports when runnin the tests, so we can't access any file-level variables
// in it. So we need to do some sneaky global trickery.

// Register the given replacement function to be called instead of fetchAndParse.
function setFetchAndParseMock(replacement) {
  globalThis["__App.test.js_fetchAndParse_mock"] = replacement;
}

// Remove any replacement function and go back to the real fetchAndParse.
function clearFetchAndParseMock() {
  globalThis["__App.test.js_fetchAndParse_mock"] = undefined;
}

jest.mock("./fetchAndParse", () => {
  // This dispatcher will replace fetchAndParse when we or anyone eles imports it.
  function fetchAndParseDispatcher() {
    // Ge tthe real fetchAndParse
    const { fetchAndParse } = jest.requireActual("./fetchAndParse");
    // Grab the replacement or the real one if no replacement is set
    let functionToUse =
      globalThis["__App.test.js_fetchAndParse_mock"] ?? fetchAndParse;
    // Give it any arguments we got and return its return value.
    return functionToUse.apply(this, arguments);
  }
  // When someone asks for this module, hand them these contents instead.
  return {
    __esModule: true,
    fetchAndParse: fetchAndParseDispatcher,
  };
});

// TODO: We won't need to do *any* of this if we actually get the ability to pass an API implementation into the app.

beforeEach(() => {
  jest.resetAllMocks();
  clearFetchAndParseMock();
});

const getRegionInput = () => {
  // Helper function to select the Region input box
  return screen.getByRole("combobox", { name: /Region/i });
};
it("renders without crashing", () => {
  render(<App />);
  expect(screen.getByAltText(/Logo/i)).toBeInTheDocument();
});

it("renders with error when api call to server throws", async () => {
  setFetchAndParseMock(() => {
    throw new Error("Mock Server Error");
  });
  render(<App />);
  await waitFor(() => {
    expect(screen.getAllByText(/Mock Server Error/i)[0]).toBeInTheDocument();
  });
});

it("renders without crashing when sent bad fetch data from server", async () => {
  setFetchAndParseMock(() => ({}));
  render(<App />);

  await waitFor(() => {
    // TODO: display multiple errors in HeaderForm.js if there are more than one.
    // All of the default errors should start with "Server did not..." so we look for that.
    expect(screen.getAllByText(/Server did not/i)[0]).toBeInTheDocument();
  });
  await waitFor(() => {
    // TubeMapContainer will display this error as default.
    screen.getByText("Fetching remote data returned error");
  });
});

it("allows the data source to be changed", () => {
  render(<App />);
  expect(screen.getByLabelText(/Data/i).value).toEqual("snp1kg-BRCA1");
  userEvent.selectOptions(screen.getByLabelText(/Data/i), "cactus");
  expect(screen.getByLabelText(/Data/i).value).toEqual("cactus");
  userEvent.selectOptions(screen.getByLabelText(/Data/i), 'vg "small" example');
  expect(screen.getByLabelText(/Data/i).value).toEqual('vg "small" example');
});

it("allows the start to be cleared", async () => {
  render(<App />);
  expect(getRegionInput().value).toEqual("17:1-100");
  await userEvent.clear(getRegionInput());
  expect(getRegionInput().value).toEqual("");
});

it("allows the start to be changed", async () => {
  // Test that after inputting a value not in the bed regions, it still updates
  render(<App />);
  expect(getRegionInput().value).toEqual("17:1-100");
  // TODO: {selectall} fake keystroke is glitchy and sometimes gets dropped or
  // eats the next keystroke. So we clear the field first.
  await userEvent.clear(getRegionInput());
  await userEvent.type(getRegionInput(), "17:200-300");
  expect(getRegionInput().value).toEqual("17:200-300");
});
