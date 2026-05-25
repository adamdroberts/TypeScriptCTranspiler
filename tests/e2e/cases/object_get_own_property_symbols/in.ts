let hits = 0;
let marks = "";

function makeDynamic(): any {
    hits++;
    return { value: 1 };
}

function mark(label: string): string {
    marks += label;
    return label;
}

const dynamicObject: any = { label: "dynamic" };

console.log("plain:", Object.getOwnPropertySymbols({ value: 1 }).length);
console.log("array:", Object.getOwnPropertySymbols(["a", "b"]).length);
console.log("string:", Object.getOwnPropertySymbols("abc").length);
console.log("dynamic:", Object.getOwnPropertySymbols(dynamicObject).length);
console.log("side:", Object.getOwnPropertySymbols(makeDynamic()).length, hits);
console.log("ignored:", Object.getOwnPropertySymbols(dynamicObject, mark("a"), mark("b")).length, marks);

try {
    console.log(Object.getOwnPropertySymbols(null as any).length);
} catch (e) {
    console.log("null:", e);
}
