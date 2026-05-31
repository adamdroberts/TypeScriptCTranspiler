const events: string[] = [];

const baseProto = { marker: "base" };
const nextProto = { marker: "next" };

const target: any = { prop: 42 };
Object.setPrototypeOf(target, baseProto);

// Wrap target in proxy 1
const p1: any = new Proxy(target, {
    getPrototypeOf: function(t: any): any {
        events.push("p1 getPrototypeOf");
        return baseProto;
    },
    setPrototypeOf: function(t: any, proto: any): any {
        events.push("p1 setPrototypeOf");
        return true;
    }
} as any);

// Wrap p1 in proxy 2 (nested proxy target!)
const p2: any = new Proxy(p1, {
    getPrototypeOf: function(t: any): any {
        events.push("p2 getPrototypeOf");
        return nextProto; // Mismatch!
    },
    setPrototypeOf: function(t: any, proto: any): any {
        events.push("p2 setPrototypeOf");
        return true; // Mismatch!
    }
} as any);

// Case 1: Extensible nested target. Mismatches should be allowed when extensible.
console.log("extensible get:", Object.getPrototypeOf(p2) === nextProto);
console.log("extensible set:", Reflect.setPrototypeOf(p2, nextProto));

// Prevent extensions on the underlying target
Object.preventExtensions(target);
console.log("isExtensible target:", Object.isExtensible(target));
console.log("isExtensible p1:", Object.isExtensible(p1));
console.log("isExtensible p2:", Object.isExtensible(p2));

// Case 2: Non-extensible nested target. Mismatch in getPrototypeOf must throw.
try {
    console.log("non-extensible get:", Object.getPrototypeOf(p2));
} catch (err: any) {
    console.log("non-extensible get error:", err);
}

// Case 3: Non-extensible nested target. Mismatch in setPrototypeOf must throw.
try {
    console.log("non-extensible set:", Reflect.setPrototypeOf(p2, nextProto));
} catch (err: any) {
    console.log("non-extensible set error:", err);
}

console.log("events:", events.join("|"));
