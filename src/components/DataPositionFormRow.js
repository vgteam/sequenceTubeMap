import React, { Component } from "react";
import PropTypes from "prop-types";
import { CopyLink } from "./CopyLink";
import { Form, Button } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStepBackward,
  faStepForward,
  faSearchPlus,
  faSearchMinus,
} from "@fortawesome/free-solid-svg-icons";
import HelpButton from "./HelpButton.js"
import * as tubeMap from "../util/tubemap";

const ZOOM_FACTOR = 2.0;

class DataPositionFormRow extends Component {
  constructor() {
    super();
    this.onKeyUp = this.onKeyUp.bind(this);
  }
  onKeyUp(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      this.props.handleInputChange(event);
      this.props.handleGoButton();
    }
  }

  handleZoomIn = () => {
    tubeMap.zoomBy(ZOOM_FACTOR);
  };

  handleZoomOut = () => {
    tubeMap.zoomBy(1.0 / ZOOM_FACTOR);
  };

  handleDownloadButton = () => {
    const svgN = document.getElementById("svg");
    const svgData = new XMLSerializer().serializeToString(svgN);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = "graph.svg";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // When the user clicks on the help icon, open the popup
  // TODO: React-ify
  helpPopupFunction = () => {
    var popup = document.getElementById("helpPopup");
    popup.classList.toggle("show");
  };

  render() {
    return (
      <Form>
        &nbsp;
        {this.props.uploadInProgress && (
          <div className="smallLoader" id="fileUploadSpinner" />
        )}

        {/* Help Button */}
        <HelpButton file="./help/help.md"></HelpButton>
        
        <Button
          color={this.props.viewTargetHasChange ? "alert" : "primary"}
          title={this.props.viewTargetHasChange ? "Click to apply pending changes." : "No changes to apply; view is up to date."}
          id="goButton"
          onClick={this.props.handleGoButton}
          disabled={this.props.uploadInProgress}
        >
          Go
        </Button>
        <Button
          color="primary"
          id="goLeftButton"
          onClick={this.props.handleGoLeft}
          disabled={this.props.uploadInProgress || !this.props.canGoLeft}
        >
          <FontAwesomeIcon icon={faStepBackward} size="lg" />
        </Button>
        <Button color="primary" id="zoomInButton" onClick={this.handleZoomIn}>
          <FontAwesomeIcon icon={faSearchPlus} size="lg" />
        </Button>
        <Button color="primary" id="zoomOutButton" onClick={this.handleZoomOut}>
          <FontAwesomeIcon icon={faSearchMinus} size="lg" />
        </Button>
        <Button
          color="primary"
          id="goRightButton"
          onClick={this.props.handleGoRight}
          disabled={this.props.uploadInProgress || !this.props.canGoRight}
        >
          <FontAwesomeIcon icon={faStepForward} size="lg" />
        </Button>
        <Button
          color="secondary"
          id="downloadButton"
          onClick={this.handleDownloadButton}
        >
          Download Image
        </Button>
        <CopyLink getCurrentViewTarget={this.props.getCurrentViewTarget} />
        {this.props.uploadInProgress && (
          <div className="spinner-grow upload-in-progress" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        )}
      </Form>
    );
  }
}

DataPositionFormRow.propTypes = {
  handleGoButton: PropTypes.func.isRequired,
  handleGoLeft: PropTypes.func.isRequired,
  handleGoRight: PropTypes.func.isRequired,
  uploadInProgress: PropTypes.bool.isRequired,
  getCurrentViewTarget: PropTypes.func.isRequired,
  viewTargetHasChange: PropTypes.bool.isRequired,
  canGoLeft: PropTypes.bool.isRequired,
  canGoRight: PropTypes.bool.isRequired,
};

export default DataPositionFormRow;
