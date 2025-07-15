import Demo, { props as P } from "react-demo";
// See https://github.com/rpominov/react-demo for how to make a demo

import React from "react";

import TrackList from "./TrackList";

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
            alphaReadsByMappingQuality: false,
          },
        },
        2: {
          trackFile: undefined,
          trackType: "graph",
          trackColorSettings: {
            mainPalette: "blues",
            auxPalette: "reds",
            colorReadsByMappingQuality: false,
            alphaReadsByMappingQuality: false,
          },
        },
        3: {
          trackFile: undefined,
          trackType: "graph",
          trackColorSettings: {
            mainPalette: "blues",
            auxPalette: "reds",
            colorReadsByMappingQuality: false,
            alphaReadsByMappingQuality: false,
          },
        },
      }),
      availableTracks: P.json([
        [
          { trackFile: "fileA1.vg", trackType: "graph" },
          { trackFile: "fileA2.gbwt", trackType: "haplotype" },
          { trackFile: "fileB1.gbwt", trackType: "haplotype" },
          { trackFile: "fileB2.gam", trackType: "read" },
          { trackFile: "fileC1.xg", trackType: "graph" },
        ],
      ]),
    }}
  >
    {(props, update) => {
      return (
        <TrackList
          {...props}
          onChange={(newTracks) => {
            update({ tracks: newTracks });
          }}
          onDelete={() => {
            console.log("track deleted");
          }}
        />
      );
    }}
  </Demo>
);
