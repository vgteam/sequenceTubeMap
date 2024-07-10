import React, { Component } from "react";
import PropTypes from "prop-types";
import { Container, Row, Col, Label, Alert, Button } from "reactstrap";
import { dataOriginTypes } from "../enums";
import "../config-client.js";
import { config } from "../config-global.mjs";
import { LocalAPI } from "../api/LocalAPI.mjs";
import DataPositionFormRow from "./DataPositionFormRow";
import ExampleSelectButtons from "./ExampleSelectButtons";
import RegionInput from "./RegionInput";
import TrackPicker from "./TrackPicker";
import BedFileDropdown from "./BedFileDropdown";
import FormHelperText from "@mui/material/FormHelperText";
import PopupDialog from "./PopupDialog.js";
import Switch from "react-switch";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import {
  parseRegion,
  stringifyRegion,
  isEmpty,
  isValidURL,
  readsExist,
} from "../common.mjs";

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
  BED: "bed",
};

// We define the subset of the empty state that is safe to apply without
// clobbering downloaded data from the server which we need
const CLEAR_STATE = {
  // Select: The file name (or string "none") that is displayed in each
  // dropdown. From the corresponding SelectOptions list.
  // File: The file name actually used (or undefined)
  bedSelect: "none",

  // Description for the selected region, is not displayed when empty
  desc: "",

  // This tracks several arrays (desc, chr, start, end) of BED region data, with
  // one entry in each array per region.
  // desc: description of region, i.e. "region with no source graph available"
  // chr: path in graph where the region is on, i.e. in ref:2000-3000, "ref" is the chr
  // start: start of the region, i.e. in ref:2000-3000, 2000 is the start
  // end: end of the region, i.e. in ref:2000-3000, 3000 is the end
  // chunk: url/directory for preexisting cached chunk, or empty string if not available
  // tracks: object full of tracks to apply when user selects region, or null
  // so regionInfo might look like: 
  /*
  {
    chr: [ '17', '17' ],
    start: [ '1', '1000' ],
    end: [ '100', '1200' ],
    desc: [ '17_1_100', '17_1000_1200' ],
    chunk: [ '', '' ],
    tracks: [ null, null ]
  }
  */
  regionInfo: {},

  // Names of paths in the graph track. Always kept in sync with the first
  // graph track. Emptied out if it is to change, to be re-populated.
  pathNames: [],

  tracks: {},
  // BED file of regions to jump between. Regions may have pre-extracted chunks in the last column.
  // If not used, may be undefined or may have the sting value "none".
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
  
  // These are track objects form uploads we made.
  uploads: [],
  // These are track objects advertised by the server
  advertisedTracks: [],
  // These are track objects provided by the server just for this region
  chunkTracks: [],
  // This one is for the BED files. It needs to exist when we start up or we
  // will try and draw the BED dropdown without an array of options.
  availableBeds: [],
};

// Return true if file is set to a string file name or URL, and false if it is
// falsey or the "none" sentinel.
function isSet(file) {
  return (file !== "none" && file);
}

// Checks if two track objects in the current track set are equal
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
  if (curr_settings && next_settings) {
    if (
      curr_settings.mainPalette !== next_settings.mainPalette ||
      curr_settings.auxPalette !== next_settings.auxPalette ||
      curr_settings.colorReadsByMappingQuality !==
        next_settings.colorReadsByMappingQuality
    ) {
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
  if (
    Object.keys(currViewTarget.tracks).length !==
    Object.keys(nextViewTarget.tracks).length
  ) {
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

  if (currViewTarget.simplify !== nextViewTarget.simplify) {
    return false;
  }

  if (currViewTarget.removeSequences !== nextViewTarget.removeSequences) {
    return false;
  }

  return true;
}

/* determine the current region: accepts a region string and returns the region index

  example of regionInfo:
  {
    chr: [ '17', '17' ],
    start: [ '1', '1000' ],
    end: [ '100', '1200' ],
    desc: [ '17_1_100', '17_1000_1200' ],
    chunk: [ '', '' ],
    tracks: [ null, null ]
  }

  examples: 
  if the regionString is "17:1-100", it would be parsed into {contig: "17", start: 1, end: 100} -> 0
  if the regionString is "17:1000-1200", it would be parsed into {contig: "17", start: 1000, end: 1200} -> 1
  if the regionString is "17:2000-3000", it cannot be found - return null

  The function uses this approach to find the regionIndex given regionString and regionInfo:
  function (region string){
    parse(region string) -> return {contig, start, end}
    loop over chr in region info
      determine if contig, start, end are present at the current index
      if present: return index
    return null
  }
*/
export const determineRegionIndex = (regionString, regionInfo) => {
  let parsedRegion;
  try {
    parsedRegion = parseRegion(regionString);
  } catch(error) {
    return null;
  }
  if (!regionInfo["chr"]){
    return null;
  }
  for (let i = 0; i < regionInfo["chr"].length; i++){
    if ((parseInt(regionInfo["start"][i]) === parsedRegion.start) 
        && (parseInt(regionInfo["end"][i]) === parsedRegion.end)
        && (regionInfo["chr"][i] === parsedRegion.contig)){
          return i;
    }
  }
  return null;
}

/*
  This function takes in a regionIndex and regionInfo, and reconstructs a regionString from them
  assumes that index is valid in regionInfo

  example of regionInfo:
  {
    chr: [ '17', '17' ],
    start: [ '1', '1000' ],
    end: [ '100', '1200' ],
    desc: [ '17_1_100', '17_1000_1200' ],
    chunk: [ '', '' ],
    tracks: [ null, null ]
  }

  example of regionIndex: 0

  example of regionString: "17:1-100"
*/
export const regionStringFromRegionIndex = (regionIndex, regionInfo) => {
  let regionStart = regionInfo["start"][regionIndex];
  let regionEnd = regionInfo["end"][regionIndex];
  let regionContig = regionInfo["chr"][regionIndex];
  return regionContig + ":" + regionStart + "-" + regionEnd;
}

// Sadly JS doesn't have any notion of a tuple to key things on, so we need a way to make a string key
function makeTrackKey(track) {
  return JSON.stringify([track.trackType, track.trackFile]);
}

// Given an array of tracks advertised by the server, an array of tracks we
// created form uploads, an array of tracks suggested for the current region,
// and the currently selected tracks, make an array of selectable tracks.
// Tracks we have selected or are suggested for the current region, but which
// we don't have a source for, are tagged with trackIsImplied. 
function collectTrackOptions(advertisedTracks, uploads, chunkTracks, currentTracks) {
  // Collect tracks known from server advertisements and uploads.
  let allKnown = advertisedTracks.concat(uploads);

  // Index them so we can ID whether a given track we see selected is alrwady known
  let knownKeys = new Set();
  for (let track of allKnown) {
    knownKeys.add(makeTrackKey(track));
  }

  let alreadyImplied = new Set();
  let implied = [];
  function visitTrack(track) {
    // Imply the given track if not known or already implied.
    let key = makeTrackKey(track);
    if (!alreadyImplied.has(key) && !knownKeys.has(key)) {
      // This track isn't known, so it must be implied.
      // Make an implied track record for it
      implied.push({
        trackType: track.trackType,
        trackFile: track.trackFile,
        // Don't bring along the color settings.
        // Do mark it as an "implied" track that we need to remember sort of exists.
        trackIsImplied: true
      });
      alreadyImplied.add(key);
    } 
  };
  for (const key in currentTracks) {
    // Imply all the current tracks that are not in the list already
    let track = currentTracks[key];
    visitTrack(track);
  }
  for (let track of chunkTracks) {
    // Also suggested ones
    visitTrack(track);
  }
  
  // Return the implied and known tracks.
  return implied.concat(allKnown);
}

// Find the counterpart to the given track object in the given array of tracks,
// or null if it is not found.
function findTrack(trackList, track) {
  for (let otherTrack of trackList) {
    if (otherTrack.trackFile == track.trackFile && otherTrack.trackType == track.trackType) {
      return otherTrack;
    }
  }
  return null;
}


// Get the first graph track in a collection of selected tracks, or a falsey
// value if there isn't one.
function firstGraphTrack(tracks) {
  for (const key in tracks) {
    let track = tracks[key];
    if (track.trackType === fileTypes.GRAPH) {
      return track;
    }
  }
  return null;
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
    const bedSelect = isSet(ds.bedFile) ? ds.bedFile : "none";
    this.setState((state) => {
      const stateVals = {
        tracks: ds.tracks,
        chunkTracks: [],
        bedFile: ds.bedFile,
        bedSelect: bedSelect,
        region: ds.region,
        dataType: ds.dataType,
        name: ds.name,
        simplify: ds.simplify,
        popupOpen: false,
        removeSequences: ds.removeSequences
      };
      return stateVals;
    });
  };

  getMountedFilenames = async () => {
    this.setState({ error: null });
    try {
      const json = await this.props.APIInterface.getFilenames(this.cancelSignal);
      if (!json.files || json.files.length === 0) {
        // We did not get back a graph, only (possibly) an error.
        const error =
          json.error || "Server did not return a list of mounted filenames.";
        this.setState({ error: error });
      } else {
        json.bedFiles.unshift("none");

        if (this.state.dataType !== dataTypes.EXAMPLES) {
          // Work out whether the BED file we were set to exists in the result we got
          const bedFile = (isValidURL(this.state.bedFile) || json.bedFiles.includes(this.state.bedFile))
            ? this.state.bedFile
            : "none";
          if (isSet(bedFile)) {
            // If so, kick off a request for BED region metadata
            console.log("Get BED regions for available BED file")
            this.getBedRegions(bedFile);
          } else {
            console.log("Don't get BED regions for BED", this.state.bedFile)
          }
          
          // Sync up path names for first graph track.
          let graphTrack = firstGraphTrack(this.state.tracks);
          if (graphTrack) {
            let trackOptions = collectTrackOptions(json.files, this.state.uploads, this.state.chunkTracks, this.state.tracks);
            let graphTrackFromList = findTrack(trackOptions, graphTrack);
            if (graphTrackFromList.trackIsImplied) {
              console.log("Don't get path names for implied track:", graphTrack);
            } else {
              // Load the paths for any graph tracks advertised by the server.
              // TODO: Do we need to do this now?
              console.log("Get path names for track:", graphTrack);
              this.getPathNames(graphTrack.trackFile);
            }
          }
        }

        this.setState((state) => {
          let newState = {
            advertisedTracks: json.files,
            availableBeds: json.bedFiles
          };

          if (state.dataType === dataTypes.CUSTOM) {
            // See if the BED file vanished and if so clear it out.
            const bedSelect = (isValidURL(state.bedSelect) || json.bedFiles.includes(state.bedSelect))
              ? state.bedSelect
              : "none";
            newState.bedSelect = bedSelect;
            newState.bedFile = isSet(bedSelect) ? bedSelect : undefined;
            if (!isSet(bedSelect)) {
              // Switching to no BED so clear the BED-related info
              newState.regionInfo = {};
              newState.desc = undefined;
            }
          }

          return newState;
        });
      }
    } catch (error) {
      console.error(error);
      this.handleFetchError(error, `API getFilenames failed:`);
    }
  };

  getBedRegions = async (bedFile) => {
    this.setState({ error: null });
    try {
      const json = await this.props.APIInterface.getBedRegions(bedFile, this.cancelSignal);
      // We need to do all our parsing here, if we expect the catch to catch errors.
      if (!json.bedRegions || !(json.bedRegions["desc"] instanceof Array)) {
        throw new Error(
          "Server did not send back an array of BED region descriptions"
        );
      }
      this.setState((state) => {
        if (state.bedFile === bedFile) {
          // We have the region info for the currently selected BED file.
          console.log("Apply retrieved BED regions");
          return {
            // RegionInfo: object with chr, chunk, desc arrays
            regionInfo: json.bedRegions ?? {},
            // Fill in the description from the coordinates when the region info arrives
            desc: this.getRegionDescByCoords(state.region, json.bedRegions ?? {})
          };
        } else {
          console.log("Discard stale BED regions for " + bedFile + " because we are now looking at " + state.bedFile);
        }
      });
    } catch (error) {
      this.handleFetchError(error, `API getBedRegions failed:`);
    }
  };

  resetBedRegions = () => {
    this.setState({
      regionInfo: {},
      desc: undefined
    });
  };

  /// Download the list of path names for the given graph file.
  /// It may be null.
  /// If the graph file isn't known to actually be an available file, set quiet
  /// to true to suppress rendering any errors.
  getPathNames = async (graphFile, quiet) => {
    if (graphFile === null){
      return;
    }
    this.setState({ error: null });
    try {
      const json = await this.props.APIInterface.getPathNames(graphFile, this.cancelSignal);
      // We need to do all our parsing here, if we expect the catch to catch errors.
      let pathNames = json.pathNames;
      if (!(pathNames instanceof Array)) {
        throw new Error("Server did not send back an array of path names");
      }
      this.setState((state) => {
        // Find the then-selected graph file
        let laterGraphTrack = firstGraphTrack(state.tracks);

        if (laterGraphTrack && laterGraphTrack.trackFile === graphFile) {
          // The path names we got are for the graph file we currently have selected.
          console.log("Apply path names");
          return {
            pathNames: pathNames,
          };
        } else {
          console.log("Discard stale path names for " + graphFile + " because we are now looking at " + laterGraphTrack);
        }
      });
    } catch (error) {
      if (!quiet) {
        // We aren't expecting any errors.
        this.handleFetchError(error, `API getPathNames failed:`);
      }
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
          if (isSet(ds.bedFile)) {
            this.getBedRegions(ds.bedFile);
            bedSelect = ds.bedFile;
          } else {
            // Without bedFile, we have no regions
            this.setState({ regionInfo: {} });
          }
          let graphTrack = firstGraphTrack(ds.tracks);
          if (graphTrack) {
            // Load the paths for any graph tracks.
            console.log("Get path names for built-in track: ", graphTrack);
            this.getPathNames(graphTrack.trackFile);
          }
          this.setState((state) => {
            let newState = {
              tracks: ds.tracks,
              chunkTracks: [],
              bedFile: ds.bedFile,
              bedSelect: bedSelect,
              region: ds.region,
              dataType: dataTypes.BUILT_IN,
              name: ds.name,
            };

            let laterGraphTrack = firstGraphTrack(state.tracks);
            if (!laterGraphTrack || !graphTrack || laterGraphTrack.trackFile !== graphTrack.trackFile) {
              // We're changing the graph track file, so clear out the path names until their result comes in.
              console.log("Discard old path named for", laterGraphTrack);
              newState.pathNames = [];
            }
            return newState;
          });
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
    simplify: this.state.simplify && !readsExist(this.state.tracks),
    removeSequences: this.state.removeSequences
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

  getRegionCoordsByDesc = (desc, regionInfo) => {
    // Given a region description (string), return the actual corresponding coordinates
    // Returns null if there is no corresponding coords

    regionInfo = regionInfo ?? this.state.regionInfo;

    // i: number that corresponds to record
    // Find index of given description in regionInfo
    if (!regionInfo["desc"]) {
      return null;
    }
    const i = regionInfo["desc"].findIndex((d) => d === desc);
    if (i === -1)
      // Not found
      return null;
    return regionStringFromRegionIndex(i, regionInfo);
  };
  
  // Get the description of the region with the given coordinates, or null if no such region exists.
  getRegionDescByCoords = (coords, regionInfo) => {
    regionInfo = regionInfo ?? this.state.regionInfo;
    for (let i = 0; i < regionInfo["chr"]?.length ?? 0; i++) {
      if (coords === regionStringFromRegionIndex(i, regionInfo)) {
        return regionInfo["desc"]?.[i] ?? null;
      }
    }
    return null;
  }

  // Function to convert array to object, where the key would be the index and the value
  //  would be the value at the array index
  convertArrayToObject = (array) => {
    let obj = {};
    for(let i = 0; i < array.length; i++){
      obj[i] = array[i];
    }
    return obj;
  }
  
  // Adopt a new region
  // Update the region description
  // Update current tracks if the stored tracks for the region are valid
  // Otherwise check if the current bed file has associated tracks
  // Tracks remain unchanged if neither condition is met
  handleRegionChange = async (coords) => {
    // Update region coords and description
    this.setState((state) => {
      return {
        region: coords,
        desc: this.getRegionDescByCoords(coords, state.regionInfo),
      };
    });

    let coordsToMetaData = {};

    // Construct a concatenated string of possible coords
    // Set relative meta data to each coord
    if (this.state.regionInfo && !isEmpty(this.state.regionInfo)) {
      for (const [index, path] of this.state.regionInfo["chr"].entries()) {
        const pathWithRegion =
          path +
          ":" +
          this.state.regionInfo.start[index] +
          "-" +
          this.state.regionInfo.end[index];
        coordsToMetaData[pathWithRegion] = {
          tracks: this.state.regionInfo.tracks[index],
          chunk: this.state.regionInfo.chunk[index],
        };
      }
    }

    // Set to null if any properties are undefined
    let tracks = coordsToMetaData?.[coords]?.tracks ?? null;
    const chunk = coordsToMetaData?.[coords]?.chunk ?? null;

    if (!tracks && isSet(this.state.bedFile) && chunk) {
      // Try fetching tracks
      const json = await this.props.APIInterface.getChunkTracks(
        this.state.bedFile,
        chunk,
        this.cancelSignal
      );

      // Replace tracks if request returns non-falsey value
      if (json.tracks) {
        console.log("json tracks: ", json.tracks);
        tracks = json.tracks;
        // TODO: Save downloaded tracks in case the user selects the region again?
      }
    }

    // Override current tracks with new tracks
    if (tracks) {
      let trackObject = this.convertArrayToObject(tracks);
      let newGraphTrack = firstGraphTrack(trackObject);
      this.setState((laterState) => {
        if (laterState.region === coords) {
          // The user still has the same region selected, so apply the tracks we now have
          let laterGraphTrack = firstGraphTrack(laterState.tracks);
          let newState = {
            tracks: trackObject,
            chunkTracks: tracks
          };

          if (!newGraphTrack || !laterGraphTrack || newGraphTrack.trackFile !== laterGraphTrack.trackFile) {
            // Changing the tracks also changes the selected graph, which means we can't keep stored path names.
            newState.pathNames = [];
          }

          return newState;
        }
        // Otherwise, don't apply the tracks, because they are no longer relevant.
      });

      let currentGraphTrack = firstGraphTrack(this.state.tracks);
      if (newGraphTrack && (!currentGraphTrack || newGraphTrack.trackFile !== currentGraphTrack.trackFile)) {
        // Path list will need to be updated.

        // Do indexing to see if the new track is implied.
        let trackOptions = collectTrackOptions(this.state.advertisedTracks, this.state.uploads, tracks, trackObject);
        let graphTrackFromList = findTrack(trackOptions, newGraphTrack);
        if (!graphTrackFromList.trackIsImplied) {
          console.log("Get path names for chunk provided graph track:", newGraphTrack)
          this.getPathNames(newGraphTrack.trackFile);
        }
      }
    } else {
      // Clear suggested tracks when we switch away from the suggesting region.
      this.setState((laterState) => {
        if (laterState.region === coords) {
          return {chunkTracks: []};
        }
      });
    }
  };

  // Apply new tracks when the user uses the track picker UI. Assumes we're
  // selecting from the advertised, uploaded, and implied tracks.
  handleInputChange = (newTracks) => {
    // Find the graph track being selected
    let newGraphTrack = firstGraphTrack(newTracks);

    this.setState((state) => {
      // Apply the new tracks
      let newState = {tracks: newTracks};
    
      // See what graph track we're actually overwriting when wer actually get applied.
      let laterGraphTrack = firstGraphTrack(state.tracks);

      if (!newGraphTrack || !laterGraphTrack || newGraphTrack.trackFile !== laterGraphTrack.trackFile) {
        // The stored path list can't apply to the new graph track.
        newState.pathNames = [];
      }

      return newState;
    });

    // After doing the state set, kick off a request for the paths in the new graph if we think we need them.
    let currentGraphTrack = firstGraphTrack(this.state.tracks);
    if (newGraphTrack && (!currentGraphTrack || newGraphTrack.trackFile !== currentGraphTrack.trackFile)) {
      // Path list will need to be updated.

      // Do indexing to see if the new track is implied.
      let trackOptions = collectTrackOptions(this.state.advertisedTracks, this.state.uploads, this.state.chunkTracks, newTracks);
      let graphTrackFromList = findTrack(trackOptions, newGraphTrack);
      if (!graphTrackFromList.trackIsImplied) {
        console.log("Get path names for newly selected graph track:", newGraphTrack)
        this.getPathNames(newGraphTrack.trackFile);
      }
    }

    // TODO: What if we don't kick off the request but we race other updates
    // such that the graph track changes and we should have?
  };

  handleBedChange = (event) => {
    const id = event.target.id;
    const value = event.target.value;
    this.setState({ [id]: value });

    this.setState((state) => {
      let newState = { bedFile: value };
      
      if (value !== state.bedFile) {
        // Bed file is changing so old BED regions aren't right anymore.
        console.log("Clearing outdated BED regions");
        newState.regionInfo = {};
        newState.desc = undefined;
      }

      return newState;
    });

    if (isSet(value) && value !== this.state.bedFile) {
      // Go fetch the BED regions which we will need.
      this.getBedRegions(value);
    }
    
  };

  // Budge the region left or right by the given negative or positive fraction
  // of its width.
  async budgeRegion(fraction) {
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
    
    await this.handleRegionChange(stringifyRegion(parsedRegion));
    this.setState(
      () => this.handleGoButton()
    );
  }


  /* Offset the region left or right by the given negative or positive fraction*/
  // offset: +1 or -1
  async jumpRegion(offset) {
    let regionIndex = determineRegionIndex(this.state.region, this.state.regionInfo) ?? 0;
    if ((offset === -1 && this.canGoLeft(regionIndex)) || (offset === 1 && this.canGoRight(regionIndex))){
      regionIndex += offset;
    }
    let regionString = regionStringFromRegionIndex(regionIndex, this.state.regionInfo);
    await this.handleRegionChange(regionString);
    this.setState(
      () => this.handleGoButton()
    );
  }

  canGoLeft = (regionIndex) => {
    if (isSet(this.state.bedFile)){
      return (regionIndex > 0);
    } else {
      return true;
    }
  }

  canGoRight = (regionIndex) => {
    if (isSet(this.state.bedFile)){
      if (!this.state.regionInfo["chr"]){
        return false;
      }
      return (regionIndex < ((this.state.regionInfo["chr"].length) - 1));
    } else {
      return true;
    }
  }


  handleGoRight = () => {
    if (isSet(this.state.bedFile)){
      this.jumpRegion(1);
    } else {
      this.budgeRegion(0.5);
    }
  };

  handleGoLeft = () => {
    if (isSet(this.state.bedFile)){
      this.jumpRegion(-1);
    } else {
      this.budgeRegion(-0.5);
    }
  };

  showFileSizeAlert = () => {
    this.setState({ fileSizeAlert: true });
  };

  setUploadInProgress = (val) => {
    this.setState({ uploadInProgress: val });
  };

  // Sends uploaded file to server and returns a path to the file
  handleFileUpload = async (fileType, file) => {
    if (!(this.props.APIInterface instanceof LocalAPI) && file.size > config.MAXUPLOADSIZE) {
      this.showFileSizeAlert();
      return;
    }

    this.setUploadInProgress(true);

    try {
      let fileName = await this.props.APIInterface.putFile(fileType, file, this.cancelSignal);
      if (fileType === "graph") {
        // Refresh the graphs right away
        this.getMountedFilenames();
      }
      this.setUploadInProgress(false);
      // Remember that we uploaded this file and can select it.
      this.setState((state) => {
        uploads: state.uploads.concat([{trackType: fileType, trackFile: fileName}])
      });
      return fileName;
    } catch (e) {
      if (!this.cancelSignal.aborted) {
        // Only pass along errors if we haven't canceled our fetches.
        throw e;
      }
    }
  };

  setUpWebsocket = () => {
    this.subscription = this.props.APIInterface.subscribeToFilenameChanges(
      this.getMountedFilenames,
      this.cancelSignal
    );
  };

  /* Function for toggling simplify button, enabling vg simplify to be turned on or off */
  toggleSimplify = () => {
    this.setState({ simplify: !this.state.simplify });
  };

  /* Function for toggling display of node sequences */
  toggleIncludeSequences = () => {
    this.setState({ removeSequences: !this.state.removeSequences });
  };

  togglePopup = () => {
    this.setState({ popupOpen: !this.state.popupOpen });
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
      <option value={dataTypes.CUSTOM_FILES} key={dataTypes.CUSTOM_FILES}>
        custom
      </option>
    );

    const customFilesFlag = this.state.dataType === dataTypes.CUSTOM_FILES;
    const examplesFlag = this.state.dataType === dataTypes.EXAMPLES;
    const viewTargetHasChange = !viewTargetsEqual(
      this.getNextViewTarget(),
      this.props.getCurrentViewTarget()
    );
    const displayDescription = this.state.desc;
    
    const availableTracks = collectTrackOptions(this.state.advertisedTracks, this.state.uploads, this.state.chunkTracks, this.state.tracks);
    console.log(
      "Rendering header form with availableTracks: ",
      availableTracks
    );

    const DataPositionFormRowComponent = (
      <DataPositionFormRow
        handleGoLeft={this.handleGoLeft}
        handleGoRight={this.handleGoRight}
        handleGoButton={this.handleGoButton}
        uploadInProgress={this.state.uploadInProgress}
        getCurrentViewTarget={this.props.getCurrentViewTarget}
        viewTargetHasChange={viewTargetHasChange}
        canGoLeft={this.canGoLeft(determineRegionIndex(this.state.region, this.state.regionInfo))}
        canGoRight={this.canGoRight(determineRegionIndex(this.state.region, this.state.regionInfo))}
      />
    );

    

    return (
      <div>
        <Container>
          <Row>
            <Col>{errorDiv}</Col>
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
                    options={this.state.availableBeds}
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
              
              {customFilesFlag && (
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    {DataPositionFormRowComponent}
                  </div>
                  <div className="d-flex justify-content-end align-items-start flex-shrink-0">
                  {(
                    <>
                      <Button
                        onClick={this.togglePopup}
                        outline
                        active={this.state.simplify || this.state.removeSequences}
                      >
                      <FontAwesomeIcon icon={faGear} /> Simplify
                      </Button>
                      <PopupDialog open={this.state.popupOpen} close={this.togglePopup} width="400px">
                        <div style={{ height: "10vh"}}>
                          {/* Toggle for simplify small variants */}
                          <label className="d-flex align-items-center justify-content-between" style={{ marginBottom: "10px"}}>
                            <span>Remove Small Variants</span>
                            <Switch onChange={this.toggleSimplify} checked={this.state.simplify} />
                          </label>
                          {/* Toggle for remove node sequences */}
                          <label className="d-flex align-items-center justify-content-between">
                            <span>Remove Node Sequences</span>
                            <Switch onChange={this.toggleIncludeSequences} checked={this.state.removeSequences} />
                          </label>
                        </div>
                      </PopupDialog>
                    </>
                  )}
                  <TrackPicker
                    tracks={this.state.tracks}
                    availableTracks={availableTracks}
                    onChange={this.handleInputChange}
                    handleFileUpload={this.handleFileUpload}
                  ></TrackPicker>
                  </div>
                </div>
              )}
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
              {displayDescription ? (
                <div style={{ marginTop: "10px" }}>
                  <FormHelperText> {"Region Description: "} </FormHelperText>
                  <FormHelperText style={{ fontWeight: "bold" }}>
                    {this.state.desc}
                  </FormHelperText>
                </div>
              ) : null}
            </Col>
          </Row>
        </Container>
      </div>
    );
  }
}

HeaderForm.propTypes = {
  dataOrigin: PropTypes.string.isRequired,
  setColorSetting: PropTypes.func.isRequired,
  setDataOrigin: PropTypes.func.isRequired,
  setCurrentViewTarget: PropTypes.func.isRequired,
  defaultViewTarget: PropTypes.any, // Header Form State, may be null if no params in URL. see Types.ts
  APIInterface: PropTypes.object.isRequired,
};

export default HeaderForm;
