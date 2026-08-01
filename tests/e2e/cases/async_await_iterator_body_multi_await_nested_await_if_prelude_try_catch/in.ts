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
            await laterReject(item + "-pre-rejected");
        } catch (reason) {
            console.log(item + "-caught");
            console.log(reason);
        } finally {
            console.log(item + "-finally");
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
            await laterReject(key + "-pre-rejected");
        } catch (reason) {
            console.log(key + "-caught");
            console.log(reason);
        } finally {
            console.log(key + "-finally");
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

async function runFulfilled(): Promise<string> {
    for (const item of ["fulfilled"]) {
        try {
            await later(item + "-pre");
        } catch (reason) {
            console.log("unexpected-catch");
            console.log(reason);
        } finally {
            console.log(item + "-finally");
        }
        if (await laterBoolean(true)) {
            await later(item + "-step");
            return await later(item + "-return");
        }
        continue;
    }
    return await later("fulfilled-fallthrough");
}

function start(): void {
    runOf()
        .then((value) => {
            console.log(value);
            return runIn();
        })
        .then((value) => {
            console.log(value);
            return runFulfilled();
        })
        .then((value) => console.log(value))
        .catch((reason) => console.log(reason));
}

start();
