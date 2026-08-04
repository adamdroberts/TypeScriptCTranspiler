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

async function run(sourceReject: boolean, cleanupReject: boolean, finallyReject: boolean): Promise<string> {
    let count = 0;
    while (await laterBoolean(count < 1)) {
        count = 1;
        try {
            throw await outcome("source", sourceReject);
        } finally {
            await outcome("cleanup", cleanupReject);
            throw await outcome("finally", finallyReject);
        }
    }
    return await later("fallback");
}

report("success", run(false, false, false))
    .then((_value) => report("source-reject", run(true, false, false)))
    .then((_value) => report("finally-reject", run(false, false, true)))
    .then((_value) => report("cleanup-reject", run(false, true, false)))
    .then((_value) => report("source-and-finally-reject", run(true, false, true)));
