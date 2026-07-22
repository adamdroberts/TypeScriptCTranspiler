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

async function doBodyMultiCondition(): Promise<string> {
    let count = 0;
    do {
        await laterBody("body-" + count);
        count++;
        continue;
    } while (await laterCondition(count < 3) && await laterCondition(true));
    return await later(bodyCount + "|done");
}

doBodyMultiCondition().then((value) => console.log(value));
