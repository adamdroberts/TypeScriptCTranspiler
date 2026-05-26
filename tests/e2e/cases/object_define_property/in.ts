const obj: any = {};

Object.defineProperty(obj, "answer", { value: 42, writable: false });
Object.defineProperty(obj, "label", { value: "life", enumerable: true });

console.log("answer:", obj.answer);
console.log("label:", obj["label"]);
console.log("json:", JSON.stringify(obj));

function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

const closed: any = {};
Object.preventExtensions(closed);
report("failed", (): any => Object.defineProperty(closed, "blocked", { value: 1, enumerable: true }));
