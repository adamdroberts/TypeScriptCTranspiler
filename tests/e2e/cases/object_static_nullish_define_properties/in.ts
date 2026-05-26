let marks = "";

function mark(label: string): any {
    marks += label;
    return label;
}

function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (err: any) {
        console.log(label + ":", err);
    }
}

const descriptor: any = { value: 2 };
const descriptors: any = { y: { value: 4 } };

report("define null literal", (): any =>
    Object.defineProperty(null, mark("a"), { value: mark("b") }, mark("c"))
);
report("define undefined runtime", (): any =>
    Object.defineProperty(undefined, mark("d"), descriptor, mark("e"))
);
report("defines null literal", (): any =>
    Object.defineProperties(null, { x: { value: mark("f") } }, mark("g"))
);
report("defines undefined runtime", (): any =>
    Object.defineProperties(undefined, descriptors, mark("h"))
);
console.log("marks:", marks);
