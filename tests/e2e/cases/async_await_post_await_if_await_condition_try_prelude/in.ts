let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("try-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function fail(value: string): void {
    mark(value);
    throw "try-prelude-thrown";
}

function failCleanup(value: string): void {
    mark(value);
    throw "try-cleanup-thrown";
}

async function awaitedIfTryPrelude(route: number): Promise<string> {
    const first = await laterString("try-prelude-first");
    if (await laterBoolean(route === 1)) {
        try {
            mark("true:try:" + first);
        } finally {
            mark("true:finally");
        }
        return await laterString(first + "-true-return");
    } else {
        try {
            mark("false:try:" + first);
        } finally {
            mark("false:finally");
        }
        throw await laterString(first + "-false-throw");
    }
}

async function awaitedIfTryPreludeReject(): Promise<string> {
    const first = await laterString("try-condition-first");
    if (await rejectedBoolean()) {
        try {
            mark("reject:try:" + first);
        } finally {
            mark("reject:finally");
        }
        return await laterString(first + "-return");
    } else {
        try {
            mark("reject:false-try:" + first);
        } finally {
            mark("reject:false-finally");
        }
        throw await laterString(first + "-throw");
    }
}

async function awaitedIfTryPreludeThrow(): Promise<string> {
    const first = await laterString("try-throw-first");
    if (await laterBoolean(true)) {
        try {
            fail("throw:try:" + first);
        } finally {
            mark("throw:finally");
        }
        return await laterString(first + "-return");
    } else {
        return await laterString(first + "-false");
    }
}

async function awaitedIfTryPreludeCleanupThrow(): Promise<string> {
    const first = await laterString("try-cleanup-first");
    if (await laterBoolean(true)) {
        try {
            mark("cleanup:try:" + first);
        } finally {
            failCleanup("cleanup:finally:" + first);
        }
        return await laterString(first + "-return");
    } else {
        return await laterString(first + "-false");
    }
}

awaitedIfTryPrelude(1).then((value) => console.log("return", value));
awaitedIfTryPrelude(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfTryPreludeReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfTryPreludeThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("body-reject", reason),
);
awaitedIfTryPreludeCleanupThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("cleanup-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
