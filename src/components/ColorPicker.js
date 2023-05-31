import PropTypes from "prop-types";
import React, {useState} from 'react';
import { SketchPicker } from 'react-color';
import { Button } from 'reactstrap'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPalette } from '@fortawesome/free-solid-svg-icons';
import { Container } from 'reactstrap';

// A react-color picker embedded within a button
export const ColorPicker = ({
    presetColors, // array of hex colors e.g ["#f44336", "#e91e63", "#9c27b0", "#673ab7"]
    onChange, // on change function expecting hex color as an argument
    testID,
}) => {
    const [color, setColor] = useState("#fff");
    const [open, setOpen] = useState(false);

    const popover = {
        position: 'absolute',
        zIndex: '2',
    }

    const cover = {
    position: 'fixed',
    top: '0px',
    right: '0px',
    bottom: '0px',
    left: '0px',
    }

    return (
        <div>
            <Button aria-label="ColorPicker" onClick={() => setOpen(!open)} data-testid={testID}><FontAwesomeIcon icon={faPalette} /></Button>

            { open ? 
                <div style={ popover  }>
                    <div style={ cover } onClick={ () => {setOpen(!open); onChange(color["hex"])} }/>
                    <Container>
                        <SketchPicker 
                            color={color}
                            presetColors={presetColors}
                            onChange={(newColor) => {
                                    setColor(newColor);
                            }}

                        />
                    </Container> 
                </div>
              : null
            }
            
        </div>
    );
};

ColorPicker.propTypes = {
    presetColors: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
    testID: PropTypes.string
}

ColorPicker.defaultProps = {
    testID: "color-picker-component"
}

export default ColorPicker;