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

async function doBodyAwaitIfElseContinue(): Promise<string> {
    let count = 0;
    do {
        if (await laterCondition(count === 0)) {
            bodyCount += 0;
            await laterBody("true-" + count);
            bodyCount += 0;
            count++;
            continue;
        } else {
            bodyCount += 0;
            await laterBody("false-" + count);
            bodyCount += 0;
            count++;
            continue;
        }
    } while (await laterCondition(count < 3));
    return await later(bodyCount + "|done");
}

doBodyAwaitIfElseContinue().then((value) => console.log(value));
