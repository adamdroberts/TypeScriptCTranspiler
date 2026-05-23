function applyTrap(target: any, thisArg: any, args: any): any {
    return "apply trap called";
}

function constructTrap(target: any, args: any, newTarget: any): any {
    return { ok: true };
}

const objectApply: any = new Proxy({ value: 1 }, { apply: applyTrap as any });
try {
    console.log("object apply:", Reflect.apply(objectApply, null, []));
} catch (e: any) {
    console.log("object apply:", e);
}

const objectConstruct: any = new Proxy({ value: 1 }, { construct: constructTrap as any });
try {
    console.log("object construct:", Reflect.construct(objectConstruct, []));
} catch (e: any) {
    console.log("object construct:", e);
}
