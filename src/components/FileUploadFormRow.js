import React, { Component } from 'react';
import { Label, Input } from 'reactstrap';
import config from '../config.json';

const BACKEND_URL = config.BACKEND_URL || `http://${window.location.host}`;
const MAX_UPLOAD_SIZE = 5242880;

class FileUploadFormRow extends Component {
  constructor(props) {
    super(props);
    this.xgFileInput = React.createRef();
    this.gbwtFileInput = React.createRef();
    this.gamFileInput = React.createRef();
  }

  onXgFileChange = () => {
    const file = this.xgFileInput.current.files[0];
    if (file === undefined) {
      this.props.resetPathNames();
      this.props.handleFileUpload('xgFile', 'none');
    } else {
      if (file.size > MAX_UPLOAD_SIZE) {
        this.xgFileInput.current.value = '';
        this.props.showFileSizeAlert();
        return;
      }
      this.props.setUploadInProgress(true);
      const formData = new FormData();
      formData.append('xgFile', file);
      const xhr = new XMLHttpRequest();
      xhr.responseType = 'json';
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
          // Every thing ok, file uploaded
          this.props.setUploadInProgress(false);
          this.props.handleFileUpload('xgFile', xhr.response.path);
          this.props.getPathNames(xhr.response.path, 'true');
        }
      };
      xhr.open('POST', `${BACKEND_URL}/xgFileSubmission`, true);
      xhr.send(formData);
    }
  };

  onGbwtFileChange = () => {
    const file = this.gbwtFileInput.current.files[0];
    if (file === undefined) {
      this.props.handleFileUpload('gbwtFile', 'none');
    } else {
      if (file.size > MAX_UPLOAD_SIZE) {
        this.gbwtFileInput.current.value = '';
        this.props.showFileSizeAlert();
        return;
      }
      this.props.setUploadInProgress(true);
      const formData = new FormData();
      formData.append('gbwtFile', file);
      const xhr = new XMLHttpRequest();
      xhr.responseType = 'json';
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
          // Every thing ok, file uploaded
          this.props.setUploadInProgress(false);
          this.props.handleFileUpload('gbwtFile', xhr.response.path);
        }
      };
      xhr.open('POST', `${BACKEND_URL}/gbwtFileSubmission`, true);
      xhr.send(formData);
    }
  };

  onGamFileChange = () => {
    const file = this.gamFileInput.current.files[0];
    if (file === undefined) {
      this.props.handleFileUpload('gamFile', 'none');
    } else {
      if (file.size > MAX_UPLOAD_SIZE) {
        this.gamFileInput.current.value = '';
        this.props.showFileSizeAlert();
        return;
      }
      this.props.setUploadInProgress(true);
      const formData = new FormData();
      formData.append('gamFile', file);
      const xhr = new XMLHttpRequest();
      xhr.responseType = 'json';
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
          // Every thing ok, file uploaded
          this.props.setUploadInProgress(false);
          this.props.handleFileUpload('gamFile', xhr.response.path);
        }
      };
      xhr.open('POST', `${BACKEND_URL}/gamFileSubmission`, true);
      xhr.send(formData);
    }
  };

  render() {
    const pathDropdownOptions = this.props.pathSelectOptions.map(pathName => {
      return (
        <option value={pathName} key={pathName}>
          {pathName}
        </option>
      );
    });

    return (
      <React.Fragment>
        <Label className="customData tight-label mb-2 mr-sm-2 mb-sm-0 ml-2">
          xg file:
        </Label>
        <Input
          type="file"
          className="customDataUpload form-control-file"
          id="xgFileUpload"
          accept=".xg"
          innerRef={this.xgFileInput}
          onChange={this.onXgFileChange}
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
          accept=".gbwt"
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
          for="pathName"
          className="customData tight-label mb-2 mr-sm-2 mb-sm-0 ml-2"
        >
          Path name:
        </Label>
        <Input
          type="select"
          className="customData custom-select mb-2 mr-sm-4 mb-sm-0"
          id="pathSelect"
          value={this.props.pathSelect}
          onChange={this.props.handleInputChange}
        >
          {pathDropdownOptions}
        </Input>
      </React.Fragment>
    );
  }
}

export default FileUploadFormRow;
