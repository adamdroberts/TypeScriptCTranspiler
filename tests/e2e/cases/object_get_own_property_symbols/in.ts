let hits = 0;

function makeDynamic(): any {
    hits++;
    return { value: 1 };
}

const dynamicObject: any = { label: "dynamic" };

// @ts-ignore: Object.getOwnPropertySymbols is covered even though this case's lib target does not declare it.
console.log("plain:", Object.getOwnPropertySymbols({ value: 1 }).length);
// @ts-ignore: Object.getOwnPropertySymbols is covered even though this case's lib target does not declare it.
console.log("array:", Object.getOwnPropertySymbols(["a", "b"]).length);
// @ts-ignore: Object.getOwnPropertySymbols is covered even though this case's lib target does not declare it.
console.log("string:", Object.getOwnPropertySymbols("abc").length);
// @ts-ignore: Object.getOwnPropertySymbols is covered even though this case's lib target does not declare it.
console.log("dynamic:", Object.getOwnPropertySymbols(dynamicObject).length);
// @ts-ignore: Object.getOwnPropertySymbols is covered even though this case's lib target does not declare it.
console.log("side:", Object.getOwnPropertySymbols(makeDynamic()).length, hits);

try {
    // @ts-ignore: Object.getOwnPropertySymbols is covered even though this case's lib target does not declare it.
    console.log(Object.getOwnPropertySymbols(null as any).length);
} catch (e) {
    console.log("null:", e);
}
