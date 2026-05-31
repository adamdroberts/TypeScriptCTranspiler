import { URLSearchParams as NodeURLSearchParams } from "node:url";

const seen: string[] = [];
function mark(label: string): string {
    seen.push(label);
    return label;
}

const params = new URLSearchParams("a=1&b=two+words&a=3", mark("ctor"));
console.log("read:", params.get("a"), params.get("b"), params.has("c"), params.toString());

params.set("a", "final value", mark("set"));
params.append("c", "x/y", mark("append"));
params.delete("b", undefined, mark("delete"));
console.log("mutated:", params.get("a", mark("get")), params.has("b", undefined, mark("has")), params.toString(mark("string")));

const url = new URL("https://example.com/path?x=1&y=two");
console.log("url:", url.searchParams.get("x"), url.searchParams.toString());

const fromModule = new NodeURLSearchParams("?q=hello%20there");
console.log("module:", fromModule.get("q"), fromModule.toLocaleString(), fromModule.valueOf() === fromModule);
console.log("seen:", seen.join(","));
