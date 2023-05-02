import React, { useState, useEffect } from 'react';
import Popup from 'reactjs-popup';
import PropTypes from "prop-types";
import { Button } from 'reactstrap'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faQuestion } from '@fortawesome/free-solid-svg-icons';
import Markdown from 'markdown-to-jsx';

import {
  Container,
  CardBody,
  Card,
} from 'reactstrap';

export const HelpButton = ({
  /* Expects a file input */
  file
}) => {
    // based off of https://react-popup.elazizi.com/controlled-popup/#using-open-prop
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);

    // based off of https://stackoverflow.com/questions/42928530/how-do-i-load-a-markdown-file-into-a-react-component/65584658#65584658
    const [content, setContent] = useState("");

    useEffect(() => {
      fetch(file)
        .then(res => res.text())
        .then(md => { setContent(md) })
        // catch - error is link
        .catch((e) => {
          setContent("Could not fetch help")
        })
        
    }, [file])

    return(
      <div>
        <Button aria-label="Help" onClick={() => setOpen(!open)}><FontAwesomeIcon icon={faQuestion} /></Button>
        {/* Popup has a trigger option, but passing in a button to trigger did not allow for the popup to be opened and closed
         with a Reactstrap button. We had to use onClick and onClose instead to open and close depending on the state of the popup */}
        <Popup open={open} closeOnDocumentClick onClose={close} contentStyle={{width: "760px"}} modal>
          <Container>
            <Card>
              <CardBody>
                  {/* Displays text from document */}
                  <Markdown children={content}/>
              </CardBody>
            </Card>
          </Container>
        </Popup>
      </div>
    )
}


HelpButton.propTypes = {
  file: PropTypes.string.isRequired,
}

HelpButton.defaultProps = {

}

export default HelpButton;
