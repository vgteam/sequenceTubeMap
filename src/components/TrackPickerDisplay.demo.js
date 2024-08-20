import Demo, { props as P } from "react-demo";
// See https://github.com/rpominov/react-demo for how to make a demo

import React from "react";

import TrackPickerDisplay from "./TrackPickerDisplay";

export default (
  <Demo
    props={{
      tracks: P.json({
        1: {
          trackFile: undefined,
          trackType: "graph",
          trackColorSettings: {
            mainPalette: "blues",
            auxPalette: "reds",
            colorReadsByMappingQuality: false,
          },
        },
        2: {
          trackFile: undefined,
          trackType: "graph",
          trackColorSettings: {
            mainPalette: "blues",
            auxPalette: "reds",
            colorReadsByMappingQuality: false,
          },
        },
        3: {
          trackFile: undefined,
          trackType: "graph",
          trackColorSettings: {
            mainPalette: "blues",
            auxPalette: "reds",
            colorReadsByMappingQuality: false,
          },
        },
      }),
      availableTracks: P.json([
        { trackFile: "fileA1.vg", trackType: "graph" },
        { trackFile: "fileA2.gbwt", trackType: "haplotype" },
        { trackFile: "fileB1.gbwt", trackType: "haplotype" },
        { trackFile: "fileB2.gam", trackType: "read" },
        { trackFile: "fileC1.xg", trackType: "graph" },
      ]),
    }}
  >
    {(props, update) => {
      return (
        <TrackPickerDisplay
          {...props}
          onChange={(newTracks) => {
            update({ tracks: newTracks });
          }}
        />
      );
    }}
  </Demo>
);
