import React, { Component } from "react";
import PropTypes from "prop-types";

import { Form, Label, Input, Button } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStepBackward,
  faStepForward,
  faSearchPlus,
  faSearchMinus,
  faQuestionCircle,
  faLink
} from "@fortawesome/free-solid-svg-icons";
import "./App.css";
import HeaderForm from "./components/HeaderForm";
import TubeMapContainer from "./components/TubeMapContainer";
import CustomizationAccordion from "./components/CustomizationAccordion";
import { dataOriginTypes } from "./enums";
import * as tubeMap from "./util/tubemap";
import config from "./config.json";

class App extends Component {
  constructor(props) {
    super(props);

    const ds = this.urlParamsToObject() ?? config.DATA_SOURCES[0];
    console.log("source", ds);
    let xgFile = ds.xgFile;
    let region = ds.region ?? ds.defaultPosition;
    let gamFile = undefined;
    if (ds.gamFile) {
      gamFile = ds.gamFile;
    }
    let gbwtFile = undefined;
    if (ds.gbwtFile) {
      gbwtFile = ds.gbwtFile;
    }
    let bedFile = undefined;
    if (ds.bedFile) {
      bedFile = ds.bedFile;
    }
    let dataPath = "default";
    if (ds.useMountedPath) {
      dataPath = "mounted";
    }
    this.state = {
      // These describe the files on the server side that we are working on.
      fetchParams: {
        // This is the query (like path:start-end) we are displaying.
        region: region,
        xgFile: xgFile,
        gbwtFile: gbwtFile,
        gamFile: gamFile,
        bedFile: bedFile,
        // This is the type of data paths we are working with, such as "mounted".
        // All the paths are scoped to a type on the server side.
        dataPath: dataPath,
      },
      // This is a little like dataPath, but lets us toggle between data from
      // the server and local test data. TODO: Unify?
      dataOrigin: dataOriginTypes.API, // EXAMPLE[N] etc.
      // These are the current rendering settings.
      visOptions: {
        removeRedundantNodes: true,
        compressedView: false,
        transparentNodes: false,
        showReads: true,
        showSoftClips: true,
        haplotypeColors: "ygreys",
        forwardReadColors: "reds",
        reverseReadColors: "blues",
        colorReadsByMappingQuality: false,
        mappingQualityCutoff: 0,
      },
    };
    console.log("state", this.state);
    debugger
  }

  componentDidUpdate() {
    const { visOptions } = this.state;
    visOptions.compressedView
      ? tubeMap.setNodeWidthOption(1)
      : tubeMap.setNodeWidthOption(0);
    tubeMap.setMergeNodesFlag(visOptions.removeRedundantNodes);
    tubeMap.setTransparentNodesFlag(visOptions.transparentNodes);
    tubeMap.setShowReadsFlag(visOptions.showReads);
    tubeMap.setSoftClipsFlag(visOptions.showSoftClips);
    tubeMap.setColorSet("haplotypeColors", visOptions.haplotypeColors);
    tubeMap.setColorSet("forwardReadColors", visOptions.forwardReadColors);
    tubeMap.setColorSet("reverseReadColors", visOptions.reverseReadColors);
    tubeMap.setColorReadsByMappingQualityFlag(
      visOptions.colorReadsByMappingQuality
    );
    tubeMap.setMappingQualityCutoff(visOptions.mappingQualityCutoff);
  }

  setFetchParams = (fetchParams) => {
    this.setState({
      fetchParams: fetchParams,
      dataOrigin: dataOriginTypes.API,
    });
  };

  toggleVisOptionFlag = (flagName) => {
    this.setState((state) => ({
      visOptions: {
        ...state.visOptions,
        [flagName]: !state.visOptions[flagName],
      },
    }));
  };

  handleMappingQualityCutoffChange = (value) => {
    this.setState((state) => ({
      visOptions: {
        ...state.visOptions,
        mappingQualityCutoff: value,
      },
    }));
  };

  setColorSetting = (key, value) => {
    this.setState((state) => ({
      visOptions: {
        ...state.visOptions,
        [key]: value,
      },
    }));
  };

  setDataOrigin = (dataOrigin) => {
    this.setState({ dataOrigin });
  };

  handleCopyLink = () => {
    const params = new URLSearchParams(this.state.fetchParams).toString();
    const full = window.location.host + "?" + params;

    navigator.clipboard.writeText(full);
    console.log("Copied", params);


  };

  urlParamsToObject = () => {
    // Take any saved parameters in the query part of the URL
    // and turn to object to populate in HeaderForm state and fetchParams
    // Returns: Object (HeaderForm state)
    // See https://stackoverflow.com/questions/8648892/how-to-convert-url-parameters-to-a-javascript-object
    // TODO: check empty
    // also make sure to not run at every render
    const params = new URL(document.location).searchParams;
    if (params.toString() === "") return null;
    const urlParams = new URLSearchParams(params);
    const entries = urlParams.entries();
    const result = {};
    for (const [key, value] of entries) {
      // each 'entry' is a [key, value] tuple
      result[key] = (value === "undefined") ? undefined : value;
    }
    console.log(params, result);
    debugger;
    return result;
  };

  render() {
    return (
      <div>
        <HeaderForm
          setFetchParams={this.setFetchParams}
          setDataOrigin={this.setDataOrigin}
          setColorSetting={this.setColorSetting}
          dataOrigin={this.state.dataOrigin}
          apiUrl={this.props.apiUrl}
          urlParams={this.urlParamsToObject()} // componentdidmount or w/e
          handleCopyLink={this.handleCopyLink}
        />
        <Button id="shareLinkButton" color="primary" onClick={this.handleCopyLink}>
          <FontAwesomeIcon icon={faLink} size="lg" />
            Copy link to data
        </Button>
        <TubeMapContainer
          fetchParams={this.state.fetchParams}
          dataOrigin={this.state.dataOrigin}
          apiUrl={this.props.apiUrl}
        />
        <CustomizationAccordion
          visOptions={this.state.visOptions}
          toggleFlag={this.toggleVisOptionFlag}
          handleMappingQualityCutoffChange={
            this.handleMappingQualityCutoffChange
          }
          setColorSetting={this.setColorSetting}
        />
      </div>
    );
  }
}

App.propTypes = {
  apiUrl: PropTypes.string,
};

App.defaultProps = {
  // Backend the whole app will hit against. Usually should be picked up from
  // the config or the browser, but needs to be swapped out in the fake
  // browser testing environment to point to a real testing backend.
  // Note that host includes the port.
  apiUrl: (config.BACKEND_URL || `http://${window.location.host}`) + "/api/v0",
};

export default App;
