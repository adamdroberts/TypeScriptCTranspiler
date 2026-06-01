function add(left: any, right: any): any {
    return left + right;
}

function Target(this: any, value: any): any {
    this.value = value;
}

const reflect: any = Reflect;
const dynamicTarget: any = Target as any;
const apply: any = reflect.apply;

try {
    console.log("apply no args:", apply());
} catch (err: any) {
    console.log("apply no args:", err);
}

try {
    console.log("apply missing list:", apply(add));
} catch (err: any) {
    console.log("apply missing list:", err);
}

try {
    console.log("apply missing list with this:", apply(add, null));
} catch (err: any) {
    console.log("apply missing list with this:", err);
}

try {
    console.log("construct no args:", reflect.construct());
} catch (err: any) {
    console.log("construct no args:", err);
}

try {
    console.log("construct missing list:", reflect.construct(dynamicTarget));
} catch (err: any) {
    console.log("construct missing list:", err);
}

try {
    console.log("construct undefined list:", reflect.construct(dynamicTarget, undefined));
} catch (err: any) {
    console.log("construct undefined list:", err);
}

try {
    const made: any = reflect.construct(dynamicTarget, ["ok"]);
    console.log("construct valid:", made.value);
} catch (err: any) {
    console.log("construct valid:", err);
}
