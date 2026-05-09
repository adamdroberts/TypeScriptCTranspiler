const proto: any = { inherited: 1 };
const obj: any = Object.create(proto);
obj.visible = 2;

Object.defineProperty(obj, "hidden", {
    value: 3,
    enumerable: false,
    configurable: true,
});

console.log("visible:", obj.propertyIsEnumerable("visible"));
console.log("hidden:", obj.propertyIsEnumerable("hidden"));
console.log("inherited:", obj.propertyIsEnumerable("inherited"));
console.log("missing:", obj.propertyIsEnumerable("missing"));
