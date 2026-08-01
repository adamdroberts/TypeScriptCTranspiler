function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function laterReject(value: string): Promise<string> {
    return new Promise<string>((_, reject) => setImmediate(() => reject(value)));
}

function bodyStep(value: string, shouldReject: boolean): Promise<string> {
    return shouldReject ? laterReject(value + "-rejected") : later(value);
}

async function runOfSuccess(): Promise<string> {
    for (const item of ["of-sync-a", "of-sync-b"]) {
        try {
            await bodyStep(item + "-try-1", false);
            console.log(item + "-try-between");
            await bodyStep(item + "-try-2", false);
        } finally {
            const cleanupLabel = item + "-cleanup-1";
            console.log(cleanupLabel);
            console.log(item + "-cleanup-done");
        }
        if (await laterBoolean(item === "of-sync-b")) {
            await later(item + "-step");
            return await later(item + "-return");
        }
        continue;
    }
    return await later("of-sync-fallthrough");
}

async function runOfSecondRejected(): Promise<string> {
    for (const item of ["of-second"]) {
        try {
            await bodyStep(item + "-try-1", false);
            console.log(item + "-try-between");
            await bodyStep(item + "-try-2", true);
        } finally {
            const cleanupLabel = item + "-cleanup-1";
            console.log(cleanupLabel);
            console.log(item + "-cleanup-done");
        }
        if (await laterBoolean(true)) {
            await later(item + "-unreachable-step");
            return await later(item + "-unreachable");
        }
        continue;
    }
    return await later("of-second-fallthrough");
}

async function runInFirstRejected(): Promise<string> {
    const values: Record<string, string> = { "in-first": "a" };
    for (const key in values) {
        try {
            await bodyStep(key + "-try-1", true);
            console.log(key + "-try-between");
            await bodyStep(key + "-try-2", false);
        } finally {
            const cleanupLabel = key + "-cleanup-1";
            console.log(cleanupLabel);
            console.log(key + "-cleanup-done");
        }
        if (await laterBoolean(true)) {
            await later(key + "-unreachable-step");
            return await later(key + "-unreachable");
        }
        continue;
    }
    return await later("in-first-fallthrough");
}

function start(): void {
    runOfSuccess()
        .then((value) => {
            console.log(value);
            return runOfSecondRejected();
        })
        .then((value) => console.log(value))
        .catch((reason) => {
            console.log("second-error-" + reason);
            return runInFirstRejected();
        })
        .then((value) => console.log(value))
        .catch((reason) => console.log("first-error-" + reason));
}

start();
