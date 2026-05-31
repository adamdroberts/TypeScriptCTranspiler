import * as qs1 from "querystring";
import * as qs2 from "node:querystring";
import qs3 from "querystring";
import { parse, stringify } from "querystring";
import { parse as parseNode, stringify as stringifyNode } from "node:querystring";

let sideEffectTracker = "";
function mark(label: string): string {
    sideEffectTracker += label;
    return label;
}

console.log("--- 1. Basic Parse & Stringify ---");
const str1 = "foo=bar&baz=qux&a=123";
const parsed1 = qs1.parse(str1);
console.log("proto is null:", Object.getPrototypeOf(parsed1) === null);
console.log("parsed1.foo:", parsed1.foo);
console.log("parsed1.baz:", parsed1.baz);
console.log("parsed1.a:", parsed1.a);

const stringified1 = qs2.stringify(parsed1);
console.log("stringified1:", stringified1);

console.log("--- 2. Duplicate Keys ---");
const str2 = "foo=bar&baz=qux&baz=abc&baz=123";
const parsed2 = qs3.parse(str2);
console.log("parsed2.foo:", parsed2.foo);
console.log("parsed2.baz is array:", Array.isArray(parsed2.baz));
console.log("parsed2.baz.length:", parsed2.baz.length);
console.log("parsed2.baz[0]:", parsed2.baz[0]);
console.log("parsed2.baz[1]:", parsed2.baz[1]);
console.log("parsed2.baz[2]:", parsed2.baz[2]);

const stringified2 = stringify(parsed2);
console.log("stringified2:", stringified2);

console.log("--- 3. Custom delimiters (sep & eq) ---");
const str3 = "foo:bar;baz:qux;baz:abc";
const parsed3 = parseNode(str3, ";", ":");
console.log("parsed3.foo:", parsed3.foo);
console.log("parsed3.baz[0]:", parsed3.baz[0]);
console.log("parsed3.baz[1]:", parsed3.baz[1]);

const stringified3 = stringifyNode(parsed3, ";", ":");
console.log("stringified3:", stringified3);

console.log("--- 4. Percent Encoding & Spaces ---");
const str4 = "a%20b=c%20d&foo+bar=baz+qux";
const parsed4 = parse(str4);
console.log("parsed4['a b']:", parsed4["a b"]);
console.log("parsed4['foo bar']:", parsed4["foo bar"]);

const stringified4 = stringify(parsed4);
console.log("stringified4:", stringified4);

console.log("--- 5. Ignored Trailing/Extra Arguments ---");
const parsed5 = parse("foo=bar", "&", "=", {}, mark("P"));
console.log("parsed5.foo:", parsed5.foo);

const stringified5 = stringify({ foo: "bar" }, "&", "=", {}, mark("S"));
console.log("stringified5:", stringified5);
console.log("side effects:", sideEffectTracker);
