import React from 'react';
import PropTypes from "prop-types";
import PopupDialog from './PopupDialog.js';

export const PopUpTrackText = ({
  open,
  text,
  close,
}) => {
    return(
      <div>
        <PopupDialog open={open} close={close}>
            {/* Node info here */}
            <h4>Object Information</h4>
            <p>Name: {text}</p>
        </PopupDialog>
      </div>
    )
}


export default PopUpTrackText;

PopUpTrackText.propTypes = {
  open: PropTypes.bool.isRequired,
  text: PropTypes.string.isRequired,
  close: PropTypes.func.isRequired,
}