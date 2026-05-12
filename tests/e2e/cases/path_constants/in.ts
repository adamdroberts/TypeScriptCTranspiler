import { sep, delimiter } from "node:path";
import * as nodepath from "path";

console.log("global:", path.sep, path.delimiter);
console.log("named:", sep, delimiter);
console.log("namespace:", nodepath.sep, nodepath.delimiter);
