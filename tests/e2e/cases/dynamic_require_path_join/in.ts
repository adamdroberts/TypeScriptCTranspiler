import * as path from "path";
import { resolve as pathResolve } from "node:path";

const first: any = require(path.join(__dirname, "path_a"));
console.log("path first:", first.label);

const second: any = require(pathResolve(__dirname, "./path_b"));
console.log("path second:", second.label);
