import Demo, {props as P} from 'react-demo'
import React from "react";
// See https://github.com/rpominov/react-demo for how to make a demo

import TrackFilePicker from "./TrackFilePicker";

export default (<Demo
  props={{
    fileOptions: P.json(["fileA", "fileB", "fileC"]),
    fileSelect: P.string("fileA"),
  }}
>
  {
    (props, update) => {
      // We need to render the component under test using the props in props, and
      // call update when the component wants to adjust the props.
      return <TrackFilePicker {...props}/>
    }
  }
</Demo>)

