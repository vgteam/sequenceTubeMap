import React, { Component } from "react";
import PropTypes from "prop-types";
import { Label } from "reactstrap";
import SelectionDropdown from "./SelectionDropdown";

class MountedDataFormRow extends Component {
  render() {
    // We use React-Select's Select, but it can't be labeled by a label pointed at its ID, because it renders as a div with that ID and divs are non-labellable according to https://html.spec.whatwg.org/multipage/forms.html#category-label.
    return (
      <React.Fragment>
        <Label
          for="xgSelectInput"
          className="customData tight-label mb-2 mr-sm-2 mb-sm-0 ml-2"
        >
          xg file:
        </Label>
        <SelectionDropdown
          className="customDataMounted dropdown mb-2 mr-sm-4 mb-sm-0"
          id="xgSelect"
          inputId="xgSelectInput"
          value={this.props.xgSelect}
          onChange={this.props.handleInputChange}
          options={this.props.xgSelectOptions}
        />

        <Label
          for="gbwtSelectInput"
          className="customData tight-label mb-2 mr-sm-2 mb-sm-0 ml-2"
        >
          gbwt file:
        </Label>
        <SelectionDropdown
          className="customDataMounted dropdown mb-2 mr-sm-4 mb-sm-0"
          id="gbwtSelect"
          inputId="gbwtSelectInput"
          value={this.props.gbwtSelect}
          onChange={this.props.handleInputChange}
          options={this.props.gbwtSelectOptions}
        />

        <Label
          for="gamSelectInput"
          className="customData tight-label mb-2 mr-sm-2 mb-sm-0 ml-2"
        >
          gam index:
        </Label>
        <SelectionDropdown
          className="customDataMounted dropdown mb-2 mr-sm-4 mb-sm-0"
          id="gamSelect"
          inputId="gamSelectInput"
          value={this.props.gamSelect}
          onChange={this.props.handleInputChange}
          options={this.props.gamSelectOptions}
        />

        <Label
          for="bedSelectInput"
          className="customData tight-label mb-2 mr-sm-2 mb-sm-0 ml-2"
        >
          BED file:
        </Label>
        <SelectionDropdown
          className="customDataMounted dropdown mb-2 mr-sm-4 mb-sm-0"
          id="bedSelect"
          inputId="bedSelectInput"
          value={this.props.bedSelect}
          onChange={this.props.handleInputChange}
          options={this.props.bedSelectOptions}
        />
        &nbsp;
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
  xgSelect: PropTypes.string.isRequired,
  xgSelectOptions: PropTypes.array.isRequired,
  handleInputChange: PropTypes.func.isRequired,
};

export default MountedDataFormRow;
