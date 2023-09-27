import React, { Component } from "react";
import PropTypes from "prop-types";
import { Container, Row, Alert } from "reactstrap";
import isEqual from "react-fast-compare";

import TubeMap from "./TubeMap";
import * as tubeMap from "../util/tubemap";
import { dataOriginTypes } from "../enums";
import { fetchAndParse } from "../fetchAndParse";
import PopUpInfoDialog from "./PopUpInfoDialog";


class TubeMapContainer extends Component {
  state = {
    isLoading: true,
    error: null,
    infoDialogContent: undefined,
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
      console.error(message, error);
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
    // updating visOptions will cause an error if the tubemap is not in place yet.
    if(!this.state.isLoading) {
      // Hook into item clicks form the tube map
      tubeMap.setInfoCallback((text) => {
        this.setState({infoDialogContent: text});
      });
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

    // infoDialogContent's value was initialized to undefined, representing a closed dialog,
    // and will be set to text to display to represent an open dialog.
    // text stores the current value associated with infoDialogContent for this
    // TubeMapContainer instance, so we can have a shorter name for it.
    let attributes = this.state.infoDialogContent;
    let isOpen;
    if (attributes === undefined){
      isOpen = false;
    } else {
      isOpen = true;
    }
    // resets value of infoDialogContent upon close
    const closePopup = () => this.setState({infoDialogContent: undefined});

    return (
      <div id="tubeMapContainer">
        <PopUpInfoDialog open={isOpen} attributes={attributes} close={closePopup} />
        <div id="tubeMapSVG">
          <TubeMap
            nodes={this.state.nodes}
            tracks={this.state.tracks}
            reads={this.state.reads}
            region={this.state.region}
            visOptions={{coloredNodes: this.state.coloredNodes, ...this.props.visOptions}}
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
        // go through viewTarget and create array of read file track numbers
        let readTrackIDs = [];
        // And the graph track number if any
        let graphTrackID = null;
        // And the haplotype track number if any
        let haplotypeTrackID = null;

        console.log("getting viewTarget ", this.props.viewTarget);
        for (const i in this.props.viewTarget.tracks) {
          const track = this.props.viewTarget.tracks[i];
          if (track.trackType === "read") {
            //add track index to array if the track contains a gam file
            readTrackIDs.push(i);
          }
          if (track.trackType === "graph") {
            // Or note if it is a graph (one allowed)
            graphTrackID = i;
          }
          if (track.trackType === "haplotype") {
            // Or a collection of haplotypes (one allowed)
            haplotypeTrackID = i;
          }
        }

        console.log("Graph track: " + graphTrackID + " Haplotype track: " + haplotypeTrackID);

        const nodes = tubeMap.vgExtractNodes(json.graph);
        const tracks = tubeMap.vgExtractTracks(json.graph, graphTrackID, haplotypeTrackID);

        // Call vgExtractReads on each file of reads and store in readsArr
        let readsArr = [];
        // Count total reads seen so far.
        let totalReads = 0;
        for (const gam of json.gam) {
          // For each returned list of reads from a file, convert all those reads to tube map format.
          // Include total read count to prevent duplicate ids.
          // Also include the source track's ID.
          let newReads = tubeMap.vgExtractReads(nodes, tracks, gam, totalReads, readTrackIDs[readsArr.length]);
          readsArr.push(newReads);
          totalReads += newReads.length;
        }
        
        // concatenate all reads together
        const reads = readsArr.flat();

        const region = json.region;
        const coloredNodes = json.coloredNodes;
        this.setState({
          isLoading: false,
          nodes,
          tracks,
          reads,
          region,
          coloredNodes
        });
        
      }
    } catch (error) {
      this.handleFetchError(
        error,
        `Fetching and parsing POST to ${this.props.apiUrl}/getChunkedData failed:`
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
        tracks = tubeMap.vgExtractTracks(vg, 0, 0); // Examples have paths and haplotypes as track 0.
        reads = tubeMap.vgExtractReads(
          nodes,
          tracks,
          this.readsFromStringToArray(data.demoReads),
          0,
          1 // Examples always have reads as track 1
        );
        break;
      case dataOriginTypes.EXAMPLE_7:
        vg = data.reverseAlignmentGraph;
        nodes = tubeMap.vgExtractNodes(vg);
        tracks = tubeMap.vgExtractTracks(vg, 0, 0); // Examples have paths and haplotypes as track 0.
        reads = tubeMap.vgExtractReads(
          nodes,
          tracks,
          data.mixedAlignmentReads,
          0,
          1 // Examples always have reads as track 1
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
  visOptions: PropTypes.object.isRequired,
};

export default TubeMapContainer;
