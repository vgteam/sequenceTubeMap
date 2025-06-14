import Demo, { props as P } from "react-demo";
// See https://github.com/rpominov/react-demo for how to make a demo

import TrackSettings from "./TrackSettings.js";

export default (
  <Demo
    props={{
      fileType: P.choices(["haplotype", "graph", "read"]),
      trackColorSettings: P.json({
        mainPalette: "blues",
        auxPalette: "reds",
        colorReadsByMappingQuality: false,
        alphaReadsByMappingQuality: false,
      }),
      availableColors: P.json([
        "greys",
        "ygreys",
        "blues",
        "reds",
        "plainColors",
      ]),
    }}
  >
    {(props, update) => {
      return (
        <TrackSettings
          {...props}
          setTrackColorSetting={(key, value) => {
            // modify a key in TrackColorSettings
            let newTrackColorSettings = { ...props.trackColorSettings };
            newTrackColorSettings[key] = value;
            update({ trackColorSettings: newTrackColorSettings });
          }}
        />
      );
    }}
  </Demo>
);
