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

async function doBodyAwaitIfSyncThrow(): Promise<string> {
    let count = 0;
    do {
        if (await laterCondition(count !== 0)) {
            await later("prep-a-" + count);
            await later("prep-b-" + count);
            bodyCount += 0;
            throw "boom-" + bodyCount;
        } else {
            await laterBody("continue-" + count);
            count++;
            continue;
        }
    } while (await laterCondition(count < 3));
    return await later("done-" + bodyCount);
}

doBodyAwaitIfSyncThrow().then(
    (value) => console.log(value),
    (error) => console.log("error:" + error),
);
