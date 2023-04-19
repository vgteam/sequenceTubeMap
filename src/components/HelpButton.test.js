import { enableFetchMocks } from 'jest-fetch-mock';
enableFetchMocks();

import React from 'react';
import {render} from '@testing-library/react';
import {HelpButton} from './HelpButton';
import {screen, waitFor} from '@testing-library/react';
import userEvent from "@testing-library/user-event";
import { act } from "react-dom/test-utils";


describe('HelpButton', () => {
    it('opens popup with help instructions', async () => {
        fetch.mockResponseOnce("Instructions");
        const result = render(
            <HelpButton file="./help/help.md" />
        );

        act(() => {
            userEvent.click(screen.getByRole('button'));
        });

        await waitFor(() => expect(screen.getByText('Instructions')).toBeTruthy());

        await waitFor(() => expect(screen.queryByText('#')).toBeFalsy());

    });
});
