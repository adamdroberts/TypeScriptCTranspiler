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

async function runOfReturnSyncCatch(stageReject: boolean, terminalReject: boolean): Promise<string> {
    for (const item of ["of-return-sync"]) {
        await later(item + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(item + "-try", stageReject);
                return await outcome(item + "-value", terminalReject);
            } catch (reason) {
                console.log(item + "-catch-" + reason);
            }
        }
        continue;
    }
    return await later("of-return-sync-fallback");
}

async function runOfThrowSyncCatch(stageReject: boolean, terminalReject: boolean): Promise<string> {
    for (const item of ["of-throw-sync"]) {
        await later(item + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(item + "-try", stageReject);
                throw await outcome(item + "-value", terminalReject);
            } catch (reason) {
                console.log(item + "-catch-" + reason);
            }
        }
        continue;
    }
    return await later("of-throw-sync-fallback");
}

async function runOfReturnAwaitedCatch(stageReject: boolean, terminalReject: boolean): Promise<string> {
    for (const item of ["of-return-await-catch"]) {
        await later(item + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(item + "-try", stageReject);
                return await outcome(item + "-value", terminalReject);
            } catch (reason) {
                await later(item + "-recovery");
                console.log(item + "-catch-" + reason);
            }
        }
        continue;
    }
    return await later("of-return-await-catch-fallback");
}

async function runOfThrowAwaitedCatch(stageReject: boolean, terminalReject: boolean): Promise<string> {
    for (const item of ["of-throw-await-catch"]) {
        await later(item + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(item + "-try", stageReject);
                throw await outcome(item + "-value", terminalReject);
            } catch (reason) {
                await later(item + "-recovery");
                console.log(item + "-catch-" + reason);
            }
        }
        continue;
    }
    return await later("of-throw-await-catch-fallback");
}

async function runInReturnSyncCatch(stageReject: boolean, terminalReject: boolean): Promise<string> {
    const values: Record<string, string> = { "in-return-sync": "value" };
    for (const key in values) {
        await later(key + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(key + "-try", stageReject);
                return await outcome(key + "-value", terminalReject);
            } catch (reason) {
                console.log(key + "-catch-" + reason);
            }
        }
        continue;
    }
    return await later("in-return-sync-fallback");
}

async function runInThrowSyncCatch(stageReject: boolean, terminalReject: boolean): Promise<string> {
    const values: Record<string, string> = { "in-throw-sync": "value" };
    for (const key in values) {
        await later(key + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(key + "-try", stageReject);
                throw await outcome(key + "-value", terminalReject);
            } catch (reason) {
                console.log(key + "-catch-" + reason);
            }
        }
        continue;
    }
    return await later("in-throw-sync-fallback");
}

async function runInReturnAwaitedCatch(stageReject: boolean, terminalReject: boolean): Promise<string> {
    const values: Record<string, string> = { "in-return-await-catch": "value" };
    for (const key in values) {
        await later(key + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(key + "-try", stageReject);
                return await outcome(key + "-value", terminalReject);
            } catch (reason) {
                await later(key + "-recovery");
                console.log(key + "-catch-" + reason);
            }
        }
        continue;
    }
    return await later("in-return-await-catch-fallback");
}

async function runInThrowAwaitedCatch(stageReject: boolean, terminalReject: boolean): Promise<string> {
    const values: Record<string, string> = { "in-throw-await-catch": "value" };
    for (const key in values) {
        await later(key + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(key + "-try", stageReject);
                throw await outcome(key + "-value", terminalReject);
            } catch (reason) {
                await later(key + "-recovery");
                console.log(key + "-catch-" + reason);
            }
        }
        continue;
    }
    return await later("in-throw-await-catch-fallback");
}

runOfReturnSyncCatch(false, false)
    .then((value) => {
        console.log("of-return-sync:" + value);
        return runOfReturnSyncCatch(false, true);
    })
    .then((value) => {
        console.log("of-return-sync-reject:" + value);
        return runOfThrowSyncCatch(false, false);
    })
    .then((value) => {
        console.log("of-throw-sync:" + value);
        return runOfThrowSyncCatch(true, false);
    })
    .then((value) => {
        console.log("of-throw-sync-stage-reject:" + value);
        return runOfReturnAwaitedCatch(false, false);
    })
    .then((value) => {
        console.log("of-return-await-catch:" + value);
        return runOfReturnAwaitedCatch(false, true);
    })
    .then((value) => {
        console.log("of-return-await-catch-reject:" + value);
        return runOfThrowAwaitedCatch(false, false);
    })
    .then((value) => {
        console.log("of-throw-await-catch:" + value);
        return runOfThrowAwaitedCatch(false, true);
    })
    .then((value) => {
        console.log("of-throw-await-catch-reject:" + value);
        return runInReturnSyncCatch(false, false);
    })
    .then((value) => {
        console.log("in-return-sync:" + value);
        return runInReturnSyncCatch(false, true);
    })
    .then((value) => {
        console.log("in-return-sync-reject:" + value);
        return runInThrowSyncCatch(false, false);
    })
    .then((value) => {
        console.log("in-throw-sync:" + value);
        return runInThrowSyncCatch(true, false);
    })
    .then((value) => {
        console.log("in-throw-sync-stage-reject:" + value);
        return runInReturnAwaitedCatch(false, false);
    })
    .then((value) => {
        console.log("in-return-await-catch:" + value);
        return runInReturnAwaitedCatch(false, true);
    })
    .then((value) => {
        console.log("in-return-await-catch-reject:" + value);
        return runInThrowAwaitedCatch(false, false);
    })
    .then((value) => {
        console.log("in-throw-await-catch:" + value);
        return runInThrowAwaitedCatch(false, true);
    })
    .then((value) => console.log("in-throw-await-catch-reject:" + value));
