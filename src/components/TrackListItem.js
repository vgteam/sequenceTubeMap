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
import React, { useEffect, useReducer, useRef } from 'react';


export const TrackListItem = ({
    // trackProps expects an object with:
    // * trackType: string
    // * trackFile: file object / undefined
    // * trackColorSettings: object(aka. colorScheme)
    trackProps,
    // availableTracks: array of tracks(see types.ts)
    availableTracks,
    // availableColors: array of ColorPalletes
    availableColors,
    onChange, // expects a new trackProps object
    onDelete,
    trackID,
  }) => {
    const [myTrackProps, dispatch] = useReducer(reducer, trackProps);
    const _onChange = useRef(onChange);

    // https://overreacted.io/a-complete-guide-to-useeffect/
    function reducer(state, action) {
      let newState = {...state};
      switch (action.type){
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
      if (myTrackProps.trackFile !== undefined && JSON.stringify(trackProps) !== JSON.stringify(myTrackProps)) {
        _onChange.current(trackID, myTrackProps);
      }
      
    }, [myTrackProps.trackFile, myTrackProps.trackType, myTrackProps.trackColorSettings, myTrackProps, _onChange, trackProps, trackID]);

    return (
      <Container>
        <Row className="g-0" key={trackID}>
          <Col className="tracklist-dropdown" sm="2">
            <TrackTypeDropdown value={myTrackProps["trackType"]} 
                              onChange={trackTypeOnChange}
                              />
          </Col>
          <Col className="tracklist-dropdown" sm="3">
            <TrackFilePicker tracks={availableTracks} 
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
                                availableColors={availableColors}
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
    availableTracks: PropTypes.array.isRequired,
    availableColors: PropTypes.array,
    onChange: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    trackID: PropTypes.string.isRequired,
  }
    
  
  export default TrackListItem;
  
  
