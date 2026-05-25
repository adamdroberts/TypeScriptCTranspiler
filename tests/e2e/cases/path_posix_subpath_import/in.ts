import posixPath, { basename, relative } from "node:path/posix";
import * as pathPosix from "path/posix";

console.log("default:", posixPath.join("/tmp", "a", "..", "b"), posixPath.sep);
console.log("named:", basename("/tmp/file.txt", ".txt"), relative("/tmp/a", "/tmp/a/b/c"));
console.log("namespace:", pathPosix.dirname("/tmp/a/b.txt"), pathPosix.extname("/tmp/a/b.txt"), pathPosix.delimiter);
