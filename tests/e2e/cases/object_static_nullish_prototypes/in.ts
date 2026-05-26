let marks = "";
function mark(label: string): string {
    marks += label;
    return label;
}

function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

report("get null", (): any => Object.getPrototypeOf(null, mark("a")));
report("get undefined", (): any => Object.getPrototypeOf(undefined, mark("b")));
report("set null", (): any => Object.setPrototypeOf(null, {}, mark("c")));
report("set undefined", (): any => Object.setPrototypeOf(undefined, null, mark("d")));
console.log("marks:", marks);
