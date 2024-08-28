import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { TrackList } from "./TrackList";
import "@testing-library/jest-dom";

describe("TrackList", () => {
  const tracks = {
    1: {
      trackFile: undefined,
      trackType: "graph",
      trackColorSettings: {
        mainPalette: "blues",
        auxPalette: "reds",
        colorReadsByMappingQuality: false,
        alphaReadsByMappingQuality: false,
      },
    },
    2: {
      trackFile: undefined,
      trackType: "graph",
      trackColorSettings: {
        mainPalette: "blues",
        auxPalette: "reds",
        colorReadsByMappingQuality: false,
        alphaReadsByMappingQuality: false,
      },
    },
    3: {
      trackFile: undefined,
      trackType: "graph",
      trackColorSettings: {
        mainPalette: "blues",
        auxPalette: "reds",
        colorReadsByMappingQuality: false,
        alphaReadsByMappingQuality: false,
      },
    },
  };
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

  function rerenderTrackList(rerender, newTracks, fakeOnChange, fakeOnDelete) {
    rerender(
      <TrackList
        tracks={newTracks}
        availableTracks={availableTracks}
        availableColors={availableColors}
        onChange={fakeOnChange}
        onDelete={fakeOnDelete}
      />
    );
  }

  it("should render without errors", async () => {
    const fakeOnChange = jest.fn();
    const fakeOnDelete = jest.fn();
    const { queryByTestId } = render(
      <TrackList
        tracks={tracks}
        availableTracks={availableTracks}
        availableColors={availableColors}
        onChange={fakeOnChange}
        onDelete={fakeOnDelete}
      />
    );

    expect(queryByTestId("file-type-select-component1")).toBeTruthy();

    expect(queryByTestId("file-type-select-component2")).toBeTruthy();

    expect(queryByTestId("file-select-component1")).toBeTruthy();

    expect(queryByTestId("settings-button-component1")).toBeTruthy();

    expect(queryByTestId("delete-button-component1")).toBeTruthy();
  });

  it("should call onChange when a track is changed", async () => {
    const fakeOnChange = jest.fn();
    const fakeOnDelete = jest.fn();
    const { queryByTestId, getByText, rerender } = render(
      <TrackList
        tracks={tracks}
        availableTracks={availableTracks}
        availableColors={availableColors}
        onChange={fakeOnChange}
        onDelete={fakeOnDelete}
      />
    );

    // select file type
    const fileTypeSelectComponent = queryByTestId(
      "file-type-select-component1"
    );
    fireEvent.keyDown(fileTypeSelectComponent.firstChild, { key: "ArrowDown" });
    await waitFor(() => getByText("haplotype"));
    fireEvent.click(getByText("haplotype"));

    expect(fakeOnChange).toHaveBeenCalledTimes(1);
    let newTracks = JSON.parse(JSON.stringify(tracks));
    newTracks[1].trackType = "haplotype";
    rerenderTrackList(rerender, newTracks, fakeOnChange, fakeOnDelete);

    // change file name
    const fileSelectComponent = queryByTestId("file-select-component1");
    fireEvent.keyDown(fileSelectComponent.firstChild, { key: "ArrowDown" });
    await waitFor(() => getByText("fileB1.gbwt"));
    fireEvent.click(getByText("fileB1.gbwt"));

    expect(fakeOnChange).toHaveBeenCalledTimes(2);
    newTracks[1].trackFile = "fileB1.gbwt";
    newTracks[1].trackType = "haplotype";
    expect(fakeOnChange).toHaveBeenCalledWith(newTracks);

    // rerender file select effect
    rerenderTrackList(rerender, newTracks, fakeOnChange, fakeOnDelete);

    // change color
    const settingsButtonComponent = queryByTestId("settings-button-component1");
    fireEvent.click(settingsButtonComponent);
    await waitFor(() => getByText("reds"));
    fireEvent.click(getByText("reds"));
    fireEvent.click(document);

    expect(fakeOnChange).toHaveBeenCalledTimes(3);

    newTracks[1].trackColorSettings.mainPalette = "reds";
    expect(fakeOnChange).toHaveBeenCalledWith(newTracks);
  });

  it("should use a new event handler when passed", async () => {
    const fakeOnChange1 = jest.fn();
    const fakeOnChange2 = jest.fn();
    const fakeOnDelete = jest.fn();
    const { queryByTestId, getByText, rerender } = render(
      <TrackList
        tracks={tracks}
        availableTracks={availableTracks}
        availableColors={availableColors}
        onChange={fakeOnChange1}
        onDelete={fakeOnDelete}
      />
    );

    expect(fakeOnChange1).toHaveBeenCalledTimes(0);

    rerenderTrackList(rerender, tracks, fakeOnChange2, fakeOnDelete);

    const fileSelectComponent = queryByTestId("file-select-component1");
    fireEvent.keyDown(fileSelectComponent.firstChild, { key: "ArrowDown" });
    await waitFor(() => getByText("fileA1.vg"));
    fireEvent.click(getByText("fileA1.vg"));

    expect(fakeOnChange1).toHaveBeenCalledTimes(0);
    expect(fakeOnChange2).toHaveBeenCalledTimes(1);
  });
});
