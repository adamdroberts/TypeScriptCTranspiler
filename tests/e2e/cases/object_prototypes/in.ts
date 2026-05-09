const proto: any = { inherited: 10 };
Object.defineProperty(proto, "fixed", {
    value: 1,
    writable: false,
    enumerable: true,
    configurable: true,
});
Object.defineProperty(proto, "hidden", {
    value: 20,
    writable: true,
    enumerable: false,
    configurable: true,
});

const child: any = Object.create(proto);
Reflect.set(child, "own", 5);
Reflect.set(child, "fixed", 2);

console.log("get:", child.inherited, Reflect.get(child, "hidden"), child.own);
console.log("has:", "inherited" in child, Reflect.has(child, "hidden"), Object.hasOwn(child, "inherited"), Object.hasOwn(child, "own"));
console.log("own:", Object.keys(child).join(","), Reflect.ownKeys(child).join(","), child.fixed, Object.hasOwn(child, "fixed"));
console.log("proto:", Object.getPrototypeOf(child) === proto, Reflect.getPrototypeOf(child) === proto);
console.log("null-set:", Reflect.setPrototypeOf(child, null), Object.getPrototypeOf(child), "inherited" in child);
console.log("object-set:", Object.setPrototypeOf(child, proto) === child, child.inherited);
console.log("cycle:", Reflect.setPrototypeOf(child, child));

Object.preventExtensions(child);
console.log("same:", Reflect.setPrototypeOf(child, proto));
const other: any = { inherited: 99 };
console.log("locked:", Reflect.setPrototypeOf(child, other), child.inherited);

const bare: any = Object.create(null);
Reflect.set(bare, "x", 3);
console.log("bare:", Object.getPrototypeOf(bare), bare.x, "x" in bare);
