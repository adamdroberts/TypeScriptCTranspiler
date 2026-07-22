let bodyCount = 0;

function laterBody(value: string): Promise<string> {
    bodyCount++;
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

async function forOfBodyAwaitBreak(): Promise<string> {
    for (const item of ["a", "b"]) {
        await laterBody(item);
        break;
    }
    return await Promise.resolve(bodyCount + "|done");
}

forOfBodyAwaitBreak().then((value) => console.log(value));
