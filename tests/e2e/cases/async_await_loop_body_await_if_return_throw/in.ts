function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

export {};

let bodyCount = 0;

async function loopBodyAwaitIfReturnThrow(): Promise<string> {
    let count = 0;
    while (await laterCondition(count < 2)) {
        if (await laterCondition(count === 0)) {
            return await later("returned-" + bodyCount);
        } else {
            throw await later("thrown-" + bodyCount);
        }
    }
    return await later("done-" + bodyCount);
}

loopBodyAwaitIfReturnThrow().then(
    (value) => console.log(value),
    (error) => console.log("error:" + error),
);
