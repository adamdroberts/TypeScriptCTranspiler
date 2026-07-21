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

async function loopBodyMultipleAwaits(): Promise<string> {
    for (let count = 0; await laterCondition(count < 2); count++) {
        bodyCount += 0;
        await laterBody("first-" + count);
        await laterBody("second-" + count);
        bodyCount += 0;
        continue;
    }
    return await later(bodyCount + "|done");
}

loopBodyMultipleAwaits().then((value) => console.log(value));
