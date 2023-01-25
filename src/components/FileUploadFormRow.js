import React, { Component } from "react";
import PropTypes from "prop-types";
import { Label, Input } from "reactstrap";

const MAX_UPLOAD_SIZE = 5242880;

class FileUploadFormRow extends Component {
  constructor(props) {
    super(props);
    this.graphFileInput = React.createRef();
    this.gbwtFileInput = React.createRef();
    this.gamFileInput = React.createRef();
    this.gamFile2Input = React.createRef();
  }

  onGraphFileChange = () => {
    const file = this.graphFileInput.current.files[0];
    if (file === undefined) {
      this.props.handleFileUpload("graphFile", "none");
    } else {
      if (file.size > MAX_UPLOAD_SIZE) {
        this.graphFileInput.current.value = "";
        this.props.showFileSizeAlert();
        return;
      }
      this.props.setUploadInProgress(true);
      const formData = new FormData();
      formData.append("graphFile", file);
      const xhr = new XMLHttpRequest();
      xhr.responseType = "json";
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
          // Every thing ok, file uploaded
          this.props.setUploadInProgress(false);
          this.props.handleFileUpload("graphFile", xhr.response.path);
          this.props.getPathNames(xhr.response.path, "upload");
        }
      };
      xhr.open("POST", `${this.props.apiUrl}/graphFileSubmission`, true);
      xhr.send(formData);
    }
  };

  onGbwtFileChange = () => {
    const file = this.gbwtFileInput.current.files[0];
    if (file === undefined) {
      this.props.handleFileUpload("gbwtFile", "none");
    } else {
      if (file.size > MAX_UPLOAD_SIZE) {
        this.gbwtFileInput.current.value = "";
        this.props.showFileSizeAlert();
        return;
      }
      this.props.setUploadInProgress(true);
      const formData = new FormData();
      formData.append("gbwtFile", file);
      const xhr = new XMLHttpRequest();
      xhr.responseType = "json";
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
          // Every thing ok, file uploaded
          this.props.setUploadInProgress(false);
          this.props.handleFileUpload("gbwtFile", xhr.response.path);
        }
      };
      xhr.open("POST", `${this.props.apiUrl}/gbwtFileSubmission`, true);
      xhr.send(formData);
    }
  };

  onGamFileChange = () => {
    const file = this.gamFileInput.current.files[0];
    if (file === undefined) {
      this.props.handleFileUpload("gamFile", "none");
    } else {
      if (file.size > MAX_UPLOAD_SIZE) {
        this.gamFileInput.current.value = "";
        this.props.showFileSizeAlert();
        return;
      }
      this.props.setUploadInProgress(true);
      const formData = new FormData();
      formData.append("gamFile", file);
      const xhr = new XMLHttpRequest();
      xhr.responseType = "json";
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
          // Every thing ok, file uploaded
          this.props.setUploadInProgress(false);
          this.props.handleFileUpload("gamFile", xhr.response.path);
        }
      };
      xhr.open("POST", `${this.props.apiUrl}/gamFileSubmission`, true);
      xhr.send(formData);
    }
  };

  onGamFile2Change = () => {
    const file = this.gamFile2Input.current.files[0];
    if (file === undefined) {
      this.props.handleFileUpload("gamFile2", "none");
    } else {
      if (file.size > MAX_UPLOAD_SIZE) {
        this.gamFile2Input.current.value = "";
        this.props.showFileSizeAlert();
        return;
      }
      this.props.setUploadInProgress(true);
      const formData = new FormData();
      formData.append("gamFile2", file);
      const xhr = new XMLHttpRequest();
      xhr.responseType = "json";
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
          // Every thing ok, file uploaded
          this.props.setUploadInProgress(false);
          this.props.handleFileUpload("gamFile2", xhr.response.path);
        }
      };
      xhr.open("POST", `${this.props.apiUrl}/gamFile2Submission`, true);
      xhr.send(formData);
    }
  };

  render() {
    return (
      <React.Fragment>
        <Label className="customData tight-label mb-2 mr-sm-2 mb-sm-0 ml-2">
          graph file:
        </Label>
        <Input
          type="file"
          className="customDataUpload form-control-file"
          id="graphFileUpload"
          accept=".xg,.vg,.hg,.gbz,.pg"
          innerRef={this.graphFileInput}
          onChange={this.onGraphFileChange}
        />
        <Label
          for="gbwtFileSelect"
          className="customData tight-label mb-2 mr-sm-2 mb-sm-0 ml-2"
        >
          gbwt file:
        </Label>
        <Input
          type="file"
          className="customDataUpload form-control-file"
          id="gbwtFileUpload"
          accept=".gbwt,.gbz"
          innerRef={this.gbwtFileInput}
          onChange={this.onGbwtFileChange}
        />
        <Label
          for="gamFileSelect"
          className="customData tight-label mb-2 mr-sm-2 mb-sm-0 ml-2"
        >
          gam index:
        </Label>
        <Input
          type="file"
          className="customDataUpload form-control-file"
          id="gamFileUpload"
          accept=".gam"
          innerRef={this.gamFileInput}
          onChange={this.onGamFileChange}
        />
        <Label
          for="gamFile2Select"
          className="customData tight-label mb-2 mr-sm-2 mb-sm-0 ml-2"
        >
          gam index 2:
        </Label>
        <Input
          type="file"
          className="customDataUpload form-control-file"
          id="gamFile2Upload"
          accept=".gam"
          innerRef={this.gamFile2Input}
          onChange={this.onGamFile2Change}
        />
      </React.Fragment>
    );
  }
}

FileUploadFormRow.propTypes = {
  apiUrl: PropTypes.string.isRequired,
  getPathNames: PropTypes.func.isRequired,
  handleFileUpload: PropTypes.func.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  setUploadInProgress: PropTypes.func.isRequired,
  showFileSizeAlert: PropTypes.func.isRequired,
};

export default FileUploadFormRow;
