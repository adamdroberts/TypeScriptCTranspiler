import * as qs1 from "querystring";
import * as qs2 from "node:querystring";
import qs3 from "querystring";
import { escape, unescape } from "querystring";
import { escape as escapeNode, unescape as unescapeNode } from "node:querystring";

let sideEffectTracker = "";
function mark(label: string): string {
    sideEffectTracker += label;
    return label;
}

console.log("--- 1. Named, Namespace, and Default Imports ---");
const input1 = "hello world+nodejs";
const escaped1 = qs1.escape(input1);
console.log("Namespace escape 1:", escaped1);
console.log("Namespace unescape 1:", qs1.unescape(escaped1));

const escaped2 = qs2.escape(input1);
console.log("Namespace escape 2:", escaped2);
console.log("Namespace unescape 2:", qs2.unescape(escaped2));

const escaped3 = qs3.escape(input1);
console.log("Default escape:", escaped3);
console.log("Default unescape:", qs3.unescape(escaped3));

const escaped4 = escape(input1);
console.log("Named escape 1:", escaped4);
console.log("Named unescape 1:", unescape(escaped4));

const escaped5 = escapeNode(input1);
console.log("Named escape 2:", escaped5);
console.log("Named unescape 2:", unescapeNode(escaped5));

console.log("--- 2. Plus and Percent Behavior ---");
// unescape converts + to space, but escape percent-encodes + to %2B
const inputWithPlus = "a+b";
const escapedPlus = escape(inputWithPlus);
console.log("escaped a+b:", escapedPlus);
console.log("unescaped escapedPlus:", unescape(escapedPlus));

const inputWithSpace = "a b";
const escapedSpace = escape(inputWithSpace);
console.log("escaped a b:", escapedSpace);
console.log("unescaped escapedSpace:", unescape(escapedSpace));

// Test raw plus character in unescape (should become space)
console.log("unescaped a+b (raw):", unescape("a+b"));
console.log("unescaped a%20b (percent):", unescape("a%20b"));
console.log("unescaped a%2Bb (percent):", unescape("a%2Bb"));

console.log("--- 3. Ignored Trailing Arguments ---");
const escapedWithIgnored = escape("hello", mark("E"));
console.log("escaped hello:", escapedWithIgnored);

const unescapedWithIgnored = unescape("hello", mark("U"));
console.log("unescaped hello:", unescapedWithIgnored);

console.log("side effects:", sideEffectTracker);
