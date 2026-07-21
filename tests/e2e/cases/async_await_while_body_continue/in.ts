function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterCondition(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

export {};

let bodyCount = 0;
let count = 0;

function laterBody(value: string): Promise<string> {
    bodyCount++;
    return later(value);
}

async function whileBodyAwaitContinue(): Promise<string> {
    while (await laterCondition(count < 2)) {
        await laterBody("body-" + count);
        count++;
        continue;
    }
    return await later(bodyCount + "|done");
}

whileBodyAwaitContinue().then((value) => console.log(value));
