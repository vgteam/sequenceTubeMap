// Type file for documentation
// (not actually enforced by Typescript)

// Possible filestypes taken from the request
// Files like GBZ contains graph and maybe haplotype and so can be either
type filetype = "graph" | "haplotype" | "read" | "bed";

// The basic concept of a track
type BaseTrack = {
  trackFile: string; // Name of file
  trackType: filetype; // What kind of data the track provides
}

// Represents a track available in an API
type AvailableTrack extends BaseTrack = {
  // If set, this track came from a preset or a pre-extracted region and is not
  // actually queryable on its own through the API for e.g. the list of paths
  // in it.
  trackIsImplied?: boolean
}

// Represents a track actually selected to be displayed
type track extends BaseTrack = {
  trackColorSettings: ColorScheme;
}

// A collection of selected tracks to render a view with
type tracks = {
  [key: number]: track;
}

// Describes something the Tube Map can look at, specifically a region and the files the region is in.
// These parameters can be extracted from defaults (config), Header Form input, or URL parameters
type ViewTarget = {
  region: string; // Format: path:start-end
  tracks: Array<track>;
  bedFile?: string;

  simplify?: boolean; // Whether to write out small snarls
  removeSequences?: boolean; // Whether to remove node sequences server-side

  // Non-essential to server, used for examples
  name?: string;
};

type RegionInfo = {
  // Each index in each of these objects
  // corresponds to one region
  // i.e. desc[4] is the desc for chr[4], start[4], end[4]
  // Chromosome/path before the :
  chr: string[],
  chunk: string[],
  // Description of region from BED
  desc: string[],
  // Numerical string
  end: string[],
  // Numerical string
  start: string[]
}

// Available color sets
enum ColorPalette{
  greys,
  ygreys,
  blues,
  reds,
  plainColors,
  lightColors,
}

// Hex describing a color
type ColorHex  = `#${string}`;


// An object created by the React-Color library, contains infomation on the color selected
type ReactColor = {
  hex: ColorHex ,
  //... has additional properties
}

// Describes the coloring information for a track
type ColorScheme = {
    mainPalette: ColorPalette | ColorHex ,
    auxPalette: ColorPalette | ColorHex ,
    colorReadsByMappingQuality: boolean
}

// Stores the assigned colorschemes of all tracks
// Entries correspond to their track counterpart, e.g colorSchemes[0] corresponds to tracks[0]
type colorSchemes = {
  trackID: ColorScheme;
}
