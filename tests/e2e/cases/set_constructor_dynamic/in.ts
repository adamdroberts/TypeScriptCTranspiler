let marks = "";

function mark(label: string): any {
    marks += label;
    return label;
}

function report(label: string, fn: () => Set<any>): void {
    try {
        const set = fn();
        console.log(label + ":", set.size, Array.from(set).join("|"));
    } catch (err: any) {
        console.log(label + ":", err);
    }
}

const nil: any = null;
const undef: any = undefined;
const values: any = [1, "two", 1];
const text: any = "aba";
const bad: any = 1;

report("null", (): Set<any> => new Set<any>(nil, mark("a")));
report("undefined", (): Set<any> => new Set<any>(undef));
report("array", (): Set<any> => new Set<any>(values));
report("string", (): Set<any> => new Set<any>(text));
report("bad", (): Set<any> => new Set<any>(bad, mark("b")));
console.log("marks:", marks);
