import React, { Component } from "react";
import PropTypes from "prop-types";
import isEqual from "react-fast-compare";
// Needed for Node <12
// TODO: remove import and dependency when we upgrade.
import {} from "polyfill-object.fromentries";

import "./App.css";
import HeaderForm from "./components/HeaderForm";
import TubeMapContainer from "./components/TubeMapContainer";
import { urlParamsToViewTarget } from "./components/CopyLink";
import CustomizationAccordion from "./components/CustomizationAccordion";
import Footer from "./components/Footer";
import { dataOriginTypes } from "./enums";
import "./config-client.js";
import { config } from "./config-global.mjs";
import ServerAPI from "./ServerAPI.mjs";
import { GBZBaseAPI } from "./GBZBaseAPI.mjs";

const EXAMPLE_TRACKS = [
  // Fake tracks for the generated examples.
  // TODO: Move over there.
  { files: [{ type: "graph", name: "fakeGraph" }] },
  { files: [{ type: "read", name: "fakeReads" }] },
];

function getColorSchemesFromTracks(tracks) {
  let schemes = [];

  for (const key in tracks) {
    if (schemes[key] === undefined) {
      // We need to adopt a color scheme
      if (tracks[key].trackColorSettings !== undefined) {
        schemes[key] = tracks[key].trackColorSettings;
      } else if (tracks[key].trackType === "read") {
        schemes[key] = { ...config.defaultReadColorPalette };
      } else {
        schemes[key] = { ...config.defaultHaplotypeColorPalette };
      }
    }
  }

  return schemes;
}

class App extends Component {
  constructor(props) {
    super(props);

    // See if the WASM API is available.
    // Right now this just tests and logs, but eventually we will be able to use it.
    let gbzApi = new GBZBaseAPI();
    gbzApi.available().then((working) => {
      if (working) {
        console.log("WASM API implementation available!");
      } else {
        console.error("WASM API implementation not available!");
      }
    });

    this.APIInterface = new ServerAPI(props.apiUrl);

    console.log("App component starting up with API URL: " + props.apiUrl);

    // Set defaultViewTarget to either URL params (if present) or the first example
    this.defaultViewTarget =
      urlParamsToViewTarget(document.location) ?? config.DATA_SOURCES[0];
    this.state = {
      // These describe the files on the server side that we are working on.
      // This is a little like dataPath (inside viewTarget, which specifies if we're using mounted/built-in data),
      // but lets us toggle between data from
      // the server and local test data
      dataOrigin: dataOriginTypes.API,
      viewTarget: this.defaultViewTarget,
      // These are the current rendering settings.
      visOptions: {
        removeRedundantNodes: true,
        compressedView: false,
        transparentNodes: false,
        showReads: true,
        showSoftClips: true,
        colorReadsByMappingQuality: false,
        colorSchemes: getColorSchemesFromTracks(this.defaultViewTarget.tracks),
        mappingQualityCutoff: 0,
      },
    };
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
   * @param {ViewTarget} viewTarget - The new data that is selected to view
   *    setCurrentViewTarget updates the current viewTarget to the new viewTarget that's passed in.
   *    Before calling setCurrentViewTarget, viewTarget refers to what is currently being displayed.
   *    See types.ts for more info on viewTarget type.
   */
  setCurrentViewTarget = (viewTarget) => {
    // Update the viewTarge
    // Remove undefined for equality check
    const newViewTarget = this.removeUndefined(viewTarget);

    if (
      !isEqual(this.state.viewTarget, newViewTarget) ||
      this.state.dataOrigin !== dataOriginTypes.API
    ) {
      console.log("Adopting view target: ", newViewTarget);

      this.setState((state) => {
        // Make sure we have color schemes.
        let newColorSchemes = getColorSchemesFromTracks(newViewTarget.tracks);

        console.log("Adopting color schemes: ", newColorSchemes);

        return {
          viewTarget: newViewTarget,
          dataOrigin: dataOriginTypes.API,
          visOptions: {
            ...state.visOptions,
            colorSchemes: newColorSchemes,
          },
        };
      });
    }
  };
  getCurrentViewTarget = () => {
    return this.removeUndefined(this.state.viewTarget);
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

  // Set a color scheme setting for a particular track.
  //
  // key is the name of the setting to set, and may be "mainPalette", "auxPalette", or "colorByMappingQuality".
  //
  // index is the index in the tracks array of the track to operate on. For now,
  // haplotypes and paths are lumped together as track 0 here, with up to two
  // tracks of reads afterward; eventually this will follow the indexing of the real
  // tracks array.
  //
  // value is the value to set. For "mainPalette" and "auxPalette" this is the name
  // of a color palette, such as "reds".
  setColorSetting = (key, index, value) => {
    this.setState((state) => {
      let newcolors = [...state.visOptions.colorSchemes];
      if (newcolors[index] === undefined) {
        // Handle the set call from example data maybe coming before we set up any nonempty real tracks.
        // TODO: Come up with a better way to do this.
        newcolors[index] = { ...config.defaultReadColorPalette };
      }
      newcolors[index] = { ...newcolors[index], [key]: value };
      console.log("Set index " + index + " key " + key + " to " + value);
      console.log("New colors: ", newcolors);
      return {
        visOptions: {
          ...state.visOptions,
          colorSchemes: newcolors,
        },
      };
    });
  };

  setDataOrigin = (dataOrigin) => {
    this.setState({ dataOrigin });
  };

  render() {
    return (
      <div>
        <HeaderForm
          setCurrentViewTarget={this.setCurrentViewTarget}
          setDataOrigin={this.setDataOrigin}
          setColorSetting={this.setColorSetting}
          dataOrigin={this.state.dataOrigin}
          defaultViewTarget={this.defaultViewTarget}
          getCurrentViewTarget={this.getCurrentViewTarget}
          APIInterface={this.APIInterface}
        />
        <TubeMapContainer
          viewTarget={this.state.viewTarget}
          dataOrigin={this.state.dataOrigin}
          visOptions={this.state.visOptions}
          APIInterface={this.APIInterface}
        />
        <CustomizationAccordion
          visOptions={this.state.visOptions}
          tracks={
            this.state.dataOrigin === dataOriginTypes.API
              ? this.state.viewTarget.tracks
              : EXAMPLE_TRACKS
          }
          toggleFlag={this.toggleVisOptionFlag}
          handleMappingQualityCutoffChange={
            this.handleMappingQualityCutoffChange
          }
          setColorSetting={this.setColorSetting}
        />
        <Footer />
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
  apiUrl: (config.BACKEND_URL || `${window.location.origin}`) + "/api/v0",
};

export default App;
