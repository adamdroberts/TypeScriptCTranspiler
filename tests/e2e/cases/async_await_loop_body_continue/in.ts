function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

let bodyCount = 0;

function laterBody(value: string): Promise<string> {
    bodyCount++;
    return later(value);
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

export {};

async function loopBodyAwaitContinue(): Promise<string> {
    for (let count = 0; await laterCondition(count < 2); count++) {
        await laterBody("body-" + count);
        continue;
    }
    return await later(bodyCount + "|done");
}

loopBodyAwaitContinue().then((value) => console.log(value));
