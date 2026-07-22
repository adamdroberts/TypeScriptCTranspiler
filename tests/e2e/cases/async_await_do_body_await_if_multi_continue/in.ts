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

async function doBodyAwaitIfMultiContinue(): Promise<string> {
    let count = 0;
    do {
        if (await laterCondition(count === 0)) {
            bodyCount += 0;
            await laterBody("true-first-" + count);
            await laterBody("true-second-" + count);
            bodyCount += 0;
            count++;
            continue;
        } else {
            bodyCount += 0;
            await laterBody("false-first-" + count);
            await laterBody("false-second-" + count);
            bodyCount += 0;
            count++;
            continue;
        }
    } while (await laterCondition(count < 3));
    return await later(bodyCount + "|done");
}

doBodyAwaitIfMultiContinue().then((value) => console.log(value));
