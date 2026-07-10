const values: any[] = ["keep", "drop", "last"];
const deleted = delete values[1];
console.log("delete:", deleted, values.length, values.join("|"), Object.hasOwn(values, "1"), Object.keys(values).join("|"));
