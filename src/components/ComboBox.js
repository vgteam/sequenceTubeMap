import * as React from "react";
import PropTypes from "prop-types";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";

export const ComboBox = ({ pathNames, regions }) => {
  const pathNamesColon = pathNames.map((name) => name + ":");
  const fullPathRegions = pathNamesColon.flatMap((pathName) => 
    regions.map((region) => pathName + region)
  )
  console.log(pathRegions)
  return (
    <Autocomplete
      disablePortal
      id="combo-box"
      options={pathRegions}
      renderInput={(params) => <TextField {...params} label="Path:Region" />}
    />
  );
};
ComboBox.propTypes = {
  // pathNames: The selectable options for pathNames
  pathNames: PropTypes.array,
  regions: PropTypes.array,
};
