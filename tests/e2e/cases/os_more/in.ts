import * as nodeOs from "node:os";
import { EOL, endianness, release, type, type as typeAlias } from "os";

console.log("global:", os.type().length > 0, os.release().length > 0, os.endianness());
console.log("namespace:", nodeOs.type().length > 0, nodeOs.release().length > 0, nodeOs.EOL === "\n");
console.log("named:", type().length > 0, release().length > 0, endianness(), EOL === "\n");
console.log("alias:", typeAlias().length > 0);
let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}
console.log("ignored:", os.type(mark("t")).length > 0, nodeOs.release(mark("r")).length > 0, endianness(mark("e")), typeAlias(mark("a")).length > 0, seen);
