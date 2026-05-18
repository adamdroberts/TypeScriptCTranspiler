import { posix, toNamespacedPath } from "path";
import * as nodePath from "node:path";

const dynamicPath = "/tmp/" + "demo";
let seen = "";
function mark(label: string): string {
  seen += label;
  return label;
}

console.log("global:", path.toNamespacedPath(dynamicPath, mark("t")));
console.log("namespace:", nodePath.toNamespacedPath("/tmp/ns"));
console.log("named:", toNamespacedPath("relative/file.txt"));
console.log("posix:", posix.toNamespacedPath("/data/report.txt"));
console.log("ignored:", seen);
