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
    const [myTrackProps, dispatch] = useReducer(reducer, trackProps);

    // https://overreacted.io/a-complete-guide-to-useeffect/
    // use reducer as a work around for passing props into useEffect
    function reducer(state, action) {
      let newState = {...state};
      switch (action.type){
        case "update":
          // hold off on calling onchange until a file is selected
          if (state["trackFile"] !== undefined){
            onChange(state);
          }
          break;
        case "setType":
          newState["trackFile"] = undefined;
          newState["trackType"] = action.payload;
          break;
        case "setFile":
          newState["trackFile"] = action.payload;
          break;
        case "setColorSettings":
          newState["trackColorSettings"] = action.payload;
          break;
        default:
          throw new Error();

      }
      return newState;
    }
  
    const trackTypeOnChange = async(newTrackType) => {
      // wait until file change to call onChange
      dispatch({type: "setType", payload: newTrackType});
    }

    const trackFileOnChange = async(newFile) => {
      dispatch({type: "setFile", payload: newFile});
    }

    const trackSettingsOnChange = async(key, value) => {
      let newTrackColorSettings = {...trackProps["trackColorSettings"]};
      newTrackColorSettings[key] = value;
      dispatch({type: "setColorSettings", payload: newTrackColorSettings});
    }

    // https://stackoverflow.com/questions/55840294/how-to-fix-missing-dependency-warning-when-using-useeffect-react-hook
    // useEffect hook to tell react to call onchange after state changes
    useEffect(() => {
      console.log("useeffect");
      
      dispatch({ type: "update" });
    }, [dispatch, myTrackProps.trackFile, myTrackProps.trackType, myTrackProps.trackColorSettings]); //passing in trackProps or onChange causes infinite recusive calls

    return (
      <Container>
        <Row className="g-0">
          <Col className="tracklist-dropdown" sm="2">
            <TrackTypeDropdown value={myTrackProps["trackType"]} 
                              onChange={trackTypeOnChange}
                              />
          </Col>
          <Col className="tracklist-dropdown" sm="3">
            <TrackFilePicker tracks={myTrackProps["availableTracks"]} 
                            fileType={myTrackProps["trackType"]} 
                            value={myTrackProps["trackFile"]}
                            pickerType={"dropdown"} 
                            handleInputChange={trackFileOnChange}
                            />
          </Col>
          <Col className="tracklist-button" sm="1">
            <TrackSettingsButton fileType={myTrackProps["trackType"]}
                                trackColorSettings={myTrackProps["trackColorSettings"]}
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
  
  
