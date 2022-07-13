import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import userEvent from "@testing-library/user-event";
import App from "./App";
// Tests functionality without server

export const getRegionInput = () => {
  // Helper function to select the Region input box
  return screen.getByRole("combobox", { name: /Region/i });
};
it("renders without crashing", () => {
  render(<App />);
  expect(screen.getByAltText(/Logo/i)).toBeInTheDocument();
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
  //expect(getRegionInput().value).toEqual("17:1-100");
  expect(getRegionInput().value).toEqual("17:1-100");
  await userEvent.clear(getRegionInput());
  expect(getRegionInput().value).toEqual("");
});

it("allows the start to be changed", async () => {
  render(<App />);
  expect(getRegionInput().value).toEqual("17:1-100");
  // TODO: {selectall} fake keystroke is glitchy and sometimes gets dropped or
  // eats the next keystroke. So we clear the field first.
  await userEvent.clear(getRegionInput());
  await userEvent.type(getRegionInput(), "17:200-300");
  expect(getRegionInput().value).toEqual("17:200-300");
});
