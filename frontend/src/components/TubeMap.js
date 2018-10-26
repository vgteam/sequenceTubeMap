import React, { Component } from 'react';
import * as tubeMap from '../util/tubemap';

class TubeMap extends Component {
  componentDidMount() {
    console.log('tubeMap mount');
    this.createTubeMap();
  }

  componentDidUpdate() {
    console.log('tubeMap update');
    this.createTubeMap();
  }

  createTubeMap = () => {
    tubeMap.create({
      svgID: '#svg',
      nodes: this.props.nodes,
      tracks: this.props.tracks,
      reads: this.props.reads
    });
  };

  render() {
    return <svg id="svg" />;
  }
}

export default TubeMap;
