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

function report(label: string, operation: Promise<string | undefined>): Promise<string> {
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

async function runOf(sourceReject: boolean, cleanupReject: boolean): Promise<string | undefined> {
    for (const item of ["of-empty"]) {
        await later(item + "-prelude");
        if (await laterBoolean(true)) {
            try {
                return await outcome(item + "-source", sourceReject);
            } finally {
                await outcome(item + "-cleanup", cleanupReject);
                return;
            }
        }
        continue;
    }
    return await later("of-empty-fallback");
}

async function runIn(sourceReject: boolean, cleanupReject: boolean): Promise<string | undefined> {
    const values: Record<string, string> = { "in-empty": "value" };
    for (const key in values) {
        await later(key + "-prelude");
        if (await laterBoolean(true)) {
            try {
                return await outcome(key + "-source", sourceReject);
            } finally {
                await outcome(key + "-cleanup", cleanupReject);
                return;
            }
        }
        continue;
    }
    return await later("in-empty-fallback");
}

report("of-success", runOf(false, false))
    .then((_value) => report("of-source-reject", runOf(true, false)))
    .then((_value) => report("of-cleanup-reject", runOf(false, true)))
    .then((_value) => report("in-success", runIn(false, false)))
    .then((_value) => report("in-source-reject", runIn(true, false)))
    .then((_value) => report("in-cleanup-reject", runIn(false, true)));
