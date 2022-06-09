import React, { Component } from "react";
import PropTypes from "prop-types";
import { Label } from "reactstrap";
import SelectionDropdown from "./SelectionDropdown";

class PathNamesFormRow extends Component {
  render() {
    return (
      <React.Fragment>
        <Label
          for="pathName"
          className="customData tight-label mb-2 mr-sm-2 mb-sm-0 ml-2"
        >
          Path name:
        </Label>
        <SelectionDropdown
          className="customData dropdown mb-2 mr-sm-4 mb-sm-0"
          id="pathSelect"
          value={this.props.pathSelect}
          onChange={this.props.handleInputChange}
          options={this.props.pathSelectOptions}
        />
      </React.Fragment>
    );
  }
}

PathNamesFormRow.propTypes = {
  pathSelect: PropTypes.string.isRequired,
  pathSelectOptions: PropTypes.array.isRequired,
  handleInputChange: PropTypes.func.isRequired,
};

export default PathNamesFormRow;
