console.log("source:" + eval(JSON.stringify("41;")));
console.log("surrogate:" + JSON.stringify("\ud800"));
function replace(key: string, value: any): any {
    return typeof value === "number" ? value + 1 : value;
}
console.log("replacer:" + JSON.stringify({ value: 17 }, replace));
console.log("list:" + JSON.stringify({ a: 1, b: 2 }, ["b", "b"]));
const object = { toJSON(key: string) { return key === "" ? 19 : 23; } };
console.log("hook:" + JSON.stringify(object));
console.log("gap:" + JSON.stringify([1, { value: 2 }], null, 1));
let effects = 0;
console.log("extra:" + JSON.stringify(true, undefined, undefined, effects++));
console.log("effects:" + effects);
