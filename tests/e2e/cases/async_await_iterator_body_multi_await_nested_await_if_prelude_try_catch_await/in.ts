let recoveryCount = 0;

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

function recover(reason: unknown): Promise<string> {
    recoveryCount++;
    return later("recovered-" + reason);
}

function rejectRecovery(reason: unknown): Promise<string> {
    return laterReject("recovery-rejected");
}

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        try {
            await prelude(item, item === "of-a");
        } catch (reason) {
            await recover(reason);
        } finally {
            console.log(item + "-finally");
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
            await prelude(key, key === "in-a");
        } catch (reason) {
            await recover(reason);
        } finally {
            console.log(key + "-finally");
        }
        if (await laterBoolean(key === "in-b")) {
            await later(key + "-step");
            return await later(key + "-return");
        }
        continue;
    }
    return await later("in-fallthrough");
}

async function runRecoveryRejected(): Promise<string> {
    for (const item of ["reject"]) {
        try {
            await laterReject(item + "-pre-rejected");
        } catch (reason) {
            await rejectRecovery(reason);
        } finally {
            console.log(item + "-finally");
        }
        if (await laterBoolean(true)) {
            await later(item + "-unreachable-step");
            return await later(item + "-unreachable");
        }
        continue;
    }
    return await later("reject-fallthrough");
}

function start(): void {
    runOf()
        .then((value) => {
            console.log(value);
            return runIn();
        })
        .then((value) => {
            console.log(value);
            return runRecoveryRejected();
        })
        .then((value) => console.log(value))
        .catch((reason) => console.log(reason + "|" + recoveryCount));
}

start();
