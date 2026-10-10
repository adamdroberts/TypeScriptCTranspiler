import { target, symbol, ref, symbolRef, registry, register, unregister, deref, resumedName } from "./owner";

class RetainedRef extends WeakRef<typeof target> {}
class RetainedRegistry extends FinalizationRegistry<string> {}
const token = {};
register.call(registry, target, "first", token);
register.call(registry, target, "second", token);
console.log("owners:", ref instanceof WeakRef, registry instanceof FinalizationRegistry);
console.log("references:", deref.call(ref) === target, symbolRef.deref() === symbol);
console.log("unregister:", unregister.call(registry, token), unregister.call(registry, token));
console.log("derived:", new RetainedRef(target).deref() === target, new RetainedRegistry(() => {}) instanceof RetainedRegistry);
resumedName().then(name => console.log("resumed:", name));
