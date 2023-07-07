import React, { Component } from "react";
import PropTypes from "prop-types";
import * as tubeMap from "../util/tubemap";
import isEqual from "react-fast-compare";

class TubeMap extends Component {
  componentDidMount() {
    this.updateVisOptions();
    this.createTubeMap();
  }

  componentDidUpdate(prevProps) {
    console.log('Props:', this.props);
    if (!isEqual(this.props, prevProps)) {
      console.log('Props have changed so re-creating tube map');
      this.updateVisOptions();
      this.createTubeMap();
    } else {
      console.log('Props have not changed so leaving existing tube map');
    }
  }

  createTubeMap = () => {
    tubeMap.create({
      svgID: "#svg",
      nodes: this.props.nodes,
      tracks: this.props.tracks,
      reads: this.props.reads,
      region: this.props.region,
      visOptions: this.props.visOptions,
    });
  };

  updateVisOptions() {
    const visOptions = this.props.visOptions;
    visOptions.compressedView
      ? tubeMap.setNodeWidthOption(1)
      : tubeMap.setNodeWidthOption(0);
    tubeMap.setMergeNodesFlag(visOptions.removeRedundantNodes);
    tubeMap.setTransparentNodesFlag(visOptions.transparentNodes);
    tubeMap.setShowReadsFlag(visOptions.showReads);
    tubeMap.setSoftClipsFlag(visOptions.showSoftClips);

    for (let i = 0; i < visOptions.colorSchemes.length; i++) {
      // Apply color-by-mapping-quality parameter to all the schemes.
      // TODO: When we get individual controls, pass through individual track options.
      let colorScheme = {...visOptions.colorSchemes[i], colorReadsByMappingQuality: visOptions.colorReadsByMappingQuality};
      // update tubemap colors
      tubeMap.setColorSet(i, colorScheme);
    }
    tubeMap.setMappingQualityCutoff(visOptions.mappingQualityCutoff);
  }  

  render() {
    return <svg id="svg" alt="Rendered sequence tube map visualization" />;
  }
}

TubeMap.propTypes = {
  nodes: PropTypes.array.isRequired,
  tracks: PropTypes.array.isRequired,
  reads: PropTypes.array.isRequired,
  region: PropTypes.array.isRequired,
  visOptions: PropTypes.object.isRequired
};

export default TubeMap;
