import React, { Component } from 'react';
import TubeMap from './TubeMap';
import config from '../config.json';
import { Container, Row } from 'reactstrap';
import * as tubeMap from '../util/tubemap';
import * as data from '../util/demo-data'; // TODO: lazy load
import { dataOriginTypes } from '../enums';

const BACKEND_URL = config.BACKEND_URL || `http://${window.location.host}`;

class TubeMapContainer extends Component {
  state = {
    isLoading: true,
    error: null
  };

  componentDidMount() {
    this.getRemoteTubeMapData();
  }

  componentDidUpdate(prevProps) {
    console.log('TubeMapContainer componentDidUpdate');
    if (this.props.dataOrigin !== prevProps.dataOrigin) {
      this.props.dataOrigin === dataOriginTypes.API
        ? this.getRemoteTubeMapData()
        : this.getExampleData();
    } else if (this.props.fetchParams !== prevProps.fetchParams) {
      this.getRemoteTubeMapData();
    }
  }

  render() {
    const { isLoading, error } = this.state;

    if (error) {
      console.log(error);
      if (error.message) {
        return <div id="inputError">{error.message}</div>;
      } else {
        return <div id="inputError">{error}</div>;
      }
    }

    if (isLoading) {
      return (
        <Container>
          <Row>
            <div id="loaderContainer">
              <div id="loader" />
            </div>
          </Row>
        </Container>
      );
    }

    return (
      <div id="tubeMapSVG">
        <TubeMap
          nodes={this.state.nodes}
          tracks={this.state.tracks}
          reads={this.state.reads}
        />
      </div>
    );
  }

  getRemoteTubeMapData = async () => {
    this.setState({ isLoading: true, error: null });
    console.log(this.props.fetchParams);
    try {
      const response = await fetch(`${BACKEND_URL}/getChunkedData`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.props.fetchParams)
      });
      const json = await response.json();
      if (json.graph === undefined) {
        // We did not get back a graph, only (possibly) an error.
        this.setState({ error: json.error, isLoading: false });
      } else {
        const nodes = tubeMap.vgExtractNodes(json.graph);
        console.log(nodes);
        const tracks = tubeMap.vgExtractTracks(json.graph);
        console.log(tracks);
        const reads = tubeMap.vgExtractReads(nodes, tracks, json.gam);
        this.setState({
          isLoading: false,
          nodes,
          tracks,
          reads
        });
      }
    } catch (error) {
      this.setState({ error: error, isLoading: false });
    }
  };

  getExampleData = () => {
    let nodes, tracks, reads;
    nodes = data.inputNodes;
    switch (this.props.dataOrigin) {
      case dataOriginTypes.EXAMPLE_1:
        tracks = data.inputTracks1;
        break;
      case dataOriginTypes.EXAMPLE_2:
        tracks = data.inputTracks2;
        break;
      case dataOriginTypes.EXAMPLE_3:
        tracks = data.inputTracks3;
        break;
      case dataOriginTypes.EXAMPLE_4:
        tracks = data.inputTracks4;
        break;
      case dataOriginTypes.EXAMPLE_5:
        tracks = data.inputTracks5;
        break;
      case dataOriginTypes.EXAMPLE_6:
        const vg = JSON.parse(data.k3138);
        nodes = tubeMap.vgExtractNodes(vg);
        tracks = tubeMap.vgExtractTracks(vg);
        reads = tubeMap.vgExtractReads(
          nodes,
          tracks,
          this.readsFromStringToArray(data.demoReads)
        );
        break;
      default:
        console.log('invalid data origin type');
    }

    this.setState({ isLoading: false, nodes, tracks, reads });
  };

  readsFromStringToArray = readsString => {
    const lines = readsString.split('\n');
    const result = [];
    lines.forEach(line => {
      if (line.length > 0) {
        result.push(JSON.parse(line));
      }
    });
    return result;
  };
}

export default TubeMapContainer;
