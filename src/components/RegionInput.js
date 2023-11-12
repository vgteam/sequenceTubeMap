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
  console.log("rendering with pathnames: ", pathNames);
  const pathNamesColon = pathNames.map((name) => name + ":");
  const pathsWithRegion = [];

  // Store possible options from bed file and match them with their respective tracks
  let optionToTrack = {};
  let optionToChunk = {};

  if (regionInfo && !isEmpty(regionInfo)) {
    // Stitch path name + region start and end
    for (const [index, path] of regionInfo["chr"].entries()) {
      pathsWithRegion.push(
        path + ":" + regionInfo.start[index] + "-" + regionInfo.end[index]
      );
    }

    // populate optionToTrack and optionToChunk with paths with region
    pathsWithRegion.forEach((path, i) => optionToTrack[path] = regionInfo.tracks[i]);
    pathsWithRegion.forEach((path, i) => optionToChunk[path] = regionInfo.chunk[i]);


    // Add descriptions
    pathsWithRegion.push(...regionInfo["desc"]);

    // populate optionToTrack and optionToChunk with paths with description as keys
    regionInfo.desc.forEach((desc, i) => optionToTrack[desc] = regionInfo.tracks[i]);
    regionInfo.desc.forEach((desc, i) => optionToChunk[desc] = regionInfo.chunk[i]);
  }

  // Autocomplete selectable options
  const displayRegions = [...pathsWithRegion, ...pathNamesColon];

  return (
    <>
      <Autocomplete
        disablePortal
        freeSolo // Allows custom input outside of the options
        getOptionLabel={(option) => option.title || option.toString()}
        value={region}
        inputValue={region}
        data-testid="autocomplete"
        id="regionInput"    

        onInputChange={(event, newInputValue) => {
          // If an option is selected, should have a match in optionToTrack and optionToChunk
          if (event.target.textContent in optionToTrack && event.target.textContent in optionToChunk) {
            // pass tracks and chunk associated with the option
            // handleRegionChange will determine if and how tracks are going to be updated
            handleRegionChange(newInputValue, optionToTrack[event.target.textContent], optionToChunk[event.target.textContent]);
          } else {
            // only pass a region value, tracks will not be updated
            handleRegionChange(newInputValue, null, null);
          }
        }}

        options={displayRegions}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Region"
            name="Region Input"
            inputProps={{
              ...params.inputProps,
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
    chunk_path: PropTypes.array,
    // Description of region from BED
    desc: PropTypes.array,
    end: PropTypes.array,
    start: PropTypes.array,
  }),
};

export default RegionInput;
