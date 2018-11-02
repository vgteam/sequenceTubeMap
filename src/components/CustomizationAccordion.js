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

  render() {
    const { visOptions, toggleFlag } = this.props;
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
                </FormGroup>

                <h5>Colors</h5>
                <Form>
                  <RadioRow
                    rowHeading="Haplotypes"
                    color={visOptions.haplotypeColors}
                    trackType="haplotypeColors"
                    setColorSetting={this.props.setColorSetting}
                  />
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
