let marks = "";

function mark(label: string): any {
    marks += label;
    return label;
}

function report(label: string, fn: () => any): void {
    try {
        const result: any = fn();
        console.log(label + ":", Array.isArray(result), result.length, result.join("|"));
    } catch (err: any) {
        console.log(label + ":", err);
    }
}

const nil: any = null;
const num: any = 1;
const obj: any = { value: 2 };
const text: any = "ab";

report("null", (): any => Array.from(nil, undefined, mark("a")));
report("number", (): any => Array.from(num, (value: any): any => mark(String(value))));
report("object", (): any => Array.from(obj));
report("string", (): any => Array.from(text));
console.log("marks:", marks);
