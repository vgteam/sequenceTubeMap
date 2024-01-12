import Demo, { props as P } from "react-demo";
// See https://github.com/rpominov/react-demo for how to make a demo

import ColorPicker from "./ColorPicker.js";

export default (
  <Demo
    props={{
      presetColors: P.json([
        "#FF6900",
        "#FCB900",
        "#7BDCB5",
        "#00D084",
        "#8ED1FC",
        "#0693E3",
        "#ABB8C3",
        "#EB144C",
        "#F78DA7",
        "#9900EF",
      ]),
    }}
  >
    {(props, update) => {
      return (
        <ColorPicker
          {...props}
          onChange={(color) => {
            // modify a key in TrackColorSettings
            console.log("changed to color ", color);
          }}
        />
      );
    }}
  </Demo>
);
