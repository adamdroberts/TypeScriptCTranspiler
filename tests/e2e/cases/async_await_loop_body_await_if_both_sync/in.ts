function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

export {};

let bodyCount = 0;

async function loopBodyAwaitIfBothSync(): Promise<string> {
    while (await laterCondition(true)) {
        if (await laterCondition(true)) {
            return "true-" + bodyCount;
        } else {
            throw "false-" + bodyCount;
        }
    }
    return await later("done-" + bodyCount);
}

loopBodyAwaitIfBothSync().then(
    (value) => console.log(value),
    (error) => console.log("error:" + error),
);
