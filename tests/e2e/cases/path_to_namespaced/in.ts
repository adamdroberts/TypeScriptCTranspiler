import { posix, toNamespacedPath } from "path";
import * as nodePath from "node:path";

const dynamicPath = "/tmp/" + "demo";

console.log("global:", path.toNamespacedPath(dynamicPath));
console.log("namespace:", nodePath.toNamespacedPath("/tmp/ns"));
console.log("named:", toNamespacedPath("relative/file.txt"));
console.log("posix:", posix.toNamespacedPath("/data/report.txt"));
