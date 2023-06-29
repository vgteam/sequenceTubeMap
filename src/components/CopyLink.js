import React, { useState } from "react";
import { Button } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import * as qs from 'qs';
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
    // complete url
    const full = window.location.origin + "?" + params;
    console.log(full);

    try{
      // copy full to clipboard
      copyCallback(full);
      // change text
      setText(CLICKED_TEXT);
    }
    catch(err){
      setText(UNCLICKED_TEXT);
      setDialogLink(full);
      console.log("copy error")
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
        <p><a href = {dialogLink} target = "_blank" rel="noopener noreferrer">Data</a><br/>Click this link to return to this view. Right click link to copy this view location.</p>
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

  var result = null;
  const s = url.href.split('?');
  // If url contains information on viewObject
  if (s[1]) {
    result = qs.parse(s[1]);
  }
 
  return result;
};
