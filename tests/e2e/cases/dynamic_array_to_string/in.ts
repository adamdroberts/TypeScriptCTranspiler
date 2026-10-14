const values: any = [1, true, null, undefined, "x"];
const nested: any = [1, [2, [3, 4]], 5];

console.log("values:", values.toString());
console.log("locale:", values.toLocaleString());
console.log("nested:", nested.toString());

const custom: any = { label: "obj" };
// The selected ECMA-262 profile excludes ECMA-402: element methods receive
// an empty argument List, even when the caller supplies reserved options.
custom.toLocaleString = function (locale: any, options: any, extra: any) {
    return "locale:" + custom.label + ":" + String(locale) + ":" + String(options) + ":" + String(extra);
};
const numericLocale: any = {};
numericLocale.toLocaleString = function (locale: any) {
    return "77:" + String(locale);
};
const localeValues: any = [custom, numericLocale, null, undefined, "tail"];
console.log("custom locale:", localeValues.toLocaleString("fr", { style: "short" }));
let trace = "";
const ignoredLocaleArg = (): any => { trace += "A"; return "ignored"; };
console.log("custom locale trailing:", localeValues.toLocaleString("fr", { style: "short" }, ignoredLocaleArg()));
console.log("caller effects:", trace);

const bad: any = { toLocaleString: 7 };
const badValues: any = [bad];
try {
    console.log(badValues.toLocaleString());
} catch (e) {
    console.log("bad locale:", e instanceof TypeError);
}
