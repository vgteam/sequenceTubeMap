import PropTypes from "prop-types";
import React, {useState} from 'react';
import { PhotoshopPicker, GithubPicker } from 'react-color';
import { Button } from 'reactstrap'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPalette } from '@fortawesome/free-solid-svg-icons';
import Popup from 'reactjs-popup';
import { Row, Container } from 'reactstrap';

// A react-color picker embedded within a button
export const ColorPicker = ({
    presetColors, // array of hex colors e.g ["#f44336", "#e91e63", "#9c27b0", "#673ab7"]
    onChange, // on change function expecting hex color as an argument
    testID,
}) => {
    const [color, setColor] = useState("#fff");
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);


    return (
        <div>
            <Button aria-label="ColorPicker" onClick={() => setOpen(!open)} data-testid={testID}><FontAwesomeIcon icon={faPalette} /></Button>

            <Popup open={open} closeOnDocumentClick={false} modal>
                <Container>
                    <Row>
                        <PhotoshopPicker 
                            color={color}
                            onChange={(newColor) => {
                                setColor(newColor)
                            }}
                            onAccept={() => {
                                onChange(color);
                                close();
                            }}
                            onCancel={close}
                        />
                    </Row>
                    <Row>
                        <GithubPicker
                            width={"100%"}
                            color={color}
                            colors={presetColors}
                            triangle="hide"
                            onChange={(newColor) => {
                                setColor(newColor);
                            }}
                        />
                    </Row>
                </Container>
            </Popup>
        </div>
    );
};

ColorPicker.propTypes = {
    presetColors: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
    testID: PropTypes.string
}

export default ColorPicker;