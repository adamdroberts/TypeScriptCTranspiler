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

async function loopBodyMultipleAwaitsBreak(): Promise<string> {
    for (let count = 0; await laterCondition(count < 2); count++) {
        await laterBody("first-" + count);
        await laterBody("second-" + count);
        break;
    }
    return await later(bodyCount + "|done");
}

loopBodyMultipleAwaitsBreak().then((value) => console.log(value));
