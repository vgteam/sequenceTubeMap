import Demo, {props as P} from 'react-demo'
// See https://github.com/rpominov/react-demo for how to make a demo

import React from "react";

import TrackFilePicker from "./TrackFilePicker";

export default (<Demo
  props={{
    tracks: P.json([{"trackFile": "fileA1.vg", "trackType": "graph"},
                    {"trackFile": "fileA2.gbwt", "trackType": "haplotype"},
                    {"trackFile": "fileB1.gbwt", "trackType": "haplotype"},
                    {"trackFile": "fileB2.gam", "trackType": "read"},
                    {"trackFile": "fileC1.xg", "trackType": "graph"}]),

    value: P.string("fileA1.vg"),
    fileType: P.choices(["graph", "haplotype", "read"]),
    pickerType: P.choices(["mounted", "upload"]),
  }}
>
  {
    (props, update) => {
      return <TrackFilePicker {...props} handleInputChange={(file) => {
        // takes file name as value, updates the fileSelect prop in TrackFilePicker
        update({value: file});
      }}
      handleFileUpload={(fileType, file) => {
        console.log("handling file upload");
      }}
    />
    }
  }
</Demo>)


