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
    const params = qs.stringify(viewTarget, { encode: false });
    // complete url
    const full = window.location.origin + "?" + params;
    console.log(full);
    
    try{
      // copy full to clipboard
      copyCallback(full);
      // change text
      setText(CLICKED_TEXT);
    }
    catch(error){
      setText(UNCLICKED_TEXT);
      setDialogLink(full);
      console.log("copy error: ", error)
    }
  
  };
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <Button id="copyLinkButton" color="primary" onClick={handleCopyLink}>
        <FontAwesomeIcon icon={faLink} size="lg" />
        {text}
      </Button>
      {/* conditional rendering information from: https://legacy.reactjs.org/docs/conditional-rendering.html */}
      {(dialogLink != null) && 
        <PopupDialog open={open} close={close}>{dialogLink}</PopupDialog>
      }
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
