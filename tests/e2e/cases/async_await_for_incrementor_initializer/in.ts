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
let lastIncrement = -1;

async function forAwaitIncrementorInitializer(): Promise<string> {
    for (let index = 0; await laterBoolean(index < 3); await laterNumber(lastIncrement = index++)) {
        bodyCount++;
    }
    return await laterString(bodyCount + "|" + lastIncrement);
}

forAwaitIncrementorInitializer().then((value) => console.log(value));
