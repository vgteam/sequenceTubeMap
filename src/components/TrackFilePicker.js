import React, {useState} from "react";
import PropTypes from "prop-types";
import Select from "react-select";



//handleInputChange takes in a string trackType
export const TrackFilePicker = ({fileOptions, fileSelect, handleInputChange}) => {
    //const fileOptions = props.fileOptions;
    //const fileSelect = props.fileSelect;

    const [currFile, setFile] = useState(fileSelect);

  
    /*
    function handleInputChange(option) {
      console.log(option);
      setFile({
        currFile: option.value
      });
    }
    */

    const dropDownOptions = fileOptions.map((option) => ({
      label: option,
      value: option,
    }));


    return(
        <Select value={currFile} options={dropDownOptions} onChange={setFile}/>  
    );
}

TrackFilePicker.propTypes = {
    fileOptions: PropTypes.array.isRequired,
    fileSelect: PropTypes.string.isRequired,
    handleInputChange: PropTypes.func
}
  
export default TrackFilePicker;

