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

async function runFinal(sourceReject: boolean, cleanupReject: boolean): Promise<string> {
    for (let count = 0; await laterBoolean(count < 1); count++) {
        count = 1;
        try {
            throw await outcome("source", sourceReject);
        } finally {
            await outcome("cleanup", cleanupReject);
            throw "finally";
        }
    }
    return await later("fallback");
}

async function runCatch(stageReject: boolean, sourceReject: boolean, recoveryReject: boolean, catchTerminalReject: boolean, cleanupReject: boolean): Promise<string> {
    for (let count = 0; await laterBoolean(count < 1); count++) {
        count = 1;
        try {
            await outcome("try", stageReject);
            throw await outcome("source", sourceReject);
        } catch (reason) {
            await outcome("recovery-" + reason, recoveryReject);
            throw await outcome("catch-terminal", catchTerminalReject);
        } finally {
            await outcome("cleanup", cleanupReject);
            throw "finally";
        }
    }
    return await later("fallback");
}

report("final-success", runFinal(false, false))
    .then((_value) => report("final-source-reject", runFinal(true, false)))
    .then((_value) => report("final-cleanup-reject", runFinal(false, true)))
    .then((_value) => report("catch-success", runCatch(false, false, false, false, false)))
    .then((_value) => report("catch-source-reject", runCatch(false, true, false, false, false)))
    .then((_value) => report("catch-stage-reject", runCatch(true, false, false, false, false)))
    .then((_value) => report("catch-recovery-reject", runCatch(true, false, true, false, false)))
    .then((_value) => report("catch-terminal-reject", runCatch(true, false, false, true, false)))
    .then((_value) => report("catch-cleanup-reject", runCatch(true, false, false, false, true)));
