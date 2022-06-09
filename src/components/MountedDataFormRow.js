import React, { Component } from "react";
import PropTypes from "prop-types";
import { Label } from "reactstrap";
import SelectionDropdown from "./SelectionDropdown";

class MountedDataFormRow extends Component {
  render() {
    return (
      <React.Fragment>
        <Label className="customData tight-label mb-2 mr-sm-2 mb-sm-0 ml-2">
          xg file:
        </Label>
        <SelectionDropdown
          className="customDataMounted dropdown mb-2 mr-sm-4 mb-sm-0"
          id="xgSelect"
          value={this.props.xgSelect}
          onChange={this.props.handleInputChange}
          options={this.props.xgSelectOptions}
        />

        <Label
          for="gbwtFileSelect"
          className="customData tight-label mb-2 mr-sm-2 mb-sm-0 ml-2"
        >
          gbwt file:
        </Label>
        <SelectionDropdown
          className="customDataMounted dropdown mb-2 mr-sm-4 mb-sm-0"
          id="gbwtSelect"
          value={this.props.gbwtSelect}
          onChange={this.props.handleInputChange}
          options={this.props.gbwtSelectOptions}
        />

        <Label
          for="gamFileSelect"
          className="customData tight-label mb-2 mr-sm-2 mb-sm-0 ml-2"
        >
          gam index:
        </Label>
        <SelectionDropdown
          className="customDataMounted dropdown mb-2 mr-sm-4 mb-sm-0"
          id="gamSelect"
          value={this.props.gamSelect}
          onChange={this.props.handleInputChange}
          options={this.props.gamSelectOptions}
        />

        <Label
          for="bedFileSelect"
          className="customData tight-label mb-2 mr-sm-2 mb-sm-0 ml-2"
        >
          BED file:
        </Label>
        <SelectionDropdown
          className="customDataMounted dropdown mb-2 mr-sm-4 mb-sm-0"
          id="bedSelect"
          value={this.props.bedSelect}
          onChange={this.props.handleInputChange}
          options={this.props.bedSelectOptions}
        />
      </React.Fragment>
    );
  }
}

MountedDataFormRow.propTypes = {
  gamSelect: PropTypes.string.isRequired,
  gamSelectOptions: PropTypes.array.isRequired,
  bedSelect: PropTypes.string.isRequired,
  bedSelectOptions: PropTypes.array.isRequired,
  gbwtSelect: PropTypes.string.isRequired,
  gbwtSelectOptions: PropTypes.array.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  pathSelect: PropTypes.string.isRequired,
  pathSelectOptions: PropTypes.array.isRequired,
  xgSelect: PropTypes.string.isRequired,
  xgSelectOptions: PropTypes.array.isRequired,
};

export default MountedDataFormRow;
