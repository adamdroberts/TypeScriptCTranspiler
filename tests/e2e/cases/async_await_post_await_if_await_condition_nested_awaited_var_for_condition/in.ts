let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function laterLoopCondition(reject: boolean, iteration: number): Promise<boolean> {
    return new Promise<boolean>((resolve, rejectPromise) => setImmediate(() => {
        if (reject && iteration === 1) {
            rejectPromise("nested-loop-condition-rejected");
        } else {
            resolve(iteration < 2);
        }
    }));
}

function mark(value: string): void {
    trace += value + "|";
}

async function awaitedIfNestedAwaitedVarForCondition(reject: boolean): Promise<string> {
    const first = await laterString("condition-first");
    if (await laterBoolean(true)) {
        for (
            var escaped = await laterString(first + "-init"),
                label = first + "-label",
                repeats = 0;
            await laterLoopCondition(reject, repeats);
            repeats++
        ) {
            mark(label + String(repeats));
        }
        return await laterString(escaped + "-return");
    } else {
        throw await laterString(first + "-else");
    }
}

awaitedIfNestedAwaitedVarForCondition(false).then(
    (value) => console.log("return", value),
    (reason) => console.log("unexpected", reason),
);
awaitedIfNestedAwaitedVarForCondition(true).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
setTimeout(() => console.log("trace", trace), 20);
