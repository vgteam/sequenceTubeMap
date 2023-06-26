import React, { Component } from "react";
import PropTypes from "prop-types";
import {
  Container,
  Collapse,
  CardBody,
  Card,
  CardHeader,
  Form,
  Label,
  Input,
  FormGroup,
} from "reactstrap";
import TrackSettings from "./TrackSettings";

class VisualizationOptions extends Component {
  state = {
    isOpenLegend: false,
    isOpenVisualizationOptions: true,
  };

  toggleLegend = (e) => {
    this.setState({ isOpenLegend: !this.state.isOpenLegend });
    e.preventDefault();
  };

  toggleVisOptions = (e) => {
    this.setState({
      isOpenVisualizationOptions: !this.state.isOpenVisualizationOptions,
    });
    e.preventDefault();
  };

  handleMappingQualityCutoffChange = (event) => {
    this.props.handleMappingQualityCutoffChange(event.target.value);
  };

  setColorWithIndex = (index) => {
    return (key, value) => {
      this.props.setColorSetting(key, index, value);
    };
  }

  render() {
    const { visOptions, toggleFlag } = this.props;
    const mappingQualityOptions = Array.from(Array(61).keys()).map((i) => {
      return (
        <option value={i} key={i}>
          {i}
        </option>
      );
    });

    let readTrackNumber = 1;

    let trackSettingsList = [];
    for (let key in this.props.tracks) {
      // Generate settings controls for each track
      let track = this.props.tracks[key];
      console.log(track);
      if (!track.trackFile) {
        continue;
      }
      let type = track.trackType;
      if (type === "graph") {
        trackSettingsList.push(
          <TrackSettings key={key} label="Graph Paths" fileType={type} trackColorSettings={visOptions.colorSchemes[key]} setTrackColorSetting={this.setColorWithIndex(key)} />
        );
      } else if (type === "haplotype") {
        // TODO: Do nothing for now. Haplotypes get assigned to the graph as their source track right now.
      } else if (type === "read") {
        if (visOptions.showReads) {
          trackSettingsList.push(
            <TrackSettings key={key} label={"Read Track " + readTrackNumber} fileType={type} trackColorSettings={visOptions.colorSchemes[key]} setTrackColorSetting={this.setColorWithIndex(key)} />
          );
          readTrackNumber++;
        }
      } else {
        throw new Error("Unknown track type " + type);
      }
    }

    return (
      <Container>
        <div id="accordion">
          <Card>
            <CardHeader id="legendCard">
              <h5 className="mb-0">
                <a href="#collapse" onClick={this.toggleLegend}>
                  Legend
                </a>
              </h5>
            </CardHeader>
            <Collapse isOpen={this.state.isOpenLegend}>
              <CardBody>
                <div id="legendDiv" />
              </CardBody>
            </Collapse>
          </Card>

          <Card>
            <CardHeader id="visOptionsCard">
              <h5 className="mb-0">
                <a href="#collapse" onClick={this.toggleVisOptions}>
                  Visualization Options
                </a>
              </h5>
            </CardHeader>
            <Collapse isOpen={this.state.isOpenVisualizationOptions}>
              <CardBody>
                <FormGroup>
                  <h5>General</h5>
                  <FormGroup check>
                    <Label check>
                      <Input
                        type="checkbox"
                        checked={visOptions.removeRedundantNodes}
                        onChange={() => toggleFlag("removeRedundantNodes")}
                      />
                      Remove redundant nodes
                    </Label>
                  </FormGroup>
                  <FormGroup check>
                    <Label check>
                      <Input
                        type="checkbox"
                        checked={visOptions.compressedView}
                        onChange={() => toggleFlag("compressedView")}
                      />
                      Compressed view
                    </Label>
                  </FormGroup>
                  <FormGroup check>
                    <Label check>
                      <Input
                        type="checkbox"
                        checked={visOptions.transparentNodes}
                        onChange={() => toggleFlag("transparentNodes")}
                      />
                      Fully transparent nodes
                    </Label>
                  </FormGroup>
                </FormGroup>

                <FormGroup>
                  <h5>Sequence Reads</h5>
                  <FormGroup check>
                    <Label check>
                      <Input
                        type="checkbox"
                        checked={visOptions.showReads}
                        onChange={() => toggleFlag("showReads")}
                      />
                      Show sequence reads
                    </Label>
                  </FormGroup>
                  {visOptions.showReads && (
                    <React.Fragment>
                      <FormGroup check>
                        <Label check>
                          <Input
                            type="checkbox"
                            checked={visOptions.showSoftClips}
                            onChange={() => toggleFlag("showSoftClips")}
                          />
                          Show soft clips
                        </Label>
                      </FormGroup>
                      <FormGroup check>
                        <Label check>
                          <Input
                            type="checkbox"
                            checked={visOptions.colorReadsByMappingQuality}
                            onChange={() =>
                              toggleFlag("colorReadsByMappingQuality")
                            }
                          />
                          Color reads by mapping quality
                        </Label>
                      </FormGroup>
                      <Form>
                        <Label className="mr-sm-2 " for="dataSourceSelect">
                          Mapping Quality Cutoff:
                        </Label>
                        <Input
                          type="select"
                          id="dataSourceSelect"
                          className="custom-select"
                          value={visOptions.mappingQualityCutoff}
                          onChange={this.handleMappingQualityCutoffChange}
                        >
                          {mappingQualityOptions}
                        </Input>
                      </Form>
                    </React.Fragment>
                  )}
                </FormGroup>
              </CardBody>
            </Collapse>
          </Card>
        </div>
      </Container>
    );
  }
}

VisualizationOptions.propTypes = {
  handleMappingQualityCutoffChange: PropTypes.func.isRequired,
  setColorSetting: PropTypes.func.isRequired,
  tracks: PropTypes.array.isRequired,
};

export default VisualizationOptions;
