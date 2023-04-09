import React from 'react';
import { render, fireEvent, waitFor }  from '@testing-library/react';
import {TrackListItem} from './TrackListItem';
import '@testing-library/jest-dom'

describe('TrackSettings', () => {
    const availableColors = ["greys", "ygreys", "reds", "plainColors", "lightColors"];

    const availableTracks = [{"files": [{"name": "fileA1.vg", "type": "graph"},
                                        {"name": "fileA2.gbwt", "type": "haplotype"}]},
                             {"files": [{"name": "fileB1.gbwt", "type": "haplotype"},
                                        {"name": "fileB2.gam", "type": "read"}]},
                             {"files": [{"name": "fileC1.xg", "type": "graph"}]}]

    it('should render without errors', async () => {
        const fakeOnChange = jest.fn();
        const fakeOnDelete = jest.fn();
        const { getByText } = render(
            <TrackListItem 
              availableTracks={availableTracks}
              onChange = {fakeOnChange}
              onDelete = {fakeOnDelete}
             />
        );

        let placeholder = await getByText("Settings");
        expect(placeholder).toBeTruthy();

        placeholder = await getByText("graph");
        expect(placeholder).toBeTruthy();

        placeholder = await getByText("Select a file");
        expect(placeholder).toBeTruthy();
    });

    it('should call onChange correctly', async () => {
        const fakeOnChange = jest.fn();
        const fakeOnDelete = jest.fn();
        
        const { getByText, queryByTestId, rerender } = render(
            <TrackListItem 
              availableColors={availableColors}
              availableTracks={availableTracks}
              onChange = {fakeOnChange}
              onDelete = {fakeOnDelete}
             />
        );

        expect(fakeOnChange).toHaveBeenCalledTimes(0);

        // change track type
        const fileTypeSelectComponent = queryByTestId('filetype-select-component');
        fireEvent.keyDown(fileTypeSelectComponent.firstChild, {key: "ArrowDown"});
        await waitFor(() => getByText("haplotype"));
        fireEvent.click(getByText("haplotype"));

        expect(fakeOnChange).toHaveBeenCalledTimes(1);
        // should be called with undefined as file
        expect(fakeOnChange).toHaveBeenCalledWith("haplotype", undefined, {"auxPallete": "reds", "colorReadsByMappingQuality": false, "mainPallete": "blues"});

        // simulate onchange rerendering component
        rerender(
            <TrackListItem 
              trackType={"haplotype"}
              availableColors={availableColors}
              availableTracks={availableTracks}
              onChange = {fakeOnChange}
              onDelete = {fakeOnDelete}
             />
        );

        // change file name
        const fileSelectComponent = queryByTestId('file-select-component');
        fireEvent.keyDown(fileSelectComponent.firstChild, {key: "ArrowDown"});
        await waitFor(() => getByText("fileB1.gbwt"));
        fireEvent.click(getByText("fileB1.gbwt"));

        expect(fakeOnChange).toHaveBeenCalledTimes(2);
        expect(fakeOnChange).toHaveBeenCalledWith("haplotype", {"name": "fileB1.gbwt", "type": "haplotype"}, {"auxPallete": "reds", "colorReadsByMappingQuality": false, "mainPallete": "blues"});


        // change color settings
        fireEvent.click(getByText("Settings", { selector: "button" }));
        fireEvent.click(getByText("reds"));
        fireEvent.click(document);

        expect(fakeOnChange).toHaveBeenCalledTimes(3); 
        expect(fakeOnChange).toHaveBeenCalledWith("haplotype", undefined, {"auxPallete": "reds", "colorReadsByMappingQuality": false, "mainPallete": "reds"});

    });
    
    it('should call onDelete correctly', async () => {
        const fakeOnChange = jest.fn();
        const fakeOnDelete = jest.fn();
        const { queryByTestId } = render(
            <TrackListItem 
              availableTracks={availableTracks}
              onChange = {fakeOnChange}
              onDelete = {fakeOnDelete}
             />
        );

        expect(fakeOnDelete).toHaveBeenCalledTimes(0); 

        fireEvent.click(queryByTestId("delete-button"));
        expect(fakeOnDelete).toHaveBeenCalledTimes(1); 
    });

});