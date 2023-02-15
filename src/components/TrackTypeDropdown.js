import React from "react";
import PropTypes from "prop-types";
/**
 * A searchable track type dropdown component.
 * Expects a two-way-binding where "value" is the selected value (out of the
 * possible track types), and calling "onChange" with an string
 * updates the value.
 * 
 * So for example:
 * <TrackTypeDropdown id="box1" value="read" onChange={(newValue) => {
 *   // Here newValue is "read"
 * }}>
 */
export function TrackTypeDropdown (props) {
    // Tweaks to the default react-select styles so that it'll look good with tube maps.

    // Given a change event on a dropdown with various options, return the 
      //string value for the user's selection 
    
    const eventToString = (changeEvent) => {
      return changeEvent.target.value;
    }

    // eventToString function to stringFnToEventFn function
    const stringFnToEventFn = (eventToString) => {
      
    }



    /*
    const onChange = (props) => {
      props({
        target: {
          id: props.id,
          value: props.value,
        },
      });
    };
    */

    let {...rest} = props;
    
    let variable = (
      <select {...rest} onChange={(props.onChange)}>
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