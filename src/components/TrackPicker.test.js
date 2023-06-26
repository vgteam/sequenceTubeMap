import React from 'react';
import { render, fireEvent, waitFor }  from '@testing-library/react';
import {TrackPicker} from './TrackPicker';
import '@testing-library/jest-dom'
import config from "./../config.json";


describe('TrackPicker', () => {
    const tracks = {
        1: config.defaultTrackProps,
        2: config.defaultTrackProps,
        3: config.defaultTrackProps,
    }
    const availableColors = ["greys", "ygreys", "reds", "plainColors", "lightColors"];
    const availableTracks = [{"files": [{"name": "fileA1.vg", "type": "graph"},
                                        {"name": "fileA2.gbwt", "type": "haplotype"}]},
                             {"files": [{"name": "fileB1.gbwt", "type": "haplotype"},
                                        {"name": "fileB2.gam", "type": "read"}]},
                             {"files": [{"name": "fileC1.xg", "type": "graph"}]}];

    it('should render without errors', async () => {
        const fakeOnChange = jest.fn();
        const { queryByTestId } = render(
            <TrackPicker
                tracks={tracks}
                availableTracks={availableTracks}
                availableColors={availableColors}
                onChange={fakeOnChange}
            />
        );

        const trackPickerButton = queryByTestId("TrackPickerButton");

        expect(trackPickerButton).toBeTruthy();

        fireEvent.click(trackPickerButton);

        expect(queryByTestId("file-type-select-component1")).toBeTruthy();

        expect(queryByTestId("file-type-select-component2")).toBeTruthy();

        expect(queryByTestId("file-select-component1")).toBeTruthy();

        expect(queryByTestId("settings-button-component1")).toBeTruthy();

        expect(queryByTestId("delete-button-component1")).toBeTruthy();

        expect(queryByTestId("track-add-button-component")).toBeTruthy();
    });


    it('should add track items when the add button is pressed', async () => {
        const fakeOnChange = jest.fn();
        const { queryByTestId } = render(
            <TrackPicker
                tracks={tracks}
                availableTracks={availableTracks}
                availableColors={availableColors}
                onChange={fakeOnChange}
            />
        );

        fireEvent.click(queryByTestId("TrackPickerButton"));

        expect(queryByTestId('file-type-select-component4')).toBeFalsy();

        const addButtonComponent = queryByTestId('track-add-button-component');
        fireEvent.click(addButtonComponent);

        expect(queryByTestId('file-type-select-component4')).toBeTruthy();
        expect(queryByTestId('file-select-component4')).toBeTruthy();
        expect(queryByTestId('settings-button-component4')).toBeTruthy();

        fireEvent.click(addButtonComponent);

        expect(queryByTestId('file-type-select-component5')).toBeTruthy();
        expect(queryByTestId('file-select-component5')).toBeTruthy();
        expect(queryByTestId('settings-button-component5')).toBeTruthy();



    });

    it('should call onChange when all files are selected', async () => {
        const fakeOnChange = jest.fn();
        const { queryByTestId, getByText, rerender } = render(
            <TrackPicker
                tracks={tracks}
                availableTracks={availableTracks}
                availableColors={availableColors}
                onChange={fakeOnChange}
            />
        );

        fireEvent.click(queryByTestId("TrackPickerButton"));

        expect(fakeOnChange).toHaveBeenCalledTimes(0);

        // select a file for all three track items

        // first track item
        fireEvent.keyDown(queryByTestId('file-select-component1').firstChild, {key: "ArrowDown"});
        await waitFor(() => getByText("fileA1.vg"));
        fireEvent.click(getByText("fileA1.vg"));

        // onChange should not be called
        expect(fakeOnChange).toHaveBeenCalledTimes(0);

        // second track item
        fireEvent.keyDown(queryByTestId("file-type-select-component2").firstChild, {key: "ArrowDown"});
        await waitFor(() => getByText("haplotype"));
        fireEvent.click(getByText("haplotype"));

        fireEvent.keyDown(queryByTestId('file-select-component2').firstChild, {key: "ArrowDown"});
        await waitFor(() => getByText("fileB1.gbwt"));
        fireEvent.click(getByText("fileB1.gbwt"));

        expect(fakeOnChange).toHaveBeenCalledTimes(0);

        // third track item
        fireEvent.keyDown(queryByTestId('file-select-component3').firstChild, {key: "ArrowDown"});
        await waitFor(() => getByText("fileC1.xg"));
        fireEvent.click(getByText("fileC1.xg"));

        let newTracks = JSON.parse(JSON.stringify(tracks));

        newTracks[1].trackFile = "fileA1.vg";
        newTracks[1].trackType = "graph";
        newTracks[2].trackFile = "fileB1.gbwt"
        newTracks[2].trackType = "haplotype";
        newTracks[3].trackFile = "fileC1.xg"
        newTracks[3].trackType = "graph"

        expect(fakeOnChange).toHaveBeenCalledTimes(1);
        expect(fakeOnChange).toHaveBeenCalledWith(newTracks);

        // add a track item and select a file
        const addButtonComponent = queryByTestId('track-add-button-component');
        fireEvent.click(addButtonComponent);

        newTracks[4] = config.defaultTrackProps;
        rerender(
            <TrackPicker
                tracks={newTracks}
                availableTracks={availableTracks}
                availableColors={availableColors}
                onChange={fakeOnChange}
            />
        )

        fireEvent.keyDown(queryByTestId("file-type-select-component4").firstChild, {key: "ArrowDown"});
        await waitFor(() => getByText("read"));
        fireEvent.click(getByText("read"));

        fireEvent.keyDown(queryByTestId('file-select-component4').firstChild, {key: "ArrowDown"});
        await waitFor(() => getByText("fileB2.gam"));
        fireEvent.click(getByText("fileB2.gam"));

        newTracks[4] = {
            trackFile: {"name": "fileB2.gam", "type": "read"},
            trackType: "read",
            trackColorSettings: {    
                mainPalette: "blues",
                auxPalette: "reds",
                colorReadsByMappingQuality: false
            }
        }

        expect(fakeOnChange).toHaveBeenCalledTimes(2);
        expect(fakeOnChange).toHaveBeenCalledWith(newTracks);

    });    

    it('should close when the exit button is pressed', async () => {
        const fakeOnChange = jest.fn();
        const { queryByTestId, getByText, rerender } = render(
            <TrackPicker
                tracks={tracks}
                availableTracks={availableTracks}
                availableColors={availableColors}
                onChange={fakeOnChange}
            />
        );

        // open popup
        fireEvent.click(queryByTestId("TrackPickerButton"));

        expect(queryByTestId("file-type-select-component1")).toBeTruthy();

        expect(queryByTestId("file-select-component1")).toBeTruthy();

        expect(queryByTestId("settings-button-component1")).toBeTruthy();

        // close popup
        fireEvent.click(queryByTestId("TrackPickerCloseButton"));

        expect(queryByTestId("file-type-select-component1")).toBeFalsy();

        expect(queryByTestId("file-select-component1")).toBeFalsy();

        expect(queryByTestId("settings-button-component1")).toBeFalsy();



    });

});
