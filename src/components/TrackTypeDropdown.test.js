import React from 'react';
import { render, fireEvent, waitFor }  from '@testing-library/react';
import {TrackTypeDropdown} from './TrackTypeDropdown';
import {screen} from '@testing-library/react';

describe('TrackTypeDropdown', () => {
    it('calls the onChange callback handler', async () => {
        const onChange = jest.fn();
        const {queryByTestId} = render(
            <TrackTypeDropdown value="haplotype" onChange={onChange}>
            </TrackTypeDropdown>
        );
        const fileTypeSelectComponent = queryByTestId('filetype-select-component');
        fireEvent.keyDown(fileTypeSelectComponent.firstChild, {key: "ArrowDown"});
        await waitFor(() => screen.getByText("graph"));
        fireEvent.click(screen.getByText("graph"));

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenLastCalledWith("graph");
    });
});