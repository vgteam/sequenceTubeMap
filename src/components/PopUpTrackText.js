import React from 'react';
import Popup from 'reactjs-popup';
import PropTypes from "prop-types";
import { Button } from 'reactstrap'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faX } from '@fortawesome/free-solid-svg-icons';

import {
  Container,
  CardBody,
  Card,
} from 'reactstrap';

export const PopUpTrackText = ({
  open,
  text,
  close,
}) => {
    // based off of https://react-popup.elazizi.com/controlled-popup/#using-open-prop
    return(
      <div>
        <Popup open={open} closeOnDocumentClick={false} contentStyle={{width: "760px"}} modal>
          <Container>
            <Card>
              <CardBody style={{boxShadow: "0 4px 8px 0 rgba(0, 0, 0, 0.2)"}}>
                {/* Close Button */}
                <Button className="closePopup" onClick={close}><FontAwesomeIcon icon={faX}/></Button>
                {/* Node info here */}
                <h4>Object Information</h4>
                <p>Name: {text}</p>
              </CardBody>
            </Card>
          </Container>
        </Popup>
      </div>
    )
}


export default PopUpTrackText;

PopUpTrackText.propTypes = {
  open: PropTypes.bool.isRequired,
  text: PropTypes.string.isRequired,
  close: PropTypes.func.isRequired,
}