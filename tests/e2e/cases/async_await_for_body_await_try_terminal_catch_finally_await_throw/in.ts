function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterCondition(value: boolean): Promise<boolean> {
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

async function run(stageReject: boolean, terminalReject: boolean, cleanupReject: boolean): Promise<string> {
    for (let count = 0; await laterCondition(count < 1); count++) {
        try {
            await outcome("try", stageReject);
            throw await outcome("terminal", terminalReject);
        } catch (reason) {
            await outcome("recovery-" + reason, false);
            console.log("catch:" + reason);
        } finally {
            await outcome("cleanup-1", cleanupReject);
            await later("cleanup-2");
            console.log("finally");
        }
    }
    return await later("fallback");
}

report("for-throw-success", run(false, false, false))
    .then((_value) => report("for-throw-terminal-reject", run(false, true, false)))
    .then((_value) => report("for-throw-cleanup-reject", run(false, false, true)))
    .then((_value) => report("for-throw-stage-reject", run(true, false, false)));
