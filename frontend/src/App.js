import React, { Component } from 'react';
import './App.css';
import HeaderForm from './components/HeaderForm';
import TubeMapContainer from './components/TubeMapContainer';
import CustomizationAccordion from './components/CustomizationAccordion';
import { dataTypes } from './enums';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      dataType: dataTypes.BUILT_IN,
      fetchParams: {
        nodeID: '1',
        distance: '100',
        byNode: 'false',
        xgFile: 'x.vg.xg',
        gbwtFile: 'x.vg.gbwt',
        gamFile: '',
        anchorTrackName: 'x',
        dataPath: 'default'
      }
    };
  }

  updateFetchParams = fetchParams => {
    this.setState({ fetchParams: fetchParams });
  };

  render() {
    return (
      <div>
        <HeaderForm updateFetchParams={this.updateFetchParams} />
        <TubeMapContainer fetchParams={this.state.fetchParams} />
        <CustomizationAccordion />
      </div>
    );
  }
}

export default App;
