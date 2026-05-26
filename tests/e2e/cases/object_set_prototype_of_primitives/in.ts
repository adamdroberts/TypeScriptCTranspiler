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

const proto: any = { tag: "proto" };

console.log(
    "typed:",
    Object.setPrototypeOf(1, proto, mark("a")),
    Object.setPrototypeOf("x", null, mark("b")),
    Object.setPrototypeOf(false, proto, mark("c")),
);
console.log(
    "more:",
    typeof Object.setPrototypeOf(10n, null, mark("d")),
    typeof Object.setPrototypeOf(Symbol("x"), proto, mark("e")),
);
report("invalid", (): any => Object.setPrototypeOf(2, 3 as any, mark("f")));
console.log("marks:", marks);
