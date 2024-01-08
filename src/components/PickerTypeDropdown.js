import PropTypes from "prop-types";
import Select from "react-select";
import React from "react";

export const PickerTypeDropdown = ({
  value,
  handleInputChange,
  pickerOptions,
  testID,
}) => {
  function onChange(option) {
    handleInputChange(option.value);
  }

  const dropDownOptions = pickerOptions.map((option) => ({
    label: option,
    value: option,
  }));

  return (
    <div data-testid={testID}>
      <Select
        options={dropDownOptions}
        value={{ label: value, value: value }}
        // Identical-looking object literals will compare unequal, so we
        // need to provide a way to turn them into strings so that
        // `value` can be matched up with the corresponding item in
        // `options`.
        getOptionValue={(o) => {
          return o["value"];
        }}
        onChange={onChange}
        autoComplete="on"
      />
    </div>
  );
};

PickerTypeDropdown.propTypes = {
  handleInputChange: PropTypes.func.isRequired,
  pickerOptions: PropTypes.array.isRequired,
  value: PropTypes.string.isRequired,
  testID: PropTypes.string,
};

PickerTypeDropdown.defaultProps = {
  value: "mounted",
  pickerOptions: ["upload, mounted"],
  testID: "picker-type-component",
};

export default PickerTypeDropdown;
