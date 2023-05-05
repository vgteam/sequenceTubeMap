import React from 'react';
import {render} from '@testing-library/react';
import {TrackSettingsButton} from './TrackSettingsButton';
import {screen} from '@testing-library/react';
import userEvent from "@testing-library/user-event";

describe('TrackSettingsButton', () => {
    it('opens popup', async () => {
        const result = render(
            <TrackSettingsButton fileType="graph" trackColorSettings={{mainPallete: "blues",
                auxPallete: "reds",
                colorReadsByMappingQuality: false}} setTrackColorSetting={function(a, b){}}></TrackSettingsButton>
        );

        await userEvent.click(screen.getByTestId('button'));

        expect(screen.getByRole('heading')).toBeTruthy();

        await userEvent.click(screen.getByTestId('button'));

        expect(screen.queryByRole('heading')).toBeFalsy();


    });
});
