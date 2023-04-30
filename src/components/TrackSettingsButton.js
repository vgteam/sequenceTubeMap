import React, { useState } from 'react';
import Popup from 'reactjs-popup';
import PropTypes from "prop-types";
import TrackSettings from "./TrackSettings.js";
import { Button } from 'reactstrap'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear } from '@fortawesome/free-solid-svg-icons';

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
    availableColors,
    testID
}) => {
    // based off of https://react-popup.elazizi.com/controlled-popup/#using-open-prop
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);
    return(
      <div>
        
        <Button aria-label="Settings" onClick={() => setOpen(!open)}><FontAwesomeIcon icon={faGear} data-testid={testID}/></Button>
      
        {/* Popup has a trigger option, but passing in a button to trigger did not allow for the popup to be opened and closed
         with a Reactstrap button. We had to use onClick and onClose instead to open and close depending on the state of the popup */}
        
        <Popup open={open} closeOnDocumentClick onClose={close} contentStyle={{width: "760px"}} modal>
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
      </div>
    )
}

TrackSettingsButton.propTypes = {
    fileType: PropTypes.string.isRequired,
    trackColorSettings: PropTypes.object.isRequired,
    setTrackColorSetting: PropTypes.func.isRequired,
    label: PropTypes.string,
    availableColors: PropTypes.array,
    testID: PropTypes.string
}

TrackSettingsButton.defaultProps = {
    availableColors: ["greys", "ygreys", "blues", "reds", "plainColors", "lightColors"],
    testID: "settings-button-component"
}

export default TrackSettingsButton;
