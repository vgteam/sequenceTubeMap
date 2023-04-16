import PropTypes from "prop-types";
import {
    Container,
    Row,
    Col
  } from "reactstrap";
import {TrackFilePicker} from './TrackFilePicker';
import {TrackTypeDropdown} from './TrackTypeDropdown';
import {TrackDeleteButton} from './TrackDeleteButton';
import {TrackSettingsButton} from './TrackSettingsButton';
import React, { useState, useEffect, useReducer } from 'react';


export const TrackListItem = ({
    trackProps,
    // trackProps expects an object with
      // trackType: string
      // trackFile: file object
      // availableTracks: array of tracks(see types.ts)
      // trackColorSettings: object(aka. colorScheme)
      // availableColors: array of ColorPalletes
    onChange, // expects a new trackProps object
    onDelete,
  }) => {
    const [myTrackFile, setFile] = useState(trackProps["trackFile"]);
    const [myTrackType, setTrack] = useState(trackProps["trackType"]);
    const [myTrackColorSettings, setColorSettings] = useState(trackProps["trackColorSettings"]);
    // can maybe replace useStates above with myTrackProps? 
    const [myTrackProps, dispatch] = useReducer(reducer, trackProps);

    // https://overreacted.io/a-complete-guide-to-useeffect/
    // use reducer as a work around for passing props into useEffect
    function reducer(state, action) {
      let newState = {...state};
      if (action.type === "update"){
        newState["trackFile"] = myTrackFile;
        newState["trackType"] = myTrackType;
        newState["trackColorSettings"] = myTrackColorSettings;
        onChange(newState);
        return newState;
      } else {
        throw new Error();
      }
    }
  
    const trackTypeOnChange = async(newTrackType) => {
      // wait until file change to call onChange
      setTrack(newTrackType);
      setFile(undefined);
    }

    const trackFileOnChange = async(newFile) => {
      setFile(newFile);
    }

    const trackSettingsOnChange = async(key, value) => {
      let newTrackColorSettings = {...trackProps["trackColorSettings"]};
      newTrackColorSettings[key] = value;
      setColorSettings(newTrackColorSettings);
    }

    // https://stackoverflow.com/questions/55840294/how-to-fix-missing-dependency-warning-when-using-useeffect-react-hook
    // useEffect hook to tell react to call onchange after state changes
    useEffect(() => {
      console.log("useeffect");

      // hold off on calling onchange until a file is selected
      if (typeof myTrackFile !== "undefined") {
        dispatch({ type: "update" });
      }
    }, [myTrackFile, myTrackType, myTrackColorSettings, dispatch]); //passing in trackProps or onChange causes infinite recusive calls

    return (
      <Container>
        <Row className="g-0">
          <Col className="tracklist-dropdown" sm="2">
            <TrackTypeDropdown value={myTrackType} 
                              onChange={trackTypeOnChange}
                              />
          </Col>
          <Col className="tracklist-dropdown" sm="3">
            <TrackFilePicker tracks={trackProps["availableTracks"]} 
                            fileType={myTrackType} 
                            value={myTrackFile}
                            pickerType={"dropdown"} 
                            handleInputChange={trackFileOnChange}
                            />
          </Col>
          <Col className="tracklist-button" sm="1">
            <TrackSettingsButton fileType={myTrackType}
                                trackColorSettings={myTrackColorSettings}
                                setTrackColorSetting={trackSettingsOnChange}
                                availableColors={trackProps["availableColors"]}
                                />
            <TrackDeleteButton onClick={onDelete}
                              />
          </Col>

        </Row>
      </Container>
    );
    
  }
  
  TrackListItem.propTypes = {
    trackProps: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
  }
    
  
  export default TrackListItem;
  
  
