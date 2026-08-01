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

function recoverFirst(reason: unknown): Promise<string> {
    return later("recovered-1-" + reason);
}

function recoverSecond(reason: unknown): Promise<string> {
    return later("recovered-2-" + reason);
}

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        try {
            await bodyStep(item + "-try-1", false);
            console.log(item + "-try-between");
            await bodyStep(item + "-try-2", item === "of-a");
        } catch (reason) {
            await recoverFirst(reason);
            console.log(item + "-catch-between-" + reason);
            await recoverSecond(reason);
            console.log(item + "-catch-done-" + reason);
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
            await bodyStep(key + "-try-1", key === "in-a");
            console.log(key + "-try-between");
            await bodyStep(key + "-try-2", false);
        } catch (reason) {
            await recoverFirst(reason);
            console.log(key + "-catch-between-" + reason);
            await recoverSecond(reason);
            console.log(key + "-catch-done-" + reason);
        }
        if (await laterBoolean(key === "in-b")) {
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
