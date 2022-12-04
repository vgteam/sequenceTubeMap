import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import userEvent from "@testing-library/user-event";
import App from "./App";

import * as fetchAndParseModule from "./fetchAndParse";
// Tests functionality without server

jest.mock("./fetchAndParse");

beforeEach(() => {
  jest.resetAllMocks();
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
  fetchAndParseModule.fetchAndParse = () => { throw new Error("Mock Server Error")};
  render(<App />);
  expect(screen.getAllByText(/Mock Server Error/i)[0]).toBeInTheDocument();
});

it("renders without crashing when sent bad fetch data from server", async () => {
  fetchAndParseModule.fetchAndParse = () => ({ });
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
