import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './App.css';
import HeaderForm from './components/HeaderForm';
import TubeMapContainer from './components/TubeMapContainer';
import CustomizationAccordion from './components/CustomizationAccordion';
import { dataOriginTypes } from './enums';
import * as tubeMap from './util/tubemap';
import config from './config.json';

class App extends Component {
  constructor(props) {
    super(props);
    const ds = config.DATA_SOURCES[0];
    let xgFile = ds.xgFile;
    let region = ds.defaultPosition;
    let gamFile = '';
    if(ds.gamFile){
      gamFile = ds.gamFile;
    }
    let gbwtFile = '';
    if(ds.gbwtFile){
      gbwtFile = ds.gbwtFile;
    }
    let bedFile = '';
    if(ds.bedFile){
      bedFile = ds.bedFile;
    }
    let dataPath = 'default';
    if(ds.useMountedPath){
      dataPath = 'mounted';
    }
    this.state = {
      fetchParams: {
        region: region,
        xgFile: xgFile,
        gbwtFile: gbwtFile,
        gamFile: gamFile,
	      bedFile: bedFile,
        dataPath: dataPath,
	      headerFetched: false
      },
      dataOrigin: dataOriginTypes.API,
      visOptions: {
        removeRedundantNodes: true,
        compressedView: false,
        transparentNodes: false,
        showReads: true,
        showSoftClips: true,
        haplotypeColors: 'ygreys',
        forwardReadColors: 'reds',
        reverseReadColors: 'blues',
        colorReadsByMappingQuality: false,
        mappingQualityCutoff: 0
      }
    };
  }

  componentDidUpdate() {
    const { visOptions } = this.state;
    visOptions.compressedView
      ? tubeMap.setNodeWidthOption(1)
      : tubeMap.setNodeWidthOption(0);
    tubeMap.setMergeNodesFlag(visOptions.removeRedundantNodes);
    tubeMap.setTransparentNodesFlag(visOptions.transparentNodes);
    tubeMap.setShowReadsFlag(visOptions.showReads);
    tubeMap.setSoftClipsFlag(visOptions.showSoftClips);
    tubeMap.setColorSet('haplotypeColors', visOptions.haplotypeColors);
    tubeMap.setColorSet('forwardReadColors', visOptions.forwardReadColors);
    tubeMap.setColorSet('reverseReadColors', visOptions.reverseReadColors);
    tubeMap.setColorReadsByMappingQualityFlag(
      visOptions.colorReadsByMappingQuality
    );
    tubeMap.setMappingQualityCutoff(visOptions.mappingQualityCutoff);
  }

  setFetchParams = fetchParams => {
    this.setState({
      fetchParams: fetchParams,
      dataOrigin: dataOriginTypes.API
    });
  };

  toggleVisOptionFlag = flagName => {
    this.setState(state => ({
      visOptions: {
        ...state.visOptions,
        [flagName]: !state.visOptions[flagName]
      }
    }));
  };

  handleMappingQualityCutoffChange = value => {
    this.setState(state => ({
      visOptions: {
        ...state.visOptions,
        mappingQualityCutoff: value
      }
    }));
  };

  setColorSetting = (key, value) => {
    this.setState(state => ({
      visOptions: {
        ...state.visOptions,
        [key]: value
      }
    }));
  };

  setDataOrigin = dataOrigin => {
    this.setState({ dataOrigin });
  };

  render() {
    return (
      <div>
        <HeaderForm
          setFetchParams={this.setFetchParams}
          setDataOrigin={this.setDataOrigin}
          setColorSetting={this.setColorSetting}
          dataOrigin={this.state.dataOrigin}
          apiUrl={this.props.apiUrl}
        />
	      {this.state.fetchParams.headerFetched && (
          <TubeMapContainer
            fetchParams={this.state.fetchParams}
            dataOrigin={this.state.dataOrigin}
            apiUrl={this.props.apiUrl}
          />
	      )}
        <CustomizationAccordion
          visOptions={this.state.visOptions}
          toggleFlag={this.toggleVisOptionFlag}
          handleMappingQualityCutoffChange={
            this.handleMappingQualityCutoffChange
          }
          setColorSetting={this.setColorSetting}
        />
      </div>
    );
  }
}

App.propTypes = {
  apiUrl: PropTypes.string
}

App.defaultProps = {
  // Backend the whole app will hit against. Usually should be picked up from
  // the config or the browser, but needs to be swapped out in the fake
  // browser testing environment to point to a real testing backend.
  // Note that host includes the port.
  apiUrl: (config.BACKEND_URL || `http://${window.location.host}`) + '/api/v0'
};

export default App;
