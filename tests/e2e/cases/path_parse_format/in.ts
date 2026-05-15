import { format, parse } from "node:path";

const parsed = path.parse("/tmp/demo/file.txt");
const named = parse("file");

console.log("parsed:", parsed.root, parsed.dir, parsed.base, parsed.ext, parsed.name);
console.log("format parsed:", path.format(parsed));
console.log("format parts:", format({ dir: "/tmp/demo", name: "file", ext: ".txt" }));
console.log("format root:", format({ root: "/", base: "file.txt" }));
console.log("named:", named.root, named.dir, named.base, named.ext, named.name);
