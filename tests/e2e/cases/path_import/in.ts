import { normalize, normalize as normalizeAlias, isAbsolute, isAbsolute as isAbsoluteAlias } from "node:path";
import * as nodepath from "path";

console.log("named normalize:", normalize("x//y/.."));
console.log("named absolute:", isAbsolute("/x"));
console.log("alias:", normalizeAlias("a//b/.."), isAbsoluteAlias("relative"));
console.log("namespace basename:", nodepath.basename("/tmp/file.txt"));
console.log("namespace normalize:", nodepath.normalize("/a/./b"));
