const values: any = [1, true, null, undefined, "x"];
const nested: any = [1, [2, [3, 4]], 5];

console.log("values:", values.toString());
console.log("locale:", values.toLocaleString());
console.log("nested:", nested.toString());

const custom: any = { label: "obj" };
custom.toLocaleString = function () {
    return "locale:" + custom.label;
};
const numericLocale: any = {};
numericLocale.toLocaleString = function () {
    return 77;
};
const localeValues: any = [custom, numericLocale, null, undefined, "tail"];
console.log("custom locale:", localeValues.toLocaleString());

const bad: any = { toLocaleString: 7 };
const badValues: any = [bad];
try {
    console.log(badValues.toLocaleString());
} catch (e) {
    console.log("bad locale:", e);
}
