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

async function loopBodyIfElseAwaitContinue(): Promise<string> {
    let count = 0;
    while (await laterCondition(count < 2)) {
        if (count < 1) {
            await laterBody("true-" + count);
            count++;
            continue;
        } else {
            await laterBody("false-" + count);
            count++;
            continue;
        }
    }
    return await later(bodyCount + "|done");
}

loopBodyIfElseAwaitContinue().then((value) => console.log(value));
