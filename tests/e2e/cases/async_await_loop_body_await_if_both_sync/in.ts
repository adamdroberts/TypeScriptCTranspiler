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
            await later("prep-true-a");
            await later("prep-true-b");
            bodyCount += 0;
            return "true-" + bodyCount;
        } else {
            await later("prep-false-a");
            await later("prep-false-b");
            bodyCount += 0;
            throw "false-" + bodyCount;
        }
    }
    return await later("done-" + bodyCount);
}

loopBodyAwaitIfBothSync().then(
    (value) => console.log(value),
    (error) => console.log("error:" + error),
);
