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

async function loopBodyAwaitReturnContinue(): Promise<string> {
    let count = 0;
    while (await laterCondition(count < 2)) {
        if (await laterCondition(count === 1)) {
            return await later("early-" + bodyCount);
        } else {
            await laterBody("continue-" + count);
            count++;
            continue;
        }
    }
    return await later("done-" + bodyCount);
}

loopBodyAwaitReturnContinue().then((value) => console.log(value));
