let marks = "";

function mark(label: string): any {
    marks += label;
    return label;
}

function report(label: string, promise: Promise<any[]>): void {
    promise
        .then((result: any[]): void => {
            console.log(label + ":", Array.isArray(result), result.length, result.join("|"));
        })
        .catch((err: any): void => {
            console.log(label + ":", err);
        });
}

const nil: any = null;
const num: any = 1;
const obj: any = { value: 2 };
const text: any = "ab";

report("null", Array.fromAsync(nil, undefined, mark("a")));
report("number", Array.fromAsync(num, (value: any): any => mark(String(value))));
report("object", Array.fromAsync(obj));
report("string", Array.fromAsync(text));
console.log("marks:", marks);
