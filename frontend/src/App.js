import React, { Component } from 'react';
import './App.css';
import HeaderForm from './components/HeaderForm';
import TubeMapContainer from './components/TubeMapContainer';
import CustomizationAccordion from './components/CustomizationAccordion';
import { dataTypes, dataSource } from './enums';

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
      },
      dataSource: dataSource.FROM_API
    };
  }

  updateFetchParams = fetchParams => {
    this.setState({ fetchParams: fetchParams });
  };

  setDataSource = ds => {
    console.log('updating data source');
    this.setState({ dataSource: ds });
  };

  render() {
    return (
      <div>
        <HeaderForm
          updateFetchParams={this.updateFetchParams}
          setDataSource={this.setDataSource}
        />
        <TubeMapContainer
          fetchParams={this.state.fetchParams}
          dataSource={this.state.dataSource}
        />
        <CustomizationAccordion />
      </div>
    );
  }
}

export default App;
