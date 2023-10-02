import PropTypes from "prop-types";
import Select from "react-select";
import React from "react";
import config from "./../config.json";
import { Input } from "reactstrap";



/*
 * A selection dropdown component that select files.
 * Expects a file type object in the form of {"name": string, "type": string}
 * 
 * The handleInputChange function expects to be passed an option type object in the form of
 * {"label": string, "value": file}
 *  
 * See demo and test file for examples of this component.
 */

//handleInputChange takes in a string trackType
export const TrackFilePicker = ({
  tracks, // array of available tracks
  fileType, // e.g read, gam, graph
  value, // input file
  handleInputChange,
  pickerType, // either "dropdown or upload" to determine which component we render
  className,
  testID,
  showFileSizeAlert,
  setUploadInProgress,
  getPathNames,
  apiUrl,
}) => {

    let uploadFileInput = React.createRef();
    let acceptedExtensions = config.fileTypeToExtensions[fileType];

    function uploadOnChange() {
      const file = uploadFileInput.current.files[0];

      if (file.size > config.MAXUPLOADSIZE) {
        showFileSizeAlert();
        return;
      }

      setUploadInProgress(true);

      const formData = new FormData();
      formData.append("trackFile", file);
      // Make sure server can identify a Read file
      formData.append("fileType", fileType); 
      const xhr = new XMLHttpRequest();
      xhr.responseType = "json";
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
          // Every thing ok, file uploaded
          setUploadInProgress(false);
          handleInputChange(xhr.response.path);
          if (fileType === "graph"){
            getPathNames(xhr.response.path);
          }
        }
      };

      xhr.open("POST", `${apiUrl}/trackFileSubmission`, true);
      xhr.send(formData);
    }


    function mountedOnChange(option) {
      // update parent state
      value = option.value;
      handleInputChange(option.value);
    }

    function getFilename(fullPath) {
      const segments = fullPath.split("/");
      return segments[segments.length - 1];
    }

    const fileOptions = []
    // find all file options matching the specified file type
    for (const track of tracks) {
        if (track.trackType === fileType) {
          fileOptions.push(track.trackFile)
        }
    }

    // takes in an array of options and maps them into a format <Select> takes
    const dropDownOptions = fileOptions.map((option) => ({
      label: getFilename(option),
      value: option,
    }));
    

    if (pickerType === "mounted"){
      return(
      // wrap Select container in div to easily query in tests
        <div data-testid={testID}>
            <Select 
              options={dropDownOptions}
              value={{label: getFilename(value), value: value}}
              // Identical-looking object literals will compare unequal, so we
              // need to provide a way to turn them into strings so that
              // `value` can be matched up with the corresponding item in
              // `options`.
              getOptionValue={(o) => {
                return o["value"];
              }}
              onChange={mountedOnChange}
              autoComplete="on"
              className={className}
            />  
          </div>
      );
    } else if (pickerType === "upload") {
      return (
        <div data-testid={testID}>
          <Input
          type="file"
          className="customDataUpload form-control-file"
          accept={acceptedExtensions}
          innerRef={uploadFileInput}
          onChange={uploadOnChange}
        />
        </div>

      );
    } else {
      throw new Error("Invalid picker type");
    }
}

TrackFilePicker.propTypes = {
    tracks: PropTypes.array.isRequired,
    fileType: PropTypes.string,
    value: PropTypes.string,
    handleInputChange: PropTypes.func.isRequired,
    pickerType: PropTypes.string,
    className: PropTypes.string,
    testID: PropTypes.string,
    showFileSizeAlert: PropTypes.func.isRequired,
    setUploadInProgress: PropTypes.func.isRequired,
    getPathNames: PropTypes.func.isRequired,
    apiUrl: PropTypes.string.isRequired,
}
  
TrackFilePicker.defaultProps = {
  value: "Select a file",
  fileType: "graph",
  pickerType: "mounted",
  className: undefined,
  testID: "file-select-component"
}

export default TrackFilePicker;

