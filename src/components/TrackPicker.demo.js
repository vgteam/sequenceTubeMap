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
    availableTracks: P.json([
        {"files": [{"name": "fileA1.vg", "type": "graph"},
                   {"name": "fileA2.gbwt", "type": "haplotype"}]},
        {"files": [{"name": "fileB1.gbwt", "type": "haplotype"},
                   {"name": "fileB2.gam", "type": "read"}]},
        {"files": [{"name": "fileC1.xg", "type": "graph"}]}
      ])
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


