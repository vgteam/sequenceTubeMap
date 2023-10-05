// common.mjs: shared functions between client and server

import config from "./config.json";

// function to remove commas from coordinate input
const removeCommas = (input) => {
  let parts = input.split(":");
  if (parts.length < 2){
    return input;
  }
  // get coordinate - numerical range after last colon
  let coordinates = parts[parts.length - 1];
  coordinates = coordinates.replace(/,/g, "");
  // put region input coordinate back together
  parts[parts.length - 1] = coordinates;
  let fixedInputValue = parts.join(":");
  return fixedInputValue;
};

// Parse a region string into:
// { contig, start, end }
// or
// { contig, start, distance }
//
// For distance, + is used as the coordinate separator. For start/end ranges, - is used.
// The coordinates are set off from the contig by the last colon.
// Commas in coordinates are removed.
//
// Throws an Error if the region was not understood.
export function parseRegion(region) {
  if (!region || region === "none") {
    throw new Error("Missing region.");
  }
  if (!region.includes(":")) {
    throw new Error("Region doesn't contain a ':'.");
  }
  if (region.endsWith(":")) {
    throw new Error("Region ends with a ':' and is missing coordinates.");
  }

  region = removeCommas(region);

  // Get the part of the region after the last colon
  let region_col = region.split(":");
  let start_end = region_col[region_col.length - 1].split("-");
  let pos_dist = region_col[region_col.length - 1].split("+");

  let contig = region_col.slice(0, -1).join(':');

  if (start_end.length === 2) {
    let start = Number(start_end[0]);
    let end = Number(start_end[1]);
    return { contig, start, end };
  } else if (pos_dist.length === 2) {
    let start = Number(pos_dist[0]);
    let distance = Number(pos_dist[1]);
    return {contig, start, distance };
  } else {
    throw new Error("Coordinates must be in the form 'X:Y-Z' or 'X:Y+Z'.");
  }
  
}

/// Return a version of region that is {contig, start, end} even if region is {contig, start, distance}
export function convertRegionToRangeRegion(region) {
  if (region.distance !== undefined) {
    // Has a distance and not an end.
    return {
      contig: region.contig,
      start: region.start,
      end: region.start + region.distance
    };
  } else {
    // Should already have an end.
    return region;
  }
}

// Take a { contig, start, end} region and turn it into a
// string compatible with parseRegion() or with vg.
export function stringifyRangeRegion({contig, start, end}) {
  return contig.concat(':', start, '-', end);
}

// Take a {contig, start, end} or {contig, start, distance} region and turn it into a string compatible with parseRegion
export function stringifyRegion(region) {
  if (region.distance !== undefined) {
    // It is a distance-based region
    return region.contig.concat(':', region.start, '+', region.distance);
  } else {
    // It is a range region
    return stringifyRangeRegion(region);
  }
}

/* This function accepts a track type input and returns the default color scheme for that track type if the 
track type is valid */
export function defaultTrackColors(trackType){
  if (trackType === "graph"){
    return config.defaultGraphColorPalette;
  } else if (trackType === "read"){
    return config.defaultReadColorPalette;
  } else if (trackType === "haplotype"){
    return config.defaultHaplotypeColorPalette;
  } else {
    throw new Error("Invalid track type: " + trackType); 
  }
}