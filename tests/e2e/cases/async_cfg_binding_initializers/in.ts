let trace = "";

class Pair {
    left: string;
    right: number;

    constructor(left: string, right: number) {
        this.left = left;
        this.right = right;
    }
}

async function bindValues(): Promise<string> {
    const objectSource: any = { left: "L", nested: { value: 2 }, extra: "E" };
    const { left, nested: { value }, ...rest } = await (
        trace += "O>",
        Promise.resolve(objectSource)
    );
    const arraySource: any = ["H", "skip", "T1", "T2"];
    const [head, , ...tail] = await (
        trace += "A>",
        Promise.resolve(arraySource)
    );
    const {
        present = (trace += "BAD>", "wrong"),
        missing = (trace += "D>", "fallback"),
    } = { present: "kept" } as any;
    const xSource: any = { x: "X" };
    const first = (trace += "1>", "first"),
        { x } = await (trace += "2>", Promise.resolve(xSource)),
        last = (trace += "3>", "last");
    return [
        left,
        String(value),
        rest.extra,
        head,
        tail.join(","),
        present,
        missing,
        first,
        x,
        last,
    ].join(":");
}

async function rejectBinding(): Promise<any> {
    const rejected: Promise<any> = Promise.reject("binding-source-failure");
    try {
        const { value } = await rejected;
        return value;
    } finally {
        trace += await Promise.resolve("F>");
    }
}

async function typedBinding(): Promise<string> {
    const { left, right } = await Promise.resolve(new Pair("typed", 5));
    return left + ":" + String(right);
}

bindValues()
    .then((result) => {
        console.log("values:", result, trace);
        return typedBinding();
    })
    .then((result) => {
        console.log("typed:", result, trace);
        return rejectBinding();
    })
    .then(
        (result) => console.log("unexpected:", result),
        (reason) => console.log("rejected:", reason, trace),
    );
