let trace = "";

function source(tag: string): any {
    let index = 0;
    const iterator: any = {};
    iterator.next = (): Promise<any> => {
        trace += tag + ">";
        return Promise.resolve(index < 2
            ? { value: ++index, done: false }
            : { done: true });
    };
    iterator[Symbol.asyncIterator] = (): any => iterator;
    return iterator;
}

async function collect(first: boolean): Promise<string> {
    let output = "";
    for await (const value of (
        first
            ? await Promise.resolve(source("A"))
            : await Promise.resolve(source("B"))
    )) {
        output += await Promise.resolve(String(value));
    }
    return output;
}

async function rejectSource(): Promise<any> {
    const rejected: Promise<any> = Promise.reject("source-failure");
    for await (const _value of await rejected) {
        trace += "unexpected";
    }
}

collect(true)
    .then((result) => {
        console.log("first:", result, trace);
        return collect(false);
    })
    .then((result) => {
        console.log("second:", result, trace);
        return rejectSource();
    })
    .then(
        (_value: any) => console.log("unexpected resolution"),
        (reason) => console.log("rejected:", reason, trace),
    );
