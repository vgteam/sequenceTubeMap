import React from 'react';
import { render, fireEvent, waitFor }  from '@testing-library/react';
import {TrackFilePicker} from './TrackFilePicker';



describe('TrackFilePicker', () => {
    const testTracks = [{"files": [{"name": "fileA1.vg", "type": "graph"},
                                   {"name": "fileA2.gbwt", "type": "haplotype"}]},
                        {"files": [{"name": "fileB1.gbwt", "type": "haplotype"},
                                   {"name": "fileB2.gam", "type": "read"}]},
                        {"files": [{"name": "fileC1.xg", "type": "graph"}]}];

    it('should render without errors', async () => {
        const fakeOnChange = jest.fn();
        const { getByText } = render(
            <TrackFilePicker 
            tracks={testTracks}
            fileType={"graph"}
            pickerType={"dropdown"}
            handleInputChange={fakeOnChange}/>
        );

        // maybe need to search by "Select a file"
        const placeholder = await getByText("Select a file");
        expect(placeholder).toBeTruthy();
    });
    
    it('should allow value to be controlled', async () => {
        const fakeOnChange = jest.fn();
        const { getByText, queryByText, rerender } = render(
            <TrackFilePicker 
            tracks={testTracks}
            fileType={"graph"}
            pickerType={"dropdown"}
            value={{"name": "fileA1.vg", "type": "graph"}}
            handleInputChange={fakeOnChange}/>
        );

        let displayed = getByText("fileA1.vg");
        expect(displayed).toBeTruthy();
        let notDisplayed = queryByText("fileC1.xg");
        expect(notDisplayed).toBeFalsy();
        
        rerender(
            <TrackFilePicker 
            tracks={testTracks}
            fileType={"graph"}
            pickerType={"dropdown"}
            value={{"name": "fileC1.xg", "type": "graph"}}
            handleInputChange={fakeOnChange}/>
        );
        
        displayed = getByText("fileC1.xg");
        expect(displayed).toBeTruthy();
        notDisplayed = queryByText("fileA1.vg");
        expect(notDisplayed).toBeFalsy();
    });

    it('should call onChange when an option is selected', async () => {
        const fakeOnChange = jest.fn();
        const { getByText, queryByTestId } = render(
            <TrackFilePicker 
            tracks={testTracks}
            fileType={"haplotype"}
            pickerType={"dropdown"}
            handleInputChange={fakeOnChange}/>
        );

        // find div containing the component
        const fileSelectComponent = queryByTestId('file-select-component');

        expect(fileSelectComponent).toBeDefined();
        expect(fileSelectComponent).not.toBeNull();

        // expand the select box
        fireEvent.keyDown(fileSelectComponent.firstChild, {key: "ArrowDown"});
        await waitFor(() => getByText("fileB1.gbwt"));
        fireEvent.click(getByText("fileB1.gbwt"));

        expect(fakeOnChange).toHaveBeenCalledTimes(1);
        expect(fakeOnChange).toHaveBeenCalledWith({"name": "fileB1.gbwt", "type": "haplotype"});

        // make sure we can repeat the process
        fireEvent.keyDown(fileSelectComponent.firstChild, {key: "ArrowDown"});
        await waitFor(() => getByText("fileA2.gbwt"));
        fireEvent.click(getByText("fileA2.gbwt"));

        expect(fakeOnChange).toHaveBeenCalledTimes(2);
        expect(fakeOnChange).toHaveBeenCalledWith({"name": "fileA2.gbwt", "type": "haplotype"});

    });

    it('should call onChange when queried by input value' ,async() => {
        const fakeOnChange = jest.fn();
        const { getByText, queryByTestId, container  } = render(
            <TrackFilePicker 
            tracks={testTracks}
            fileType={"graph"}
            pickerType={"dropdown"}
            handleInputChange={fakeOnChange}/>
        );

        const fileSelectComponent = queryByTestId('file-select-component');
        
        fireEvent.change(container.querySelector('input'), {
            target: { value: 'fileC1.xg' },
        });
        
        fireEvent.keyDown(fileSelectComponent.firstChild, { key: 'ArrowDown' });  

        await waitFor(() => getByText("fileC1.xg"));
        fireEvent.click(getByText("fileC1.xg"));

        expect(fakeOnChange).toHaveBeenCalledTimes(1);
        expect(fakeOnChange).toHaveBeenCalledWith({"name": "fileC1.xg", "type": "graph"});
    })
    
});
