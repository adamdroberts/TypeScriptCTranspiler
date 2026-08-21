let trace = "";

function source(tag: string): any {
    let index = 0;
    const entries: any = [["a", 1], ["b", 2]];
    const iterator: any = {};
    iterator.next = (): Promise<any> => {
        trace += tag + ">";
        if (index >= entries.length) return Promise.resolve({ done: true });
        return Promise.resolve({ value: entries[index++], done: false });
    };
    iterator.return = (): Promise<any> => {
        trace += tag + "!";
        return Promise.resolve({ done: true });
    };
    iterator[Symbol.asyncIterator] = (): any => iterator;
    return iterator;
}

async function run(mode: string, tag: string): Promise<string> {
    let output = "";
    outer: for await (const [key, value] of source(tag)) {
        output += await Promise.resolve(key + String(value));
        if (mode === "break") break outer;
        if (mode === "return") return output;
        if (mode === "throw") throw "failure";
    }
    return output;
}

async function syncFallback(values: any): Promise<number> {
    let total = 0;
    for await (const value of values) {
        total += await Promise.resolve(Number(value));
    }
    return total;
}

run("natural", "N")
    .then((result) => {
        console.log("natural:", result, trace);
        return run("break", "B");
    })
    .then((result) => {
        console.log("break:", result, trace);
        return run("return", "R");
    })
    .then((result) => {
        console.log("return:", result, trace);
        return run("throw", "T").then(
            (unexpected) => console.log("unexpected:", unexpected),
            (reason) => console.log("throw:", reason, trace),
        );
    })
    .then((_ignored: any) => syncFallback([1, 2]))
    .then((result) => console.log("sync:", result, trace));
