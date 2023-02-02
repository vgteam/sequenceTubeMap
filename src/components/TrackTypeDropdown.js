import React from "react";
import PropTypes from "prop-types";
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
export function TrackTypeDropdown (props) {
  const onChange = (option) => {
    this.props.onChange({
      target: {
      id: this.props.id,
      value: option.value,
    },
  });
};
  
// Tweaks to the default react-select styles so that it'll look good with tube maps.
// let {onChange, ...rest} = props;
let variable = (
  <select {...props}>
    <option value="graph">graph</option>
    <option value="haplotype">haplotype</option>
    <option value="read">read</option>
  </select>
  );
  return (
    variable
  );
}

TrackTypeDropdown.propTypes = {
  id: PropTypes.string,
  className: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

TrackTypeDropdown.defaultProps = {
  id: undefined,
  className: undefined,
  value: undefined,
};

export default TrackTypeDropdown;
