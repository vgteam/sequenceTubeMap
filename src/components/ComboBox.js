import React, { useState } from "react";
import PropTypes from "prop-types";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import FormHelperText from "@mui/material/FormHelperText";

export const ComboBox = ({ regionInfo, pathNames, getRegionCoords }) => {
  const [value, setValue] = useState("");
  // Add : to pathNames
  const pathNamesColon = pathNames.map((name) => name + ":");
  const pathsWithRegion = [];

  const isEmpty = (obj) => Object.keys(obj).length === 0;

  if (regionInfo && !isEmpty(regionInfo)) {
    console.log(regionInfo, regionInfo["chr"]);
    // Stitch path name + region start and end
    for (const [index, path] of regionInfo["chr"].entries()) {
      pathsWithRegion.push(
        path + ":" + regionInfo.start[index] + "-" + regionInfo.end[index]
      );
    }
    // Add descriptions
    pathsWithRegion.push(...regionInfo["desc"]);
  }

  const displayRegions = [...pathsWithRegion, ...pathNamesColon];

  const handleSelected = (selected) => {
    let coords = selected;
    if (regionInfo["desc"].includes(selected)) {
      // Just a description was selected, get coords
      coords = getRegionCoords(selected);
    }
    setValue(coords);
  };

  return (
    <>
      <Autocomplete
        disablePortal
        value={value}
        // Process
        onChange={(e, value) => handleSelected(value)}
        id="combo-box"
        options={displayRegions}
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
  getRegionCoords: PropTypes.func.isRequired,
  // Each BED region has its own index
  regionInfo: PropTypes.shape({
    // Path
    chr: PropTypes.array,
    chunk: PropTypes.array,
    // Description of region from BED
    desc: PropTypes.array,
    end: PropTypes.array,
    start: PropTypes.array,
  }),
};

// TODO : Add options for actual coords for region descs
//        Add options for just path names (no region desc after)
//        Add options for just region desc
//        Figure out region correspondence with path
//            Write function getRegionByDesc -> object { chr, start, end, }
//              possibly back to server or just glue it together here
//            or could call regRegionCoords and parse the path
//
//        make a display name and name for each object - touch server?
