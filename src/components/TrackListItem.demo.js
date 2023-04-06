import Demo, {props as P} from 'react-demo'
// See https://github.com/rpominov/react-demo for how to make a demo

import React from "react";

import TrackListItem from "./TrackListItem";

export default (<Demo
  props={{
    trackType: P.choices(["graph", "haplotype", "read"]),
    availableTracks: P.json([{"files": [{"name": "fileA1.vg", "type": "graph"},
                                        {"name": "fileA2.gbwt", "type": "haplotype"}]},
                             {"files": [{"name": "fileB1.gbwt", "type": "haplotype"},
                                        {"name": "fileB2.gam", "type": "read"}]},
                             {"files": [{"name": "fileC1.xg", "type": "graph"}]}]),
  }}
>
  {
    (props, update) => {
      return <TrackListItem {...props} 
        onChange={(newTrackType, newTrackFile, newTrackColorSettings) => {
          // Bind new value back up to value.
          // Remember: we get a string 
          update({trackType: newTrackType});
          update({trackFile: newTrackFile});
          update({trackColorSettings: newTrackColorSettings})}} 
        onDelete={() => {console.log("track deleted")}}/>
    }
  }
</Demo>)


