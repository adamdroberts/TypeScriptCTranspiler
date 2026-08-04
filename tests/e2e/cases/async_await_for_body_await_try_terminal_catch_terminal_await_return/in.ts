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

async function run(stageReject: boolean, sourceTerminalReject: boolean, recoveryReject: boolean, catchTerminalReject: boolean, cleanupReject: boolean): Promise<string> {
    for (let count = 0; await laterBoolean(count < 1); count++) {
        try {
            await outcome("try", stageReject);
            throw await outcome("source-terminal", sourceTerminalReject);
        } catch (reason) {
            console.log("catch-prelude:" + reason);
            await outcome("recovery", recoveryReject);
            console.log("catch-postlude:" + reason);
            return await outcome("catch-terminal", catchTerminalReject);
        } finally {
            console.log("finally-prelude");
            await outcome("cleanup", cleanupReject);
            console.log("finally");
        }
    }
    return await later("fallback");
}

report("success", run(false, false, false, false, false))
    .then((_value) => report("source-terminal-reject", run(false, true, false, false, false)))
    .then((_value) => report("stage-reject", run(true, false, false, false, false)))
    .then((_value) => report("catch-recovery-reject", run(true, false, true, false, false)))
    .then((_value) => report("catch-terminal-reject", run(true, false, false, true, false)))
    .then((_value) => report("cleanup-reject", run(true, false, false, false, true)));
