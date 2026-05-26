function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (err: any) {
        console.log(label + ":", err);
    }
}

let marks = "";
function mark(label: string): any {
    marks += label;
    return label;
}

const user: any = { name: "ada" };
const ref = new WeakRef<any>(user, mark("c"));
const found: any = ref.deref(mark("d"));
console.log("deref:", found.name, found === user);
console.log("missing:", ref.valueOf() === ref);

report("number", (): any => {
    new WeakRef<any>(1);
    return "ok";
});
report("null", (): any => {
    const nil: any = null;
    new WeakRef<any>(nil, mark("n"));
    return "ok";
});
console.log("marks:", marks);
