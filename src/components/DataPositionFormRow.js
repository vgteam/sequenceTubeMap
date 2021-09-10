import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Form, Label, Input, Button } from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStepBackward,
  faStepForward,
  faSearchPlus,
  faSearchMinus
} from '@fortawesome/free-solid-svg-icons';
import * as tubeMap from '../util/tubemap';

const ZOOM_FACTOR = 2.0;

class DataPositionFormRow extends Component {
  handleZoomIn = () => {
    tubeMap.zoomBy(ZOOM_FACTOR);
  };

  handleZoomOut = () => {
    tubeMap.zoomBy(1.0 / ZOOM_FACTOR);
  };

  handleDownloadButton = () => {
    const svgN = document.getElementById('svg');
    const svgData = new XMLSerializer().serializeToString(svgN);
    const svgBlob = new Blob([svgData], {
      type: 'image/svg+xml;charset=utf-8'
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = 'graph.svg';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  render() {
    return (
      <Form inline>
        <Label className="tight-label mb-2 mr-sm-2 mb-sm-0 ml-2" for="region">
          Region:
        </Label>
        <Input
          type="text"
          className="custom-input form-control mb-2 mr-sm-4 mb-sm-0"
          id="region"
          size="12"
          value={this.props.region}
          onChange={this.props.handleInputChange}
        />
        &nbsp;
        {this.props.uploadInProgress && (
          <div className="smallLoader" id="fileUploadSpinner" />
        )}
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
      </Form>
    );
  }
}

DataPositionFormRow.propTypes = {
  handleGoButton: PropTypes.func.isRequired,
  handleGoLeft: PropTypes.func.isRequired,
  handleGoRight: PropTypes.func.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  region: PropTypes.string.isRequired,
  uploadInProgress: PropTypes.bool.isRequired,
};

export default DataPositionFormRow;
