let marks = "";
function mark(label: string): string {
    marks += label;
    return label;
}

const target: any = {};
console.log(
    "define:",
    Object.defineProperty(target, "a", { value: 1, enumerable: true }, mark("a")) === target,
    target.a,
);

const descriptorMap: any = { b: { value: 2, enumerable: true } };
console.log("properties var:", Object.defineProperties(target, descriptorMap, mark("b")) === target, target.b);
console.log(
    "properties literal:",
    Object.defineProperties(target, { c: { value: 3, enumerable: true } }, mark("c"), mark("d")) === target,
    target.c,
);

const values = [4, 5];
console.log(
    "array define:",
    Object.defineProperty(values, "1", { value: 8, enumerable: true, writable: true, configurable: true }, mark("e")) === values,
    values[1],
);

function sample(): void {}
const dynamicSample: any = sample;
console.log(
    "function define:",
    Object.defineProperty(dynamicSample, "name", { value: "sample", enumerable: false }, mark("f")) === dynamicSample,
    dynamicSample.name,
);

function typedSample(): void {}
const typedFunctionProperties = Object.defineProperties(
    typedSample,
    {
        name: { value: "typedSample", writable: false, enumerable: false, configurable: false },
    },
    mark("g"),
);
console.log(
    "typed function properties:",
    typedFunctionProperties === typedSample,
    Object.hasOwn(typedSample, "name"),
    Reflect.get(typedSample, "name"),
);

function runtimeSample(): void {}
const runtimeFunctionDescriptors: any = {
    length: { value: 0, writable: false, enumerable: false, configurable: false },
};
const runtimeFunctionProperties = Object.defineProperties(runtimeSample, runtimeFunctionDescriptors, mark("h"));
console.log(
    "runtime function properties:",
    runtimeFunctionProperties === runtimeSample,
    Object.hasOwn(runtimeSample, "length"),
    Reflect.get(runtimeSample, "length"),
);

console.log("keys:", Object.keys(target).join("|"), Object.keys(values).join("|"), Object.keys(dynamicSample).join("|"));
console.log("marks:", marks);
