let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("try-catch-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function fail(value: string): void {
    mark(value);
    throw "try-catch-prelude-thrown";
}

function failCleanup(value: string): void {
    mark(value);
    throw "try-catch-cleanup-thrown";
}

async function awaitedIfTryCatchPrelude(route: number): Promise<string> {
    const first = await laterString("try-catch-first");
    if (await laterBoolean(route === 1)) {
        try {
            fail("true:try:" + first);
        } catch (reason) {
            mark("true:catch:" + reason);
        } finally {
            mark("true:finally");
        }
        return await laterString(first + "-true-return");
    } else {
        try {
            mark("false:try:" + first);
        } catch (reason) {
            mark("false:catch:" + reason);
        } finally {
            mark("false:finally");
        }
        throw await laterString(first + "-false-throw");
    }
}

async function awaitedIfTryCatchPreludeReject(): Promise<string> {
    const first = await laterString("try-catch-condition-first");
    if (await rejectedBoolean()) {
        try {
            mark("reject:try:" + first);
        } catch (reason) {
            mark("reject:catch:" + reason);
        } finally {
            mark("reject:finally");
        }
        return await laterString(first + "-return");
    } else {
        try {
            mark("reject:false-try:" + first);
        } catch (reason) {
            mark("reject:false-catch:" + reason);
        } finally {
            mark("reject:false-finally");
        }
        throw await laterString(first + "-throw");
    }
}

async function awaitedIfTryCatchPreludeCleanupThrow(): Promise<string> {
    const first = await laterString("try-catch-cleanup-first");
    if (await laterBoolean(true)) {
        try {
            fail("cleanup:try:" + first);
        } catch (reason) {
            mark("cleanup:catch:" + reason);
        } finally {
            failCleanup("cleanup:finally:" + first);
        }
        return await laterString(first + "-return");
    } else {
        return await laterString(first + "-false");
    }
}

async function awaitedIfTryCatchPreludeCatchThrow(): Promise<string> {
    const first = await laterString("try-catch-catch-first");
    if (await laterBoolean(true)) {
        try {
            fail("catch-throw:try:" + first);
        } catch (reason) {
            failCleanup("catch-throw:catch:" + reason);
        } finally {
            mark("catch-throw:finally");
        }
        return await laterString(first + "-return");
    } else {
        return await laterString(first + "-false");
    }
}

awaitedIfTryCatchPrelude(1).then((value) => console.log("return", value));
awaitedIfTryCatchPrelude(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfTryCatchPreludeReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfTryCatchPreludeCleanupThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("cleanup-reject", reason),
);
awaitedIfTryCatchPreludeCatchThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("catch-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
