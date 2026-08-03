function laterNumber(value: number): Promise<number> {
    return new Promise<number>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

let bodyCount = 0;

async function forAwaitIncrementor(): Promise<string> {
    let index = 0;
    for (; await laterBoolean(index < 3); await laterNumber(index++)) {
        bodyCount++;
    }
    return await laterString(index + "|" + bodyCount);
}

forAwaitIncrementor().then((value) => console.log(value));
