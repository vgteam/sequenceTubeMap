import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrackFilePicker } from "./TrackFilePicker";

describe("TrackFilePicker", () => {
  const testTracks = [
    { trackFile: "fileA1.vg", trackType: "graph" },
    { trackFile: "fileA2.gbwt", trackType: "haplotype" },
    { trackFile: "fileB1.gbwt", trackType: "haplotype" },
    { trackFile: "fileB2.gam", trackType: "read" },
    { trackFile: "fileC1.xg", trackType: "graph" },
  ];

  it("should render without errors", async () => {
    const fakeOnChange = jest.fn();
    const { getByText } = render(
      <TrackFilePicker
        tracks={testTracks}
        fileType={"graph"}
        pickerType={"mounted"}
        handleInputChange={fakeOnChange}
      />
    );

    // maybe need to search by "Select a file"
    const placeholder = await getByText("Select a file");
    expect(placeholder).toBeTruthy();
  });

  it("should allow value to be controlled", async () => {
    const fakeOnChange = jest.fn();
    const { getByText, queryByText, rerender } = render(
      <TrackFilePicker
        tracks={testTracks}
        fileType={"graph"}
        pickerType={"mounted"}
        value={"fileA1.vg"}
        handleInputChange={fakeOnChange}
      />
    );

    let displayed = getByText("fileA1.vg");
    expect(displayed).toBeTruthy();
    let notDisplayed = queryByText("fileC1.xg");
    expect(notDisplayed).toBeFalsy();

    rerender(
      <TrackFilePicker
        tracks={testTracks}
        fileType={"graph"}
        pickerType={"mounted"}
        value={"fileC1.xg"}
        handleInputChange={fakeOnChange}
      />
    );

    displayed = getByText("fileC1.xg");
    expect(displayed).toBeTruthy();
    notDisplayed = queryByText("fileA1.vg");
    expect(notDisplayed).toBeFalsy();
  });

  it("should call onChange when an option is selected", async () => {
    const fakeOnChange = jest.fn();
    const { getByText, queryByTestId } = render(
      <TrackFilePicker
        tracks={testTracks}
        fileType={"haplotype"}
        pickerType={"mounted"}
        handleInputChange={fakeOnChange}
      />
    );

    // find div containing the component
    const fileSelectComponent = queryByTestId("file-select-component");

    expect(fileSelectComponent).toBeDefined();
    expect(fileSelectComponent).not.toBeNull();

    // expand the select box
    fireEvent.keyDown(fileSelectComponent.firstChild, { key: "ArrowDown" });
    await waitFor(() => getByText("fileB1.gbwt"));
    fireEvent.click(getByText("fileB1.gbwt"));

    expect(fakeOnChange).toHaveBeenCalledTimes(1);
    expect(fakeOnChange).toHaveBeenCalledWith("fileB1.gbwt");

    // make sure we can repeat the process
    fireEvent.keyDown(fileSelectComponent.firstChild, { key: "ArrowDown" });
    await waitFor(() => getByText("fileA2.gbwt"));
    fireEvent.click(getByText("fileA2.gbwt"));

    expect(fakeOnChange).toHaveBeenCalledTimes(2);
    expect(fakeOnChange).toHaveBeenCalledWith("fileA2.gbwt");
  });

  it("should call onChange when queried by input value", async () => {
    const fakeOnChange = jest.fn();
    const { getByText, queryByTestId, container } = render(
      <TrackFilePicker
        tracks={testTracks}
        fileType={"graph"}
        pickerType={"mounted"}
        handleInputChange={fakeOnChange}
      />
    );

    const fileSelectComponent = queryByTestId("file-select-component");

    fireEvent.change(container.querySelector("input"), {
      target: { value: "fileC1.xg" },
    });

    fireEvent.keyDown(fileSelectComponent.firstChild, { key: "ArrowDown" });

    await waitFor(() => getByText("fileC1.xg"));
    fireEvent.click(getByText("fileC1.xg"));

    expect(fakeOnChange).toHaveBeenCalledTimes(1);
    expect(fakeOnChange).toHaveBeenCalledWith("fileC1.xg");
  });

  it("should call call handleFileUpload when a file is inputted", async () => {
    const fakeOnChange = jest.fn();
    const fakeHandleFileUpload = jest.fn();

    const { queryByTestId } = render(
      <TrackFilePicker
        tracks={testTracks}
        fileType={"graph"}
        pickerType={"upload"}
        handleInputChange={fakeOnChange}
        handleFileUpload={fakeHandleFileUpload}
      />
    );

    const fakeFile = new File(["example_data"], "example.vg", {
      type: "text/vg",
    });

    const fileSelectComponent = queryByTestId("file-select-component");

    await waitFor(() => {
      userEvent.upload(fileSelectComponent, fakeFile);
    });

    expect(fakeHandleFileUpload).toHaveBeenCalledTimes(1);
    expect(fileSelectComponent.files.length).toBe(1);
    expect(fileSelectComponent.files[0]).toStrictEqual(fakeFile);
  });
});
