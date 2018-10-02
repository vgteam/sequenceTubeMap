import React, { Component } from 'react';
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
        <Label className="tight-label mb-2 mr-sm-2 mb-sm-0 ml-2" for="nodeID">
          Start:
        </Label>
        <Input
          type="text"
          className="custom-input form-control mb-2 mr-sm-4 mb-sm-0"
          id="nodeID"
          size="12"
          value={this.props.nodeID}
          onChange={this.props.handleInputChange}
        />
        <Label className="tight-label mb-2 mr-sm-2 mb-sm-0 ml-2" for="distance">
          Length:
        </Label>
        <Input
          type="text"
          className="custom-input form-control mb-2 mr-sm-2 mb-sm-0"
          id="distance"
          size="4"
          value={this.props.distance}
          onChange={this.props.handleInputChange}
        />
        <Label
          className="tight-label mb-2 mr-sm-2 mb-sm-0 ml-2"
          for="unitSelect"
        >
          Unit:
        </Label>
        <Input
          type="select"
          className="custom-select mb-2 mr-sm-2 mb-sm-0"
          id="byNode"
          value={this.props.byNode}
          onChange={this.props.handleInputChange}
        >
          <option value="false">Nucleotides</option>
          <option value="true">Nodes</option>
        </Input>
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

export default DataPositionFormRow;
