import React, { Component } from "react";
import PropTypes from "prop-types";
import { Container, Row, Col, Label, Alert, Button } from "reactstrap";
import { dataOriginTypes } from "../enums";
import { fetchAndParse } from "../fetchAndParse";
import "../config-client.js";
import { config } from "../config-global.mjs";
import DataPositionFormRow from "./DataPositionFormRow";
import ExampleSelectButtons from "./ExampleSelectButtons";
import RegionInput from "./RegionInput";
import TrackPicker from "./TrackPicker";
import BedFileDropdown from "./BedFileDropdown";
import { parseRegion, stringifyRegion, isEmpty, readsExist } from "../common.mjs";


// See src/Types.ts

const DATA_SOURCES = config.DATA_SOURCES;
const MAX_UPLOAD_SIZE_DESCRIPTION = "5 MB";
const dataTypes = {
  BUILT_IN: "built-in",
  CUSTOM_FILES: "mounted files",
  EXAMPLES: "examples",
};
const fileTypes = {
  GRAPH: "graph",
  HAPLOTYPE: "haplotype",
  READ: "read",
  BED:"bed",
};


// We define the subset of the empty state that is safe to apply without
// clobbering downloaded data from the server which we need
const CLEAR_STATE = {
  // Select: The file name (or string "none") that is displayed in each
  // dropdown. From the corresponding SelectOptions list.
  // File: The file name actually used (or undefined)
  bedSelect: "none",

  // This tracks several arrays of BED region data, stored by data type, with
  // one entry in each array per region.
  regionInfo: {},

  pathNames: ["none"],

  tracks: {},
  bedFile: undefined,
  region: "",
  name: undefined,

  dataType: dataTypes.BUILT_IN,
  fileSizeAlert: false,
  uploadInProgress: false,
  error: null,

  viewTarget: undefined,
};

// We define the entire empty state template.
const EMPTY_STATE = {
  ...CLEAR_STATE,

  // SelectOptions: The options available in the dropdown displayed.

  // These ones are for selecting entire files and need to be preserved when
  // switching dataType.
  fileSelectOptions: [],
  // This one is for the BED files. It needs to exist when we start up or we
  // will try and draw the BED dropdown without an array of options.
  bedSelectOptions: []
};

// Creates track to be stored in ViewTarget
// Modify as the track system changes
// INPUT: file structure, see Types.ts
function createTrack(file) {
  //track properties
  const files = [file]

  //remove empty files here?

  const track = {
    files: files,
  };
  return track;
}

// Checks if all file names in the track are equal
function tracksEqual(curr, next) {
  if ((curr === undefined) !== (next === undefined)) {
    // One is undefined and the other isn't
    return false;
  }

  const curr_file = curr.trackFile;
  const next_file = next.trackFile;

  const curr_settings = curr.trackColorSettings;
  const next_settings = next.trackColorSettings;
  
  // check if color settings are equal
  if (curr_settings && next_settings){
    if (curr_settings.mainPalette !== next_settings.mainPalette || 
        curr_settings.auxPalette !== next_settings.auxPalette ||
        curr_settings.colorReadsByMappingQuality !== next_settings.colorReadsByMappingQuality) {
          
        return false;
    }
  }
  // count falsy file names as the same
  if ((!curr_file && !next_file) || curr_file === next_file) {
    return true;
  }
  return false;

}

// Checks if two view targets are the same. They are the same if they have the
// same tracks and the same region.
function viewTargetsEqual(currViewTarget, nextViewTarget) {

  // Update if one is undefined and the other isn't
  if ((currViewTarget === undefined) !== (nextViewTarget === undefined)) {
    return false;
  }

  // Update if view target tracks are not equal
  if (Object.keys(currViewTarget.tracks).length !== Object.keys(nextViewTarget.tracks).length) {
    // Different lengths so not equal
    return false;
  }

  for (const key in currViewTarget.tracks) {
    const currTrack = currViewTarget.tracks[key];
    const nextTrack = nextViewTarget.tracks[key];

    // if the key doesn't exist in the other track
    if (!currTrack || !nextTrack) {
      return false;
    }

    if (!tracksEqual(currTrack, nextTrack)) {
      // Different tracks so not equal
      return false;
    }
  }

  if (currViewTarget.bedFile !== nextViewTarget.bedFile) {
    return false;
  }

  // Update if regions are not equal
  if (currViewTarget.region !== nextViewTarget.region) {
     return false;
  }

  if (currViewTarget.simplify !== nextViewTarget.simplify){
    return false;
  }

  return true;

}

class HeaderForm extends Component {
  state = EMPTY_STATE;
  componentDidMount() {
    this.fetchCanceler = new AbortController();
    this.cancelSignal = this.fetchCanceler.signal;
    this.initState();
    this.getMountedFilenames();
    this.setUpWebsocket();
  }
  componentWillUnmount() {
    // Cancel the requests since we may have long running requests pending.
    this.fetchCanceler.abort();
  }
  handleFetchError(error, message) {
    if (!this.cancelSignal.aborted) {
      console.log(message, error.name, error.message);
      this.setState({ error: error });
    } else {
      console.log(
        "fetch canceled by componentWillUnmount",
        error.name,
        error.message
      );
    }
  }

  initState = () => {
    // Populate state with either viewTarget or the first example
    let ds = this.props.defaultViewTarget ?? DATA_SOURCES[0];
    const bedSelect = ds.bedFile ? ds.bedFile : "none";
    if (bedSelect !== "none") {
      this.getBedRegions(bedSelect);
    }
    for (const key in ds.tracks) {
      if (ds.tracks[key].trackType === fileTypes.GRAPH) {
        // Load the paths for any graph tracks
        console.log("Get path names for track: ", ds.tracks[key]);
        this.getPathNames(ds.tracks[key].trackFile);
      }
    }
    this.setState((state) => {
      const stateVals = {
        tracks: ds.tracks,
        bedFile: ds.bedFile,
        bedSelect: bedSelect,
        region: ds.region,
        dataType: ds.dataType,
        name: ds.name,
        simplify: ds.simplify 
      };
      return stateVals;
    });
  };

  setTrackFile = (type, index, file) => {
    // Set the nth track of the given type to the given file.
    // If there is no nth track of that type, create one.
    // If the file is "none", remove that track.
    this.setState((state) => {
      console.log('Set file ' + type + ' index ' + index + ' to ' + file + ' over ' + JSON.stringify(state.tracks));

      // Make a modified copy of the tracks
      let newTracks = [];

      // Find the nth track of this type, if any.
      let seenTracksOfType = 0;
      let maxKey = -1;
      for (const key in state.tracks) {
        let track = state.tracks[key];
        if (track.trackType === type) {
          if (seenTracksOfType === index) {
            if (file !== "none") {
              // We want to adjust it, so keep a modified copy of it
              let newTrack = JSON.parse(JSON.stringify(track));
              newTrack.trackFile = file;
              newTracks[key] = newTrack;
            }
            // If the file is "none" we drop the track.
          } else {
            // We want to keep it as is
            newTracks[key] = track;
          }
          seenTracksOfType++;
        } else {
          // We want to keep all tracks of other types as is
          newTracks[key] = track;
        }
        if (parseInt(key) > maxKey) {
          maxKey = parseInt(key);
        }
      }
      
      console.log('Saw ' + seenTracksOfType + ' tracks of type vs index ' + index)
      if (seenTracksOfType === index && file !== "none") {
        // We need to add this track
        console.log('Create track at index ' + (maxKey + 1))
        newTracks[maxKey + 1] = createTrack({"type": type, "name": file});
      }

      // Add the new tracks to the state
      let newState = Object.assign({}, state);
      newState.tracks = newTracks;
      console.log('Set result: ' + JSON.stringify(newTracks));
      return newState;
    });
  }

  getTrackFile = (tracks, type, index) => {
    // Get the file used in the nth track of the gicen type, or "none" if no
    // such track exists.
    let seenTracksOfType = 0;
    for (const key in tracks) {
      let track = tracks[key];
      if (track === -1) {
        continue;
      }
      if (track.trackType === type) {
        if (seenTracksOfType === index) {
          // This is the one. Return its filename.
          return track.trackFile;
        }
        seenTracksOfType++;
      } 
    }
    // Not found
    return "none";
  }

  getMountedFilenames = async () => {
    this.setState({ error: null });
    try {
      const json = await fetchAndParse(`${this.props.apiUrl}/getFilenames`, {
        signal: this.cancelSignal, // (so we can cancel the fetch request if we will unmount component)
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!json.files || json.files.length === 0) {
        // We did not get back a graph, only (possibly) an error.
        const error =
          json.error || "Server did not return a list of mounted filenames.";
        this.setState({ error: error });
      } else {
        json.bedFiles.unshift("none");

        if (this.state.dataType === dataTypes.CUSTOM_FILES) {
          this.setState((state) => {
            const bedSelect = json.bedFiles.includes(state.bedSelect)
              ? state.bedSelect
              : "none";
            if (bedSelect !== "none") {
              this.getBedRegions(bedSelect);
            }
            for (const key in state.tracks) {
              if (state.tracks[key].trackType === fileTypes.GRAPH) {
                // Load the paths for any graph tracks.
                // TODO: Do we need to do this now?
                console.log("Get path names for track: ", state.tracks[key]);
                this.getPathNames(state.tracks[key].trackFile);
              }
            } 
            return {
              fileSelectOptions: json.files,
              bedSelectOptions: json.bedFiles,
              bedSelect,
            };
          });
        } else {
          this.setState((state) => {
            return {
              fileSelectOptions: json.files,
              bedSelectOptions: json.bedFiles,
            };
          });
        }
      }
    } catch (error) {
      this.handleFetchError(
        error,
        `GET to ${this.props.apiUrl}/getFilenames failed:`
      );
    }
  };

  getBedRegions = async (bedFile) => {
    this.setState({ error: null });
    try {
      const json = await fetchAndParse(`${this.props.apiUrl}/getBedRegions`, {
        signal: this.cancelSignal, // (so we can cancel the fetch request if we will unmount component)
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bedFile }),
      });
      // We need to do all our parsing here, if we expect the catch to catch errors.
      if (!json.bedRegions || !(json.bedRegions["desc"] instanceof Array)) {
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
      this.handleFetchError(
        error,
        `POST to ${this.props.apiUrl}/getBedRegions failed:`
      );
    }
  };

  resetBedRegions = () => {
    this.setState({
      regionInfo: {},
    });
  };

  getPathNames = async (graphFile) => {
    this.setState({ error: null });
    try {
      const json = await fetchAndParse(`${this.props.apiUrl}/getPathNames`, {
        signal: this.cancelSignal, // (so we can cancel the fetch request if we will unmount component)
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ graphFile }),
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
      this.handleFetchError(
        error,
        `POST to ${this.props.apiUrl}/getPathNames failed:`
      );
    }
  };

  handleDataSourceChange = (event) => {
    const value = event.target.value;

    if (value === dataTypes.CUSTOM_FILES) {
      this.setState((state) => {
        return {
          ...CLEAR_STATE,
          bedFile: "none",
          // not sure why we would like to keep the previous selection when changing data sources. What I know is it creates a bug for the regions, where the tubemap tries to read the previous bedFile (e.g. defaulted to example 1), can't find it and raises an error
          // bedFile: state.bedSelect,
          dataType: dataTypes.CUSTOM_FILES,
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
          let bedSelect = "none";
          if (ds.bedFile) {
            this.getBedRegions(ds.bedFile);
            bedSelect = ds.bedFile;
          } else {
            // Without bedFile, we have no regions
            this.setState({ regionInfo: {} });
          }
          for (const key in ds.tracks) {
            if (ds.tracks[key].trackType === fileTypes.GRAPH) {
              // Load the paths for any graph tracks.
              console.log("Get path names for track: ", ds.tracks[key]);
              this.getPathNames(ds.tracks[key].trackFile);
            }
          }
          this.setState({
            tracks: ds.tracks, 
            bedFile: ds.bedFile,
            bedSelect: bedSelect,
            region: ds.region,
            dataType: dataTypes.BUILT_IN,
            name: ds.name,
          });
          return;
        }
      });
    }
  };
  getNextViewTarget = () => ({
    tracks: this.state.tracks,
    bedFile: this.state.bedFile,
    name: this.state.name,
    region: this.state.region,
    dataType: this.state.dataType,
    simplify: this.state.simplify && !(readsExist(this.state.tracks))
  });

  handleGoButton = () => {
    console.log("HANDLING GO BUTTON:");
    if (this.props.dataOrigin !== dataOriginTypes.API) {
      this.props.setColorSetting("haplotypeColors", "ygreys");
      this.props.setColorSetting("forwardReadColors", "reds");
    }

    const nextViewTarget = this.getNextViewTarget();
    const currViewTarget = this.props.getCurrentViewTarget();

    // Tracks list is empty
    if (Object.keys(nextViewTarget["tracks"]).length === 0) {
      // TODO: put some kind of visual indicator that the tracks list is empty
      console.log("Tracks must not be empty before go");
      return;
    }

    
    if (!viewTargetsEqual(currViewTarget, nextViewTarget)) {
      // Update the view if the view target has changed.
      this.props.setCurrentViewTarget(nextViewTarget);
    }

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

  // In addition to a new region value, also takes tracks and chunk associated with the region
  // Update current track if the new tracks are valid
  // Otherwise check if the current bed file is a url, and if tracks can be fetched from said url
  // Tracks remain unchanged if neither condition is met
  handleRegionChange = async (value) => {
    // After user selects a region name or coordinates,
    // update path, region, and associated tracks(if applicable)

    // Update path and region
    let coords = value;
    if (
      this.state.regionInfo.hasOwnProperty("desc") &&
      this.state.regionInfo["desc"].includes(value)
    ) {
      // Just a description was selected, get coords
      coords = this.getRegionCoords(value);
    }
    this.setState({ region: coords });
    
    let coordsToMetaData = {}

    // Construct a concatenated string of possible coords
    // Set relative meta data to each coord
    if (this.state.regionInfo && !isEmpty(this.state.regionInfo)) {
      for (const [index, path] of this.state.regionInfo["chr"].entries()) {
        const pathWithRegion = path + ":" + this.state.regionInfo.start[index] + "-" + this.state.regionInfo.end[index];
        coordsToMetaData[pathWithRegion] = {
          "tracks": this.state.regionInfo.tracks[index],
          "chunk": this.state.regionInfo.chunk[index]
        }
      }
    }

    // Set to null if any properties are undefined
    const tracks = coordsToMetaData?.[coords]?.tracks ?? null;
    const chunk = coordsToMetaData?.[coords]?.chunk ?? null;

    // Override current tracks with new tracks from chunk dir
    if (tracks) {
      this.setState({ tracks: tracks });
      console.log("New tracks have been applied");
    } else if (this.state.bedFile && chunk) {
      // Try to retrieve tracks from the server
      const json = await fetchAndParse(`${this.props.apiUrl}/getChunkTracks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bedFile: this.state.bedFile, chunk: chunk }),
      });

      // Replace tracks if request returns non-falsey value
      if (json.tracks) {
        this.setState((laterState) => {
          if (laterState.region === coords) {
            // The user still has the same region selected, so apply the tracks we now have
            return { tracks: json.tracks };
          }
          // Otherwise, don't apply the downloaded tracks, because they are no longer relevant.
          // TODO: Save the downloaded tracks in case the user selects the region again?
        });
      }
    }
  };

  handleInputChange = (newTracks) => {
    this.setState((state) => {
      let newState = Object.assign({}, state);
      newState.tracks = newTracks;
      console.log('Set result: ' + JSON.stringify(newTracks));
      return newState;
    });

    // update path names
    const graphFile = this.getTrackFile(newTracks, fileTypes.GRAPH, 0);
    if (graphFile && graphFile !== "none"){
      this.getPathNames(graphFile);
    }

  };

  handleBedChange = (event) => {
    const id = event.target.id;
    const value = event.target.value;
    this.setState({ [id]: value });

    if (value !== "none") {
      this.getBedRegions(value);
    }
    this.setState({ bedFile: value });

  }

  // Budge the region left or right by the given negative or positive fraction
  // of its width.
  budgeRegion(fraction) {
    let parsedRegion = parseRegion(this.state.region);

    if (parsedRegion.distance !== undefined) {
      // This is a start + distance region
      let shift = parsedRegion.distance * fraction;
      // So just shift the start
      parsedRegion.start = Math.max(0, Math.round(parsedRegion.start + shift));
    } else {
      // This is a start - end region
      let shift = (parsedRegion.end - parsedRegion.start) * fraction;
      // So shift the whole window
      parsedRegion.start = Math.max(0, Math.round(parsedRegion.start + shift));
      parsedRegion.end = Math.max(0, Math.round(parsedRegion.end + shift));
    }
   
    this.setState(
      (state) => ({
        region: stringifyRegion(parsedRegion),
      }),
      () => this.handleGoButton()
    );
  }

  handleGoRight = () => {
    this.budgeRegion(0.5);
  };

  handleGoLeft = () => {
    this.budgeRegion(-0.5);
  };

  showFileSizeAlert = () => {
    this.setState({ fileSizeAlert: true });
  };

  setUploadInProgress = (val) => {
    this.setState({ uploadInProgress: val });
  };

  // Sends uploaded file to server and returns a path to the file
  handleFileUpload = async (fileType, file) => {
    return new Promise(function (resolve, reject) {
      if (file.size > config.MAXUPLOADSIZE) {
        this.showFileSizeAlert();
        return;
      }
  
      this.setUploadInProgress(true);
  
      const formData = new FormData();
      // If the file is anything other than a Blob, it will be turned into a
      // string and added as a normal form value. If it is a Blob it will
      // become a file upload. Note that a File is a kind of Blob. See
      // <https://developer.mozilla.org/en-US/docs/Web/API/FormData/append#value>
      //
      // But in jsdom in the test environment there are two Blob types: Node's
      // and jdsom's, and only jsdom's will work. Node's will turn into a
      // string. And it seems hard to get at both types in a way that makes
      // sense in a browser. So we will add the file and make sure it added OK
      // and didn't stringify.
      
      // According to <https://stackoverflow.com/a/43914175>, we *must* set a filename for uploads.
      // In jsdom it turns on jsdom's own type checking support.
      let fileName = file.name || "upload.dat";
      formData.append("trackFile", file, fileName);
      if (typeof formData.get("trackFile") == "string") {
        // Catch stringification in case jsdom didn't.
        console.error("Cannot upload file because it is not the appropriate type:", file);
        throw new Error("File is not an appropriate type to upload");
      }
      // Make sure server can identify a Read file
      formData.append("fileType", fileType); 
      const xhr = new XMLHttpRequest();
      xhr.responseType = "json";
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
          // Every thing ok, file uploaded
          this.setUploadInProgress(false);
          if (fileType === "graph") {
            this.getPathNames(xhr.response.path);
          }

          resolve(xhr.response.path);
        }
      };
      
      console.log("Uploading file", file);
      console.log("Sending form data", formData);
      console.log("Form file is a " + typeof formData.get("trackFile"));
      xhr.open("POST", `${this.props.apiUrl}/trackFileSubmission`, true);
      xhr.send(formData);
    }.bind(this));
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

  /* Function for simplify */
  enableSimplify = () => {
    this.setState( { simplify: !this.state.simplify });
  }

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
      <option value={dataTypes.CUSTOM_FILES} key={dataTypes.CUSTOM_FILES}>
        custom
      </option>
    );

    const customFilesFlag = this.state.dataType === dataTypes.CUSTOM_FILES;
    const examplesFlag = this.state.dataType === dataTypes.EXAMPLES;
    const viewTargetHasChange = !viewTargetsEqual(this.getNextViewTarget(), this.props.getCurrentViewTarget());

    const ifReadsExist = readsExist(this.state.tracks);


    console.log(
      "Rendering header form with fileSelectOptions: ",
      this.state.fileSelectOptions
    );

    const DataPositionFormRowComponent = <DataPositionFormRow
      handleGoLeft={this.handleGoLeft}
      handleGoRight={this.handleGoRight}
      handleGoButton={this.handleGoButton}
      uploadInProgress={this.state.uploadInProgress}
      getCurrentViewTarget={this.props.getCurrentViewTarget}
      viewTargetHasChange={viewTargetHasChange}
    />

    return (
      <div>
        <Container>
          <Row>
            <Col>
              {errorDiv}
            </Col>
          </Row>
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
              {customFilesFlag && (
                <React.Fragment>
                  <Label
                    for="bedSelectInput"
                    className="customData tight-label mb-2 mr-sm-2 mb-sm-0 ml-2"
                  >
                    BED file:
                  </Label>
                  &nbsp;
                  <BedFileDropdown
                    className="customDataMounted dropdown mb-2 mr-sm-4 mb-sm-0"
                    id="bedSelect"
                    inputId="bedSelectInput"
                    value={this.state.bedSelect}
                    onChange={this.handleBedChange}
                    options={this.state.bedSelectOptions}
                  />
                  &nbsp;
                </React.Fragment>

              )}

              {!examplesFlag && (
                <RegionInput
                  pathNames={this.state.pathNames}
                  regionInfo={this.state.regionInfo}
                  handleRegionChange={this.handleRegionChange}
                  region={this.state.region}
                />
              )}

              {customFilesFlag && 
                <div style={{display: "flex"}}>
                  {DataPositionFormRowComponent}
                  <TrackPicker
                    tracks={this.state.tracks}
                    availableTracks={this.state.fileSelectOptions}
                    onChange={this.handleInputChange}
                    handleFileUpload={this.handleFileUpload}
                  ></TrackPicker>
                  {/* Button for simplify */}
                  {
                    !ifReadsExist &&
                    <Button onClick={this.enableSimplify} outline active={this.state.simplify}>{this.state.simplify ? "Simplify On" : "Simplify Off"}</Button>
                  }
                  </div>
              }

              <Row>
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
                  !customFilesFlag && DataPositionFormRowComponent 
                )}
              </Row>
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
