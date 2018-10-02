import React, { Component } from 'react';
import TubeMap from './TubeMap';
import config from '../config.json';
import { Container, Row } from 'reactstrap';

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
    if (this.props.fetchParams !== prevProps.fetchParams) {
      console.log('inner');
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
        <TubeMap graph={this.state.graph} gam={this.state.gam} />
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
        this.setState({ graph: json.graph, gam: json.gam, isLoading: false });
      }
    } catch (error) {
      this.setState({ error: error, isLoading: false });
    }
  };
}

export default TubeMapContainer;
