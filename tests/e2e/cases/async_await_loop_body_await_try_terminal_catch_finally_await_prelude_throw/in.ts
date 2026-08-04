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
            console.log("try-prelude");
            await outcome("try", stageReject);
            throw await outcome("terminal", terminalReject);
        } catch (reason) {
            console.log("catch-prelude:" + reason);
            await outcome("recovery-" + reason, false);
            console.log("catch-postlude:" + reason);
        } finally {
            console.log("finally-prelude");
            await outcome("cleanup-1", cleanupReject);
            await later("cleanup-2");
            console.log("finally");
        }
    }
    return await later("fallback");
}

report("prelude-throw-success", run(false, false, false))
    .then((_value) => report("prelude-throw-terminal-reject", run(false, true, false)))
    .then((_value) => report("prelude-throw-cleanup-reject", run(false, false, true)))
    .then((_value) => report("prelude-throw-stage-reject", run(true, false, false)));
