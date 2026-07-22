let bodyCount = 0;

function laterBody(value: string): Promise<void> {
    bodyCount++;
    return Promise.resolve(undefined);
}

async function forOfBodyAwaitContinue(): Promise<string> {
    for (const item of ["a", "b"]) {
        await laterBody(item);
        continue;
    }
    return await Promise.resolve(bodyCount + "|done");
}

forOfBodyAwaitContinue().then((value) => console.log(value));
