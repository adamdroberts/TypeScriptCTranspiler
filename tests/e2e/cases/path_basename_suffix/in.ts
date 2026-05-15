import { basename, posix } from "path";
import * as nodePath from "node:path";

console.log("global:", path.basename("/tmp/file.txt", ".txt"));
console.log("namespace:", nodePath.basename("/tmp/archive.tar.gz", ".gz"));
console.log("named:", basename("alpha/beta.ts", ".ts"));
console.log("posix:", posix.basename("/data/report.json", ".json"));
console.log("partial:", path.basename("/tmp/file.txt", "txt"));
console.log("miss:", path.basename("/tmp/file.txt", ".js"));
