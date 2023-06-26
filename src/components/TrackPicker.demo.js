import Demo, {props as P} from 'react-demo'
// See https://github.com/rpominov/react-demo for how to make a demo

import React from "react";
import config from "./../config.json";
import TrackPicker from "./TrackPicker";

export default (<Demo
  props={{
    tracks:P.json({
        1: config.defaultTrackProps,
        2: config.defaultTrackProps,
        3: config.defaultTrackProps,
    }),
    availableTracks: P.json([{"trackFile": "fileA1.vg", "trackType": "graph"},
                            {"trackFile": "fileA2.gbwt", "trackType": "haplotype"},
                            {"trackFile": "fileB1.gbwt", "trackType": "haplotype"},
                            {"trackFile": "fileB2.gam", "trackType": "read"},
                            {"trackFile": "fileC1.xg", "trackType": "graph"}])
  }}
>
  {
    (props, update) => {
      return <TrackPicker {...props} 
        onChange={(newTracks) => {
          update({tracks: newTracks});
        }} 
        />
    }
  }
</Demo>)


