import React from 'react';
import Popup from 'reactjs-popup';
import PropTypes from "prop-types";
import TrackSettings from "./TrackSettings.js";
import {
  Container,
  CardBody,
  Card,
} from 'reactstrap';

export const TrackSettingsButton = ({
    fileType,
    trackColorSettings,
    setTrackColorSetting,
    label,
    availableColors
}) => {
    return(
        <Popup trigger={<button type="button"> Settings </button>} position="right center" contentStyle={{width: "760px"}} modal>
          <Container>
            <Card>
              <CardBody>
                  <TrackSettings
                    fileType={fileType}
                    trackColorSettings={trackColorSettings}
                    availableColors={availableColors}
                    setTrackColorSetting={setTrackColorSetting}
                    label={label}/>
              </CardBody>
            </Card>
          </Container>
        </Popup>
    )
}

TrackSettingsButton.propTypes = {
    fileType: PropTypes.string.isRequired,
    trackColorSettings: PropTypes.object.isRequired,
    setTrackColorSetting: PropTypes.func.isRequired,
    label: PropTypes.string,
    availableColors: PropTypes.array,
}

TrackSettingsButton.defaultProps = {
    availableColors: ["greys", "ygreys", "blues", "reds", "plainColors", "lightColors"]
}

export default TrackSettingsButton;
