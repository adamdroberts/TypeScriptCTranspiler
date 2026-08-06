let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function laterIncrement(reject: boolean, iteration: number): Promise<string> {
    return new Promise<string>((resolve, rejectPromise) => setImmediate(() => {
        if (reject && iteration === 1) {
            rejectPromise("nested-incrementor-rejected");
        } else {
            resolve("increment-" + String(iteration));
        }
    }));
}

function mark(value: string): void {
    trace += value + "|";
}

async function awaitedIfNestedAwaitedVarForIncrementor(reject: boolean): Promise<string> {
    const first = await laterString("incrementor-first");
    if (await laterBoolean(true)) {
        for (
            var escaped = await laterString(first + "-init"),
                label = first + "-label",
                repeats = 0;
            repeats < 2;
            await laterIncrement(reject, repeats)
        ) {
            mark(label + String(repeats));
            repeats++;
        }
        return await laterString(escaped + "-return");
    } else {
        throw await laterString(first + "-else");
    }
}

awaitedIfNestedAwaitedVarForIncrementor(false).then(
    (value) => console.log("return", value),
    (reason) => console.log("unexpected", reason),
);
awaitedIfNestedAwaitedVarForIncrementor(true).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("incrementor-reject", reason),
);
setTimeout(() => console.log("trace", trace), 20);
