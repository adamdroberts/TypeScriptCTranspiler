function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function outcome(value: string, shouldReject: boolean): Promise<string> {
    return shouldReject
        ? new Promise<string>((_, reject) => setImmediate(() => reject(value)))
        : later(value);
}

function report(label: string, operation: Promise<string>): Promise<string> {
    return operation
        .then((value) => {
            console.log(label + ":" + value);
            return "ok";
        })
        .catch((reason) => {
            console.log(label + "-error:" + reason);
            return "ok";
        });
}

async function runOfReturnSyncCatch(stageReject: boolean, terminalReject: boolean, cleanupReject: boolean): Promise<string> {
    for (const item of ["of-return-sync-catch"]) {
        await later(item + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(item + "-try", stageReject);
                return await outcome(item + "-value", terminalReject);
            } catch (reason) {
                console.log(item + "-catch-" + reason);
            } finally {
                await outcome(item + "-cleanup-1", cleanupReject);
                await later(item + "-cleanup-2");
                console.log(item + "-finally");
            }
        }
        continue;
    }
    return await later("of-return-sync-catch-fallback");
}

async function runOfThrowSyncCatch(stageReject: boolean, terminalReject: boolean, cleanupReject: boolean): Promise<string> {
    for (const item of ["of-throw-sync-catch"]) {
        await later(item + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(item + "-try", stageReject);
                throw await outcome(item + "-value", terminalReject);
            } catch (reason) {
                console.log(item + "-catch-" + reason);
            } finally {
                await outcome(item + "-cleanup-1", cleanupReject);
                await later(item + "-cleanup-2");
                console.log(item + "-finally");
            }
        }
        continue;
    }
    return await later("of-throw-sync-catch-fallback");
}

async function runOfReturnAwaitedCatch(stageReject: boolean, terminalReject: boolean, cleanupReject: boolean): Promise<string> {
    for (const item of ["of-return-awaited-catch"]) {
        await later(item + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(item + "-try", stageReject);
                return await outcome(item + "-value", terminalReject);
            } catch (reason) {
                await later(item + "-recovery");
                console.log(item + "-catch-" + reason);
            } finally {
                await outcome(item + "-cleanup-1", cleanupReject);
                await later(item + "-cleanup-2");
                console.log(item + "-finally");
            }
        }
        continue;
    }
    return await later("of-return-awaited-catch-fallback");
}

async function runOfThrowAwaitedCatch(stageReject: boolean, terminalReject: boolean, cleanupReject: boolean): Promise<string> {
    for (const item of ["of-throw-awaited-catch"]) {
        await later(item + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(item + "-try", stageReject);
                throw await outcome(item + "-value", terminalReject);
            } catch (reason) {
                await later(item + "-recovery");
                console.log(item + "-catch-" + reason);
            } finally {
                await outcome(item + "-cleanup-1", cleanupReject);
                await later(item + "-cleanup-2");
                console.log(item + "-finally");
            }
        }
        continue;
    }
    return await later("of-throw-awaited-catch-fallback");
}

async function runInReturnSyncCatch(stageReject: boolean, terminalReject: boolean, cleanupReject: boolean): Promise<string> {
    const values: Record<string, string> = { "in-return-sync-catch": "value" };
    for (const key in values) {
        await later(key + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(key + "-try", stageReject);
                return await outcome(key + "-value", terminalReject);
            } catch (reason) {
                console.log(key + "-catch-" + reason);
            } finally {
                await outcome(key + "-cleanup-1", cleanupReject);
                await later(key + "-cleanup-2");
                console.log(key + "-finally");
            }
        }
        continue;
    }
    return await later("in-return-sync-catch-fallback");
}

async function runInThrowSyncCatch(stageReject: boolean, terminalReject: boolean, cleanupReject: boolean): Promise<string> {
    const values: Record<string, string> = { "in-throw-sync-catch": "value" };
    for (const key in values) {
        await later(key + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(key + "-try", stageReject);
                throw await outcome(key + "-value", terminalReject);
            } catch (reason) {
                console.log(key + "-catch-" + reason);
            } finally {
                await outcome(key + "-cleanup-1", cleanupReject);
                await later(key + "-cleanup-2");
                console.log(key + "-finally");
            }
        }
        continue;
    }
    return await later("in-throw-sync-catch-fallback");
}

async function runInReturnAwaitedCatch(stageReject: boolean, terminalReject: boolean, cleanupReject: boolean): Promise<string> {
    const values: Record<string, string> = { "in-return-awaited-catch": "value" };
    for (const key in values) {
        await later(key + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(key + "-try", stageReject);
                return await outcome(key + "-value", terminalReject);
            } catch (reason) {
                await later(key + "-recovery");
                console.log(key + "-catch-" + reason);
            } finally {
                await outcome(key + "-cleanup-1", cleanupReject);
                await later(key + "-cleanup-2");
                console.log(key + "-finally");
            }
        }
        continue;
    }
    return await later("in-return-awaited-catch-fallback");
}

async function runInThrowAwaitedCatch(stageReject: boolean, terminalReject: boolean, cleanupReject: boolean): Promise<string> {
    const values: Record<string, string> = { "in-throw-awaited-catch": "value" };
    for (const key in values) {
        await later(key + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(key + "-try", stageReject);
                throw await outcome(key + "-value", terminalReject);
            } catch (reason) {
                await later(key + "-recovery");
                console.log(key + "-catch-" + reason);
            } finally {
                await outcome(key + "-cleanup-1", cleanupReject);
                await later(key + "-cleanup-2");
                console.log(key + "-finally");
            }
        }
        continue;
    }
    return await later("in-throw-awaited-catch-fallback");
}

report("of-return-sync-success", runOfReturnSyncCatch(false, false, false))
    .then((_value) => report("of-return-sync-terminal-reject", runOfReturnSyncCatch(false, true, false)))
    .then((_value) => report("of-return-sync-cleanup-reject", runOfReturnSyncCatch(false, false, true)))
    .then((_value) => report("of-return-sync-stage-reject", runOfReturnSyncCatch(true, false, false)))
    .then((_value) => report("of-throw-sync-success", runOfThrowSyncCatch(false, false, false)))
    .then((_value) => report("of-throw-sync-terminal-reject", runOfThrowSyncCatch(false, true, false)))
    .then((_value) => report("of-throw-sync-cleanup-reject", runOfThrowSyncCatch(false, false, true)))
    .then((_value) => report("of-throw-sync-stage-reject", runOfThrowSyncCatch(true, false, false)))
    .then((_value) => report("of-return-awaited-success", runOfReturnAwaitedCatch(false, false, false)))
    .then((_value) => report("of-return-awaited-terminal-reject", runOfReturnAwaitedCatch(false, true, false)))
    .then((_value) => report("of-return-awaited-cleanup-reject", runOfReturnAwaitedCatch(false, false, true)))
    .then((_value) => report("of-return-awaited-stage-reject", runOfReturnAwaitedCatch(true, false, false)))
    .then((_value) => report("of-throw-awaited-success", runOfThrowAwaitedCatch(false, false, false)))
    .then((_value) => report("of-throw-awaited-terminal-reject", runOfThrowAwaitedCatch(false, true, false)))
    .then((_value) => report("of-throw-awaited-cleanup-reject", runOfThrowAwaitedCatch(false, false, true)))
    .then((_value) => report("of-throw-awaited-stage-reject", runOfThrowAwaitedCatch(true, false, false)))
    .then((_value) => report("in-return-sync-success", runInReturnSyncCatch(false, false, false)))
    .then((_value) => report("in-return-sync-terminal-reject", runInReturnSyncCatch(false, true, false)))
    .then((_value) => report("in-return-sync-cleanup-reject", runInReturnSyncCatch(false, false, true)))
    .then((_value) => report("in-return-sync-stage-reject", runInReturnSyncCatch(true, false, false)))
    .then((_value) => report("in-throw-sync-success", runInThrowSyncCatch(false, false, false)))
    .then((_value) => report("in-throw-sync-terminal-reject", runInThrowSyncCatch(false, true, false)))
    .then((_value) => report("in-throw-sync-cleanup-reject", runInThrowSyncCatch(false, false, true)))
    .then((_value) => report("in-throw-sync-stage-reject", runInThrowSyncCatch(true, false, false)))
    .then((_value) => report("in-return-awaited-success", runInReturnAwaitedCatch(false, false, false)))
    .then((_value) => report("in-return-awaited-terminal-reject", runInReturnAwaitedCatch(false, true, false)))
    .then((_value) => report("in-return-awaited-cleanup-reject", runInReturnAwaitedCatch(false, false, true)))
    .then((_value) => report("in-return-awaited-stage-reject", runInReturnAwaitedCatch(true, false, false)))
    .then((_value) => report("in-throw-awaited-success", runInThrowAwaitedCatch(false, false, false)))
    .then((_value) => report("in-throw-awaited-terminal-reject", runInThrowAwaitedCatch(false, true, false)))
    .then((_value) => report("in-throw-awaited-cleanup-reject", runInThrowAwaitedCatch(false, false, true)))
    .then((_value) => report("in-throw-awaited-stage-reject", runInThrowAwaitedCatch(true, false, false)));
