let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function mark(value: string): void {
    trace += value + "|";
}

async function awaitedIfBranchPrelude(route: number): Promise<string> {
    const first = await laterString("branch-prelude-first");
    if (await laterBoolean(route === 1)) {
        mark(first + "-true");
        return await laterString(first + "-return");
    } else {
        mark(first + "-false");
        throw await laterString(first + "-throw");
    }
}

awaitedIfBranchPrelude(1).then((value) => console.log("return", value));
awaitedIfBranchPrelude(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
setTimeout(() => console.log("trace", trace), 10);
