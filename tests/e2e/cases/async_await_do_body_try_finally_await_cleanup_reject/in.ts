let cleanupCount = 0;

function failingBody(): Promise<void> {
    return Promise.reject("body-failed");
}

function laterCleanup(): Promise<void> {
    cleanupCount++;
    return Promise.resolve(undefined);
}

async function doBodyTryFinallyAwaitCleanupReject(): Promise<string> {
    let count = 0;
    do {
        try {
            await failingBody();
        } finally {
            await laterCleanup();
            count++;
        }
        continue;
    } while (await Promise.resolve(false));
    return "unexpected|" + cleanupCount + "|" + count;
}

doBodyTryFinallyAwaitCleanupReject().then(undefined, (error) => console.log(String(error) + "|" + cleanupCount));
