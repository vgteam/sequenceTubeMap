import React, { useState, useEffect } from 'react';
import PropTypes from "prop-types";
import { Button } from 'reactstrap'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faQuestion } from '@fortawesome/free-solid-svg-icons';
import Markdown from 'markdown-to-jsx';
import PopupDialog from './PopupDialog.js';

export const HelpButton = ({
  /* Expects a file input */
  file
}) => {

    let fileURL = new URL(file, document.baseURI)
    // based off of https://react-popup.elazizi.com/controlled-popup/#using-open-prop
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);

    // based off of https://stackoverflow.com/questions/42928530/how-do-i-load-a-markdown-file-into-a-react-component/65584658#65584658
    const [content, setContent] = useState("");

    const Image = ({ alt, src, ...props }) => (
      <img alt={alt} src={new URL(src, fileURL)} {...props} style={{maxWidth: "100%", border: "solid black 1px"}}/>
    );

    const options = {
      overrides: {
        img: { component: Image }
      }
    };

    useEffect(() => {
      fetch(file)
        .then(res => res.text())
        .then(md => { setContent(md) })
        // catch - error is link
        .catch((e) => {
          // If the network drops or if the front-end static server isn't
          // avaialble (like in the end to end tests), put something instead of
          // having an unhandled rejection.
          setContent("Could not fetch help")
        })
        
    }, [file])

    return(
      <>
        <Button aria-label="Help" onClick={() => setOpen(!open)}><FontAwesomeIcon icon={faQuestion} /></Button>
        <PopupDialog open={open} close={close}>
            <Markdown options={options} children={content}/>
        </PopupDialog>
      </>     
    )
}


HelpButton.propTypes = {
  file: PropTypes.string.isRequired,
}

HelpButton.defaultProps = {

}

export default HelpButton;
