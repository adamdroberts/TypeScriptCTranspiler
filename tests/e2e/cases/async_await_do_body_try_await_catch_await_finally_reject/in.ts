let finallyCount = 0;

function failingBody(): Promise<void> {
    return Promise.reject("body-failed");
}

function failingRecovery(): Promise<void> {
    return Promise.reject("recovery-failed");
}

async function doBodyTryAwaitCatchAwaitFinallyReject(): Promise<string> {
    do {
        try {
            await failingBody();
        } catch {
            await failingRecovery();
        } finally {
            finallyCount++;
        }
        continue;
    } while (await Promise.resolve(false));
    return "unexpected";
}

doBodyTryAwaitCatchAwaitFinallyReject().then(undefined, (error) => console.log(String(error) + "|" + finallyCount));
