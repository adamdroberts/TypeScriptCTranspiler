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

async function loopBodyAwaitIfElseContinue(): Promise<string> {
    let count = 0;
    while (await laterCondition(count < 2)) {
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
    }
    return await later(bodyCount + "|done");
}

loopBodyAwaitIfElseContinue().then((value) => console.log(value));
