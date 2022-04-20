import React, { useState } from "react";
import { Form, Label, Input, Button } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";

const UNCLICKED_TEXT = " Copy link to data";
const CLICKED_TEXT = " Copied link!";

export const urlParamsToObject = () => {
  // Take any saved parameters in the query part of the URL
  // and turn to object to populate in HeaderForm state and fetchParams
  // Returns: Object (HeaderForm state)
  // See https://stackoverflow.com/questions/8648892/how-to-convert-url-parameters-to-a-javascript-object
  // TODO: check empty
  // also make sure to not run at every render
  const params = new URL(document.location).searchParams;
  if (params.toString() === "") return null;
  const urlParams = new URLSearchParams(params);
  const entries = urlParams.entries();
  const result = {};
  for (const [key, value] of entries) {
    // each 'entry' is a [key, value] tuple
    result[key] = value === "undefined" ? undefined : value;
  }
  console.log(params, result);
  debugger;
  return result;
};

export function CopyLink(props) {
  console.log("props", { props });
  const [text, setText] = useState(UNCLICKED_TEXT);

  const handleCopyLink = () => {
    const params = new URLSearchParams(props.fetchParams).toString();
    const full = window.location.host + "?" + params;

    navigator.clipboard.writeText(full);
    setText(CLICKED_TEXT);
    console.log("Copied", params);
  };
  return (
    <Button id="shareLinkButton" color="primary" onClick={handleCopyLink}>
      <FontAwesomeIcon icon={faLink} size="lg" />
      {text}
    </Button>
  );
}
