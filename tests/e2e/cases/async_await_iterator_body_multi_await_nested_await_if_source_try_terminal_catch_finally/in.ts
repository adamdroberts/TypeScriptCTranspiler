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

async function runOfReturnSyncCatchFinally(stageReject: boolean, terminalReject: boolean): Promise<string> {
    for (const item of ["of-return-sync-finally"]) {
        await later(item + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(item + "-try", stageReject);
                return await outcome(item + "-value", terminalReject);
            } catch (reason) {
                console.log(item + "-catch-" + reason);
            } finally {
                console.log(item + "-finally");
            }
        }
        continue;
    }
    return await later("of-return-sync-finally-fallback");
}

async function runOfThrowSyncCatchFinally(stageReject: boolean, terminalReject: boolean): Promise<string> {
    for (const item of ["of-throw-sync-finally"]) {
        await later(item + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(item + "-try", stageReject);
                throw await outcome(item + "-value", terminalReject);
            } catch (reason) {
                console.log(item + "-catch-" + reason);
            } finally {
                console.log(item + "-finally");
            }
        }
        continue;
    }
    return await later("of-throw-sync-finally-fallback");
}

async function runOfReturnAwaitedCatchFinally(stageReject: boolean, terminalReject: boolean): Promise<string> {
    for (const item of ["of-return-await-finally"]) {
        await later(item + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(item + "-try", stageReject);
                return await outcome(item + "-value", terminalReject);
            } catch (reason) {
                await later(item + "-recovery");
                console.log(item + "-catch-" + reason);
            } finally {
                console.log(item + "-finally");
            }
        }
        continue;
    }
    return await later("of-return-await-finally-fallback");
}

async function runOfThrowAwaitedCatchFinally(stageReject: boolean, terminalReject: boolean): Promise<string> {
    for (const item of ["of-throw-await-finally"]) {
        await later(item + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(item + "-try", stageReject);
                throw await outcome(item + "-value", terminalReject);
            } catch (reason) {
                await later(item + "-recovery");
                console.log(item + "-catch-" + reason);
            } finally {
                console.log(item + "-finally");
            }
        }
        continue;
    }
    return await later("of-throw-await-finally-fallback");
}

async function runInReturnSyncCatchFinally(stageReject: boolean, terminalReject: boolean): Promise<string> {
    const values: Record<string, string> = { "in-return-sync-finally": "value" };
    for (const key in values) {
        await later(key + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(key + "-try", stageReject);
                return await outcome(key + "-value", terminalReject);
            } catch (reason) {
                console.log(key + "-catch-" + reason);
            } finally {
                console.log(key + "-finally");
            }
        }
        continue;
    }
    return await later("in-return-sync-finally-fallback");
}

async function runInThrowSyncCatchFinally(stageReject: boolean, terminalReject: boolean): Promise<string> {
    const values: Record<string, string> = { "in-throw-sync-finally": "value" };
    for (const key in values) {
        await later(key + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(key + "-try", stageReject);
                throw await outcome(key + "-value", terminalReject);
            } catch (reason) {
                console.log(key + "-catch-" + reason);
            } finally {
                console.log(key + "-finally");
            }
        }
        continue;
    }
    return await later("in-throw-sync-finally-fallback");
}

async function runInReturnAwaitedCatchFinally(stageReject: boolean, terminalReject: boolean): Promise<string> {
    const values: Record<string, string> = { "in-return-await-finally": "value" };
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
                console.log(key + "-finally");
            }
        }
        continue;
    }
    return await later("in-return-await-finally-fallback");
}

async function runInThrowAwaitedCatchFinally(stageReject: boolean, terminalReject: boolean): Promise<string> {
    const values: Record<string, string> = { "in-throw-await-finally": "value" };
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
                console.log(key + "-finally");
            }
        }
        continue;
    }
    return await later("in-throw-await-finally-fallback");
}

runOfReturnSyncCatchFinally(false, false)
    .then((value) => {
        console.log("of-return-sync-finally:" + value);
        return runOfReturnSyncCatchFinally(false, true);
    })
    .then((value) => {
        console.log("of-return-sync-finally-reject:" + value);
        return runOfThrowSyncCatchFinally(false, false);
    })
    .then((value) => {
        console.log("of-throw-sync-finally:" + value);
        return runOfThrowSyncCatchFinally(true, false);
    })
    .then((value) => {
        console.log("of-throw-sync-finally-stage-reject:" + value);
        return runOfReturnAwaitedCatchFinally(false, false);
    })
    .then((value) => {
        console.log("of-return-await-finally:" + value);
        return runOfReturnAwaitedCatchFinally(false, true);
    })
    .then((value) => {
        console.log("of-return-await-finally-reject:" + value);
        return runOfThrowAwaitedCatchFinally(false, false);
    })
    .then((value) => {
        console.log("of-throw-await-finally:" + value);
        return runOfThrowAwaitedCatchFinally(false, true);
    })
    .then((value) => {
        console.log("of-throw-await-finally-reject:" + value);
        return runInReturnSyncCatchFinally(false, false);
    })
    .then((value) => {
        console.log("in-return-sync-finally:" + value);
        return runInReturnSyncCatchFinally(false, true);
    })
    .then((value) => {
        console.log("in-return-sync-finally-reject:" + value);
        return runInThrowSyncCatchFinally(false, false);
    })
    .then((value) => {
        console.log("in-throw-sync-finally:" + value);
        return runInThrowSyncCatchFinally(true, false);
    })
    .then((value) => {
        console.log("in-throw-sync-finally-stage-reject:" + value);
        return runInReturnAwaitedCatchFinally(false, false);
    })
    .then((value) => {
        console.log("in-return-await-finally:" + value);
        return runInReturnAwaitedCatchFinally(false, true);
    })
    .then((value) => {
        console.log("in-return-await-finally-reject:" + value);
        return runInThrowAwaitedCatchFinally(false, false);
    })
    .then((value) => {
        console.log("in-throw-await-finally:" + value);
        return runInThrowAwaitedCatchFinally(false, true);
    })
    .then((value) => console.log("in-throw-await-finally-reject:" + value));
