import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Container, Row, Col, Form, Label, Input, Alert } from 'reactstrap';
import { dataOriginTypes } from '../enums';
// import defaultConfig from '../config.default.json';
import config from '../config.json';
import DataPositionFormRow from './DataPositionFormRow';
import MountedDataFormRow from './MountedDataFormRow';
import FileUploadFormRow from './FileUploadFormRow';
import ExampleSelectButtons from './ExampleSelectButtons';

const DATA_SOURCES = config.DATA_SOURCES;
const MAX_UPLOAD_SIZE_DESCRIPTION = '5 MB';
const dataTypes = {
  BUILT_IN: 'built-in',
  FILE_UPLOAD: 'file-upload',
  MOUNTED_FILES: 'mounted files',
  EXAMPLES: 'examples'
};

class HeaderForm extends Component {
  state = {
    xgSelectOptions: ['none'],
    xgSelect: 'none',

    gbwtSelectOptions: ['none'],
    gbwtSelect: 'none',

    gamSelectOptions: ['none'],
    gamSelect: 'none',

    bedSelectOptions: ['none'],
    bedSelect: 'none',

    regionSelectOptions: ['none'],
    regionInfo: {},
    regionSelect: 'none',

    xgFile: 'snp1kg-BRCA1.vg.xg',
    gbwtFile: '',
    gamFile: 'NA12878-BRCA1.sorted.gam',
    bedFile: '',
    dataPath: 'default',

    region: '17:1-100',

    dataType: dataTypes.BUILT_IN,
    fileSizeAlert: false,
    uploadInProgress: false
  };

  componentDidMount() {
    this.getMountedFilenames();
    this.setUpWebsocket();
  }

  getMountedFilenames = async () => {
    try {
      const response = await fetch(`${this.props.apiUrl}/getFilenames`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const json = await response.json();
      json.xgFiles.unshift('none');
      json.gbwtFiles.unshift('none');
      json.gamIndices.unshift('none');
      json.bedFiles.unshift('none');

      this.setState(state => {
        const xgSelect = json.xgFiles.includes(state.xgSelect)
              ? state.xgSelect
              : 'none';
        const gbwtSelect = json.gbwtFiles.includes(state.gbwtSelect)
              ? state.gbwtSelect
              : 'none';
        const gamSelect = json.gamIndices.includes(state.gamSelect)
              ? state.gamSelect
              : 'none';
        const bedSelect = json.bedFiles.includes(state.bedSelect)
              ? state.bedSelect
	      : 'none';
	if (bedSelect !== 'none'){
	  this.getBedRegions(bedSelect, false);
	}
        return {
          xgSelectOptions: json.xgFiles,
          gbwtSelectOptions: json.gbwtFiles,
          gamSelectOptions: json.gamIndices,
          bedSelectOptions: json.bedFiles,
          xgSelect,
          gbwtSelect,
          gamSelect,
	  bedSelect
        };
      });
    } catch (error) {
      console.log(`GET to ${this.props.apiUrl}/getFilenames failed:`, error);
    }
  };

  getBedRegions = async (bedFile, isUploadedFile) => {
    try {
      const response = await fetch(`${this.props.apiUrl}/getBedRegions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bedFile, isUploadedFile })
      });
      const json = await response.json();
      this.setState(state => {
        const regionSelect = json.bedRegions['desc'].includes(state.regionSelect)
          ? state.regionSelect
          : json.bedRegions['desc'][0];
        return {
	  regionInfo: json.bedRegions,
          regionSelectOptions: json.bedRegions['desc'],
          regionSelect,
          regionSelect: regionSelect
        };
      });
    } catch (error) {
      console.log(`POST to ${this.props.apiUrl}/getBedRegions failed:`, error);
    }
  };

  resetBedRegions = () => {
    this.setState({
      regionSelect: 'none',
      regionInfo: {},
      regionSelectOptions: ['none']
    });
  };
  
  handleDataSourceChange = event => {
    const value = event.target.value;
    DATA_SOURCES.forEach(ds => {
      if (ds.name === value) {
        this.setState({
          xgFile: ds.xgFile,
          gbwtFile: ds.gbwtFile,
          gamFile: ds.gamFile,
	  bedFile: ds.bedFile,
          dataPath: ds.useMountedPath ? 'mounted' : 'default',
          region: ds.defaultPosition,
          dataType: dataTypes.BUILT_IN
        });
        return;
      }
    });
    if (value === 'customFileUpload') {
      this.setState(state => {
        return {
          xgFile: state.xgSelect,
          gbwtFile: state.gbwtSelect,
          gamFile: state.gamSelect,
          bedFile: state.bedSelect,
          dataPath: 'upload',
          dataType: dataTypes.FILE_UPLOAD
        };
      });
    } else if (value === 'customMounted') {
      this.setState(state => {
        return {
          xgFile: state.xgSelect,
          gbwtFile: state.gbwtSelect,
          gamFile: state.gamSelect,
          bedFile: state.bedSelect,
          dataPath: 'mounted',
          dataType: dataTypes.MOUNTED_FILES
        };
      });
    } else if (value === 'syntheticExamples') {
      this.setState({ dataType: dataTypes.EXAMPLES });
    }
  };

  handleGoButton = () => {
    if (this.props.dataOrigin !== dataOriginTypes.API) {
      this.props.setColorSetting('haplotypeColors', 'greys');
      this.props.setColorSetting('forwardReadColors', 'reds');
    }
    const fetchParams = {
      region: this.state.region,
      xgFile: this.state.xgFile,
      gbwtFile: this.state.gbwtFile,
      gamFile: this.state.gamFile,
      bedFile: this.state.bedFile,
      regionInfo: this.state.regionInfo,
      anchorTrackName: this.state.anchorTrackName,
      dataPath: this.state.dataPath
    };
    this.props.setFetchParams(fetchParams);
  };

  handleInputChange = event => {
    const id = event.target.id;
    const value = event.target.value;
    this.setState({ [id]: value });
    if (id === 'xgSelect') {
      this.setState({ xgFile: value });
    } else if (id === 'gbwtSelect') {
      this.setState({ gbwtFile: value });
    } else if (id === 'gamSelect') {
      this.setState({ gamFile: value });
    } else if (id === 'bedSelect') {
      this.getBedRegions(value, false);
      this.setState({ bedFile: value });
    } else if (id === 'regionSelect') {
      // find which region corresponds to this region label/desc
      const region = '';
      let i = 0;
      while (i < this.state.regionInfo['desc'].length && this.state.regionInfo['desc'][i] !== value) i += 1;
      if (i < this.state.regionInfo['desc'].length){
	let region_chr = this.state.regionInfo['chr'][i];
	let region_start = this.state.regionInfo['start'][i];
	let region_end = this.state.regionInfo['end'][i];
	this.setState({ region: region_chr.concat(':', region_start, '-', region_end) });
      }
    }
  };

  handleGoRight = () => {
    let region_col = this.state.region.split(":");
    let start_end = region_col[1].split("-");
    let r_start = Number(start_end[0]);
    let r_end = Number(start_end[1]);
    let shift = (r_end - r_start) / 2;
    r_start = Math.round(r_start + shift);
    r_end = Math.round(r_end + shift);
    this.setState(
      state => ({
        region: region_col[0].concat(":", r_start, "-", r_end)
      }),
      () => this.handleGoButton()
    );
  };

  handleGoLeft = () => {
    let region_col = this.state.region.split(":");
    let start_end = region_col[1].split("-");
    let r_start = Number(start_end[0]);
    let r_end = Number(start_end[1]);
    let shift = (r_end - r_start) / 2;
    r_start = Math.max(0, Math.round(r_start - shift));
    r_end = Math.max(0, Math.round(r_end - shift));
    this.setState(
      state => ({
        region: region_col[0].concat(":", r_start, "-", r_end)
      }),
      () => this.handleGoButton()
    );
  };

  handleFileUpload = (fileType, fileName) => {
    this.setState({ [fileType]: fileName });
  };

  showFileSizeAlert = () => {
    this.setState({ fileSizeAlert: true });
  };

  setUploadInProgress = val => {
    this.setState({ uploadInProgress: val });
  };

  setUpWebsocket = () => {
    this.ws = new WebSocket(this.props.apiUrl.replace(/^http/, 'ws'));
    this.ws.onmessage = message => {
      this.getMountedFilenames();
    };
    this.ws.onclose = event => {
      setTimeout(this.setUpWebsocket, 1000);
    };
    this.ws.onerror = event => {
      this.ws.close();
    };
  };

  render() {
    let dataSourceDropdownOptions = DATA_SOURCES.map(ds => {
      return (
        <option value={ds.name} key={ds.name}>
          {ds.name}
        </option>
      );
    });
    dataSourceDropdownOptions.push(
      <option value="syntheticExamples" key="syntheticExamples">
        synthetic data examples
      </option>,
      <option value="customFileUpload" key="customFileUpload">
        custom (file upload)
      </option>,
      <option value="customMounted" key="customMounted">
        custom (mounted files)
      </option>
    );

    const mountedFilesFlag = this.state.dataType === dataTypes.MOUNTED_FILES;
    const uploadFilesFlag = this.state.dataType === dataTypes.FILE_UPLOAD;
    const examplesFlag = this.state.dataType === dataTypes.EXAMPLES;

    return (
      <div>
        <Container fluid={true}>
          <Row>
            <Col md="auto">
              <img src="./logo.png" alt="Logo" />
            </Col>
            <Col>
              <Form inline>
                <Label
                  className="tight-label mb-2 mr-sm-2 mb-sm-0 ml-2"
                  for="dataSourceSelect"
                >
                  Data:
                </Label>
                <Input
                  type="select"
                  id="dataSourceSelect"
                  className="custom-select mb-2 mr-sm-4 mb-sm-0"
                  onChange={this.handleDataSourceChange}
                >
                  {dataSourceDropdownOptions}
                </Input>
                {mountedFilesFlag && (
                  <MountedDataFormRow
                    xgSelect={this.state.xgSelect}
                    xgSelectOptions={this.state.xgSelectOptions}
                    gbwtSelect={this.state.gbwtSelect}
                    gbwtSelectOptions={this.state.gbwtSelectOptions}
                    gamSelect={this.state.gamSelect}
                    gamSelectOptions={this.state.gamSelectOptions}
                    bedSelect={this.state.bedSelect}
                    bedSelectOptions={this.state.bedSelectOptions}
                    regionSelect={this.state.regionSelect}
                    regionSelectOptions={this.state.regionSelectOptions}
                    handleInputChange={this.handleInputChange}
                  />
                )}
                {uploadFilesFlag && (
                  <FileUploadFormRow
                    apiUrl={this.props.apiUrl}
                    handleInputChange={this.handleInputChange}
                    handleFileUpload={this.handleFileUpload}
                    showFileSizeAlert={this.showFileSizeAlert}
                    setUploadInProgress={this.setUploadInProgress}
                  />
                )}
              </Form>
              <Alert
                color="danger"
                isOpen={this.state.fileSizeAlert}
                toggle={() => {
                  this.setState({ fileSizeAlert: false });
                }}
                className="mt-3"
              >
                <strong>File size too big! </strong>
                You may only upload files with a maximum size of{' '}
                {MAX_UPLOAD_SIZE_DESCRIPTION}.
              </Alert>
              {examplesFlag ? (
                <ExampleSelectButtons
                  setDataOrigin={this.props.setDataOrigin}
                  setColorSetting={this.props.setColorSetting}
                />
              ) : (
                <DataPositionFormRow
                  region={this.state.region}
                  handleInputChange={this.handleInputChange}
                  handleGoLeft={this.handleGoLeft}
                  handleGoRight={this.handleGoRight}
                  handleGoButton={this.handleGoButton}
                  uploadInProgress={this.state.uploadInProgress}
                />
              )}
            </Col>
          </Row>
        </Container>
      </div>
    );
  }
}

HeaderForm.propTypes = {
  apiUrl: PropTypes.string.isRequired,
  dataOrigin: PropTypes.string.isRequired,
  setColorSetting: PropTypes.func.isRequired,
  setDataOrigin: PropTypes.func.isRequired,
  setFetchParams: PropTypes.func.isRequired
};

export default HeaderForm;
