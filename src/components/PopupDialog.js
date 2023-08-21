import React from 'react';
import Popup from 'reactjs-popup';
import { Button } from 'reactstrap'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faX } from '@fortawesome/free-solid-svg-icons';
import PropTypes from "prop-types";
import { Container, CardBody, Card } from 'reactstrap';

export const PopupDialog = ({
  open,
  children,
  close,
  closeOnDocumentClick,
  width,
  testID
}) => {
    // based off of https://react-popup.elazizi.com/controlled-popup/#using-open-prop
    return(
      <>
        <Popup open={open} closeOnDocumentClick={closeOnDocumentClick} contentStyle={width !== null ? {width: width} : {}} modal>
          <Container>
            <Card style={{boxShadow: "0 4px 8px 0 rgba(0, 0, 0, 0.2)"}}>
              <CardBody style={{overflowY: "scroll", overflowX: "hidden", maxHeight: "90vh"}}>
                {/* Close Button */}
                <Button className="closePopup" onClick={close} data-testid={testID.concat("CloseButton")}><FontAwesomeIcon icon={faX}/></Button>
                <div>{children}</div>
              </CardBody>
            </Card>
          </Container>
        </Popup>
      </>
    )
}


export default PopupDialog;

PopupDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  close: PropTypes.func.isRequired,
  closeOnDocumentClick: PropTypes.bool,
  width: PropTypes.string,
  testID: PropTypes.string
}

PopupDialog.defaultProps = {
  closeOnDocumentClick: false,
  width: "760px",
  testID: "PopupDialog"
}
