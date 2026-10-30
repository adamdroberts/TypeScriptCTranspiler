function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (e: any) {
        // Error message text is implementation-defined; assert the error kind.
        console.log(label + ":", e instanceof TypeError ? "TypeError" : e);
    }
}

const nullTarget: any = null;
const undefinedTarget: any = undefined;
const proto: any = { marker: "proto" };
const obj: any = Object.create(proto);

report("null", (): any => Object.getPrototypeOf(nullTarget));
report("undefined", (): any => Object.getPrototypeOf(undefinedTarget));
console.log("object:", Object.getPrototypeOf(obj).marker);
