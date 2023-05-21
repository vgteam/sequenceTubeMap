import React from "react";
import PropTypes from "prop-types";
import Select from "react-select";

/**
 * A track type dropdown component.
 * Created using composition of functions approach.
 * 
 * Expects a two-way-binding where "value" is the selected value (out of the
 * possible track types), and calling "onChange" updates the value.
 * 
 */

export function TrackTypeDropdown (props) {
  
    
    // dropdown and selections
    // upon selection of a dropdown option, call onChange function 
    let dropdown = (
      <div data-testid={props.testID}>
        <Select {...props} onChange={o => {
          props.onChange(o.value)}
        }
          options={["graph", "haplotype", "read"].map(o => ({
            label: o, value: o
          }))}
          value={{label: props.value, value: props.value}}
        />
      </div>
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
  testID: PropTypes.string
};

TrackTypeDropdown.defaultProps = {
  id: undefined,
  className: undefined,
  value: "graph",
  testID: "file-type-select-component"
};

export default TrackTypeDropdown;

