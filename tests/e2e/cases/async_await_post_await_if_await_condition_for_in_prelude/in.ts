let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("for-in-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failForInSource(value: string): string[] {
    mark(value);
    throw "for-in-source-thrown";
}

async function awaitedIfForInPrelude(route: number): Promise<string> {
    const first = await laterString("for-in-first");
    if (await laterBoolean(route === 1)) {
        for (const key in ["a", "b"]) {
            mark("true:for-in:" + first + ":" + key);
        }
        return await laterString(first + "-true-return");
    } else {
        for (const key in ["x", "y"]) {
            mark("false:for-in:" + first + ":" + key);
        }
        throw await laterString(first + "-false-throw");
    }
}

async function awaitedIfForInPreludeReject(): Promise<string> {
    const first = await laterString("for-in-condition-first");
    if (await rejectedBoolean()) {
        for (const key in ["reject-true"]) {
            mark(key + ":" + first);
        }
        return await laterString(first + "-return");
    } else {
        for (const key in ["reject-false"]) {
            mark(key + ":" + first);
        }
        throw await laterString(first + "-throw");
    }
}

async function awaitedIfForInPreludeThrow(): Promise<string> {
    const first = await laterString("for-in-throw-first");
    if (await laterBoolean(true)) {
        for (const key in failForInSource("throw:source:" + first)) {
            mark("throw:body:" + key);
        }
        return await laterString(first + "-return");
    } else {
        return await laterString(first + "-false");
    }
}

awaitedIfForInPrelude(1).then((value) => console.log("return", value));
awaitedIfForInPrelude(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfForInPreludeReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfForInPreludeThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("source-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
