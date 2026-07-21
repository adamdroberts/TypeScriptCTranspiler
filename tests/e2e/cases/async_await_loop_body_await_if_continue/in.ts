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

async function loopBodyAwaitIfContinue(): Promise<string> {
    let count = 0;
    while (await laterCondition(count < 2)) {
        if (await laterCondition(count === 0)) {
            await laterBody("true-" + count);
            count++;
            continue;
        } else {
            count++;
            continue;
        }
    }
    return await later(bodyCount + "|done");
}

loopBodyAwaitIfContinue().then((value) => console.log(value));
