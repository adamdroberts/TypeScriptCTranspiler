import { URLSearchParams as NodeURLSearchParams } from "node:url";

const seen: string[] = [];
function mark(label: string): string {
    seen.push(label);
    return label;
}

const params = new URLSearchParams("a=1&b=two+words&a=3&a=4&c=5", mark("ctor"));

const allA = params.getAll("a");
console.log("allA length:", allA.length);
console.log("allA elements:", allA.join(","));

const allB = params.getAll("b", mark("ignored_arg"));
console.log("allB elements:", allB.join(","));

const allX = params.getAll("missing");
console.log("allX length:", allX.length);

const fromModule = new NodeURLSearchParams("?x=first&x=second");
const allXMod = fromModule.getAll("x");
console.log("module allX elements:", allXMod.join(" & "));

console.log("seen:", seen.join(","));
