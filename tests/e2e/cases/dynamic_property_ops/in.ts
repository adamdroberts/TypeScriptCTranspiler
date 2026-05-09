const obj: any = { visible: 1 };

Object.defineProperty(obj, "locked", {
    value: 2,
    writable: true,
    enumerable: true,
    configurable: false,
});

console.log("visible in:", "visible" in obj);
console.log("missing in:", "missing" in obj);
console.log("delete visible:", delete obj.visible);
console.log("visible after:", "visible" in obj);
console.log("delete locked:", delete obj["locked"]);
console.log("locked after:", Object.hasOwn(obj, "locked"));
console.log("json:", JSON.stringify(obj));
