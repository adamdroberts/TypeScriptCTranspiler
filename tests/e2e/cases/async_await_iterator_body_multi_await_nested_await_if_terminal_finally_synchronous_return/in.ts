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

async function runOf(sourceReject: boolean, cleanupReject: boolean, finallyReject: boolean): Promise<string> {
    for (const item of ["of-return"]) {
        await later(item + "-prelude");
        if (await laterBoolean(true)) {
            try {
                return await outcome(item + "-source", sourceReject);
            } finally {
                await outcome(item + "-cleanup", cleanupReject);
                return item + "-finally";
            }
        }
        continue;
    }
    return await later("of-return-fallback");
}

async function runIn(sourceReject: boolean, cleanupReject: boolean, finallyReject: boolean): Promise<string> {
    const values: Record<string, string> = { "in-return": "value" };
    for (const key in values) {
        await later(key + "-prelude");
        if (await laterBoolean(true)) {
            try {
                return await outcome(key + "-source", sourceReject);
            } finally {
                await outcome(key + "-cleanup", cleanupReject);
                return key + "-finally";
            }
        }
        continue;
    }
    return await later("in-return-fallback");
}

report("of-success", runOf(false, false, false))
    .then((_value) => report("of-source-reject", runOf(true, false, false)))
    .then((_value) => report("of-finally-reject", runOf(false, false, true)))
    .then((_value) => report("of-cleanup-reject", runOf(false, true, false)))
    .then((_value) => report("of-source-and-finally-reject", runOf(true, false, true)))
    .then((_value) => report("in-success", runIn(false, false, false)))
    .then((_value) => report("in-source-reject", runIn(true, false, false)))
    .then((_value) => report("in-finally-reject", runIn(false, false, true)))
    .then((_value) => report("in-cleanup-reject", runIn(false, true, false)))
    .then((_value) => report("in-source-and-finally-reject", runIn(true, false, true)));
