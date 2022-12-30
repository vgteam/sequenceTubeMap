import React, { useState } from "react";
import { Button } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import * as qs from 'qs';

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

    console.log("copying");
    //const params = new URLSearchParams(viewTarget).toString();
    const params = qs.stringify(viewTarget, { encode: false });
    const full = window.location.origin + "?" + params;
    console.log(full);
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

  var result = {};
  const s = url.href.split('?');
  // If url contains information on viewObject
  if (s[1]) {
    result = qs.parse(s[1]);
  } else {
    // Get portion of URL after '?'
    const params = new URL(url).searchParams;

    if (params.toString() === "") return null;
    // Parse the parameters from the URL
    const urlParams = new URLSearchParams(params);
    const entries = urlParams.entries();
    for (const [key, value] of entries) {
      console.log("key: ", key);
      console.log("value: ", value);
      // each 'entry' is a [key, value] tuple
      if (value !== undefined) {
        // If multiple values under the same key is recieved
        if (Object.prototype.hasOwnProperty.call(result, key)) {
          if (typeof result[key] === 'string') {
            result[key] = [result[key]];
          }
          result[key].push(value);
        } else {
          result[key] = value;
        }
      }
    }
  }
 
  return result;
};
