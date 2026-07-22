let bodyCount = 0;
let cleanupCount = 0;

function laterBody(value: string): Promise<void> {
    bodyCount++;
    return Promise.resolve(undefined);
}

function laterCleanup(value: string): Promise<void> {
    cleanupCount++;
    return Promise.resolve(undefined);
}

function laterCondition(value: boolean): Promise<boolean> {
    return Promise.resolve(value);
}

async function doBodyTryFinallyAwaitCleanupContinue(): Promise<string> {
    let count = 0;
    do {
        try {
            await laterBody("try-" + count);
        } finally {
            await laterCleanup("cleanup-" + count);
            count++;
        }
        continue;
    } while (await laterCondition(count < 2));
    return await Promise.resolve(bodyCount + "|" + cleanupCount + "|" + count);
}

doBodyTryFinallyAwaitCleanupContinue().then((value) => console.log(value));
