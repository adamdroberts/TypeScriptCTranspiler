function Target(this: any, value: any): void {
    this.value = value;
}

function ReturnedFunction(this: any): void {
}

function returnArray(target: any, args: any, newTarget: any): any {
    return ["array", args[0], typeof target, typeof newTarget];
}

function returnFunction(target: any, args: any, newTarget: any): any {
    return ReturnedFunction as any;
}

function returnObject(target: any, args: any, newTarget: any): any {
    return { kind: "object", first: args[0], newTargetType: typeof newTarget };
}

function returnPrimitive(target: any, args: any, newTarget: any): any {
    return 7;
}

const ArrayCtor: any = new Proxy(Target as any, { construct: returnArray as any });
const arrayMade: any = new ArrayCtor("x");
console.log("array:", Array.isArray(arrayMade), arrayMade[0], arrayMade[1], arrayMade[2], arrayMade[3]);

const FunctionCtor: any = new Proxy(Target as any, { construct: returnFunction as any });
const functionMade: any = Reflect.construct(FunctionCtor, []);
console.log("function:", typeof functionMade, String(functionMade));

const ObjectCtor: any = new Proxy(Target as any, { construct: returnObject as any });
const objectMade: any = Reflect.construct(ObjectCtor, ["y"]);
console.log("object:", objectMade.kind, objectMade.first, objectMade.newTargetType);

const PrimitiveCtor: any = new Proxy(Target as any, { construct: returnPrimitive as any });
try {
    console.log("primitive:", Reflect.construct(PrimitiveCtor, []));
} catch (err: any) {
    console.log("primitive:", err);
}
