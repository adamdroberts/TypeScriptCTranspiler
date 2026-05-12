import { relative } from "node:path";

console.log("absolute:", path.relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb"));
console.log("relative:", path.relative("a/b/c", "a/d/e"));
console.log("same:", path.relative("a/b", "a/b"));
console.log("named:", relative("src/lib", "src/app/main.ts"));
