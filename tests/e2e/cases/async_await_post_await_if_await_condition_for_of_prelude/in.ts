let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("for-of-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failForOfSource(value: string): string[] {
    mark(value);
    throw "for-of-source-thrown";
}

async function awaitedIfForOfPrelude(route: number): Promise<string> {
    const first = await laterString("for-of-first");
    if (await laterBoolean(route === 1)) {
        for (const value of ["a", "b"]) {
            mark("true:for-of:" + first + ":" + value);
        }
        return await laterString(first + "-true-return");
    } else {
        for (const value of ["x", "y"]) {
            mark("false:for-of:" + first + ":" + value);
        }
        throw await laterString(first + "-false-throw");
    }
}

async function awaitedIfForOfPreludeReject(): Promise<string> {
    const first = await laterString("for-of-condition-first");
    if (await rejectedBoolean()) {
        for (const value of ["reject-true"]) {
            mark(value + ":" + first);
        }
        return await laterString(first + "-return");
    } else {
        for (const value of ["reject-false"]) {
            mark(value + ":" + first);
        }
        throw await laterString(first + "-throw");
    }
}

async function awaitedIfForOfPreludeThrow(): Promise<string> {
    const first = await laterString("for-of-throw-first");
    if (await laterBoolean(true)) {
        for (const value of failForOfSource("throw:source:" + first)) {
            mark("throw:body:" + value);
        }
        return await laterString(first + "-return");
    } else {
        return await laterString(first + "-false");
    }
}

awaitedIfForOfPrelude(1).then((value) => console.log("return", value));
awaitedIfForOfPrelude(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfForOfPreludeReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfForOfPreludeThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("source-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
