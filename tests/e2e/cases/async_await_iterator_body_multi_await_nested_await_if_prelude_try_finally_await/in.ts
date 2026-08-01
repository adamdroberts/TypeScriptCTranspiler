function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function laterReject(value: string): Promise<string> {
    return new Promise<string>((_, reject) => setImmediate(() => reject(value)));
}

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        try {
            await later(item + "-pre");
        } finally {
            await later(item + "-cleanup");
            console.log(item + "-cleanup");
        }
        if (await laterBoolean(item === "of-b")) {
            await later(item + "-step");
            return await later(item + "-return");
        } else {
            await later(item + "-step");
        }
        continue;
    }
    return await later("of-fallthrough");
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a", "in-b": "b" };
    for (const key in values) {
        try {
            await later(key + "-pre");
        } finally {
            await later(key + "-cleanup");
            console.log(key + "-cleanup");
        }
        if (await laterBoolean(key === "in-b")) {
            await later(key + "-step");
            return await later(key + "-return");
        } else {
            await later(key + "-step");
        }
        continue;
    }
    return await later("in-fallthrough");
}

async function runRejected(): Promise<string> {
    for (const item of ["reject"]) {
        try {
            await laterReject(item + "-pre-rejected");
        } finally {
            await later(item + "-cleanup");
            console.log(item + "-cleanup");
        }
        if (await laterBoolean(true)) {
            await later(item + "-unreachable-step");
            return await later(item + "-unreachable");
        }
        continue;
    }
    return await later("reject-fallthrough");
}

async function runCleanupRejected(): Promise<string> {
    for (const item of ["override"]) {
        try {
            await later(item + "-pre");
        } finally {
            await laterReject(item + "-cleanup-rejected");
            console.log("unreachable-cleanup");
        }
        if (await laterBoolean(true)) {
            await later(item + "-unreachable-step");
            return await later(item + "-unreachable");
        }
        continue;
    }
    return await later("override-fallthrough");
}

function start(): void {
    runOf()
        .then((value) => {
            console.log(value);
            return runIn();
        })
        .then((value) => {
            console.log(value);
            return runRejected().catch((reason) => {
                console.log(reason);
                return runCleanupRejected();
            });
        })
        .then((value) => console.log(value))
        .catch((reason) => console.log(reason));
}

start();
