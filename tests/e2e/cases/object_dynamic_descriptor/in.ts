const dataDesc: any = { value: 7, writable: true, enumerable: true, configurable: true };
const target: any = {};

console.log("object define:", Object.defineProperty(target, "a", dataDesc) === target, target.a);
console.log("object keys:", Object.keys(target).join(","));

const reflectTarget: any = {};
const reflectDesc: any = { value: "x", enumerable: true };
console.log("reflect define:", Reflect.defineProperty(reflectTarget, "name", reflectDesc), reflectTarget.name);
console.log("reflect keys:", Object.keys(reflectTarget).join(","));

Object.preventExtensions(reflectTarget);
const failedDesc: any = { value: 1, configurable: true };
console.log("reflect failed:", Reflect.defineProperty(reflectTarget, "other", failedDesc));

const arrayTarget: any = [];
const arrayDesc: any = { value: "first", writable: true, enumerable: true, configurable: true };
console.log("array define:", Object.defineProperty(arrayTarget, "0", arrayDesc) === arrayTarget, arrayTarget[0], arrayTarget.length);

function Named(this: any): void {
}

const fnTarget: any = Named as any;
const fnDesc: any = { value: "Named" };
console.log("function define:", Reflect.defineProperty(fnTarget, "name", fnDesc), fnTarget.name);

const emptyArrayDesc: any = [];
const emptyArrayTarget: any = {};
console.log(
    "array descriptor default:",
    Object.defineProperty(emptyArrayTarget, "arrDefault", emptyArrayDesc) === emptyArrayTarget,
    Object.prototype.hasOwnProperty.call(emptyArrayTarget, "arrDefault"),
    String(emptyArrayTarget.arrDefault),
    Object.keys(emptyArrayTarget).length,
);

const descriptorArrayMap: any = [{ value: "zero", enumerable: true, configurable: true }];
const descriptorArrayTarget: any = {};
console.log(
    "array descriptor map:",
    Object.defineProperties(descriptorArrayTarget, descriptorArrayMap) === descriptorArrayTarget,
    descriptorArrayTarget[0],
    Object.keys(descriptorArrayTarget).join(","),
);
