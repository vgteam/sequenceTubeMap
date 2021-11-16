// Function to fetch a JSON response, and throw an error if the server returns
// an error code, the response is not valid JSON, or the resposne contains an
// "error" field.
// Takes the same arguments as fetch(), and returns a promise for the parsed
// JSON root object.
export async function fetchAndParse(...fetchArgs) {
  let response = await fetch(...fetchArgs);
  // If this doesn't parse, an error will happen.
  const json = await response.json();
  // We need to do all our parsing here, if we expect the catch to catch errors.
  if (json.error) {
    // Even 200 responses can come with error messages, and if an error
    // response has a message, we want it.
    throw new Error(json.error);
  } else if (response.status < 200 || response.status > 299) {
    // Not a successful response
    throw new Error('Server responded with error code ' + response.status);
  }
  // Otherwise return the parsed JSON
  return json;
};
