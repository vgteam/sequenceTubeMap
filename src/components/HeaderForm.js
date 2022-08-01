import React, { Component } from "react";
import PropTypes from "prop-types";
import { Container, Row, Col, Form, Label, Alert } from "reactstrap";
import { dataOriginTypes } from "../enums";
import { fetchAndParse } from "../fetchAndParse";
// import defaultConfig from '../config.default.json';
import config from "../config.json";
import DataPositionFormRow from "./DataPositionFormRow";
import MountedDataFormRow from "./MountedDataFormRow";
import FileUploadFormRow from "./FileUploadFormRow";
import ExampleSelectButtons from "./ExampleSelectButtons";
import { RegionInput } from "./RegionInput";
// See src/Types.ts

const DATA_SOURCES = config.DATA_SOURCES;
const MAX_UPLOAD_SIZE_DESCRIPTION = "5 MB";
const dataTypes = {
  BUILT_IN: "built-in",
  FILE_UPLOAD: "file-upload",
  MOUNTED_FILES: "mounted files",
  EXAMPLES: "examples",
};
const EMPTY_STATE = {
  // SelectOptions: The options available in the dropdown displayed
  // Select: The file name (or string "none") that is displayed in the form
  // File: The file name (or undefined)
  xgSelectOptions: ["none"],
  xgSelect: "none",

  gbwtSelectOptions: ["none"],
  gbwtSelect: "none",

  gamSelectOptions: ["none"],
  gamSelect: "none",

  bedSelectOptions: ["none"],
  bedSelect: "none",

  // This tracks several arrays of BED region data, stored by data type, with
  // one entry in each array per region.
  regionInfo: {},

  pathNames: ["none"],

  xgFile: undefined,
  gbwtFile: undefined,
  gamFile: undefined,
  bedFile: undefined,
  dataPath: undefined,
  region: "none",
  name: undefined,

  dataType: dataTypes.BUILT_IN,
  fileSizeAlert: false,
  uploadInProgress: false,
  error: null,

  viewTarget: undefined,
};

class HeaderForm extends Component {
  state = EMPTY_STATE;
  componentDidMount() {
    this.initState();
    this.getMountedFilenames();
    this.setUpWebsocket();
  }
  DATA_NAMES = DATA_SOURCES.map((source) => source.name);

  initState = () => {
    // Populate state with either viewTarget or the first example
    let ds = this.props.defaultViewTarget ?? DATA_SOURCES[0];
    const xgSelect = ds.xgFile ? ds.xgFile : "none";
    const bedSelect = ds.bedFile ? ds.bedFile : "none";
    const dataPath = ds.dataPath;

    this.setState((state) => {
      if (bedSelect !== "none") {
        this.getBedRegions(bedSelect, dataPath);
      }
      if (xgSelect !== "none") {
        this.getPathNames(xgSelect, dataPath);
      }
      const stateVals = {
        xgFile: ds.xgFile,
        xgSelect: xgSelect,
        gbwtFile: ds.gbwtFile,
        gamFile: ds.gamFile,
        bedFile: ds.bedFile,
        bedSelect: bedSelect,
        dataPath: dataPath,
        region: ds.region,
        dataType: ds.dataType,
        name: ds.name,
      };
      return stateVals;
    });
  };

  getMountedFilenames = async () => {
    this.setState({ error: null });
    try {
      const json = await fetchAndParse(`${this.props.apiUrl}/getFilenames`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (json.xgFiles === undefined) {
        // We did not get back a graph, only (possibly) an error.
        const error = json.error || "Listing file names";
        this.setState({ error: error });
      } else {
        json.xgFiles.unshift("none");
        json.gbwtFiles.unshift("none");
        json.gamIndices.unshift("none");
        json.bedFiles.unshift("none");

        if (this.state.dataPath === "mounted") {
          this.setState((state) => {
            const xgSelect = json.xgFiles.includes(state.xgSelect)
              ? state.xgSelect
              : "none";
            const gbwtSelect = json.gbwtFiles.includes(state.gbwtSelect)
              ? state.gbwtSelect
              : "none";
            const gamSelect = json.gamIndices.includes(state.gamSelect)
              ? state.gamSelect
              : "none";
            const bedSelect = json.bedFiles.includes(state.bedSelect)
              ? state.bedSelect
              : "none";
            if (bedSelect !== "none") {
              this.getBedRegions(bedSelect, "mounted");
            }
            if (xgSelect !== "none") {
              this.getPathNames(xgSelect, "mounted");
            }
            return {
              xgSelectOptions: json.xgFiles,
              gbwtSelectOptions: json.gbwtFiles,
              gamSelectOptions: json.gamIndices,
              bedSelectOptions: json.bedFiles,
              xgSelect,
              gbwtSelect,
              gamSelect,
              bedSelect,
            };
          });
        } else {
          this.setState((state) => {
            return {
              xgSelectOptions: json.xgFiles,
              gbwtSelectOptions: json.gbwtFiles,
              gamSelectOptions: json.gamIndices,
              bedSelectOptions: json.bedFiles,
            };
          });
        }
      }
    } catch (error) {
      this.setState({ error: error });
      console.error(`GET to ${this.props.apiUrl}/getFilenames failed:`, error);
    }
  };

  getBedRegions = async (bedFile, dataPath) => {
    this.setState((prevState) => ({ ...prevState, error: null }));
    try {
      const json = await fetchAndParse(`${this.props.apiUrl}/getBedRegions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bedFile, dataPath }),
      });
      // We need to do all our parsing here, if we expect the catch to catch errors.
      let bedRegionsDesc = json.bedRegions["desc"];

      if (!(bedRegionsDesc instanceof Array)) {
        throw new Error(
          "Server did not send back an array of BED region descriptions"
        );
      }
      this.setState((state) => {
        return {
          // RegionInfo: object with chr, chunk, desc arrays
          regionInfo: json.bedRegions ?? {},
        };
      });
    } catch (error) {
      console.error(
        `POST to ${this.props.apiUrl}/getBedRegions failed:`,
        error
      );
      this.setState({ error: error });
    }
  };

  resetBedRegions = () => {
    this.setState({
      regionInfo: {},
    });
  };

  getPathNames = async (xgFile, dataPath) => {
    this.setState({ error: null });
    try {
      const json = await fetchAndParse(`${this.props.apiUrl}/getPathNames`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ xgFile, dataPath }),
      });
      // We need to do all our parsing here, if we expect the catch to catch errors.
      let pathNames = json.pathNames;
      if (!(pathNames instanceof Array)) {
        throw new Error("Server did not send back an array of path names");
      }
      this.setState((state) => {
        return {
          pathNames: pathNames,
        };
      });
    } catch (error) {
      console.error(`POST to ${this.props.apiUrl}/getPathNames failed:`, error);
      this.setState({ error: error });
    }
  };

  handleDataSourceChange = (event) => {
    const value = event.target.value;

    if (value === dataTypes.FILE_UPLOAD) {
      const newState = {
        ...EMPTY_STATE,
        dataPath: "upload",
        dataType: dataTypes.FILE_UPLOAD,
        error: this.state.error,
      };
      this.setState(newState, () => {});
    } else if (value === dataTypes.MOUNTED_FILES) {
      this.setState((state) => {
        return {
          ...EMPTY_STATE,
          xgFile: state.xgSelect,
          gbwtFile: state.gbwtSelect,
          gamFile: state.gamSelect,
          bedFile: state.bedSelect,
          dataPath: "mounted",
          dataType: dataTypes.MOUNTED_FILES,
        };
      });
    } else if (value === dataTypes.EXAMPLES) {
      // Synthetic data examples in dropdown
      this.setState({ dataType: dataTypes.EXAMPLES });
    } else {
      // BUILT-IN EXAMPLES
      // Find data source whose name matches selection
      DATA_SOURCES.forEach((ds) => {
        if (ds.name === value) {
          let dataPath = ds.dataPath;
          let bedSelect = "none";
          if (ds.bedFile) {
            this.getBedRegions(ds.bedFile, dataPath);
            bedSelect = ds.bedFile;
          }
          this.getPathNames(ds.xgFile, dataPath);
          this.setState({
            xgFile: ds.xgFile,
            xgSelect: ds.xgFile,
            gbwtFile: ds.gbwtFile,
            gamFile: ds.gamFile,
            bedFile: ds.bedFile,
            bedSelect: bedSelect,
            dataPath: dataPath,
            region: ds.region,
            regionInfo: ds.bedFile ? this.state.regionInfo : {},
            dataType: dataTypes.BUILT_IN,
            name: ds.name,
          });
          return;
        }
      });
    }
  };
  getNextViewTarget = () => ({
    name: this.state.name,
    region: this.state.region,
    xgFile: this.state.xgFile,
    gbwtFile: this.state.gbwtFile,
    gamFile: this.state.gamFile,
    bedFile: this.state.bedFile,
    dataPath: this.state.dataPath,
    dataType: this.state.dataType,
  });

  handleGoButton = () => {
    if (this.props.dataOrigin !== dataOriginTypes.API) {
      this.props.setColorSetting("haplotypeColors", "ygreys");
      this.props.setColorSetting("forwardReadColors", "reds");
    }
    const viewTarget = this.getNextViewTarget();
    this.props.setCurrentViewTarget(viewTarget);
  };

  getRegionCoords = (desc) => {
    // Given a region description (string), return the actual corresponding coordinates
    // Returns null if there is no corresponding coords
    // i: number that corresponds to record
    // Find index of given description in regionInfo
    const i = this.state.regionInfo["desc"].findIndex((d) => d === desc);
    if (i === -1)
      // Not found
      return null;
    // Find corresponding chr, start, and end
    const regionChr = this.state.regionInfo["chr"][i];
    const regionStart = this.state.regionInfo["start"][i];
    const regionEnd = this.state.regionInfo["end"][i];
    // Combine chr, start, and end to get region string
    const regionString = regionChr.concat(":", regionStart, "-", regionEnd);
    return regionString;
  };
  handleRegionChange = (value) => {
    // After user selects a region name or coordinates,
    // update path and region
    let coords = value;

    if (
      this.state.regionInfo.hasOwnProperty("desc") &&
      this.state.regionInfo["desc"].includes(value)
    ) {
      // Just a description was selected, get coords
      coords = this.getRegionCoords(value);
    }
    this.setState({ region: coords });
  };
  handleInputChange = (event) => {
    const id = event.target.id;
    const value = event.target.value;
    this.setState({ [id]: value });
    if (id === "xgSelect") {
      this.getPathNames(value, this.state.dataPath);
      this.setState({ xgFile: value });
    } else if (id === "gbwtSelect") {
      this.setState({ gbwtFile: value });
    } else if (id === "gamSelect") {
      this.setState({ gamFile: value });
    } else if (id === "bedSelect") {
      this.getBedRegions(value, this.state.dataPath);
      this.setState({ bedFile: value });
    }
  };

  handleGoRight = () => {
    let region_col = this.state.region.split(":");
    let start_end = region_col[1].split("-");
    let r_start = Number(start_end[0]);
    let r_end = Number(start_end[1]);
    let shift = (r_end - r_start) / 2;
    r_start = Math.round(r_start + shift);
    r_end = Math.round(r_end + shift);
    this.setState(
      (state) => ({
        region: region_col[0].concat(":", r_start, "-", r_end),
      }),
      () => this.handleGoButton()
    );
  };

  handleGoLeft = () => {
    let region_col = this.state.region.split(":");
    let start_end = region_col[1].split("-");
    let r_start = Number(start_end[0]);
    let r_end = Number(start_end[1]);
    let shift = (r_end - r_start) / 2;
    r_start = Math.max(0, Math.round(r_start - shift));
    r_end = Math.max(0, Math.round(r_end - shift));
    this.setState(
      (state) => ({
        region: region_col[0].concat(":", r_start, "-", r_end),
      }),
      () => this.handleGoButton()
    );
  };

  handleFileUpload = (fileType, fileName) => {
    this.setState({ [fileType]: fileName });
  };

  showFileSizeAlert = () => {
    this.setState({ fileSizeAlert: true });
  };

  setUploadInProgress = (val) => {
    this.setState({ uploadInProgress: val });
  };

  setUpWebsocket = () => {
    this.ws = new WebSocket(this.props.apiUrl.replace(/^http/, "ws"));
    this.ws.onmessage = (message) => {
      this.getMountedFilenames();
    };
    this.ws.onclose = (event) => {
      setTimeout(this.setUpWebsocket, 1000);
    };
    this.ws.onerror = (event) => {
      this.ws.close();
    };
  };

  render() {
    let errorDiv = null;
    if (this.state.error) {
      const message = this.state.error.message
        ? this.state.error.message
        : this.state.error;
      // We drop the error message into a div and leave most of the UI so the
      // user can potentially recover by picking something else.
      errorDiv = (
        <div>
          <Container fluid={true}>
            <Row>
              <Alert color="danger">{message}</Alert>
            </Row>
          </Container>
        </div>
      );
    }

    let dataSourceDropdownOptions = DATA_SOURCES.map((ds) => {
      return (
        <option value={ds.name} key={ds.name}>
          {ds.name}
        </option>
      );
    });
    dataSourceDropdownOptions.push(
      <option value={dataTypes.EXAMPLES} key="syntheticExamples">
        synthetic data examples
      </option>,
      <option value={dataTypes.FILE_UPLOAD} key="customFileUpload">
        custom (file upload)
      </option>,
      <option value={dataTypes.MOUNTED_FILES} key={dataTypes.MOUNTED_FILES}>
        custom (mounted files)
      </option>
    );

    const mountedFilesFlag = this.state.dataType === dataTypes.MOUNTED_FILES;
    const uploadFilesFlag = this.state.dataType === dataTypes.FILE_UPLOAD;
    const examplesFlag = this.state.dataType === dataTypes.EXAMPLES;

    return (
      <div>
        {errorDiv}
        <Container fluid={true}>
          <Row>
            <Col md="auto">
              <img src="./logo.png" alt="Logo" />
            </Col>
            <Col>
                <Label
                  className="tight-label mb-2 mr-sm-2 mb-sm-0 ml-2"
                  for="dataSourceSelect"
                >
                  Data:
                </Label>
                <select
                  type="select"
                  value={
                    this.state.dataType === dataTypes.BUILT_IN
                      ? this.state.name
                      : this.state.dataType
                  }
                  id="dataSourceSelect"
                  className="form-select
                  mb-2 mr-sm-4 mb-sm-0"
                  onChange={this.handleDataSourceChange}
                >
                  {dataSourceDropdownOptions}
                </select>
                &nbsp;
                {mountedFilesFlag && (
                  <MountedDataFormRow
                    xgSelect={this.state.xgSelect}
                    xgSelectOptions={this.state.xgSelectOptions}
                    gbwtSelect={this.state.gbwtSelect}
                    gbwtSelectOptions={this.state.gbwtSelectOptions}
                    gamSelect={this.state.gamSelect}
                    gamSelectOptions={this.state.gamSelectOptions}
                    bedSelect={this.state.bedSelect}
                    bedSelectOptions={this.state.bedSelectOptions}
                    handleInputChange={this.handleInputChange}
                  />
                )}
                {!examplesFlag && (
                  <RegionInput
                    pathNames={this.state.pathNames}
                    regionInfo={this.state.regionInfo}
                    handleRegionChange={this.handleRegionChange}
                    region={this.state.region}
                  />
                )}
                {uploadFilesFlag && (
                  <FileUploadFormRow
                    apiUrl={this.props.apiUrl}
                    getPathNames={this.getPathNames}
                    handleInputChange={this.handleInputChange}
                    handleFileUpload={this.handleFileUpload}
                    showFileSizeAlert={this.showFileSizeAlert}
                    setUploadInProgress={this.setUploadInProgress}
                  />
                )}
              <Alert
                color="danger"
                isOpen={this.state.fileSizeAlert}
                toggle={() => {
                  this.setState({ fileSizeAlert: false });
                }}
                className="mt-3"
              >
                <strong>File size too big! </strong>
                You may only upload files with a maximum size of{" "}
                {MAX_UPLOAD_SIZE_DESCRIPTION}.
              </Alert>
              {examplesFlag ? (
                <ExampleSelectButtons
                  setDataOrigin={this.props.setDataOrigin}
                  setColorSetting={this.props.setColorSetting}
                />
              ) : (
                <DataPositionFormRow
                  handleGoLeft={this.handleGoLeft}
                  handleGoRight={this.handleGoRight}
                  handleGoButton={this.handleGoButton}
                  uploadInProgress={this.state.uploadInProgress}
                  getCurrentViewTarget={this.props.getCurrentViewTarget}
                />
              )}
            </Col>
          </Row>
        </Container>
      </div>
    );
  }
}

HeaderForm.propTypes = {
  apiUrl: PropTypes.string.isRequired,
  dataOrigin: PropTypes.string.isRequired,
  setColorSetting: PropTypes.func.isRequired,
  setDataOrigin: PropTypes.func.isRequired,
  setCurrentViewTarget: PropTypes.func.isRequired,
  defaultViewTarget: PropTypes.any, // Header Form State, may be null if no params in URL. see Types.ts
};

export default HeaderForm;
