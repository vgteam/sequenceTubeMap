import React, {useState} from "react";
import PropTypes from "prop-types";
import Select from "react-select";



//handleInputChange takes in a string trackType
export const TrackFilePicker = ({
  tracks, // array of available tracks
  fileType, // e.g read, gam, graph
  handleInputChange,
  pickerType, // either "dropdown or upload" to determine which component we render
  className 
}) => {


    function onChange(option) {
      // update parent state
      handleInputChange(option.value);
    }


    const fileOptions = []
    // find all file options matching the specified file type
    for (const track of tracks) {
        for (const file of track["files"]) {
          if (file["type"] === fileType) {
            fileOptions.push(file);
          }
        }
    }

    // takes in an array of options and maps them into a format <Select> takes
    const dropDownOptions = fileOptions.map((option) => ({
      label: option["name"],
      value: option,
    }));
    

    if (pickerType === "dropdown"){
      return(
      // wrap Select container in div to easily query in tests
        <div data-testid="file-select-component">
            <Select 
              options={dropDownOptions} 
              onChange={onChange}
              placeholder="Select a file"
              autoComplete="on"
              className={className}
            />  
          </div>
      );
    } else if (pickerType === "upload") {
      // TODO: render <input> component and create upload onChange function 
      return (
        <div data-testid="file-select-component">
          <input/>  
        </div>

      );
    } else {
      throw new Error("Invalid picker type");
    }
}

TrackFilePicker.propTypes = {
    tracks: PropTypes.array.isRequired,
    fileType: PropTypes.string.isRequired,
    handleInputChange: PropTypes.func.isRequired,
    pickerType: PropTypes.string,
    className: PropTypes.string,
}
  
TrackFilePicker.defaultProps = {
  pickerType: "dropdown",
  className: undefined
}

export default TrackFilePicker;

