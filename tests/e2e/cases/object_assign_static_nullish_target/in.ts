let marks = "";
function source(label: string): any {
    marks += label;
    return { x: 1 };
}

function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

report("null source", (): any => Object.assign(null, source("a")));
report("undefined source", (): any => Object.assign(undefined, source("b")));
report("null empty", (): any => Object.assign(null));
report("undefined empty", (): any => Object.assign(undefined));
console.log("marks:", marks);
