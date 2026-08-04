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

async function runOf(stageReject: boolean, sourceReject: boolean, recoveryReject: boolean, catchTerminalReject: boolean, cleanupReject: boolean, finallyReject: boolean): Promise<string> {
    for (const item of ["of-return"]) {
        await later(item + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(item + "-try", stageReject);
                return await outcome(item + "-source", sourceReject);
            } catch (reason) {
                await outcome(item + "-recovery-" + reason, recoveryReject);
                return await outcome(item + "-catch-terminal", catchTerminalReject);
            } finally {
                await outcome(item + "-cleanup", cleanupReject);
                return await outcome(item + "-finally", finallyReject);
            }
        }
        continue;
    }
    return await later("of-return-fallback");
}

async function runIn(stageReject: boolean, sourceReject: boolean, recoveryReject: boolean, catchTerminalReject: boolean, cleanupReject: boolean, finallyReject: boolean): Promise<string> {
    const values: Record<string, string> = { "in-return": "value" };
    for (const key in values) {
        await later(key + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(key + "-try", stageReject);
                return await outcome(key + "-source", sourceReject);
            } catch (reason) {
                await outcome(key + "-recovery-" + reason, recoveryReject);
                return await outcome(key + "-catch-terminal", catchTerminalReject);
            } finally {
                await outcome(key + "-cleanup", cleanupReject);
                return await outcome(key + "-finally", finallyReject);
            }
        }
        continue;
    }
    return await later("in-return-fallback");
}

report("of-success", runOf(false, false, false, false, false, false))
    .then((_value) => report("of-source-reject", runOf(false, true, false, false, false, false)))
    .then((_value) => report("of-stage-reject", runOf(true, false, false, false, false, false)))
    .then((_value) => report("of-recovery-reject", runOf(true, false, true, false, false, false)))
    .then((_value) => report("of-catch-terminal-reject", runOf(true, false, false, true, false, false)))
    .then((_value) => report("of-finally-reject", runOf(true, false, false, false, false, true)))
    .then((_value) => report("of-cleanup-reject", runOf(true, false, false, false, true, false)))
    .then((_value) => report("in-success", runIn(false, false, false, false, false, false)))
    .then((_value) => report("in-source-reject", runIn(false, true, false, false, false, false)))
    .then((_value) => report("in-stage-reject", runIn(true, false, false, false, false, false)))
    .then((_value) => report("in-recovery-reject", runIn(true, false, true, false, false, false)))
    .then((_value) => report("in-catch-terminal-reject", runIn(true, false, false, true, false, false)))
    .then((_value) => report("in-finally-reject", runIn(true, false, false, false, false, true)))
    .then((_value) => report("in-cleanup-reject", runIn(true, false, false, false, true, false)));
