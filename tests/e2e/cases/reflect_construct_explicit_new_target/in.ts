function Target(this: any, value: any): any {
    this.value = value;
}

function Other(this: any): any {
    this.marker = "other";
}

const target: any = Target as any;
const other: any = Other as any;
const reflect: any = Reflect;

try {
    const omitted: any = Reflect.construct(target, ["omitted"]);
    console.log("omitted:", omitted.value);
} catch (err: any) {
    console.log("omitted:", err);
}

try {
    const explicit: any = Reflect.construct(target, ["explicit"], other);
    console.log("explicit:", explicit.value, Object.getPrototypeOf(explicit) === other.prototype);
} catch (err: any) {
    console.log("explicit:", err);
}

try {
    console.log("undefined:", Reflect.construct(target, ["bad"], undefined));
} catch (err: any) {
    console.log("undefined:", err);
}

try {
    console.log("method undefined:", reflect.construct(target, ["bad"], undefined));
} catch (err: any) {
    console.log("method undefined:", err);
}
