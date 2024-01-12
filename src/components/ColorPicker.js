import PropTypes from "prop-types";
import React, { useState } from "react";
import { SketchPicker } from "react-color";
import { Button } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPalette } from "@fortawesome/free-solid-svg-icons";
import { Container } from "reactstrap";

// A react-color picker embedded within a button
export const ColorPicker = ({
  color, // hex color or named color pallete currently selected.
  presetColors, // array of hex colors e.g ["#f44336", "#e91e63", "#9c27b0", "#673ab7"]
  onChange, // on change function expecting hex color as an argument
  testID,
}) => {
  const [nextColor, setNextColor] = useState(undefined);
  const [open, setOpen] = useState(false);

  const popover = {
    position: "absolute",
    zIndex: "2",
  };

  const cover = {
    position: "fixed",
    top: "0px",
    right: "0px",
    bottom: "0px",
    left: "0px",
  };

  function togglePicker() {
    if (open) {
      setOpen(false);
      if (nextColor) {
        // Apply the color
        onChange(nextColor);
      }
    } else {
      setOpen(true);
      if (color && color.startsWith("#")) {
        // If we had a color picked, use it to start
        setNextColor(color);
      } else {
        // We don't have a color to start with. We don't want to apply
        // a random color when we close.
        setNextColor(undefined);
      }
    }
  }

  return (
    <div>
      <Button
        aria-label="ColorPicker"
        onClick={togglePicker}
        data-testid={testID}
      >
        <FontAwesomeIcon icon={faPalette} />
      </Button>

      {open ? (
        <div style={popover}>
          <div style={cover} onClick={togglePicker} />
          <Container>
            <SketchPicker
              color={nextColor || "#fff"}
              presetColors={presetColors}
              onChange={(newColor) => {
                setNextColor(newColor["hex"]);
              }}
            />
          </Container>
        </div>
      ) : null}
    </div>
  );
};

ColorPicker.propTypes = {
  color: PropTypes.string,
  presetColors: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  testID: PropTypes.string,
};

ColorPicker.defaultProps = {
  testID: "color-picker-component",
};

export default ColorPicker;
