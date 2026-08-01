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
    return later("catch-recovery-1-" + reason);
}

function recoverSecond(reason: unknown, shouldReject: boolean): Promise<string> {
    return shouldReject
        ? laterReject("catch-recovery-2-" + reason + "-rejected")
        : later("catch-recovery-2-" + reason);
}

function cleanupStep(value: string, shouldReject: boolean): Promise<string> {
    return shouldReject ? laterReject(value + "-rejected") : later(value);
}

async function runOfSuccess(): Promise<string> {
    for (const item of ["of-success-a", "of-success-b"]) {
        try {
            await bodyStep(item + "-try-1", false);
            console.log(item + "-try-between");
            await bodyStep(item + "-try-2", false);
        } catch (reason) {
            await recoverFirst(reason);
            console.log(item + "-catch-between-" + reason);
            await recoverSecond(reason, false);
            console.log(item + "-catch-done-" + reason);
        } finally {
            const cleanupLabel = item + "-cleanup-1";
            console.log(cleanupLabel);
            await cleanupStep(cleanupLabel, false);
            console.log(item + "-cleanup-between");
            await cleanupStep(item + "-cleanup-2", false);
            console.log(item + "-cleanup-done");
        }
        if (await laterBoolean(item === "of-success-b")) {
            await later(item + "-step");
            return await later(item + "-return");
        }
        continue;
    }
    return await later("of-success-fallthrough");
}

async function runOfBodyRejected(): Promise<string> {
    for (const item of ["of-body"]) {
        try {
            await bodyStep(item + "-try-1", false);
            console.log(item + "-try-between");
            await bodyStep(item + "-try-2", true);
        } catch (reason) {
            await recoverFirst(reason);
            console.log(item + "-catch-between-" + reason);
            await recoverSecond(reason, false);
            console.log(item + "-catch-done-" + reason);
        } finally {
            const cleanupLabel = item + "-cleanup-1";
            console.log(cleanupLabel);
            await cleanupStep(cleanupLabel, false);
            console.log(item + "-cleanup-between");
            await cleanupStep(item + "-cleanup-2", false);
            console.log(item + "-cleanup-done");
        }
        if (await laterBoolean(false)) {
            await later(item + "-unreachable-step");
            return await later(item + "-unreachable");
        }
        continue;
    }
    return await later("of-body-fallthrough");
}

async function runInBodyRejected(): Promise<string> {
    const values: Record<string, string> = { "in-body": "a" };
    for (const key in values) {
        try {
            await bodyStep(key + "-try-1", true);
            console.log(key + "-try-between");
            await bodyStep(key + "-try-2", false);
        } catch (reason) {
            await recoverFirst(reason);
            console.log(key + "-catch-between-" + reason);
            await recoverSecond(reason, false);
            console.log(key + "-catch-done-" + reason);
        } finally {
            const cleanupLabel = key + "-cleanup-1";
            console.log(cleanupLabel);
            await cleanupStep(cleanupLabel, false);
            console.log(key + "-cleanup-between");
            await cleanupStep(key + "-cleanup-2", false);
            console.log(key + "-cleanup-done");
        }
        if (await laterBoolean(false)) {
            await later(key + "-unreachable-step");
            return await later(key + "-unreachable");
        }
        continue;
    }
    return await later("in-body-fallthrough");
}

async function runOfCatchRejected(): Promise<string> {
    for (const item of ["of-catch"]) {
        try {
            await bodyStep(item + "-try-1", false);
            console.log(item + "-try-between");
            await bodyStep(item + "-try-2", true);
        } catch (reason) {
            await recoverFirst(reason);
            console.log(item + "-catch-between-" + reason);
            await recoverSecond(reason, true);
            console.log("unreachable-catch-done");
        } finally {
            const cleanupLabel = item + "-cleanup-1";
            console.log(cleanupLabel);
            await cleanupStep(cleanupLabel, false);
            console.log(item + "-cleanup-between");
            await cleanupStep(item + "-cleanup-2", false);
            console.log(item + "-cleanup-done");
        }
        if (await laterBoolean(true)) {
            await later(item + "-unreachable-step");
            return await later(item + "-unreachable");
        }
        continue;
    }
    return await later("of-catch-fallthrough");
}

async function runInFinallyRejected(): Promise<string> {
    const values: Record<string, string> = { "in-finally": "a" };
    for (const key in values) {
        try {
            await bodyStep(key + "-try-1", false);
            console.log(key + "-try-between");
            await bodyStep(key + "-try-2", false);
        } catch (reason) {
            await recoverFirst(reason);
            console.log("unreachable-catch-" + reason);
            await recoverSecond(reason, false);
        } finally {
            const cleanupLabel = key + "-cleanup-1";
            console.log(cleanupLabel);
            await cleanupStep(cleanupLabel, false);
            console.log(key + "-cleanup-between");
            await cleanupStep(key + "-cleanup-2", true);
            console.log("unreachable-cleanup-done");
        }
        if (await laterBoolean(true)) {
            await later(key + "-unreachable-step");
            return await later(key + "-unreachable");
        }
        continue;
    }
    return await later("in-finally-fallthrough");
}

function start(): void {
    runOfSuccess()
        .then((value) => {
            console.log(value);
            return runOfBodyRejected();
        })
        .then((value) => {
            console.log(value);
            return runInBodyRejected();
        })
        .then((value) => {
            console.log(value);
            return runOfCatchRejected();
        })
        .then((value) => console.log(value))
        .catch((reason) => {
            console.log("catch-error-" + reason);
            return runInFinallyRejected();
        })
        .then((value) => console.log(value))
        .catch((reason) => console.log("finally-error-" + reason));
}

start();
