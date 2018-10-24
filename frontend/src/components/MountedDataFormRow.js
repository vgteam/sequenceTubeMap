import React, { Component } from 'react';
import { Label, Input } from 'reactstrap';

class MountedDataFormRow extends Component {
  render() {
    const xgFileDropdownOptions = this.props.xgSelectOptions.map(fileName => {
      return (
        <option value={fileName} key={fileName}>
          {fileName}
        </option>
      );
    });

    const gbwtFileDropdownOptions = this.props.gbwtSelectOptions.map(
      fileName => {
        return (
          <option value={fileName} key={fileName}>
            {fileName}
          </option>
        );
      }
    );

    const gamFileDropdownOptions = this.props.gamSelectOptions.map(fileName => {
      return (
        <option value={fileName} key={fileName}>
          {fileName}
        </option>
      );
    });

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
          type="select"
          className="customDataMounted custom-select mb-2 mr-sm-4 mb-sm-0"
          id="xgSelect"
          value={this.props.xgSelect}
          onChange={this.props.handleInputChange}
        >
          {xgFileDropdownOptions}
        </Input>

        <Label
          for="gbwtFileSelect"
          className="customData tight-label mb-2 mr-sm-2 mb-sm-0 ml-2"
        >
          gbwt file:
        </Label>
        <Input
          type="select"
          className="customDataMounted custom-select mb-2 mr-sm-4 mb-sm-0"
          id="gbwtSelect"
          value={this.props.gbwtSelect}
          onChange={this.props.handleInputChange}
        >
          {gbwtFileDropdownOptions}
        </Input>

        <Label
          for="gamFileSelect"
          className="customData tight-label mb-2 mr-sm-2 mb-sm-0 ml-2"
        >
          gam index:
        </Label>
        <Input
          type="select"
          className="customDataMounted custom-select mb-2 mr-sm-4 mb-sm-0"
          id="gamSelect"
          value={this.props.gamSelect}
          onChange={this.props.handleInputChange}
        >
          {gamFileDropdownOptions}
        </Input>

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

export default MountedDataFormRow;
