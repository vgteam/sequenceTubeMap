import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as tubeMap from '../util/tubemap';

class TubeMap extends Component {
  componentDidMount() {
    this.createTubeMap();
  }

  componentDidUpdate() {
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

TubeMap.propTypes = {
  nodes: PropTypes.array.isRequired,
  tracks: PropTypes.array.isRequired,
  reads: PropTypes.array.isRequired 
};

export default TubeMap;
