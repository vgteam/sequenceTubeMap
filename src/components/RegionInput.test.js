import { render, fireEvent, screen } from "@testing-library/react";
import { RegionInput } from "./RegionInput";
const handleRegionChangeMock = (newValue) => {
  return newValue;
};
const MOCK_PATHS = ["pathy", "anotherPath", "node", "chr600"];
const CHANGED_MOCK_PATHS = ["x"];
const renderMockRegion = () => {
  // Render RegionInput to virtual DOM
  render(
    <RegionInput
      pathNames={MOCK_PATHS}
      region={"1-3"}
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
test("it updates the region options", () => {

});
