const values: any[] = ["keep", "drop", "last"];
const deleted = delete values[1];
console.log("delete:", deleted, values.length, values.join("|"), Object.hasOwn(values, "1"), Object.keys(values).join("|"));
console.log("names:", Object.getOwnPropertyNames(values).join("|"));
console.log("values:", Object.values(values).join("|"));
const entries: any = Object.entries(values);
console.log("entries:", entries[0][0] + ":" + entries[0][1] + "|" + entries[1][0] + ":" + entries[1][1]);
const descriptors: any = Object.getOwnPropertyDescriptors(values);
console.log("descriptors:", Object.keys(descriptors).join("|"), Object.hasOwn(descriptors, "1"), Object.hasOwn(descriptors, "2"));
