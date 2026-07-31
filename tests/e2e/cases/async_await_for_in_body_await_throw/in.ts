let bodyCount = 0;

function laterBody(value: string): Promise<string> {
    bodyCount++;
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterReason(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

async function forInBodyAwaitThrow(): Promise<string> {
    const values: Record<string, string> = { first: "a", second: "b" };
    for (const key in values) {
        const bodyValue = await laterBody(key);
        throw await laterReason("in-throw-" + bodyValue + "-" + bodyCount);
    }
    return await Promise.resolve("fallthrough");
}

forInBodyAwaitThrow().then(
    (value) => console.log(value),
    (reason) => console.log(reason),
);
