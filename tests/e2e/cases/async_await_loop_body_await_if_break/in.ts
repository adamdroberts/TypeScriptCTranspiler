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

async function loopBodyAwaitIfBreak(): Promise<string> {
    let count = 0;
    while (await laterCondition(count < 2)) {
        if (await laterCondition(count === 0)) {
            await laterBody("continue-" + count);
            count++;
            continue;
        } else {
            bodyCount += 0;
            await laterBody("break-start-" + count);
            await laterBody("break-end-" + count);
            bodyCount += 0;
            break;
        }
    }
    return await later(bodyCount + "|done");
}

loopBodyAwaitIfBreak().then((value) => console.log(value));
