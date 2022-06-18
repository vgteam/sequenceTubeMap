import * as React from "react";
import PropTypes from "prop-types";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";

export const ComboBox = ({ pathNames }) => {
  const pathNamesColon = pathNames.map((name) => name + ":");
  return (
    <Autocomplete
      disablePortal
      id="combo-box"
      options={pathNamesColon}
      renderInput={(params) => <TextField {...params} label="Path:Region" />}
    />
  );
};
ComboBox.propTypes = {
  // pathNames: The selectable options for pathNames
  pathNames: PropTypes.array,
};
