import React, {useState} from "react";
import PropTypes from "prop-types";
import Select from "react-select";



//handleInputChange takes in a string trackType
export const TrackFilePicker = ({
  fileOptions, // array of string representing files names
  fileSelect, 
  handleInputChange,
  pickerType, // either "dropdown or upload" to determine which component we render
  className 
}) => {

    const [currFile, setFile] = useState(fileSelect);


    function onChange(option) {
      // update state
      setFile(option.value);
      // handle input change from parent
      handleInputChange(option.value);
    }

    // takes in an array of options and maps them into a format <Select> takes
    const dropDownOptions = fileOptions.map((option) => ({
      label: option,
      value: option,
    }));

    if (pickerType === "dropdown"){
      return(
      // wrap Select container in div to easily query in tests
        <div data-testid="file-select-component">
            <Select 
              value={dropDownOptions.filter(function(option) {
                return option.value === currFile;})
              } 
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
      console.log("use dropdown or upload as pickerType");
      return <h1>Something went wrong.</h1>;
    }
}

TrackFilePicker.propTypes = {
    fileOptions: PropTypes.array.isRequired,
    fileSelect: PropTypes.string.isRequired,
    handleInputChange: PropTypes.func.isRequired,
    pickerType: PropTypes.string,
    className: PropTypes.string,
}
  
TrackFilePicker.defaultProps = {
  pickerType: "dropdown",
  classname: undefined
}

export default TrackFilePicker;

