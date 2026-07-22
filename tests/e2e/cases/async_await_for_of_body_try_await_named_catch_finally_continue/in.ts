let caughtReason = "";
let bodyCount = 0;
let cleanupCount = 0;

function failingBody(value: string): Promise<void> {
    bodyCount++;
    return value === "fail" ? Promise.reject("body-failed") : Promise.resolve(undefined);
}

function cleanup(value: string): Promise<void> {
    cleanupCount++;
    return Promise.resolve(undefined);
}

async function forOfBodyTryAwaitNamedCatchFinallyContinue(): Promise<string> {
    for (const item of ["fail", "ok"]) {
        try {
            await failingBody(item);
        } catch (error) {
            caughtReason = String(error);
        } finally {
            await cleanup("cleanup-" + item);
        }
        continue;
    }
    return await Promise.resolve(caughtReason + "|" + bodyCount + "|" + cleanupCount);
}

forOfBodyTryAwaitNamedCatchFinallyContinue().then((value) => console.log(value));
