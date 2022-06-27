import React, {useState} from "react";
import PropTypes from "prop-types";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import FormHelperText from "@mui/material/FormHelperText";

export const ComboBox = ({ pathNames, regions, getRegionCoords }) => {
  const [value, setValue] = useState("");
  // Add : to pathNames
  const pathNamesColon = pathNames.map((name) => name + ":");

  // All path names with all regions
  const fullPathRegions = pathNamesColon.flatMap((pathName) =>
    regions.map((region) => pathName + region)
  );
  // TODO : Add options for actual coords for region descs
  //        Add options for just path names (no region desc after)
  //        Add options for just region desc
  //        Figure out region correspondence with path
  //            Write function getRegionByDesc -> object { chr, start, end, }
  //              possibly back to server or just glue it together here
  //            or could call regRegionCoords and parse the path
  //
  //        make a display name and name for each object - touch server?
  return (
    <>
      <Autocomplete
        disablePortal
        value={value}
        // Process
        onChange={(e, value) => setValue(value)}
        id="combo-box"
        options={fullPathRegions}
        renderInput={(params) => (
          <TextField {...params} label="Region and path" />
        )}
      />
      <FormHelperText id="combo-box-helper-text">
        {`
        Input a data segment to select with format <path>:<region>.  See ? for more information.
          `}
      </FormHelperText>
    </>
  );
};
ComboBox.propTypes = {
  // pathNames: The selectable options for pathNames
  pathNames: PropTypes.array,
  regions: PropTypes.array,
  getRegionCoords: PropTypes.func.isRequired,
};
