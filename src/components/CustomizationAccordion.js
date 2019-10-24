import React, { Component } from 'react';
import {
  Container,
  Collapse,
  CardBody,
  Card,
  CardHeader,
  Form,
  Label,
  Input,
  FormGroup
} from 'reactstrap';
import RadioRow from './RadioRow';

class VisualizationOptions extends Component {
  state = {
    isOpenLegend: false,
    isOpenVisualizationOptions: true
  };

  toggleLegend = e => {
    this.setState({ isOpenLegend: !this.state.isOpenLegend });
    e.preventDefault();
  };

  toggleVisOptions = e => {
    this.setState({
      isOpenVisualizationOptions: !this.state.isOpenVisualizationOptions
    });
    e.preventDefault();
  };

  handleMappingQualityCutoffChange = event => {
    this.props.handleMappingQualityCutoffChange(event.target.value);
  };

  render() {
    const { visOptions, toggleFlag } = this.props;
    const mappingQualityOptions = Array.from(Array(61).keys()).map(i => {
      return (
        <option value={i} key={i}>
          {i}
        </option>
      );
    });
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
                        onChange={() => toggleFlag('removeRedundantNodes')}
                      />
                      Remove redundant nodes
                    </Label>
                  </FormGroup>
                  <FormGroup check>
                    <Label check>
                      <Input
                        type="checkbox"
                        checked={visOptions.compressedView}
                        onChange={() => toggleFlag('compressedView')}
                      />
                      Compressed view
                    </Label>
                  </FormGroup>
                  <FormGroup check>
                    <Label check>
                      <Input
                        type="checkbox"
                        checked={visOptions.transparentNodes}
                        onChange={() => toggleFlag('transparentNodes')}
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
                        onChange={() => toggleFlag('showReads')}
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
                            onChange={() => toggleFlag('showSoftClips')}
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
                              toggleFlag('colorReadsByMappingQuality')
                            }
                          />
                          Color reads by mapping quality
                        </Label>
                      </FormGroup>
                      <Form inline>
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

                <h5>Colors</h5>
                <Form>
                  <RadioRow
                    rowHeading="Haplotypes"
                    color={visOptions.haplotypeColors}
                    trackType="haplotypeColors"
                    setColorSetting={this.props.setColorSetting}
                  />
                  {visOptions.showReads &&
                    !visOptions.colorReadsByMappingQuality && (
                      <React.Fragment>
                        <RadioRow
                          rowHeading="Reads (forward strand)"
                          color={visOptions.forwardReadColors}
                          trackType="forwardReadColors"
                          setColorSetting={this.props.setColorSetting}
                        />
                        <RadioRow
                          rowHeading="Reads (reverse strand)"
                          color={visOptions.reverseReadColors}
                          trackType="reverseReadColors"
                          setColorSetting={this.props.setColorSetting}
                        />
                      </React.Fragment>
                    )}
                </Form>
              </CardBody>
            </Collapse>
          </Card>
        </div>
      </Container>
    );
  }
}

export default VisualizationOptions;
