const obj: any = { a: 1 };
obj.b = 2;
obj["c"] = 3;
obj.b += 5;
obj["c"] *= 2;

console.log("obj:", obj.a, obj.b, obj.c, Object.keys(obj).join(","));

const proto: any = {};
Object.defineProperty(proto, "locked", {
    value: 1,
    writable: false,
    enumerable: true,
    configurable: true,
});

const child: any = Object.create(proto);
child.locked = 9;
child.free = 4;

console.log("child:", child.locked, child.free, Object.hasOwn(child, "locked"), Object.keys(child).join(","));
