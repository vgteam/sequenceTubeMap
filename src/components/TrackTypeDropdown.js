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

// todo: create an onChange function that takes in an event and turns it to a string

export function TrackTypeDropdown (props) {
    // Tweaks to the default react-select styles so that it'll look good with tube maps.

    // Given a change event on a dropdown with various options, return the 
      //string value for the user's selection 
    
    
    const eventToString = (changeEvent) => {
      return changeEvent.target.value;
    }

    const compose = (f, g) => x => f(g(x));

    // input event handler that takes in a string (Track type)
    // output event handler to take in an event
    // this function should change event handler's input type
    // eventToString function to stringFnToEventFn function
    const stringFnToEventFn = (StringFn) => {
      //props.onChange(StringFn);
      return compose(StringFn, eventToString);
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

    // copies props into rest 
    let {...rest} = props;
    
    
    let dropdown = (
      <select {...rest} onChange={stringFnToEventFn(props.onChange)}>
        <option value="graph">graph</option>
        <option value="haplotype">haplotype</option>
        <option value="read">read</option>
      </select>
    );
    
    return (
      dropdown
    );
}

/* React checks for the type of each prop passed in to ensure that the correct type is being 
inputted to the component. For example, if 'id' is supposed to be a string, a number must not 
be passed in - that would cause errors. However, if the prop has 'isRequired' specified, 
it must be passed to the component. */

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

