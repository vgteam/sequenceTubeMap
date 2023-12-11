import React from "react";
import PropTypes from "prop-types";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import FormHelperText from "@mui/material/FormHelperText";
import Tooltip from "@mui/material/Tooltip";
import "../config-client.js";
import "../config-global.mjs";
import { isEmpty } from "../common.mjs";

// RegionInput: The path and region input box component
// Responsible for selecting the path/chr and segment of data to look at

export const RegionInput = ({
  region,
  regionInfo,
  handleRegionChange,
  pathNames,
}) => {
  // Generate autocomplete options for regions from regionInfo
  // Add : to pathNames
  console.log("rendering with pathnames: ", pathNames);
  const pathNamesColon = pathNames.map((name) => {
    return {label: name + ":", value: name + ":"};
  });
  const pathsWithRegion = [];

  const regionToDesc = new Map();

  if (regionInfo && !isEmpty(regionInfo)) {
    // Stitch path name + region start and end
    for (const [index, path] of regionInfo["chr"].entries()) {
      const pathWithRegion = path + ":" + regionInfo.start[index] + "-" + regionInfo.end[index];
      pathsWithRegion.push({
        label: pathWithRegion + " " + regionInfo.desc[index],
        value: pathWithRegion
      });
      regionToDesc.set(pathWithRegion, regionInfo.desc[index]);
    }
  }

  // Autocomplete selectable options
  const displayRegions = [...pathsWithRegion, ...pathNamesColon];

  let descLabel = "Region";
  if (regionToDesc.get(region)) {
    descLabel = regionToDesc.get(region);
  }

  return (
    <>
      <Tooltip title={descLabel} placement="top-start">
        <Autocomplete
          disablePortal
          freeSolo // Allows custom input outside of the options
          getOptionLabel={(option) => option.label || option.toString()}
          value={region}
          inputValue={region}
          data-testid="autocomplete"
          id="regionInput" 

          onInputChange={(event, newInput) => {
            let regionValue = newInput;
            const regionObject = displayRegions.find((option) => option.label === newInput);
            // If input is selected from one of the options
            if (regionObject) {
              regionValue = regionObject.value
            }
            handleRegionChange(regionValue, regionToDesc.get(regionValue));
          }}

          options={displayRegions}
          renderInput={(params) => (
            <TextField
              {...params}
              label={"Region"}
              name="Region Input"
              inputProps={{
                ...params.inputProps,
              }}
            />
          )}
        />
      </Tooltip>
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
    chunk_path: PropTypes.array,
    // Description of region from BED
    desc: PropTypes.array,
    end: PropTypes.array,
    start: PropTypes.array,
  }),
};

export default RegionInput;