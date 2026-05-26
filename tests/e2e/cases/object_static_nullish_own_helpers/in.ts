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

report("keys", (): any => Object.keys(null, mark("a")));
report("values", (): any => Object.values(undefined, mark("b")));
report("entries", (): any => Object.entries(null, mark("c")));
report("names", (): any => Object.getOwnPropertyNames(undefined, mark("d")));
report("symbols", (): any => Object.getOwnPropertySymbols(null, mark("e")).length);
report("descriptor", (): any => Object.getOwnPropertyDescriptor(null, mark("f"), mark("g")));
report("descriptors", (): any => Object.getOwnPropertyDescriptors(undefined, mark("h")));
report("hasOwn", (): any => Object.hasOwn(null, mark("i"), mark("j")));
console.log("marks:", marks);
