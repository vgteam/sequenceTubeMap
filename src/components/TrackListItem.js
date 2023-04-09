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

// fileOptions expects an object of filenames mapped to tracktype

export const TrackListItem = ({
    trackType,
    trackFile,
    availableTracks,
    onChange, 
    trackColorSettings,
    onDelete,
    availableColors
  }) => {
  
    function trackTypeOnChange(newTrackType) {
      // clear filedropdown to prevent calling onChange with invalid (tracktype, trackfile) pairing
      onChange(newTrackType, undefined, trackColorSettings);
    }

    function trackFileOnChange(newFile) {
      onChange(trackType, newFile, trackColorSettings);
    }

    function trackSettingsOnChange(key, value) {
      let newTrackColorSettings = {...trackColorSettings};
      newTrackColorSettings[key] = value;
      onChange(trackType, trackFile, newTrackColorSettings)
    }

    return (
      <Container>
        <Row>
          <Col>
            <TrackTypeDropdown value={trackType} 
                              onChange={trackTypeOnChange}
                              />
          </Col>
          <Col>
            <TrackFilePicker tracks={availableTracks} 
                            fileType={trackType} 
                            value={trackFile}
                            pickerType={"dropdown"} 
                            handleInputChange={trackFileOnChange}
                            />
          </Col>
          <Col>
            <TrackSettingsButton fileType={trackType}
                                trackColorSettings={trackColorSettings}
                                setTrackColorSetting={trackSettingsOnChange}
                                availableColors={availableColors}
                                />
          </Col>
          <Col>
            <TrackDeleteButton onClick={onDelete}
                              />
          </Col>
        </Row>
      </Container>
    );
    
  }
  
  TrackListItem.propTypes = {
    trackType: PropTypes.string,
    trackFile: PropTypes.string,
    availableTracks: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
    trackColorSettings: PropTypes.object,
    onDelete: PropTypes.func.isRequired,
    availableColors: PropTypes.array,
  }
    
  TrackListItem.defaultProps = {
    trackType: "graph",
    trackFile: undefined,
    availableColors: undefined,
    trackColorSettings: {    
      mainPallete: "blues",
      auxPallete: "reds",
      colorReadsByMappingQuality: false},
    
  }
  
  export default TrackListItem;
  
  
