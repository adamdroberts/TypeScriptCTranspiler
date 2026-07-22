let bodyCount = 0;

function laterBody(value: string): Promise<string> {
    bodyCount++;
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

async function forInBodyAwaitContinue(): Promise<string> {
    const values: Record<string, string> = { first: "a", second: "b" };
    for (const key in values) {
        await laterBody(key);
        continue;
    }
    return await Promise.resolve(bodyCount + "|done");
}

forInBodyAwaitContinue().then((value) => console.log(value));
