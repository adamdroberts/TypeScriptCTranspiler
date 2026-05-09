const values: any = [1, true, null, undefined, "x"];
const nested: any = [1, [2, [3, 4]], 5];

console.log("values:", values.toString());
console.log("locale:", values.toLocaleString());
console.log("nested:", nested.toString());
