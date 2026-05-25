function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

const nullTarget: any = null;
const undefinedTarget: any = undefined;
const numberTarget: any = 7;

report("names null", (): any => Object.getOwnPropertyNames(nullTarget).length);
report("desc undefined", (): any => Object.getOwnPropertyDescriptor(undefinedTarget, "x"));
report("descs null", (): any => Object.getOwnPropertyDescriptors(nullTarget));
report("has undefined", (): any => Object.hasOwn(undefinedTarget, "x"));
console.log("number:", Object.getOwnPropertyNames(numberTarget).length, String(Object.getOwnPropertyDescriptor(numberTarget, "x")), Object.hasOwn(numberTarget, "x"));
