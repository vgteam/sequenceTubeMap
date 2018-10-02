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
    const nodes = tubeMap.vgExtractNodes(this.props.graph);
    console.log(nodes);
    const tracks = tubeMap.vgExtractTracks(this.props.graph);
    console.log(tracks);
    const reads = tubeMap.vgExtractReads(nodes, tracks, this.props.gam);
    tubeMap.create({
      svgID: '#svg',
      nodes,
      tracks,
      reads
    });
  };

  render() {
    return <svg id="svg" />;
  }
}

export default TubeMap;
