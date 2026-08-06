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
            rejectPromise("mixed-loop-condition-rejected");
        } else {
            resolve(iteration < 2);
        }
    }));
}

function laterIncrement(reject: boolean, iteration: number): Promise<string> {
    return new Promise<string>((resolve, rejectPromise) => setImmediate(() => {
        if (reject && iteration === 1) {
            rejectPromise("mixed-incrementor-rejected");
        } else {
            resolve("increment-" + String(iteration));
        }
    }));
}

function mark(value: string): void {
    trace += value + "|";
}

async function awaitedIfNestedAwaitedVarForConditionIncrementor(
    rejectCondition: boolean,
    rejectIncrementor: boolean,
): Promise<string> {
    const first = await laterString("mixed-first");
    if (await laterBoolean(true)) {
        for (
            var escaped = await laterString(first + "-init"),
                label = first + "-label",
                repeats = 0;
            await laterLoopCondition(rejectCondition, repeats);
            await laterIncrement(rejectIncrementor, repeats)
        ) {
            mark(label + String(repeats));
            repeats++;
        }
        return await laterString(escaped + "-return");
    } else {
        throw await laterString(first + "-else");
    }
}

awaitedIfNestedAwaitedVarForConditionIncrementor(false, false)
    .then((value) => {
        console.log("return", value);
        return awaitedIfNestedAwaitedVarForConditionIncrementor(true, false);
    })
    .then(
        (value) => console.log("unexpected condition", value),
        (reason) => {
            console.log("condition-reject", reason);
            return awaitedIfNestedAwaitedVarForConditionIncrementor(false, true);
        },
    )
    .then(
        (value) => console.log("unexpected incrementor", value),
        (reason) => console.log("incrementor-reject", reason),
    );
setTimeout(() => console.log("trace", trace), 20);
