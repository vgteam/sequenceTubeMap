import React, { Component } from "react";
import PropTypes from "prop-types";
import { Col, Label, Input, FormGroup } from "reactstrap";

// map of all possible colors [displayedName, value]
const colorMap = new Map([
  ["colorful", "plainColors"],
  ["greyscale", "greys"],
  ["Ygreyscale", "ygreys"],
  ["reds", "reds"],
  ["blues", "blues"],
  ["pale colors", "lightColors"],
]);

class RadioRow extends Component {
  onChange = (event) => {

    this.props.setColorSetting(
      this.props.setting,
      colorMap.get(event.target.value)
    );

  };


  render() {
    let currColorMap = new Map(colorMap);
    for (const [keyColor, valueColor] of colorMap) {
      if(!this.props.availableColors.includes(valueColor)){
        currColorMap.delete(keyColor);
      }
    }

    const colorRadios = Array.from(currColorMap).map(([keyColor, valueColor]) => {
      return (
        <Col xs="auto" key={keyColor}>
          <FormGroup check>
            <Label check>
              <Input
                type="radio"
                value={keyColor}
                checked={this.props.color === valueColor}
                onChange={this.onChange}
                key={keyColor}
              />
              {keyColor}
            </Label>
          </FormGroup>
        </Col>
      );
    });
    return (
      <FormGroup row className="mb-1">
        {this.props.rowHeading}:
        {colorRadios}
      </FormGroup>
    );
  }
}

RadioRow.propTypes = {
  color: PropTypes.string.isRequired,
  rowHeading: PropTypes.string.isRequired,
  setColorSetting: PropTypes.func.isRequired,
  setting: PropTypes.string.isRequired,
  availableColors: PropTypes.array
};

RadioRow.defaultProps = {
  availableColors: ["greys", "ygreys", "blues", "reds", "plainColors", "lightColors"]
}

export default RadioRow;
