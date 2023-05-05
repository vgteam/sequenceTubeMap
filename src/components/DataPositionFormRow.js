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
        <HelpButton file="./help/help-tooltip.md"></HelpButton>
        
        <Button
          color="primary"
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
          <div class="spinner-grow" role="status">
            <span class="sr-only">Loading...</span>
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
};

export default DataPositionFormRow;
