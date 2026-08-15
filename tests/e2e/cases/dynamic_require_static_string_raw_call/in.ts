// @ts-nocheck: String.raw call templates are intentionally validated by the AOT resolver.
type Suffix = "a" | "b";

const template: any = { raw: ["./raw_call_", ""] };

function loadRaw(name: Suffix): any {
    return require(String.raw(template, name));
}

const first = loadRaw("b");
const second: any = require(String.raw(template, "a"));
const missing: any = require(String.raw(template));

console.log("raw call first:", first.label);
console.log("raw call second:", second.label);
console.log("raw call missing:", missing.label);
