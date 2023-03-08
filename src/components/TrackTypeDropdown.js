import React from "react";
import PropTypes from "prop-types";
/**
 * A searchable track type dropdown component.
 * Created using composition of functions approach.
 * 
 * Expects a two-way-binding where "value" is the selected value (out of the
 * possible track types), and calling "onChange" updates the value.
 * 
 */

export function TrackTypeDropdown (props) {
    // Tweaks to the default react-select styles so that it'll look good with tube maps.

    // eventToString: given a change event on a dropdown with various options, return the 
      //string value for the user's selection 
    const eventToString = (changeEvent) => {
      return changeEvent.target.value;
    }

    // composition function
    const compose = (f, g) => x => f(g(x));

    // input string function, and output function to take in an event 
    // props.onChange will be the outer function accepting result of eventToString, 
    //  to result in a function that accepts a selection event
    const stringFnToEventFn = (StringFn) => {
      return compose(StringFn, eventToString);
    }
  
    // copies props into rest 
    let {...rest} = props;
    
    // dropdown and selections
    // upon selection of a dropdown option, call onChange function 
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

