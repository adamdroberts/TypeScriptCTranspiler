import * as nodePath from "node:path";
import { posix } from "path";

const parsed = posix.parse("/tmp/file.txt");

console.log("global:", path.posix.join("alpha", "beta"), path.posix.sep, path.posix.delimiter);
console.log("namespace:", nodePath.posix.normalize("/a//b/.."), nodePath.posix.isAbsolute("/x"));
console.log("named:", posix.relative("/a/b", "/a/c"), posix.format(parsed));
