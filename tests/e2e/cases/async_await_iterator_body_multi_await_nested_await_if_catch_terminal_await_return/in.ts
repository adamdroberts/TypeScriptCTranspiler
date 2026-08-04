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

async function runOf(stageReject: boolean, terminalReject: boolean, recoveryReject: boolean, catchTerminalReject: boolean, cleanupReject: boolean): Promise<string> {
    for (const item of ["of-return"]) {
        await later(item + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(item + "-try", stageReject);
                throw await outcome(item + "-source-terminal", terminalReject);
            } catch (reason) {
                console.log(item + "-catch-prelude:" + reason);
                await outcome(item + "-recovery", recoveryReject);
                console.log(item + "-catch-postlude:" + reason);
                return await outcome(item + "-catch-terminal", catchTerminalReject);
            } finally {
                console.log(item + "-finally-prelude");
                await outcome(item + "-cleanup", cleanupReject);
                console.log(item + "-finally");
            }
        }
        continue;
    }
    return await later("of-return-fallback");
}

async function runIn(stageReject: boolean, terminalReject: boolean, recoveryReject: boolean, catchTerminalReject: boolean, cleanupReject: boolean): Promise<string> {
    const values: Record<string, string> = { "in-return": "value" };
    for (const key in values) {
        await later(key + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(key + "-try", stageReject);
                throw await outcome(key + "-source-terminal", terminalReject);
            } catch (reason) {
                console.log(key + "-catch-prelude:" + reason);
                await outcome(key + "-recovery", recoveryReject);
                console.log(key + "-catch-postlude:" + reason);
                return await outcome(key + "-catch-terminal", catchTerminalReject);
            } finally {
                console.log(key + "-finally-prelude");
                await outcome(key + "-cleanup", cleanupReject);
                console.log(key + "-finally");
            }
        }
        continue;
    }
    return await later("in-return-fallback");
}

report("of-success", runOf(false, false, false, false, false))
    .then((_value) => report("of-source-terminal-reject", runOf(false, true, false, false, false)))
    .then((_value) => report("of-stage-reject", runOf(true, false, false, false, false)))
    .then((_value) => report("of-catch-recovery-reject", runOf(true, false, true, false, false)))
    .then((_value) => report("of-catch-terminal-reject", runOf(true, false, false, true, false)))
    .then((_value) => report("of-cleanup-reject", runOf(true, false, false, false, true)))
    .then((_value) => report("in-success", runIn(false, false, false, false, false)))
    .then((_value) => report("in-source-terminal-reject", runIn(false, true, false, false, false)))
    .then((_value) => report("in-stage-reject", runIn(true, false, false, false, false)))
    .then((_value) => report("in-catch-recovery-reject", runIn(true, false, true, false, false)))
    .then((_value) => report("in-catch-terminal-reject", runIn(true, false, false, true, false)))
    .then((_value) => report("in-cleanup-reject", runIn(true, false, false, false, true)));
