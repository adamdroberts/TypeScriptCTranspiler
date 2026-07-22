let bodyCount = 0;

function laterBody(value: string): Promise<string> {
    bodyCount++;
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

async function forOfBodyAwaitReturn(): Promise<string> {
    for (const item of ["a", "b"]) {
        await laterBody(item);
        return await Promise.resolve(bodyCount + "|returned");
    }
    return await Promise.resolve("fallthrough");
}

forOfBodyAwaitReturn().then((value) => console.log(value));
