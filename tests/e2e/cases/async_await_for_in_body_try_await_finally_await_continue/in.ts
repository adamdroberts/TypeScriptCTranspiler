let bodyCount = 0;
let cleanupCount = 0;

function body(value: string): Promise<string> {
    bodyCount++;
    return new Promise<string>((resolve, reject) => setImmediate(() => {
        if (value === "first") reject("body-failed");
        else resolve("ok");
    }));
}

function cleanup(value: string): Promise<string> {
    cleanupCount++;
    return new Promise<string>((resolve) => setImmediate(() => resolve("clean")));
}

async function forInBodyTryAwaitFinallyAwaitContinue(): Promise<string> {
    const values: Record<string, string> = { first: "fail", second: "ok" };
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

forInBodyTryAwaitFinallyAwaitContinue().then(
    (value) => console.log(value),
    (reason) => console.log("error:" + reason),
);
