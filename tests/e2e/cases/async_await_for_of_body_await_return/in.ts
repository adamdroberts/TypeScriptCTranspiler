let bodyCount = 0;

function laterBody(value: string): Promise<void> {
    bodyCount++;
    return Promise.resolve(undefined);
}

async function forOfBodyAwaitReturn(): Promise<string> {
    for (const item of ["a", "b"]) {
        await laterBody(item);
        return await Promise.resolve(bodyCount + "|returned");
    }
    return await Promise.resolve("fallthrough");
}

forOfBodyAwaitReturn().then((value) => console.log(value));
