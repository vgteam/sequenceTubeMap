import React from 'react';
import {render, fireEvent} from '@testing-library/react';
import {TrackFilePicker} from './TrackFilePicker';
import { screen, configure } from '@testing-library/react';
import userEvent from "@testing-library/user-event";

describe('TrackFilePicker', () => {
    it('calls the onChange callback handler', async () => {
        const onChange = jest.fn();
        const result = render(
            <TrackFilePicker fileSelect="fileA" fileOptions={["fileA", "fileB", "fileC"]} handleInputChange={onChange}>
            </TrackFilePicker>
        );
        await userEvent.selectOptions(
            screen.getByRole('combobox'),
            'fileB'
          );
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenLastCalledWith("fileB");
    });
});