// @ts-nocheck: string length proofs are intentionally validated by the AOT resolver.
type Choice = "a" | "bb";

const rawTemplate: any = { raw: ["", ""] };

function load(choice: Choice): any {
    return require("./string_len_" + choice.length);
}

const direct = require("./string_len_" + "hello".length);
const combined = require("./string_len_" + ("a" + "bc").length);
const constructed = require("./string_len_" + String("four").length);
const raw = require("./string_len_" + String.raw(rawTemplate, "x").length);

console.log(direct.label, combined.label, constructed.label, raw.label, load("bb").label);
