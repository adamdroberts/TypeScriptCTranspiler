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

async function loopBodyIfBreakContinue(): Promise<string> {
    let count = 0;
    while (await laterCondition(count < 2)) {
        if (count < 1) {
            bodyCount += 0;
            await laterBody("body-" + count);
            bodyCount += 0;
            count++;
            continue;
        } else {
            bodyCount += 0;
            await laterBody("break-" + count);
            bodyCount += 0;
            break;
        }
    }
    return await later(bodyCount + "|done");
}

loopBodyIfBreakContinue().then((value) => console.log(value));
