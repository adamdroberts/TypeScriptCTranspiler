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

function recoverFirst(reason: unknown): Promise<string> {
    return later("first-recovered-" + reason);
}

function recoverSecond(reason: unknown): Promise<string> {
    return later("second-recovered-" + reason);
}

function rejectFirst(reason: unknown): Promise<string> {
    return laterReject("first-recovery-rejected");
}

function rejectSecond(reason: unknown): Promise<string> {
    return laterReject("second-recovery-rejected");
}

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        try {
            await prelude(item, item === "of-a");
        } catch (reason) {
            let first: string = await recoverFirst(reason), second: string;
            second = await recoverSecond(reason);
            console.log(item + "-values-" + first + "|" + second + "|" + reason);
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
            var first: string = await recoverFirst(reason), second: string;
            second = await recoverSecond(reason);
            console.log(key + "-values-" + first + "|" + second + "|" + reason);
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

async function runFirstRecoveryRejected(): Promise<string> {
    for (const item of ["first"]) {
        try {
            await laterReject(item + "-pre-rejected");
        } catch (reason) {
            let first: string = await rejectFirst(reason), second: string;
            second = await recoverSecond(reason);
            console.log("unreachable-" + first + "-" + second);
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
    return await later("first-fallthrough");
}

async function runSecondRecoveryRejected(): Promise<string> {
    for (const item of ["second"]) {
        try {
            await laterReject(item + "-pre-rejected");
        } catch (reason) {
            let first: string = await recoverFirst(reason), second: string;
            second = await rejectSecond(reason);
            console.log("unreachable-" + first + "-" + second);
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
    return await later("second-fallthrough");
}

async function runCleanupRejected(): Promise<string> {
    for (const item of ["cleanup"]) {
        try {
            await laterReject(item + "-pre-rejected");
        } catch (reason) {
            let first: string = await recoverFirst(reason), second: string;
            second = await recoverSecond(reason);
            console.log(item + "-values-" + first + "|" + second + "|" + reason);
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
    return await later("cleanup-fallthrough");
}

function start(): void {
    runOf()
        .then((value) => {
            console.log(value);
            return runIn();
        })
        .then((value) => {
            console.log(value);
            return runFirstRecoveryRejected().catch((reason) => {
                console.log("first-error-" + reason);
                return runSecondRecoveryRejected().catch((secondReason) => {
                    console.log("second-error-" + secondReason);
                    return runCleanupRejected();
                });
            });
        })
        .then((value) => console.log(value))
        .catch((reason) => console.log("cleanup-error-" + reason));
}

start();
