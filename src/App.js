import React, { Component } from "react";
import PropTypes from "prop-types";
import isEqual from "react-fast-compare";

import "./App.css";
import HeaderForm from "./components/HeaderForm";
import TubeMapContainer from "./components/TubeMapContainer";
import { urlParamsToViewTarget } from "./components/CopyLink";
import CustomizationAccordion from "./components/CustomizationAccordion";
import { dataOriginTypes } from "./enums";
import * as tubeMap from "./util/tubemap";
import config from "./config.json";
// Data path  - see server.js and config.json

class App extends Component {
  constructor(props) {
    super(props);

    // TODO: add touchParamsToDataSource()
    // Fix typing inconsistency
    const ds = urlParamsToViewTarget(document.location) ?? config.DATA_SOURCES[0];
    this.state = {
      // These describe the files on the server side that we are working on.
      // This is a little like dataPath, but lets us toggle between data from
      // the server and local test data. TODO: Unify?
      viewTarget: ds,
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
  /*
   * Drop undefined values
   * See https://stackoverflow.com/questions/286141/remove-blank-attributes-from-an-object-in-javascript/38340730#38340730
   */
  removeUndefined = (obj) => {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v != null)
    );
  };

  /**
   * @param {ViewTarget} viewTarget - The default or selected data to view
   */
  setViewTarget = (viewTarget) => {
    console.log("before viewTarget: ", this.state.viewTarget);
    const newViewTarget = this.removeUndefined(viewTarget);

    if (
      !isEqual(this.state.viewTarget, newViewTarget) ||
      this.state.dataOrigin != dataOriginTypes.API
    ) {
      this.setState({
        viewTarget: newViewTarget,
        dataOrigin: dataOriginTypes.API,
      });
    }
    console.log("after: ", this.state.viewTarget);
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

  render() {
    return (
      <div>
        <HeaderForm
          setViewTarget={this.setViewTarget}
          setDataOrigin={this.setDataOrigin}
          setColorSetting={this.setColorSetting}
          dataOrigin={this.state.dataOrigin}
          apiUrl={this.props.apiUrl}
          viewTarget={urlParamsToViewTarget(document.location)}
        />
        <TubeMapContainer
          viewTarget={this.state.viewTarget}
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
