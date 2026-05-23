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

const make: any = Make as any;
const override: any = Override as any;
const primitiveReturn: any = PrimitiveReturn as any;

const made: any = Reflect.construct(make, ["a"]);
const overridden: any = Reflect.construct(override, ["b"]);
const primitive: any = Reflect.construct(primitiveReturn, ["c"]);

console.log("made:", made.label, made.kind, typeof made);
console.log("override:", overridden.value, typeof overridden);
console.log("primitive:", primitive.value, typeof primitive);
