let bodyCount = 0;

function laterBody(value: string): Promise<string> {
    bodyCount++;
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterReason(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

async function forOfBodyAwaitThrow(): Promise<string> {
    for (const item of ["a", "b"]) {
        let bodyValue: string;
        bodyValue = await laterBody(item);
        throw await laterReason("of-throw-" + bodyValue + "-" + bodyCount);
    }
    return await Promise.resolve("fallthrough");
}

forOfBodyAwaitThrow().then(
    (value) => console.log(value),
    (reason) => console.log(reason),
);
