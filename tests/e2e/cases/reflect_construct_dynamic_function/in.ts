function Make(this: any, label: any): any {
    this.label = label;
    this.kind = "this:" + typeof this;
}

function Override(this: any, value: any): any {
    this.value = "ignored";
    return { value };
}

function PrimitiveReturn(this: any, value: any): any {
    this.value = value;
    return 123;
}

function NullPrototypeNewTarget(this: any): any {
    this.value = "newTarget";
}

function AlternateNewTarget(this: any): any {
    this.value = "alternate";
}

const make: any = Make as any;
const override: any = Override as any;
const primitiveReturn: any = PrimitiveReturn as any;
const nullPrototypeNewTarget: any = NullPrototypeNewTarget as any;
Reflect.defineProperty(nullPrototypeNewTarget, "prototype", {
    value: null,
    writable: true,
    enumerable: false,
    configurable: false,
});

const made: any = Reflect.construct(make, ["a"]);
const overridden: any = Reflect.construct(override, ["b"]);
const primitive: any = Reflect.construct(primitiveReturn, ["c"]);
const nullPrototype: any = Reflect.construct(make, ["d"], nullPrototypeNewTarget);
const typedTarget: any = Reflect.construct(Make, ["typed"]);
const alternatePrototype: any = Reflect.construct(Make, ["alternate"], AlternateNewTarget);

console.log("made:", made.label, made.kind, typeof made);
console.log("override:", overridden.value, typeof overridden);
console.log("primitive:", primitive.value, typeof primitive);
console.log("null prototype fallback:", nullPrototype.label, nullPrototype.hasOwnProperty("label"), Object.getPrototypeOf(nullPrototype) === null);
console.log("typed target:", typedTarget.label, typedTarget.kind);
console.log("new target:", alternatePrototype.label, Object.getPrototypeOf(alternatePrototype) === (AlternateNewTarget as any).prototype, alternatePrototype instanceof AlternateNewTarget);

try {
    Reflect.construct(function() {}, [], Array.isArray);
} catch (err: any) {
    console.log("nonconstructor newTarget:", err.name, err instanceof TypeError, err.constructor === TypeError);
}

try {
    new (Array.isArray as any)([]);
} catch (err: any) {
    console.log("nonconstructor target:", err.name, err instanceof TypeError, err.constructor === TypeError);
}
