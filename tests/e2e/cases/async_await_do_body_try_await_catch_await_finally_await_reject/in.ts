let cleanupCount = 0;

function failingBody(): Promise<void> {
    return Promise.reject("body-failed");
}

function failingRecovery(): Promise<void> {
    return Promise.reject("recovery-failed");
}

function cleanup(): Promise<void> {
    cleanupCount++;
    return Promise.resolve(undefined);
}

async function doBodyTryAwaitCatchAwaitFinallyAwaitReject(): Promise<string> {
    do {
        try {
            await failingBody();
        } catch {
            await failingRecovery();
        } finally {
            await cleanup();
        }
        continue;
    } while (await Promise.resolve(false));
    return "unexpected";
}

doBodyTryAwaitCatchAwaitFinallyAwaitReject().then(undefined, (error) => console.log(String(error) + "|" + cleanupCount));
