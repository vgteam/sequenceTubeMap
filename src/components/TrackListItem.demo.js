import Demo, {props as P} from 'react-demo'
// See https://github.com/rpominov/react-demo for how to make a demo

import React from "react";

import TrackListItem from "./TrackListItem";

export default (<Demo
  props={{
    trackProps: P.json({
      trackFile: undefined,
      trackType: "graph",
      trackColorSettings: {    
        mainPalette: "blues",
        auxPalette: "reds",
        colorReadsByMappingQuality: false
      }
    }),
    availableTracks: P.json([{"trackFile": "fileA1.vg", "trackType": "graph"},
                            {"trackFile": "fileA2.gbwt", "trackType": "haplotype"},
                            {"trackFile": "fileB1.gbwt", "trackType": "haplotype"},
                            {"trackFile": "fileB2.gam", "trackType": "read"},
                            {"trackFile": "fileC1.xg", "trackType": "graph"}]),
  }}
>
  {
    (props, update) => {
      return <TrackListItem {...props} 
        onChange={(trackID, newTrackProps) => {
          update({trackProps: newTrackProps});
        }} 
        onDelete={() => {console.log("track deleted")}}/>
    }
  }
</Demo>)


