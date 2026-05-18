import { relative } from "node:path";
let seen = "";
function mark(label: string): string {
  seen += label;
  return label;
}

console.log("absolute:", path.relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb", mark("r")));
console.log("relative:", path.relative("a/b/c", "a/d/e"));
console.log("same:", path.relative("a/b", "a/b"));
console.log("named:", relative("src/lib", "src/app/main.ts"));
console.log("ignored:", seen);
