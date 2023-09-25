import React, { Component } from "react";
import PropTypes from "prop-types";
//import Select from "react-select";
import CreatableSelect from 'react-select/creatable';

/**
 * A searchable selection dropdown component.
 * Expects a two-way-binding where "value" is the selected value (out of the
 * array in "options"), and calling "onChange" with an event-like object
 * updates the value.
 * 
 * The onChange argument is meant to look enough like a DOM change event on a
 * "real" <select> to fool most people. It is an object with a "target"
 * property, which then has an "id" property with this component's "id" prop,
 * and a "value" property with the new value.
 * 
 * So for example:
 * <SelectionDropdown id="box1" value="a" options={["a", "b"]} onChange={(e) => {
 *   // Here e is {"target": {"id": "box1", "value": "b"}}
 * }}>
 */
export class BedFileDropdown extends Component {
  render() {
    // Tweaks to the default react-select styles so that it'll look good with tube maps.
    const styles = {
      control: (base) => ({
        ...base,
        minHeight: "unset",
        height: "calc(2.25rem - 2px)",
      }),
      valueContainer: (base) => ({
        ...base,
        // Roughly calculate the width that can fit the largest text. This can't be updated dynamically.
        width:
          Math.max(...this.props.options.map((option) => option.length)) * 8 +
          16,
        minWidth: "48px",
        position: "unset",
      }),
      indicatorsContainer: (base) => ({
        ...base,
        height: "inherit",
      }),
      menu: (base) => ({
        ...base,
        width: "max-content",
        minWidth: "100%",
        zIndex: 999,
      }),
    };

    function getFilename(fullPath) {
      const segments = fullPath.split("/");
      return segments[segments.length - 1];
    }

    const dropdownOptions = this.props.options.map((option) => ({
      label: getFilename(option),
      value: option,
    }));

    const onChange = (option) => {
      this.props.onChange({
        target: {
          id: this.props.id,
          value: option.value,
        },
      });
    };

    return (
      <CreatableSelect
        getNewOptionData={(inputValue, optionLabel) => ({
          label: optionLabel,
          value: inputValue,
        })}
        id={this.props.id}
        inputId={this.props.inputId}
        className={this.props.className}
        value={
          dropdownOptions.find((option) => option.value === this.props.value) || {label: getFilename(this.props.value) , value: this.props.value}
        }
        styles={styles}
        isSearchable={true}
        onChange={onChange}
        options={dropdownOptions}
        getOptionValue={(o) => {
          return o["value"];
        }}
        openMenuOnClick={dropdownOptions.length < 2000}
      />
    );
  }
}

BedFileDropdown.propTypes = {
  id: PropTypes.string,
  inputId: PropTypes.string,
  className: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.array.isRequired,
};

BedFileDropdown.defaultProps = {
  id: undefined,
  inputId: undefined,
  className: undefined,
  value: undefined,
};

export default BedFileDropdown;
