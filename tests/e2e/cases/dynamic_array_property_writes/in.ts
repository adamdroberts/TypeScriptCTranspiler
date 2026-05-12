const items: any = ["red", "blue"];

items["1"] = "cyan";
console.log("string index:", items.join("|"), items[1]);

console.log("reflect index:", Reflect.set(items, "3", "gold"));
console.log("expanded:", items.length, items[2], items[3], items.join("|"));

console.log("reflect length:", Reflect.set(items, "length", 2));
console.log("truncated:", items.length, items.join("|"));

console.log("delete length:", Reflect.deleteProperty(items, "length"));
