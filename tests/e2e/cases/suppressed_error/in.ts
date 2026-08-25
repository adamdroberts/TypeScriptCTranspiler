const created = new SuppressedError("original", "cleanup", "cleanup failed", "ignored");
const called = SuppressedError("call-original", "call-cleanup");
const descriptor: any = Object.getOwnPropertyDescriptor(created, "error");
const descriptors: any = Object.getOwnPropertyDescriptors(created);
const SuppressedAlias = SuppressedError;
const aliased: any = SuppressedAlias("alias-original", "alias-cleanup", "alias message");

console.log("new:", created.name, created.message, String(created.error), String(created.suppressed), created.toString());
console.log("call:", called.name, called.message, String(called.error), String(called.suppressed));
console.log("own:", created.hasOwnProperty("error"), created.hasOwnProperty("suppressed"), Object.hasOwn(created, "error"));
console.log("reflect:", Reflect.get(created, "error"), Reflect.has(created, "suppressed"), descriptor.value, descriptor.enumerable);
console.log("names:", Object.getOwnPropertyNames(created).join("|"), Object.keys(descriptors).join("|"));
console.log("alias:", (SuppressedError as any).name, (SuppressedError as any).length, aliased.error, aliased.suppressed, aliased.message, aliased instanceof SuppressedError, aliased instanceof Error, aliased.constructor === SuppressedError);
