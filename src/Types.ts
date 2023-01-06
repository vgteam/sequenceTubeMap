// Type file for documentation
// (not actually enforced by Typescript)

// All the paths are scoped to a type on the server side.
// This is the type of data paths we are working with, such as "mounted", "upload", or "default" - see server.js.
type DataPath = "mounted" | "default" | "upload";

// Describes whether a built-in example, user uploaded file, mounted, or synthetic example
// Fills input for the "Data:" dropdown in the HeaderForm
type DataType = "built-in" | "file-upload" | "mounted files" | "examples";

// Possible filestypes taken from the request
// Files like GBZ contains graph and maybe haplotype and so can be either
type filetype = "graph" | "haplotype" | "read" | "bed";

// Describes a file via name and type(graph, haplotype)
// e.g name: cactus.xg, type: graph
type file = {
  name: string;
  type: filetype;
};

// Contains information necessary to make a track
type track = {
  files: Array<file>
}

// Describes something the Tube Map can look at, specifically a region and the files the region is in.
// These parameters can be extracted from defaults (config), Header Form input, or URL parameters
type ViewTarget = {
  region: string; // Format: path:start-end
  tracks: Array<track>;
  bedFile?: string;

  // Non-essential to server, used for examples
  name?: string;
  dataPath: DataPath;
  dataType: DataType;
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
