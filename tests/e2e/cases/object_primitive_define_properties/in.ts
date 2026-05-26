let marks = "";

function mark(label: string): any {
    marks += label;
    return label;
}

function numTarget(): number {
    marks += "n";
    return 1;
}

function strTarget(): string {
    marks += "s";
    return "text";
}

function boolTarget(): boolean {
    marks += "q";
    return true;
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

report("define number literal", (): any =>
    Object.defineProperty(numTarget(), mark("a"), { value: mark("b") }, mark("c"))
);
report("define string runtime", (): any =>
    Object.defineProperty(strTarget(), mark("d"), descriptor, mark("e"))
);
report("defines boolean literal", (): any =>
    Object.defineProperties(boolTarget(), { x: { value: mark("f") } }, mark("g"))
);
report("defines string runtime", (): any =>
    Object.defineProperties(strTarget(), descriptors, mark("h"))
);
console.log("marks:", marks);
