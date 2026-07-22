let bodyCount = 0;

function laterBody(value: string): Promise<string> {
    bodyCount++;
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

async function forOfBodyAwaitContinue(): Promise<string> {
    for (const item of ["a", "b"]) {
        await laterBody(item);
        continue;
    }
    return await Promise.resolve(bodyCount + "|done");
}

forOfBodyAwaitContinue().then((value) => console.log(value));
