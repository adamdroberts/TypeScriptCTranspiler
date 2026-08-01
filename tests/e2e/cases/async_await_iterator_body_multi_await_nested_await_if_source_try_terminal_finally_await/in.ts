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

async function runOfReturn(stageReject: boolean, terminalReject: boolean, cleanupReject: boolean): Promise<string> {
    for (const item of ["of-return-await-finally"]) {
        await later(item + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(item + "-try", stageReject);
                return await outcome(item + "-value", terminalReject);
            } finally {
                await outcome(item + "-cleanup-1", cleanupReject);
                await later(item + "-cleanup-2");
                console.log(item + "-finally");
            }
        }
        continue;
    }
    return await later("of-return-await-finally-fallback");
}

async function runOfThrow(stageReject: boolean, terminalReject: boolean, cleanupReject: boolean): Promise<string> {
    for (const item of ["of-throw-await-finally"]) {
        await later(item + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(item + "-try", stageReject);
                throw await outcome(item + "-value", terminalReject);
            } finally {
                await outcome(item + "-cleanup-1", cleanupReject);
                await later(item + "-cleanup-2");
                console.log(item + "-finally");
            }
        }
        continue;
    }
    return await later("of-throw-await-finally-fallback");
}

async function runInReturn(stageReject: boolean, terminalReject: boolean, cleanupReject: boolean): Promise<string> {
    const values: Record<string, string> = { "in-return-await-finally": "value" };
    for (const key in values) {
        await later(key + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(key + "-try", stageReject);
                return await outcome(key + "-value", terminalReject);
            } finally {
                await outcome(key + "-cleanup-1", cleanupReject);
                await later(key + "-cleanup-2");
                console.log(key + "-finally");
            }
        }
        continue;
    }
    return await later("in-return-await-finally-fallback");
}

async function runInThrow(stageReject: boolean, terminalReject: boolean, cleanupReject: boolean): Promise<string> {
    const values: Record<string, string> = { "in-throw-await-finally": "value" };
    for (const key in values) {
        await later(key + "-prelude");
        if (await laterBoolean(true)) {
            try {
                await outcome(key + "-try", stageReject);
                throw await outcome(key + "-value", terminalReject);
            } finally {
                await outcome(key + "-cleanup-1", cleanupReject);
                await later(key + "-cleanup-2");
                console.log(key + "-finally");
            }
        }
        continue;
    }
    return await later("in-throw-await-finally-fallback");
}

report("of-return-success", runOfReturn(false, false, false))
    .then((_value) => report("of-return-terminal-reject", runOfReturn(false, true, false)))
    .then((_value) => report("of-return-cleanup-reject", runOfReturn(false, true, true)))
    .then((_value) => report("of-return-stage-reject", runOfReturn(true, false, false)))
    .then((_value) => report("of-throw-success", runOfThrow(false, false, false)))
    .then((_value) => report("of-throw-terminal-reject", runOfThrow(false, true, false)))
    .then((_value) => report("of-throw-cleanup-reject", runOfThrow(false, false, true)))
    .then((_value) => report("in-return-success", runInReturn(false, false, false)))
    .then((_value) => report("in-return-terminal-reject", runInReturn(false, true, false)))
    .then((_value) => report("in-return-cleanup-reject", runInReturn(false, true, true)))
    .then((_value) => report("in-return-stage-reject", runInReturn(true, false, false)))
    .then((_value) => report("in-throw-success", runInThrow(false, false, false)))
    .then((_value) => report("in-throw-terminal-reject", runInThrow(false, true, false)))
    .then((_value) => report("in-throw-cleanup-reject", runInThrow(false, false, true)));
