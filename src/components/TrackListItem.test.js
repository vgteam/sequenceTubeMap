import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { TrackListItem } from "./TrackListItem";
import "@testing-library/jest-dom";

describe("TrackListItem", () => {
  const trackFile = undefined;
  const trackType = "graph";
  const availableColors = [
    "greys",
    "ygreys",
    "reds",
    "plainColors",
    "lightColors",
  ];
  const availableTracks = [
    { trackFile: "fileA1.vg", trackType: "graph" },
    { trackFile: "fileA2.gbwt", trackType: "haplotype" },
    { trackFile: "fileB1.gbwt", trackType: "haplotype" },
    { trackFile: "fileB2.gam", trackType: "read" },
    { trackFile: "fileC1.xg", trackType: "graph" },
  ];
  const trackColorSettings = {
    mainPalette: "blues",
    auxPalette: "reds",
    colorReadsByMappingQuality: false,
  };

  it("should render without errors", async () => {
    const fakeOnChange = jest.fn();
    const fakeOnDelete = jest.fn();
    const { getByText, getByRole } = render(
      <TrackListItem
        trackProps={{
          trackFile: trackFile,
          trackType: trackType,
          trackColorSettings: trackColorSettings,
        }}
        availableColors={availableColors}
        availableTracks={availableTracks}
        onChange={fakeOnChange}
        onDelete={fakeOnDelete}
        trackID={1}
      />
    );

    let placeholder = getByRole("button", { name: /Settings/i });
    expect(placeholder).toBeTruthy();

    placeholder = await getByText("graph");
    expect(placeholder).toBeTruthy();

    placeholder = await getByText("Select a file");
    expect(placeholder).toBeTruthy();
  });

  it("should call onChange correctly", async () => {
    const fakeOnChange = jest.fn();
    const fakeOnDelete = jest.fn();

    const { getByText, queryByTestId, rerender } = render(
      <TrackListItem
        trackProps={{
          trackFile: trackFile,
          trackType: trackType,
          trackColorSettings: trackColorSettings,
        }}
        availableColors={availableColors}
        availableTracks={availableTracks}
        onChange={fakeOnChange}
        onDelete={fakeOnDelete}
        trackID={1}
      />
    );

    expect(fakeOnChange).toHaveBeenCalledTimes(0);

    // change track type
    const fileTypeSelectComponent = queryByTestId(
      "file-type-select-component1"
    );
    fireEvent.keyDown(fileTypeSelectComponent.firstChild, { key: "ArrowDown" });
    await waitFor(() => getByText("haplotype"));
    fireEvent.click(getByText("haplotype"));

    expect(fakeOnChange).toHaveBeenCalledTimes(1);

    // simulate onchange rerendering component
    rerender(
      <TrackListItem
        trackProps={{
          trackFile: trackFile,
          trackType: "haplotype",
          trackColorSettings: trackColorSettings,
        }}
        availableColors={availableColors}
        availableTracks={availableTracks}
        onChange={fakeOnChange}
        onDelete={fakeOnDelete}
        trackID={1}
      />
    );

    // change file name
    const fileSelectComponent = queryByTestId("file-select-component1");
    fireEvent.keyDown(fileSelectComponent.firstChild, { key: "ArrowDown" });
    await waitFor(() => getByText("fileB1.gbwt"));
    fireEvent.click(getByText("fileB1.gbwt"));

    expect(fakeOnChange).toHaveBeenCalledTimes(2);
    expect(fakeOnChange).toHaveBeenCalledWith(1, {
      trackFile: "fileB1.gbwt",
      trackType: "haplotype",
      trackColorSettings: trackColorSettings,
    });

    rerender(
      <TrackListItem
        trackProps={{
          trackFile: "fileB1.gbwt",
          trackType: "haplotype",
          trackColorSettings: trackColorSettings,
        }}
        availableColors={availableColors}
        availableTracks={availableTracks}
        onChange={fakeOnChange}
        onDelete={fakeOnDelete}
        trackID={1}
      />
    );

    // change color settings
    fireEvent.click(queryByTestId("settings-button-component1"));
    await waitFor(() => getByText("reds"));
    fireEvent.click(getByText("reds"));
    fireEvent.click(document);

    expect(fakeOnChange).toHaveBeenCalledTimes(3);
  });

  it("should call onDelete correctly", async () => {
    const fakeOnChange = jest.fn();
    const fakeOnDelete = jest.fn();
    const { queryByTestId } = render(
      <TrackListItem
        trackProps={{
          trackFile: trackFile,
          trackType: trackType,
          trackColorSettings: trackColorSettings,
        }}
        availableColors={availableColors}
        availableTracks={availableTracks}
        onChange={fakeOnChange}
        onDelete={fakeOnDelete}
        trackID={1}
      />
    );

    expect(fakeOnDelete).toHaveBeenCalledTimes(0);

    fireEvent.click(queryByTestId("delete-button-component1"));
    expect(fakeOnDelete).toHaveBeenCalledTimes(1);
  });
});
