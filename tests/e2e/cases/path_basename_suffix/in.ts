import { basename, posix } from "path";
import * as nodePath from "node:path";
let seen = "";
function mark(label: string): string {
  seen += label;
  return label;
}

console.log("global:", path.basename("/tmp/file.txt", ".txt", mark("b")));
console.log("namespace:", nodePath.basename("/tmp/archive.tar.gz", ".gz"));
console.log("named:", basename("alpha/beta.ts", ".ts"));
console.log("posix:", posix.basename("/data/report.json", ".json"));
console.log("partial:", path.basename("/tmp/file.txt", "txt"));
console.log("miss:", path.basename("/tmp/file.txt", ".js"));
console.log("dirname/extname:", path.dirname("/tmp/file.txt", mark("d")), path.extname("/tmp/file.txt", mark("e")));
console.log("ignored:", seen);
