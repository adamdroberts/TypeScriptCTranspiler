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
    let count = 0;
    while (await laterCondition(count === 0)) {
        count = 1;
        try {
            await outcome("try", stageReject);
            return await outcome("terminal", terminalReject);
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

report("return-success", run(false, false, false))
    .then((_value) => report("return-terminal-reject", run(false, true, false)))
    .then((_value) => report("return-cleanup-reject", run(false, false, true)))
    .then((_value) => report("return-stage-reject", run(true, false, false)));
