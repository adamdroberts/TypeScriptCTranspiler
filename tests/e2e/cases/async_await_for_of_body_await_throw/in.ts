let bodyCount = 0;

function laterBody(value: string): Promise<void> {
    bodyCount++;
    return Promise.resolve(undefined);
}

function laterReason(value: string): Promise<string> {
    return Promise.resolve(value);
}

async function forOfBodyAwaitThrow(): Promise<string> {
    for (const item of ["a", "b"]) {
        await laterBody(item);
        throw await laterReason("of-throw-" + bodyCount);
    }
    return await Promise.resolve("fallthrough");
}

forOfBodyAwaitThrow().then(
    (value) => console.log(value),
    (reason) => console.log(reason),
);
