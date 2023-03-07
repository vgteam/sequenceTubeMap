import Demo, {props as P} from 'react-demo'
// See https://github.com/rpominov/react-demo for how to make a demo

import React from "react";

import TrackFilePicker from "./TrackFilePicker";

export default (<Demo
  props={{
    fileOptions: P.json(["fileA", "fileB", "fileC", "anotherfile.vg"]),
    fileSelect: P.string("fileA"),
    pickerType: P.string("dropdown"),
  }}
>
  {
    (props, update) => {
      return <TrackFilePicker {...props} handleInputChange={(file) => {
        // takes file name as value, updates the fileSelect prop in TrackFilePicker
        update({fileSelect: file});
      }}/>
    }
  }
</Demo>)


