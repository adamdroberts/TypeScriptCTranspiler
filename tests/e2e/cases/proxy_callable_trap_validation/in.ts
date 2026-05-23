function add(this: any, left: any, right: any): any {
    return this.base + left + right;
}

function Target(this: any, value: any): any {
    this.value = value;
}

function primitiveConstruct(target: any, args: any, newTarget: any): any {
    return 123;
}

const badApply: any = new Proxy(add as any, { apply: 1 as any });
try {
    console.log("bad apply:", Reflect.apply(badApply, { base: 10 }, [2, 3]));
} catch (e: any) {
    console.log("bad apply:", e);
}

const badConstruct: any = new Proxy(Target as any, { construct: 1 as any });
try {
    console.log("bad construct:", Reflect.construct(badConstruct, ["x"]));
} catch (e: any) {
    console.log("bad construct:", e);
}

const primitiveResult: any = new Proxy(Target as any, { construct: primitiveConstruct as any });
try {
    console.log("primitive construct:", Reflect.construct(primitiveResult, ["x"]));
} catch (e: any) {
    console.log("primitive construct:", e);
}
