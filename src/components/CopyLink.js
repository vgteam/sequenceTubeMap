import React, { useState } from "react";
import { Button } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";

const UNCLICKED_TEXT = " Copy link to data";
const CLICKED_TEXT = " Copied link!";

export const writeToClipboard = (text) => {
  navigator.clipboard.writeText(text);
};

// For testing purposes
let copyCallback = writeToClipboard;
export const setCopyCallback = (callback) => (copyCallback = callback);
export function CopyLink(props) {
  // Button to copy a link with viewTarget to the data selected

  const [text, setText] = useState(UNCLICKED_TEXT);

  const handleCopyLink = () => {
    // Turn viewTarget into a URL query string
    const viewTarget = props.getCurrentViewTarget();

    const params = new URLSearchParams(viewTarget).toString();
    const full = window.location.origin + "?" + params;
    copyCallback(full);

    // Write link to clipboard
    // Update button text to show we've copied
    setText(CLICKED_TEXT);
  };
  return (
    <Button id="copyLinkButton" color="primary" onClick={handleCopyLink}>
      <FontAwesomeIcon icon={faLink} size="lg" />
      {text}
    </Button>
  );
}

export const urlParamsToViewTarget = (url) => {
  // @param {string} url - url containing search params
  //  normally should be document.location
  // Take any saved parameters in the query part of the URL
  // and turn to object to populate in HeaderForm state and viewTarget
  // Returns: Object (viewTarget) - see App.js
  // Source for parsing: https://stackoverflow.com/questions/8648892/how-to-convert-url-parameters-to-a-javascript-object

  // Get portion of URL after '?'
  const params = new URL(url).searchParams;
  if (params.toString() === "") return null;
  // Parse the parameters from the URL
  const urlParams = new URLSearchParams(params);
  const entries = urlParams.entries();
  const result = {};
  for (const [key, value] of entries) {
    // each 'entry' is a [key, value] tuple
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
};
