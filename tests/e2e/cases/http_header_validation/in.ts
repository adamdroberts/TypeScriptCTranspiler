import httpDefault, { validateHeaderName, validateHeaderValue } from "node:http";
import * as httpNamespace from "http";

console.log("valid:", validateHeaderName("Content-Type"), validateHeaderValue("Content-Type", "ok"), httpDefault.validateHeaderName("X"), httpNamespace.validateHeaderValue("X", "ok"));

try {
    httpNamespace.validateHeaderName("Bad Name");
} catch (error) {
    console.log("name error:", String(error));
}
try {
    httpDefault.validateHeaderValue("X-Test", "bad\nvalue");
} catch (error) {
    console.log("value error:", String(error));
}

let seen = "";
function mark(value: string): string {
    seen += value;
    return value;
}
validateHeaderName("X-Test", mark("label"), mark("extra-name"));
validateHeaderValue("X-Test", "ok", mark("extra-value"));
console.log("side effects:", seen);
