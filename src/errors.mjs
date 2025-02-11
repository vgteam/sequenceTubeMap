/// errors.mjs: Error type definitions for the tube map server

// We can throw this error to trigger our error handling code instead of
// Express's default. It covers input validation failures, and vaguely-expected
// server-side errors we want to report in a controlled way (because they could
// be caused by bad user input to vg).
export class TubeMapError extends Error {
  constructor(message) {
    super(message);
  }
}

// We can throw this error to make Express respond with a bad request error
// message. We should throw it whenever we detect that user input is
// unacceptable.
export class BadRequestError extends TubeMapError {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

// We can throw this error to make Express respond with an internal server
// error message
export class InternalServerError extends TubeMapError {
  constructor(message) {
    super(message);
    this.status = 500;
  }
}

// We can throw this error to make Express respond with an internal server
// error message about vg.
export class VgExecutionError extends InternalServerError {
  constructor(message) {
    super(message);
  }
}
