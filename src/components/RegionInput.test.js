import { render, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegionInput from "./RegionInput";
import "@testing-library/jest-dom";
const handleRegionChangeMock = jest.fn();
const MOCK_PATHS = ["pathy", "anotherPath", "node", "chr600"];
const INIT_REGION = "";
const makeRegionInput = (region) => (
  <RegionInput
    pathNames={MOCK_PATHS}
    region={region}
    regionInfo={{
      chr: [],
      chunk: [],
      desc: [],
      end: [],
      start: [],
    }}
    handleRegionChange={handleRegionChangeMock}
  />
);
const renderMockRegion = () => {
  // Render RegionInput to virtual DOM
  let mockInput = makeRegionInput(INIT_REGION);
  return render(mockInput);
};

test("it renders expected options for given props", () => {
  renderMockRegion();

  // Select autocomplete
  const autocomplete = screen.getByTestId("autocomplete");

  const input = autocomplete.querySelector("input");

  autocomplete.focus();
  fireEvent.click(input);
  // Key down to ensure options show up
  fireEvent.keyDown(autocomplete, { key: "ArrowDown" });

  // Make sure all our mock paths are showing up
  expect(screen.getAllByRole("option")).toHaveLength(MOCK_PATHS.length);
});
test("it calls handleRegionChange when region is changed with new region", async () => {
  // Ensure region is added when it's not part of the option list

  const { rerender } = renderMockRegion();

  handleRegionChangeMock.mockImplementation((region) =>
    rerender(makeRegionInput(region))
  );
  // Select autocomplete
  const input = screen.getByRole("combobox", { name: /Region/i });

  fireEvent.click(input);

  expect(input.value).toEqual(INIT_REGION);

  const NEW_REGION = "newPath:0-10";
  await userEvent.clear(input);
  await userEvent.type(input, NEW_REGION);

  expect(handleRegionChangeMock).toHaveBeenLastCalledWith(
    NEW_REGION,
    undefined
  );
});
