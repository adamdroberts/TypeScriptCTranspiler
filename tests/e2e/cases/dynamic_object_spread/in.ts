const base: any = { a: 1, b: "old" };
const text: any = "xy";
const empty: any = undefined;

const merged: any = { start: "s", ...base, b: "new", ...text };
console.log("fields:", merged.start, merged.a, merged.b, merged["0"], merged["1"]);

const nullish: any = { ...empty, ok: "yes" };
console.log("nullish:", nullish.ok, Object.keys(nullish).length);
