import React, { Component } from "react";
import PropTypes from "prop-types";
import Select from "react-select";
import SelectionDropdown from "./SelectionDropdown";

/**
 * A searchable track type dropdown component.
 * Expects a two-way-binding where "value" is the selected value (out of the
 * possible track types), and calling "onChange" with an string
 * updates the value.
 * 
 * 
 * 
 * So for example:
 * <TrackTypeDropdown id="box1" value="read" onChange={(newValue) => {
 *   // Here newValue is "read"
 * }}>
 */
 const onChange = (option) => {
  this.props.onChange({
    target: {
      id: this.props.id,
      value: option.value,
    },
  });
};

export function TrackTypeDropdown (props) {
    // Tweaks to the default react-select styles so that it'll look good with tube maps.
    let {onChange, ...rest} = props;
    return (
      <SelectionDropdown {...rest} options={['graph', 'haplotype', 'read']} onChange={(onChange)} />
    );
}

TrackTypeDropdown.propTypes = {
  id: PropTypes.string,
  inputId: PropTypes.string,
  className: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

TrackTypeDropdown.defaultProps = {
  id: undefined,
  inputId: undefined,
  className: undefined,
  value: undefined,
};

export default TrackTypeDropdown;
