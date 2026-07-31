let bodyCount = 0;

function laterBody(value: string): Promise<string> {
    bodyCount++;
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterResult(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

async function forInBodyAwaitReturn(): Promise<string> {
    const values: Record<string, string> = { first: "a", second: "b" };
    for (const key in values) {
        let bodyValue: string;
        bodyValue = await laterBody(key);
        return await laterResult(bodyCount + "|" + bodyValue + "|returned");
    }
    return await laterResult("fallthrough");
}

forInBodyAwaitReturn().then((value) => console.log(value));
