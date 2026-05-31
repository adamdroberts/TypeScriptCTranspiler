const seen: string[] = [];
function mark(label: string): string {
    seen.push(label);
    return label;
}

const params = new URLSearchParams("z=9&a=1&b=two&a=3");
console.log("before:", params.toString());

// Test sort with ignored arguments to cover ignored args evaluation
params.sort(mark("ignored_arg"));

console.log("after:", params.toString());

// Test iteration after sort to cover order of keys, values, entries, and for-of loop
console.log("keys:", Array.from(params.keys()).join(","));
console.log("values:", Array.from(params.values()).join(","));
for (const [key, val] of params) {
    console.log("entry:", key, "=", val);
}

// Test duplicate stability (equal names should preserve their original order of duplicate values)
const params2 = new URLSearchParams("b=1&a=first&b=2&a=second");
params2.sort();
console.log("stable duplicates:", params2.toString());

console.log("seen:", seen.join(","));
