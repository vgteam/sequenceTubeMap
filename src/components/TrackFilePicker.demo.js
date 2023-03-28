import Demo, {props as P} from 'react-demo'
// See https://github.com/rpominov/react-demo for how to make a demo

import React from "react";

import TrackFilePicker from "./TrackFilePicker";

export default (<Demo
  props={{
    tracks: P.json([{"files": [{"name": "fileA1.vg", "type": "graph"},
                              {"name": "fileA2.gbwt", "type": "haplotype"}]},
                    {"files": [{"name": "fileB1.gbwt", "type": "haplotype"},
                              {"name": "fileB2.gam", "type": "read"}]},
                    {"files": [{"name": "fileC1.xg", "type": "graph"}]}]),

    value: P.json({"name": "fileA1.vg", "type": "graph"}),
    fileType: P.choices(["graph", "haplotype", "read"]),
    pickerType: P.choices(["dropdown", "upload"]),
  }}
>
  {
    (props, update) => {
      return <TrackFilePicker {...props} handleInputChange={(file) => {
        // takes file name as value, updates the fileSelect prop in TrackFilePicker
        update({value: file});
      }}/>
    }
  }
</Demo>)


