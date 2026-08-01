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

function recover(label: string): Promise<string> {
    console.log("recover-call-" + label);
    return later("recovered-" + label);
}

function rejectRecovery(label: string): Promise<string> {
    console.log("reject-call-" + label);
    return laterReject("recovery-rejected");
}

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        try {
            await prelude(item, item === "of-a");
        } catch (reason) {
            const label = item + "-catch-" + reason;
            console.log(label);
            const recovered = await recover(label);
            console.log(item + "-recovery-value-" + recovered + "|" + reason);
        } finally {
            await later(item + "-cleanup");
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
            await prelude(key, key === "in-a");
        } catch (reason) {
            const label = key + "-catch-" + reason;
            console.log(label);
            const recovered = await recover(label);
            console.log(key + "-recovery-value-" + recovered + "|" + reason);
        } finally {
            await later(key + "-cleanup");
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

async function runRecoveryRejected(): Promise<string> {
    for (const item of ["recover-rejected"]) {
        try {
            await laterReject(item + "-pre-rejected");
        } catch (reason) {
            const label = item + "-catch-" + reason;
            console.log(label);
            const recovered = await rejectRecovery(label);
            console.log("unreachable-" + recovered);
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
    return await later("recover-rejected-fallthrough");
}

async function runCleanupRejected(): Promise<string> {
    for (const item of ["cleanup-rejected"]) {
        try {
            await laterReject(item + "-pre-rejected");
        } catch (reason) {
            const label = item + "-catch-" + reason;
            console.log(label);
            const recovered = await recover(label);
            console.log(item + "-recovery-value-" + recovered + "|" + reason);
        } finally {
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
            return runRecoveryRejected().catch((reason) => {
                console.log("recovery-error-" + reason);
                return runCleanupRejected();
            });
        })
        .then((value) => console.log(value))
        .catch((reason) => console.log("cleanup-error-" + reason));
}

start();
