const primitiveKeys = new Map([["bad-key", "value"]]);
const shouldReject = new WeakMap<object, string>(
    primitiveKeys as unknown as Map<object, string>,
);
console.log(shouldReject.has({}));
