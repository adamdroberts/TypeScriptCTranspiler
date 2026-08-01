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

async function runOf(): Promise<string> {
    for (const item of ["of-first", "of-second", "of-success"]) {
        try {
            await bodyStep(item + "-try-1", item === "of-first");
            console.log(item + "-try-between");
            await bodyStep(item + "-try-2", item === "of-second");
        } catch (reason) {
            console.log(item + "-catch-" + reason);
        } finally {
            const cleanupLabel = item + "-cleanup-1";
            console.log(cleanupLabel);
            console.log(item + "-cleanup-done");
        }
        if (await laterBoolean(item === "of-success")) {
            await later(item + "-step");
            return await later(item + "-return");
        }
        continue;
    }
    return await later("of-fallthrough");
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = {
        "in-first": "a",
        "in-second": "b",
        "in-success": "c",
    };
    for (const key in values) {
        try {
            await bodyStep(key + "-try-1", key === "in-first");
            console.log(key + "-try-between");
            await bodyStep(key + "-try-2", key === "in-second");
        } catch (reason) {
            console.log(key + "-catch-" + reason);
        } finally {
            const cleanupLabel = key + "-cleanup-1";
            console.log(cleanupLabel);
            console.log(key + "-cleanup-done");
        }
        if (await laterBoolean(key === "in-success")) {
            await later(key + "-step");
            return await later(key + "-return");
        }
        continue;
    }
    return await later("in-fallthrough");
}

function start(): void {
    runOf()
        .then((value) => {
            console.log(value);
            return runIn();
        })
        .then((value) => console.log(value))
        .catch((reason) => console.log("unexpected-" + reason));
}

start();
