const items: any = ["red", "blue"];

items["1"] = "cyan";
console.log("string index:", items.join("|"), items[1]);

console.log("reflect index:", Reflect.set(items, "3", "gold"));
console.log("expanded:", items.length, items[2], items[3], items.join("|"));

console.log("reflect length:", Reflect.set(items, "length", 2));
console.log("truncated:", items.length, items.join("|"));

console.log("delete length:", Reflect.deleteProperty(items, "length"));

const keyed: any = ["zero", "one"];
keyed[1.5] = "half";
keyed[-1] = "minus";
console.log("numeric props:", keyed[1.5], keyed[-1], keyed[1], keyed.length, Object.keys(keyed).join("|"));

const boundary: any = [];
boundary["4294967295"] = "max";
boundary["4294967296"] = "beyond";
console.log("boundary props:", boundary.length, boundary["4294967295"], boundary["4294967296"], Object.keys(boundary).join("|"));

const numericBoundary: any = [];
numericBoundary[4294967295] = "numeric-max";
numericBoundary[4294967296] = "numeric-beyond";
console.log("numeric boundary props:", numericBoundary.length, numericBoundary[4294967295], numericBoundary[4294967296], Object.keys(numericBoundary).join("|"));
