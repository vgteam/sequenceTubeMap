import Demo, {props as P} from 'react-demo'
// See https://github.com/rpominov/react-demo for how to make a demo

import React from "react";

import TrackListItem from "./TrackListItem";

export default (<Demo
  props={{
    trackProps: P.json({
      trackFile: undefined,
      trackType: "graph",
      availableTracks: [{"files": [{"name": "fileA1.vg", "type": "graph"},
                                          {"name": "fileA2.gbwt", "type": "haplotype"}]},
                               {"files": [{"name": "fileB1.gbwt", "type": "haplotype"},
                                          {"name": "fileB2.gam", "type": "read"}]},
                               {"files": [{"name": "fileC1.xg", "type": "graph"}]}],
      trackColorSettings: {    
        mainPallete: "blues",
        auxPallete: "reds",
        colorReadsByMappingQuality: false},
    })
  }}
>
  {
    (props, update) => {
      return <TrackListItem {...props} 
        onChange={(newTrackProps) => {

          update({trackProps: newTrackProps});
        }} 
        onDelete={() => {console.log("track deleted")}}/>
    }
  }
</Demo>)


