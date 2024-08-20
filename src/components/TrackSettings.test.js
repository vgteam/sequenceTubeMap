import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { TrackSettings } from "./TrackSettings";
import "@testing-library/jest-dom";

describe("TrackSettings", () => {
  const availableColors = [
    "greys",
    "ygreys",
    "blues",
    "reds",
    "plainColors",
    "lightColors",
  ];
  const trackColorSettings = {
    mainPalette: "blues",
    auxPalette: "reds",
    colorReadsByMappingQuality: false,
  };

  it("should render without errors", async () => {
    const fakeOnChange = jest.fn();
    const { getByText } = render(
      <TrackSettings
        fileType={"haplotype"}
        trackColorSettings={trackColorSettings}
        availableColors={availableColors}
        setTrackColorSetting={fakeOnChange}
      />
    );

    // maybe need to search by "Select a file"
    const placeholder = await getByText("blues");
    expect(placeholder).toBeTruthy();
  });

  it("should call onChange when an option is selected", async () => {
    const fakeOnChange = jest.fn();
    const { getByLabelText } = render(
      <TrackSettings
        fileType={"haplotype"}
        trackColorSettings={trackColorSettings}
        availableColors={availableColors}
        setTrackColorSetting={fakeOnChange}
      />
    );

    const redLabel = getByLabelText("reds");
    const greyLabel = getByLabelText("greyscale");

    expect(fakeOnChange).toHaveBeenCalledTimes(0);

    fireEvent.click(redLabel);
    expect(fakeOnChange).toHaveBeenCalledTimes(1);

    fireEvent.click(greyLabel);
    expect(fakeOnChange).toHaveBeenCalledTimes(2);
    expect(fakeOnChange).toHaveBeenCalledWith("mainPalette", "greys");
  });

  it("should update the radio values when an option is selected", async () => {
    const fakeOnChange = jest.fn();
    const { getByLabelText } = render(
      <TrackSettings
        fileType={"haplotype"}
        trackColorSettings={trackColorSettings}
        availableColors={availableColors}
        setTrackColorSetting={fakeOnChange}
      />
    );

    const radio = getByLabelText("blues");
    fireEvent.change(radio, { target: { value: "reds" } });
    expect(radio.value).toBe("reds");
  });
});
