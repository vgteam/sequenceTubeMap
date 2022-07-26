import React from "react";
import PropTypes from "prop-types";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import FormHelperText from "@mui/material/FormHelperText";

// RegionInput: The path and region input box component
// Responsible for selecting the path/chr and segment of data to look at
const isEmpty = (obj) => Object.keys(obj).length === 0;
export const RegionInput = ({
  region,
  regionInfo,
  handleRegionChange,
  pathNames,
}) => {
  // Generate autocomplete options for regions from regionInfo
  // Add : to pathNames
  const pathNamesColon = pathNames.map((name) => name + ":");
  const pathsWithRegion = [];

  if (regionInfo && !isEmpty(regionInfo)) {
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

  return (
    <>
      <Autocomplete
        disablePortal
        freeSolo
        value={region}
        data-testid="autocomplete"
        onChange={(e, value) => handleRegionChange(value)}
        id="regionInput"
        options={displayRegions}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Region"
            name="Region Input"
            inputProps={{
              ...params.inputProps,
              onKeyDown: (e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                }
              },
            }}
          />
        )}
      />
      <FormHelperText id="comboBoxHelperText">
        {`
        Input a data segment to select with format <path>:<regionRange> and hit 'Go'.  See ? for more information.
          `}
      </FormHelperText>
    </>
  );
};
RegionInput.propTypes = {
  // pathNames: The selectable options for pathNames
  pathNames: PropTypes.array,
  region: PropTypes.string,
  handleRegionChange: PropTypes.func.isRequired,
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
