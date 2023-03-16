import React, { Component } from "react";
import PropTypes from "prop-types";
import { Container, Row, Alert } from "reactstrap";
import isEqual from "react-fast-compare";

import TubeMap from "./TubeMap";
import * as tubeMap from "../util/tubemap";
import { dataOriginTypes } from "../enums";
import { fetchAndParse } from "../fetchAndParse";

class TubeMapContainer extends Component {
  state = {
    isLoading: true,
    error: null,
  };

  componentDidMount() {
    this.fetchCanceler = new AbortController();
    this.cancelSignal = this.fetchCanceler.signal;
    this.getRemoteTubeMapData();
  }

  componentWillUnmount() {
    // Cancel the requests since we may have long running requests pending.
    this.fetchCanceler.abort();
  }

  handleFetchError(error, message) {
    if (!this.cancelSignal.aborted) {
      console.log(message, error.name, error.message);
      this.setState({ error: error, isLoading: false });
    } else {
      console.log("fetch canceled by componentWillUnmount", error.message);
    }
  }

  componentDidUpdate(prevProps) {
    // TODO: this is the way the React docs say to make requests (do them when
    // the component updates), but when we make a request we pop ourselves into
    // a loading state and immediately do another update, which then means we
    // have to mess around with deep comparison to see we don't need yet a
    // third update. Is there a way to let React keep track of the fact that we
    // aren't up to date with the requested state yet?
    if (this.props.dataOrigin !== prevProps.dataOrigin) {
      this.props.dataOrigin === dataOriginTypes.API
        ? this.getRemoteTubeMapData()
        : this.getExampleData();
    } else {
      if (!isEqual(this.props.viewTarget, prevProps.viewTarget)) {
        // We need to compare the fetch parameters with stringification because
        // they will get swapped out for a different object all the time, and we
        // don't want to compare object identity. TODO: stringify isn't
        // guaranteed to be stable so we can still make extra requests.
        this.getRemoteTubeMapData();
      }
    }
  }

  render() {
    const { isLoading, error } = this.state;

    if (error) {
      const message = error.message ? error.message : error;
      return (
        <div id="tubeMapContainer">
          <Container>
            <Row>
              <Alert color="danger">{message}</Alert>
            </Row>
          </Container>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div id="tubeMapContainer">
          <Container>
            <Row>
              <div id="loaderContainer">
                <div id="loader" />
              </div>
            </Row>
          </Container>
        </div>
      );
    }

    return (
      <div id="tubeMapContainer">
        <div id="tubeMapSVG">
          <TubeMap
            nodes={this.state.nodes}
            tracks={this.state.tracks}
            reads={this.state.reads}
            region={this.state.region}
          />
        </div>
      </div>
    );
  }

  getRemoteTubeMapData = async () => {
    this.setState({ isLoading: true, error: null });
    try {
      const json = await fetchAndParse(`${this.props.apiUrl}/getChunkedData`, {
        signal: this.cancelSignal, // (so we can cancel the fetch request if we will unmount component)
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.props.viewTarget),
      });
      if (json.graph === undefined) {
        // We did not get back a graph, even if we didn't get an error either.
        const error = "Fetching remote data returned error";
        throw new Error(error);
      } else {
        const nodes = tubeMap.vgExtractNodes(json.graph);
        const tracks = tubeMap.vgExtractTracks(json.graph);
        // Call vgExtractReads on each individual read and store in readsArr
        let readsArr = [];
        for (const gam of Object.values(json.gam)) {
          // Include readsArr length to prevent duplicate ids
          readsArr.push(tubeMap.vgExtractReads(nodes, tracks, gam, readsArr.length));
        }
        
        // go through viewTarget and create array of read file track numbers
        let sourceTrackIDs = [];
        for (let i = 0; i < this.props.viewTarget.tracks.length; i++) {
          const track = this.props.viewTarget.tracks[i];
          //add track index to array if the track contains a gam file
          for (const file of track.files) {
            if (file.type === "read") {
              sourceTrackIDs.push(i);
              break;
            }
          }
        }

        console.log(sourceTrackIDs);
        // Go through every read and assign it a source file number
        for (let i = 0; i < readsArr.length; i++) {
          for (let j = 0; j < readsArr[i].length; j++) {
            readsArr[i][j].sourceTrackID = sourceTrackIDs[i];
          }
        }

        // concatenate all reads together
        const reads = readsArr.flat();

        const region = json.region;
        this.setState({
          isLoading: false,
          nodes,
          tracks,
          reads,
          region,
        });
      }
    } catch (error) {
      this.handleFetchError(
        error,
        `POST to ${this.props.apiUrl}/getChunkedData failed:`
      );
    }
  };

  getExampleData = async () => {
    this.setState({ isLoading: true });
    // Nodes, tracks, and reads are all required, so start with defaults.
    let nodes = [];
    let tracks = [];
    let reads = [];
    let region = [];
    let vg;
    const data = await import("../util/demo-data");
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
        vg = JSON.parse(data.k3138);
        nodes = tubeMap.vgExtractNodes(vg);
        tracks = tubeMap.vgExtractTracks(vg);
        reads = tubeMap.vgExtractReads(
          nodes,
          tracks,
          this.readsFromStringToArray(data.demoReads)
        );
        break;
      case dataOriginTypes.EXAMPLE_7:
        vg = data.reverseAlignmentGraph;
        nodes = tubeMap.vgExtractNodes(vg);
        tracks = tubeMap.vgExtractTracks(vg);
        reads = tubeMap.vgExtractReads(
          nodes,
          tracks,
          data.mixedAlignmentReads
        );
        break;
      case dataOriginTypes.NO_DATA:
        // Leave the data empty.
        break;
      default:
        console.log("invalid example data origin type:", this.props.dataOrigin);
    }

    this.setState({ isLoading: false, nodes, tracks, reads, region });
  };

  readsFromStringToArray = (readsString) => {
    const lines = readsString.split("\n");
    const result = [];
    lines.forEach((line) => {
      if (line.length > 0) {
        result.push(JSON.parse(line));
      }
    });
    return result;
  };
}

TubeMapContainer.propTypes = {
  apiUrl: PropTypes.string.isRequired,
  dataOrigin: PropTypes.oneOf(Object.values(dataOriginTypes)).isRequired,
  viewTarget: PropTypes.object.isRequired,
};

export default TubeMapContainer;
