import React from 'react';
import {render, fireEvent} from '@testing-library/react';
import {TrackTypeDropdown} from './TrackTypeDropdown';
import { screen, configure } from '@testing-library/react';
import userEvent from "@testing-library/user-event";

describe('TrackTypeDropdown', () => {
    it('calls the onChange callback handler', async () => {
        const onChange = jest.fn();
  
        const result = render(
            <TrackTypeDropdown value="haplotype" onChange={onChange}>
            </TrackTypeDropdown>
        );
  

        await userEvent.selectOptions(
            screen.getByRole('combobox'),
            'graph'
          );
  
        expect(onChange).toHaveBeenCalledTimes(1);
    });
});