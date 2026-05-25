import fs, { constants } from "node:fs";
import * as nodeFs from "fs";

const writeCreate = constants.O_WRONLY | constants.O_CREAT;
const appendCreate = fs.constants.O_APPEND | fs.constants.O_CREAT;
const guarded = nodeFs.constants.O_NOFOLLOW | nodeFs.constants.O_DIRECTORY;

console.log("open:", constants.O_RDONLY, constants.O_WRONLY, constants.O_RDWR);
console.log("write:", constants.O_CREAT, constants.O_EXCL, constants.O_TRUNC, constants.O_APPEND);
console.log("path:", constants.O_DIRECTORY, constants.O_NOFOLLOW);
console.log("combined:", writeCreate, appendCreate, guarded);
