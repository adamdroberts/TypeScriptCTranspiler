let bodyCount = 0;
let cleanupCount = 0;

function body(value: string): Promise<string> {
    bodyCount++;
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function cleanup(value: string): Promise<string> {
    cleanupCount++;
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

async function forInBodyTryAwaitFinallyAwaitSuccess(): Promise<string> {
    const values: Record<string, string> = { first: "a", second: "b" };
    for (const key in values) {
        try {
            await body(key);
        } finally {
            await cleanup("cleanup-" + key);
        }
        continue;
    }
    return await Promise.resolve(bodyCount + "|" + cleanupCount);
}

forInBodyTryAwaitFinallyAwaitSuccess().then((value) => console.log(value));
