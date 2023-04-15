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
import React, { useState, useEffect } from 'react';


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

    function getNewTrackProps() {
      // give onChange an updated object with values from local state
      let newTrackProps = {...trackProps};
      newTrackProps["trackFile"] = myTrackFile;
      newTrackProps["trackType"] = myTrackType;
      newTrackProps["trackColorSettings"] = myTrackColorSettings;
      return newTrackProps;
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

    // useEffect hook to tell react to call onchange after state changes
    useEffect(() => {
      if (typeof myTrackFile !== "undefined") {
        // hold off on calling onchange until a file is selected
        onChange(getNewTrackProps());
      }
    }, [myTrackFile, myTrackType, myTrackColorSettings]);

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
  
  
