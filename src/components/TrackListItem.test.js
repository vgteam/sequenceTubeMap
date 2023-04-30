import React from 'react';
import { render, fireEvent, waitFor }  from '@testing-library/react';
import {TrackListItem} from './TrackListItem';
import '@testing-library/jest-dom'

describe('TrackListItem', () => {
    const trackFile = undefined;
    const trackType = "graph";
    const availableColors = ["greys", "ygreys", "reds", "plainColors", "lightColors"];
    const availableTracks = [{"files": [{"name": "fileA1.vg", "type": "graph"},
                                        {"name": "fileA2.gbwt", "type": "haplotype"}]},
                             {"files": [{"name": "fileB1.gbwt", "type": "haplotype"},
                                        {"name": "fileB2.gam", "type": "read"}]},
                             {"files": [{"name": "fileC1.xg", "type": "graph"}]}];
    const trackColorSettings = {    
        mainPallete: "blues",
        auxPallete: "reds",
        colorReadsByMappingQuality: false
    };


    it('should render without errors', async () => {
        const fakeOnChange = jest.fn();
        const fakeOnDelete = jest.fn();
        const { getByText, getByRole } = render(
            <TrackListItem 
              trackProps={{
                trackFile: trackFile,
                trackType: trackType,
                trackColorSettings: trackColorSettings
              }}
              availableColors = {availableColors}
              availableTracks = {availableTracks}
              onChange = {fakeOnChange}
              onDelete = {fakeOnDelete}
              trackID = {1}
             />
        );

        let placeholder = getByRole("button", {name: /Settings/i});
        expect(placeholder).toBeTruthy();

        placeholder = await getByText("graph");
        expect(placeholder).toBeTruthy();

        placeholder = await getByText("Select a file");
        expect(placeholder).toBeTruthy();
    });

    it('should call onChange correctly', async () => {
        const fakeOnChange = jest.fn();
        const fakeOnDelete = jest.fn();
        
        const { getByText, queryByTestId, rerender, getByRole } = render(
            <TrackListItem 
            trackProps={{
                trackFile: trackFile,
                trackType: trackType,
                trackColorSettings: trackColorSettings
              }}
              availableColors = {availableColors}
              availableTracks = {availableTracks}
              onChange = {fakeOnChange}
              onDelete = {fakeOnDelete}
              trackID = {1}
             />
        );

        expect(fakeOnChange).toHaveBeenCalledTimes(0);

        // change track type
        const fileTypeSelectComponent = queryByTestId("file-type-select-component1");
        fireEvent.keyDown(fileTypeSelectComponent.firstChild, {key: "ArrowDown"});
        await waitFor(() => getByText("haplotype"));
        fireEvent.click(getByText("haplotype"));

        // should wait for file select to call onChange
        expect(fakeOnChange).toHaveBeenCalledTimes(0);

        // simulate onchange rerendering component
        rerender(
            <TrackListItem 
            trackProps={{
                trackFile: trackFile,
                trackType: "haplotype",
                trackColorSettings: trackColorSettings
              }}
              availableColors = {availableColors}
              availableTracks = {availableTracks}
              onChange = {fakeOnChange}
              onDelete = {fakeOnDelete}
              trackID = {1}
             />
        );

        // change file name
        const fileSelectComponent = queryByTestId('file-select-component1');
        fireEvent.keyDown(fileSelectComponent.firstChild, {key: "ArrowDown"});
        await waitFor(() => getByText("fileB1.gbwt"));
        fireEvent.click(getByText("fileB1.gbwt"));

        expect(fakeOnChange).toHaveBeenCalledTimes(1);
        expect(fakeOnChange).toHaveBeenCalledWith(1, {
            trackFile: {"name": "fileB1.gbwt", "type": "haplotype"},
            trackType: "haplotype",
            trackColorSettings: trackColorSettings
        });


        // change color settings
        fireEvent.click(getByRole("button", {name: /Settings/i}));
        await waitFor(() => getByText("reds"));
        fireEvent.click(getByText("reds"));
        fireEvent.click(document);

        expect(fakeOnChange).toHaveBeenCalledTimes(2); 


    });
    
    it('should call onDelete correctly', async () => {
        const fakeOnChange = jest.fn();
        const fakeOnDelete = jest.fn();
        const { queryByTestId } = render(
            <TrackListItem 
            trackProps={{
                trackFile: trackFile,
                trackType: trackType,
                trackColorSettings: trackColorSettings
              }}
              availableColors = {availableColors}
              availableTracks = {availableTracks}
              onChange = {fakeOnChange}
              onDelete = {fakeOnDelete}
              trackID = {1}
             />
        );

        expect(fakeOnDelete).toHaveBeenCalledTimes(0); 

        fireEvent.click(queryByTestId("delete-button-component1"));
        expect(fakeOnDelete).toHaveBeenCalledTimes(1); 
    });

});
