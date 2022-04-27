// Type file for documentation
// (not actually enforced by Typescript)

type DataPath = "mounted" | "default" | "upload";
// All the paths are scoped to a type on the server side.
// This is the type of data paths we are working with, such as "mounted", "upload", or "default" - see server.js.

// Describes whether a built-in example, user uploaded file, mounted, or synthetic example
// Fills input for the "Data:" dropdown in the HeaderForm
type DataType = "built-in" | "file-upload" | "mounted files" | "examples";


/* path to type
 * mounted - mounted
 * upload - upload
 * built-in - examples (?)
 * built-in - default(internal) or mounted
 *
 * reedundant between name, data type, and data path. 
 * if we just use name it should be easy
 */

// Describes something the Tube Map can look at, specifically a region and the files the region is in.
// These parameters can be extracted from defaults (config), Header Form input, or URL parameters
type ViewTarget = {
  region: string; // Format: path:start-end
  xgFile: string;
  gbwtFile?: string;
  gamFile?: string;
  bedFile?: string;
// Non-essential to server, used for examples

  name?: string;   
  dataPath: DataPath;
  dataType: DataType;
};

