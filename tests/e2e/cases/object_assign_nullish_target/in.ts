function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

const source: any = { x: 1 };
const nullTarget: any = null;
const undefinedTarget: any = undefined;

report("null", (): any => Object.assign(nullTarget, source));
report("undefined", (): any => Object.assign(undefinedTarget, source));
