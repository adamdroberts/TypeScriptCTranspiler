function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

const target: any = {};
const descriptors: any = {
    first: { value: 1, enumerable: true },
    bad: 1,
};

report("bad descriptor", (): any => Object.defineProperties(target, descriptors));
console.log("after bad descriptor:", Object.keys(target).join(","), target.first);

const accessors: any = {
    first: { value: 2, enumerable: true },
    bad: { get: 3 },
};

report("bad accessor", (): any => Object.defineProperties(target, accessors));
console.log("after bad accessor:", Object.keys(target).join(","), target.first);
