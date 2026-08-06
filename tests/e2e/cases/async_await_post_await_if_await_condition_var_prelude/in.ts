let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("var-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSelector(value: string): boolean {
    mark(value);
    throw "var-selector-thrown";
}

async function awaitedIfVarPrelude(route: number): Promise<string> {
    const first = await laterString("var-first");
    if (await laterBoolean(route === 1)) {
        var label = first + "-true";
        mark(label);
        return await laterString(label + "-return");
    } else {
        var label = first + "-false";
        mark(label);
        throw await laterString(label + "-throw");
    }
}

async function awaitedIfVarPreludeReject(): Promise<string> {
    const first = await laterString("var-condition-first");
    if (await rejectedBoolean()) {
        var label = first + "-true";
        mark(label);
        return await laterString(label + "-return");
    } else {
        var fallback = first + "-false";
        mark(fallback);
        throw await laterString(fallback + "-throw");
    }
}

async function awaitedIfVarPreludeThrow(): Promise<string> {
    const first = await laterString("var-selector-first");
    if (await laterBoolean(failSelector("selector:" + first))) {
        var label = first + "-true";
        return await laterString(label + "-return");
    } else {
        var fallback = first + "-false";
        return await laterString(fallback + "-false");
    }
}

awaitedIfVarPrelude(1).then((value) => console.log("return", value));
awaitedIfVarPrelude(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfVarPreludeReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfVarPreludeThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
