# Development Guide

This document describes how to work on the Sequence Tube Map code as a developer.

## Development Server

The `npm run build`/`npm run serve` pipeline can only produce minified code, which can be difficult to debug. In development, you should instead use:
  ```
  yarn start
  ```
  or
  ```
  npm run start
  ```
This will use React's development mode server to serve the frontend, and run the backend in a separate process, behind React's proxy. Local ports 3000 (or set a different SERVER_PORT in .env) and 3001 must both be free.

Running in this mode allows the application to produce human-readable stack traces when something goes wrong in the browser.

## Running Tests

For interactive development, you can use:
  ```
  yarn test
  ```
  or
  ```
  npm run test
  ```

This will start the tests in a watching mode, where files that are changed will prompt apparently-dependent tests to rerun. Note that this only looks for changes versus the currently checked-out Git commit; if you have committed your changes, you cannot test them this way. On Mac, it also requires that the `watchman` package be installed, because it needs to watch the jillions of files in `node_modules` for changes.

If you want to run all the tests, you can run:
  ```
  yarn test -- --watchAll=false
  ```
  or
  ```
  npm run test -- --watchAll=false
  ```

You can also set the environment variable `CI=true`, or [look sufficiently like a kind of CI environment known to `react-scripts`](https://create-react-app.dev/docs/running-tests/#command-line-interface).

If you want to run just a single test, based on its `describe` or `it` name argument, you can do something like:

  ```
  npm run test -- --watchAll=false -t "can retrieve the list of mounted xg files"
  ```

## Running Prettier Formatter

In order to format all `.js` and `.css` files you can run:

```
npm run format
```
Currently, this repo currently uses [Prettier's default options](https://prettier.io/docs/en/options.html), including double quotes and 2 space tab width for JS. 

