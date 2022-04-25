// Type file for documentation
// (not actually enforced by Typescript)

type DataPath = "mounted" | "default" | "upload";
// All the paths are scoped to a type on the server side.
// This is the type of data paths we are working with, such as "mounted", "upload", or "default" - see server.js.

// Describes something the Tube Map can look at, specifically a region and the files the region is in.
// These parameters can be extracted from defaults (config), Header Form input, or URL parameters
type ViewTarget = {
  region: string; // Format: path:start-end
  xgFile: string;
  gbwtFile?: string;
  gamFile?: string;
  bedFile?: string;
  dataPath: DataPath;
  name?: string; // Non-essential to server, used for examples
};

// Used by header form to select which option for Data: dropdown
type DataType = "built-in" | "file-upload" | "mounted files" | "examples";
