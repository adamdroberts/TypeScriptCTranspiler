function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

export {};

let bodyCount = 0;

function laterBody(value: string): Promise<string> {
    bodyCount++;
    return later(value);
}

async function doBodyAwaitThrowContinue(): Promise<string> {
    let count = 0;
    do {
        if (await laterCondition(count !== 0)) {
            throw await later("boom-" + bodyCount);
        } else {
            await laterBody("continue-" + count);
            count++;
            continue;
        }
    } while (await laterCondition(count < 3));
    return await later("done-" + bodyCount);
}

doBodyAwaitThrowContinue().then(
    (value) => console.log(value),
    (error) => console.log("error:" + error),
);
