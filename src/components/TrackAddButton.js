import React from "react";
import { Button } from "reactstrap";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// Component in TrackListDisplay, adds new track item into TrackList when pressed
export const TrackAddButton = ({ onChange, testID }) => {
  return (
    <Button
      aria-label="TrackAdd"
      onClick={onChange}
      data-testid={testID}
      style={{ width: "40px", marginLeft: "25px", marginTop: "5px" }}
    >
      <FontAwesomeIcon icon={faPlus} />
    </Button>
  );
};

TrackAddButton.propTypes = {
  onChange: PropTypes.func.isRequired,
  testID: PropTypes.string,
};

TrackAddButton.defaultProps = {
  testID: "track-add-button-component",
};

export default TrackAddButton;
