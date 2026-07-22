let bodyCount = 0;
let cleanupCount = 0;

function body(value: string): Promise<string> {
    bodyCount++;
    return new Promise<string>((resolve, reject) => setImmediate(() => {
        if (value === "fail") reject("body-failed");
        else resolve("ok");
    }));
}

function cleanup(value: string): Promise<string> {
    cleanupCount++;
    return new Promise<string>((resolve) => setImmediate(() => resolve("clean")));
}

async function forOfBodyTryAwaitFinallyAwaitContinue(): Promise<string> {
    for (const item of ["fail", "ok"]) {
        try {
            await body(item);
        } finally {
            await cleanup("cleanup-" + item);
        }
        continue;
    }
    return await Promise.resolve(bodyCount + "|" + cleanupCount);
}

forOfBodyTryAwaitFinallyAwaitContinue().then(
    (value) => console.log(value),
    (reason) => console.log("error:" + reason),
);
