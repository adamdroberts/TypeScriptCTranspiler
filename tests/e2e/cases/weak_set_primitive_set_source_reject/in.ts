const primitiveValues = new Set(["bad-value"]);
const shouldReject = new WeakSet<object>(
    primitiveValues as unknown as Set<object>,
);
console.log(shouldReject.has({}));
