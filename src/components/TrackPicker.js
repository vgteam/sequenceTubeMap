import React, { useState } from 'react';
import Popup from 'reactjs-popup';
import PropTypes from "prop-types";
import TrackPickerDisplay from "./TrackPickerDisplay.js";
import { Button } from 'reactstrap'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faList, faX } from '@fortawesome/free-solid-svg-icons';

import {
  CardBody,
  Card,
} from 'reactstrap';

export const TrackPicker = ({
    tracks, // expects a trackList, same as trackListDisplay
    availableTracks,
    availableColors,
    onChange,
}) => {
    // based off of https://react-popup.elazizi.com/controlled-popup/#using-open-prop
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);

    return(
      <div>
        
        <Button aria-label="TrackPicker" data-testid={"TrackPickerButton"} onClick={() => setOpen(!open)}><FontAwesomeIcon icon={faList} /></Button>

        <Popup open={open} closeOnDocumentClick={false} style={{ width: "100%" }} modal>
            <Card>
                <CardBody>
                    <Button className="closePopup" onClick={close}><FontAwesomeIcon icon={faX} data-testid={"TrackPickerExitButton"} /></Button>
                    <TrackPickerDisplay
                        tracks={tracks}
                        availableTracks={availableTracks}
                        availableColors={availableColors}
                        onChange={onChange}
                    />
                </CardBody>
            </Card>
        </Popup>
      </div>
    )
}

TrackPicker.propTypes = {
    tracks: PropTypes.object.isRequired,
    availableTracks: PropTypes.array.isRequired,
    availableColors: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired
}


export default TrackPicker;
