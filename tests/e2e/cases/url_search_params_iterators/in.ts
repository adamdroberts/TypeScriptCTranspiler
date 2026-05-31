const seen: string[] = [];
function mark(label: string): string {
    seen.push(label);
    return label;
}

const params = new URLSearchParams("a=1&b=two&a=3");

// 1. keys(), values(), entries() with ignored argument evaluation
const keys = params.keys(mark("keys"));
const values = params.values(mark("values"));
const entries = params.entries(mark("entries"));

console.log("keys:", Array.from(keys).join(","));
console.log("values:", Array.from(values).join(","));
for (const entry of Array.from(entries)) {
    console.log("entry:", entry[0], "->", entry[1]);
}

// 2. for-of loop (destructuring)
for (const [key, val] of params) {
    console.log("for-of:", key, "=", val);
}

// 3. forEach
params.forEach((value, key, parent) => console.log("forEach callback:", key, "has value", value, "parent length", parent.toString().length), null, mark("forEach"));

// 4. forEach with custom thisArg
class Context {
    prefix = "item: ";
}
function cb(this: Context, value: string, key: string) {
    console.log(this.prefix + key + " = " + value);
}
const ctx = new Context();
params.forEach(cb, ctx);

// 5. Computed [Symbol.iterator]() manual invocation and next()
const iterator = params[Symbol.iterator]();
const entry1 = iterator.next().value;
console.log("manual iterator 1:", entry1[0], "->", entry1[1]);
const entry2 = iterator.next().value;
console.log("manual iterator 2:", entry2[0], "->", entry2[1]);
const entry3 = iterator.next().value;
console.log("manual iterator 3:", entry3[0], "->", entry3[1]);
console.log("manual iterator 4 done:", iterator.next().done);

console.log("seen:", seen.join(","));
