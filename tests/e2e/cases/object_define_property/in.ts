const obj: any = {};

Object.defineProperty(obj, "answer", { value: 42, writable: false });
Object.defineProperty(obj, "label", { value: "life", enumerable: true });

console.log("answer:", obj.answer);
console.log("label:", obj["label"]);
console.log("json:", JSON.stringify(obj));
