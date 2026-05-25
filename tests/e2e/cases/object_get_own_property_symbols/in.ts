let hits = 0;

function makeDynamic(): any {
    hits++;
    return { value: 1 };
}

const dynamicObject: any = { label: "dynamic" };

console.log("plain:", Object.getOwnPropertySymbols({ value: 1 }).length);
console.log("array:", Object.getOwnPropertySymbols(["a", "b"]).length);
console.log("string:", Object.getOwnPropertySymbols("abc").length);
console.log("dynamic:", Object.getOwnPropertySymbols(dynamicObject).length);
console.log("side:", Object.getOwnPropertySymbols(makeDynamic()).length, hits);

try {
    console.log(Object.getOwnPropertySymbols(null as any).length);
} catch (e) {
    console.log("null:", e);
}
