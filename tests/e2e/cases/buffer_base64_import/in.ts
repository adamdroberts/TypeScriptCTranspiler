import bufferDefault, { atob, atob as atobAlias, btoa, btoa as btoaAlias } from "node:buffer";
import * as bufferNs from "buffer";

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

console.log("named:", btoa("Hi"), atob("SGk="));
console.log("alias:", btoaAlias("Az"), atobAlias("QXo="));
console.log("namespace:", bufferNs.btoa("OK"), bufferNs.atob("T0s="));
console.log("default:", bufferDefault.btoa("Yo", mark("b")), bufferDefault.atob("WW8=", mark("a")), seen);
