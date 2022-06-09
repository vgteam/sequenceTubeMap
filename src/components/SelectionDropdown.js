import React, { Component } from "react";
import PropTypes from "prop-types";
import Select from "react-select";

/**
 * A searchable selection dropdown component.
 */
class SelectionDropdown extends Component {
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
      }),
    };

    const dropdownOptions = this.props.options.map((option) => ({
      label: option,
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
      <Select
        id={this.props.id}
        className={this.props.className}
        value={
          dropdownOptions.find((option) => option.value === this.props.value) ||
          {}
        }
        styles={styles}
        isSearchable={true}
        onChange={onChange}
        options={dropdownOptions}
        openMenuOnClick={dropdownOptions.length < 2000}
      />
    );
  }
}

SelectionDropdown.propTypes = {
  id: PropTypes.string,
  className: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.array.isRequired,
};

SelectionDropdown.defaultProps = {
  id: undefined,
  className: undefined,
  value: undefined,
};

export default SelectionDropdown;
