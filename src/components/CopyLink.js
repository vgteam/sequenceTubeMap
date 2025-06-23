import React, { useState } from "react";
import { Button } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import * as qs from "qs";
import PopupDialog from "./PopupDialog";

const UNCLICKED_TEXT = " Copy link to data";
const CLICKED_TEXT = " Copied link!";

// uses Clipboard API to write text to clipboard
export const writeToClipboard = (text) => {
  navigator.clipboard.writeText(text);
};

// For testing purposes
let copyCallback = writeToClipboard;

// sets value of copyCallback
export const setCopyCallback = (callback) => (copyCallback = callback);

export function CopyLink(props) {
  // Button to copy a link with viewTarget to the data selected
  const [text, setText] = useState(UNCLICKED_TEXT);
  const [dialogLink, setDialogLink] = useState(undefined);

  const handleCopyLink = () => {
    // Turn viewTarget into a URL query string
    const viewTarget = props.getCurrentViewTarget();
    // Don't stringify objects for readability
    // https://github.com/ljharb/qs#stringifying
    const params = qs.stringify(viewTarget, { encodeValuesOnly: true });
    console.log("params ", params);
    
    // Make a new URL based off the current one
    let url = new URL(window.location.toString());
    url.search = "?" + params;
    url.hash = "";
    console.log(url);

    try {
      // copy full to clipboard
      copyCallback(url.toString());
      // change text
      setText(CLICKED_TEXT);
    } catch (err) {
      setText(UNCLICKED_TEXT);
      setDialogLink(url.toString());
      console.log("copy error");
    }
  };

  const close = () => setDialogLink(undefined);

  return (
    <>
      <Button id="copyLinkButton" color="primary" onClick={handleCopyLink}>
        <FontAwesomeIcon icon={faLink} size="lg" />
        {text}
      </Button>
      <PopupDialog open={dialogLink != null} close={close}>
        <h5>Link to Data</h5>
        {/* Received warning on build that simply using target="_blank" is a security risk in older browsers, so included rel="noopener noreferrer" as per this post: 
         https://stackoverflow.com/questions/57628890/why-people-use-rel-noopener-noreferrer-instead-of-just-rel-noreferrer */}
        <p>
          <a href={dialogLink} target="_blank" rel="noopener noreferrer">
            Data
          </a>
          <br />
          Click this link to return to this view. Right click link to copy this
          view location.
        </p>
      </PopupDialog>
    </>
  );
}

export const urlParamsToViewTarget = (url) => {
  // @param {string} url - url containing search params
  //  normally should be document.location
  // Take any saved parameters in the query part of the URL
  // and turn to object to populate in HeaderForm state and viewTarget
  // Returns: Object (viewTarget) - see App.js

  let parsed = new URL(url);
  let result = null;
  // If url contains information on viewObject
  if (parsed.search) {
    result = qs.parse(parsed.search.substr(1));
  }

  

  // Ensures that the flag fields are booleans, as the qs module can't tell
  // the difference between false and "false"
  if (result != null) {
    for (let flag_name of ["simplify", "removeSequences"]) {
      if (result[flag_name] === "true") {
        result[flag_name] = true;
      } else if (result[flag_name] === "false") {
        result[flag_name] = false;
      }
    }
  }

  return result;
};
