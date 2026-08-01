function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function laterReject(value: string): Promise<string> {
    return new Promise<string>((_, reject) => setImmediate(() => reject(value)));
}

function prelude(value: string, shouldReject: boolean): Promise<string> {
    return shouldReject ? laterReject(value + "-pre-rejected") : later(value + "-pre");
}

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        try {
            await prelude(item, false);
        } finally {
            const cleanupLabel = item + "-finally-pre";
            console.log(cleanupLabel);
            await later(cleanupLabel);
            console.log(item + "-cleanup");
        }
        if (await laterBoolean(item === "of-b")) {
            await later(item + "-step");
            return await later(item + "-return");
        }
        continue;
    }
    return await later("of-fallthrough");
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a", "in-b": "b" };
    for (const key in values) {
        try {
            await prelude(key, false);
        } finally {
            const cleanupLabel = key + "-finally-pre";
            console.log(cleanupLabel);
            await later(cleanupLabel);
            console.log(key + "-cleanup");
        }
        if (await laterBoolean(key === "in-b")) {
            await later(key + "-step");
            return await later(key + "-return");
        }
        continue;
    }
    return await later("in-fallthrough");
}

async function runBodyRejected(): Promise<string> {
    for (const item of ["body-rejected"]) {
        try {
            await prelude(item, true);
        } finally {
            const cleanupLabel = item + "-finally-pre";
            console.log(cleanupLabel);
            await later(cleanupLabel);
            console.log(item + "-cleanup");
        }
        if (await laterBoolean(true)) {
            await later(item + "-unreachable-step");
            return await later(item + "-unreachable");
        }
        continue;
    }
    return await later("body-rejected-fallthrough");
}

async function runCleanupRejected(): Promise<string> {
    for (const item of ["cleanup-rejected"]) {
        try {
            await laterReject(item + "-pre-rejected");
        } finally {
            const cleanupLabel = item + "-finally-pre";
            console.log(cleanupLabel);
            await laterReject(item + "-finally-rejected");
            console.log("unreachable-cleanup");
        }
        if (await laterBoolean(true)) {
            await later(item + "-unreachable-step");
            return await later(item + "-unreachable");
        }
        continue;
    }
    return await later("cleanup-rejected-fallthrough");
}

function start(): void {
    runOf()
        .then((value) => {
            console.log(value);
            return runIn();
        })
        .then((value) => {
            console.log(value);
            return runBodyRejected().catch((reason) => {
                console.log("body-error-" + reason);
                return runCleanupRejected();
            });
        })
        .then((value) => console.log(value))
        .catch((reason) => console.log("cleanup-error-" + reason));
}

start();
