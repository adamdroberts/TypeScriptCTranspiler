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

async function forOfBodyTryAwaitFinallyAwaitSuccess(): Promise<string> {
    for (const item of ["a", "b"]) {
        try {
            await body(item);
        } finally {
            await cleanup("cleanup-" + item);
        }
        continue;
    }
    return await Promise.resolve(bodyCount + "|" + cleanupCount);
}

forOfBodyTryAwaitFinallyAwaitSuccess().then((value) => console.log(value));
