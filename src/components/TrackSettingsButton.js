import React from 'react';
import Popup from 'reactjs-popup';
import PropTypes from "prop-types";
import TrackSettings from "./TrackSettings.js";

export const TrackSettingsButton = ({
    fileType,
    trackColorSettings,
    setTrackColorSetting,
    availableColors
}) => {
    return(
        <Popup trigger={<button type="button"> Settings </button>} position="right center" modal> 
            <TrackSettings 
            fileType={fileType}
            trackColorSettings={trackColorSettings}
            availableColors={availableColors}
            setTrackColorSetting={setTrackColorSetting}/>
        </Popup>
    )
}

TrackSettingsButton.propTypes = {
    fileType: PropTypes.string.isRequired,
    trackColorSettings: PropTypes.object.isRequired,
    setTrackColorSetting: PropTypes.func.isRequired,
    availableColors: PropTypes.array
}

TrackSettingsButton.defaultProps = {
    availableColors: ["greys", "ygreys", "blues", "reds", "plainColors", "lightColors"]
}

export default TrackSettingsButton;
