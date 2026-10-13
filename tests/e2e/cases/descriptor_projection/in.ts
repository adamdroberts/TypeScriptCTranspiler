const descriptorTarget = { field: 17 };
let interceptedWrites = 0;
Object.defineProperties(Object.prototype, {
    value: {configurable: true, set(value: any) { interceptedWrites++; }},
    done: {configurable: true, set(value: any) { interceptedWrites++; }},
});
try {
    const descriptor = Object.getOwnPropertyDescriptor(descriptorTarget, "field")!;
    const step = [23].values().next();
    console.log("descriptor:", Object.hasOwn(descriptor, "value"), descriptor.value, Object.keys(descriptor).join(","));
    console.log("iterator:", Object.hasOwn(step, "value"), Object.hasOwn(step, "done"), step.value, step.done);
    console.log("intercepted:", interceptedWrites);
} finally {
    delete (Object.prototype as any).value;
    delete (Object.prototype as any).done;
}
const fakeGetter = function() {};
(Object.prototype as any).get = fakeGetter;
try {
    console.log("data lookup:", Object.prototype.__lookupGetter__.call(descriptorTarget, "field") === undefined);
} finally {
    delete (Object.prototype as any).get;
}
