function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function laterReject(value: string): Promise<string> {
    return new Promise<string>((_, reject) => setImmediate(() => reject(value)));
}

function bodyStep(value: string, shouldReject: boolean): Promise<string> {
    return shouldReject ? laterReject(value + "-rejected") : later(value);
}

function recoverFirst(reason: unknown): Promise<string> {
    return later("sync-recovered-1-" + reason);
}

function recoverSecond(reason: unknown, shouldReject: boolean): Promise<string> {
    return shouldReject
        ? laterReject("sync-recovered-2-" + reason + "-rejected")
        : later("sync-recovered-2-" + reason);
}

async function runOf(): Promise<string> {
    for (const item of ["of-sync-a", "of-sync-b"]) {
        try {
            await bodyStep(item + "-try-1", false);
            console.log(item + "-try-between");
            await bodyStep(item + "-try-2", item === "of-sync-a");
        } catch (reason) {
            await recoverFirst(reason);
            console.log(item + "-catch-between-" + reason);
            await recoverSecond(reason, false);
            console.log(item + "-catch-done-" + reason);
        } finally {
            const cleanupLabel = item + "-cleanup-1";
            console.log(cleanupLabel);
            console.log(item + "-cleanup-done");
        }
        if (await laterBoolean(item === "of-sync-b")) {
            await later(item + "-step");
            return await later(item + "-return");
        }
        continue;
    }
    return await later("of-sync-fallthrough");
}

async function runInCatchRejected(): Promise<string> {
    const values: Record<string, string> = { "in-sync": "a" };
    for (const key in values) {
        try {
            await bodyStep(key + "-try-1", false);
            console.log(key + "-try-between");
            await bodyStep(key + "-try-2", true);
        } catch (reason) {
            await recoverFirst(reason);
            console.log(key + "-catch-between-" + reason);
            await recoverSecond(reason, true);
            console.log("unreachable-catch-done");
        } finally {
            const cleanupLabel = key + "-cleanup-1";
            console.log(cleanupLabel);
            console.log(key + "-cleanup-done");
        }
        if (await laterBoolean(true)) {
            await later(key + "-unreachable-step");
            return await later(key + "-unreachable");
        }
        continue;
    }
    return await later("in-sync-fallthrough");
}

function start(): void {
    runOf()
        .then((value) => {
            console.log(value);
            return runInCatchRejected();
        })
        .then((value) => console.log(value))
        .catch((reason) => console.log("catch-error-" + reason));
}

start();
