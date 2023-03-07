import React from 'react';
import { render, fireEvent, waitFor, cleanup }  from '@testing-library/react';
import {TrackFilePicker} from './TrackFilePicker';



describe('TrackFilePicker', () => {
    const testOptions = ["fileA", "fileB", "fileC"];

    it('should render withouterrors', async () => {
        const fakeOnChange = jest.fn();
        const { getByText } = render(
            <TrackFilePicker 
            fileOptions={testOptions}
            fileSelect={"fileA"}
            pickerType={"dropdown"}
            handleInputChange={fakeOnChange}/>
        );

        // maybe need to search by "Select a file"
        const placeholder = getByText("fileA");
        expect(placeholder).toBeTruthy();
    });

    it('should call onChange when an option is selected', async () => {
        const fakeOnChange = jest.fn();
        const { getByText, queryByTestId } = render(
            <TrackFilePicker 
            fileOptions={testOptions}
            fileSelect={"fileA"}
            pickerType={"dropdown"}
            handleInputChange={fakeOnChange}/>
        );

        // find div containing the component
        const fileSelectComponent = queryByTestId('file-select-component');

        expect(fileSelectComponent).toBeDefined();
        expect(fileSelectComponent).not.toBeNull();

        // expand the select box
        fireEvent.keyDown(fileSelectComponent.firstChild, {key: "ArrowDown"});
        await waitFor(() => getByText("fileB"));
        fireEvent.click(getByText("fileB"));

        expect(fakeOnChange).toHaveBeenCalledTimes(1);
        expect(fakeOnChange).toHaveBeenCalledWith("fileB");

        // make sure we can repeat the process
        fireEvent.keyDown(fileSelectComponent.firstChild, {key: "ArrowDown"});
        await waitFor(() => getByText("fileC"));
        fireEvent.click(getByText("fileC"));

        expect(fakeOnChange).toHaveBeenCalledTimes(2);
        expect(fakeOnChange).toHaveBeenCalledWith("fileC");

    });

    it('should call onChange when filter by input value' ,async() => {
        const fakeOnChange = jest.fn();
        const { getByText, queryByTestId, container  } = render(
            <TrackFilePicker 
            fileOptions={testOptions}
            fileSelect={"fileA"}
            pickerType={"dropdown"}
            handleInputChange={fakeOnChange}/>
        );

        const fileSelectComponent = queryByTestId('file-select-component');
        
        fireEvent.change(container.querySelector('input'), {
            target: { value: 'fileC' },
        });
        
        fireEvent.keyDown(fileSelectComponent.firstChild, { key: 'ArrowDown' });  

        await waitFor(() => getByText("fileC"));
        fireEvent.click(getByText("fileC"));

        expect(fakeOnChange).toHaveBeenCalledTimes(1);
        expect(fakeOnChange).toHaveBeenCalledWith("fileC");
    })
    
});