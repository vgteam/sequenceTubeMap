import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import userEvent from '@testing-library/user-event';
import App from './App';

it('renders without crashing', () => {
  render(<App />);
  expect(screen.getByAltText(/Logo/i)).toBeInTheDocument()
});

it('allows the data source to be changed', () => {
  render(<App />);
  expect(screen.getByLabelText(/Data/i).value).toEqual('snp1kg-BRCA1');
  userEvent.selectOptions(screen.getByLabelText(/Data/i), 'cactus');
  expect(screen.getByLabelText(/Data/i).value).toEqual('cactus');
  userEvent.selectOptions(screen.getByLabelText(/Data/i), 'vg "small" example');
  expect(screen.getByLabelText(/Data/i).value).toEqual('vg "small" example');
});

it('allows the start to be cleared', async () => {
  render(<App />);
  expect(screen.getByLabelText(/Start/i).value).toEqual('1');
  await userEvent.clear(screen.getByLabelText(/Start/i));
  expect(screen.getByLabelText(/Start/i).value).toEqual('');
});

it('allows the start to be changed', async () => {
  render(<App />);
  expect(screen.getByLabelText(/Start/i).value).toEqual('1');
  // TODO: {selectall} fake keystroke is glitchy and sometimes gets dropped or
  // eats the next keystroke. So we clear the field first.
  await userEvent.clear(screen.getByLabelText(/Start/i));
  await userEvent.type(screen.getByLabelText(/Start/i), '123');
  expect(screen.getByLabelText(/Start/i).value).toEqual('123');
});

it('allows the length to be cleared', async () => {
  render(<App />);
  expect(screen.getByLabelText(/Length/i).value).toEqual('100');
  await userEvent.clear(screen.getByLabelText(/Length/i));
  expect(screen.getByLabelText(/Length/i).value).toEqual('');
});

it('allows the length to be changed', async () => {
  render(<App />);
  expect(screen.getByLabelText(/Length/i).value).toEqual('100');
  await userEvent.clear(screen.getByLabelText(/Length/i));
  await userEvent.type(screen.getByLabelText(/Length/i), '123');
  expect(screen.getByLabelText(/Length/i).value).toEqual('123');
});

