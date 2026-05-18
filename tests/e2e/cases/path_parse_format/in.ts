import { format, parse } from "node:path";
let seen = "";
function mark(label: string): string {
  seen += label;
  return label;
}

const parsed = path.parse("/tmp/demo/file.txt", mark("p"));
const named = parse("file");

console.log("parsed:", parsed.root, parsed.dir, parsed.base, parsed.ext, parsed.name);
console.log("format parsed:", path.format(parsed, mark("f")));
console.log("format parts:", format({ dir: "/tmp/demo", name: "file", ext: ".txt" }));
console.log("format root:", format({ root: "/", base: "file.txt" }));
console.log("named:", named.root, named.dir, named.base, named.ext, named.name);
console.log("ignored:", seen);
