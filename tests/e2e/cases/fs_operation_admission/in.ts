import { open } from "node:fs/promises";
function useLocal(fs: any): any { return fs.readFileSync("local"); }
const local: any = { readFileSync(value: any): any { return "shadow:" + value; } };
console.log("receiver:", useLocal(local));
open("package.json", "r").then((handle: any): any => handle.close()).then((): void => console.log("named open:", true));
