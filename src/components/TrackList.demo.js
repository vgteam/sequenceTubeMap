import Demo, {props as P} from 'react-demo'
// See https://github.com/rpominov/react-demo for how to make a demo

import React from "react";

import TrackList from "./TrackList";

export default (<Demo
  props={{
    tracks:P.json({
        1: {
            trackFile: undefined,
            trackType: "graph",
            trackColorSettings: {    
                mainPalette: "blues",
                auxPalette: "reds",
                colorReadsByMappingQuality: false
            }
        },
        2: {
            trackFile: undefined,
            trackType: "graph",
            trackColorSettings: {    
                mainPalette: "blues",
                auxPalette: "reds",
                colorReadsByMappingQuality: false
            }
        },
        3: {
            trackFile: undefined,
            trackType: "graph",
            trackColorSettings: {    
                mainPalette: "blues",
                auxPalette: "reds",
                colorReadsByMappingQuality: false
            }
        },
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
      return <TrackList {...props} 
        onChange={(newTracks) => {
          update({tracks: newTracks});
        }} 
        onDelete={() => {console.log("track deleted")}}/>
    }
  }
</Demo>)


