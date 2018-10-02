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
import * as tubeMap from '../util/tubemap';

class VisualizationOptions extends Component {
  state = {
    isOpenLegend: false,
    isOpenVisualizationOptions: true,
    removeRedundantNodes: true,
    compressedView: false,
    showReads: true,
    showSoftClips: true
  };

  onChange = event => {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value
    });
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

  toggleCompressedView = () => {
    const newCompressedView = !this.state.compressedView;
    newCompressedView
      ? tubeMap.setNodeWidthOption(1)
      : tubeMap.setNodeWidthOption(0);
    this.setState(state => ({ compressedView: !state.compressedView }));
  };

  toggleRedundantNodesRemoval = () => {
    const newRemoveRedundantNodes = !this.state.removeRedundantNodes;
    tubeMap.setMergeNodesFlag(newRemoveRedundantNodes);
    this.setState(state => ({
      removeRedundantNodes: !state.removeRedundantNodes
    }));
  };

  toggleShowReads = () => {
    const newShowReads = !this.state.showReads;
    tubeMap.setShowReadsFlag(newShowReads);
    this.setState(state => ({ showReads: !state.showReads }));
  };

  toggleShowSoftClips = () => {
    const newShowSoftClips = !this.state.showSoftClips;
    tubeMap.setSoftClipsFlag(newShowSoftClips);
    this.setState(state => ({ showSoftClips: !state.showSoftClips }));
  };

  render() {
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
                        checked={this.state.removeRedundantNodes}
                        onChange={this.toggleRedundantNodesRemoval}
                      />
                      Remove redundant nodes
                    </Label>
                  </FormGroup>
                  <FormGroup check>
                    <Label check>
                      <Input
                        type="checkbox"
                        checked={this.state.compressedView}
                        onChange={this.toggleCompressedView}
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
                        checked={this.state.showReads}
                        onChange={this.toggleShowReads}
                      />
                      Show sequence reads
                    </Label>
                  </FormGroup>
                  <FormGroup check>
                    <Label check>
                      <Input
                        type="checkbox"
                        checked={this.state.showSoftClips}
                        onChange={this.toggleShowSoftClips}
                      />
                      Show soft clips
                    </Label>
                  </FormGroup>
                </FormGroup>

                <h5>Colors</h5>
                <Form>
                  <RadioRow
                    rowHeading="Haplotypes"
                    initialColor="greyscale"
                    trackType="haplotypeColors"
                  />
                  <RadioRow
                    rowHeading="Reads (forward strand)"
                    initialColor="reds"
                    trackType="forwardReadColors"
                  />
                  <RadioRow
                    rowHeading="Reads (reverse strand)"
                    initialColor="blues"
                    trackType="reverseReadColors"
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
