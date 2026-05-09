const obj: any = {};

Object.defineProperty(obj, "visible", {
    value: 1,
    writable: false,
    enumerable: true,
    configurable: false,
});
Object.defineProperty(obj, "hidden", {
    value: "h",
    writable: true,
    enumerable: false,
    configurable: true,
});

const descs: any = Object.getOwnPropertyDescriptors(obj);

console.log("keys:", Object.keys(descs).join("|"));
console.log("visible:", descs.visible.value, descs.visible.writable, descs.visible.enumerable, descs.visible.configurable);
console.log("hidden:", descs.hidden.value, descs.hidden.writable, descs.hidden.enumerable, descs.hidden.configurable);
