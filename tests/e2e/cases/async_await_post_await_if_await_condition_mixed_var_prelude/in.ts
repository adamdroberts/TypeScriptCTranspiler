let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("mixed-var-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSelector(value: string): boolean {
    mark(value);
    throw "mixed-var-selector-thrown";
}

async function awaitedIfMixedVarPrelude(route: number): Promise<string> {
    const first = await laterString("mixed-var-first");
    if (await laterBoolean(route === 1)) {
        var label = first + "-true", suffix: string;
        suffix = "return";
        mark(label + ":" + suffix);
        return await laterString(label + "-" + suffix);
    } else {
        var label: string, suffix = "throw";
        label = first + "-false";
        mark(label + ":" + suffix);
        throw await laterString(label + "-" + suffix);
    }
}

async function awaitedIfMixedVarPreludeReject(): Promise<string> {
    const first = await laterString("mixed-var-condition-first");
    if (await rejectedBoolean()) {
        var label = first + "-true", suffix: string;
        suffix = "return";
        mark(label + ":" + suffix);
        return await laterString(label + "-" + suffix);
    } else {
        var label: string, suffix = "throw";
        label = first + "-false";
        mark(label + ":" + suffix);
        throw await laterString(label + "-" + suffix);
    }
}

async function awaitedIfMixedVarPreludeThrow(): Promise<string> {
    const first = await laterString("mixed-var-selector-first");
    if (await laterBoolean(failSelector("selector:" + first))) {
        var label = first + "-true", suffix: string;
        suffix = "return";
        return await laterString(label + "-" + suffix);
    } else {
        var label: string, suffix = "false";
        label = first + "-false";
        return await laterString(label + "-" + suffix);
    }
}

awaitedIfMixedVarPrelude(1).then((value) => console.log("return", value));
awaitedIfMixedVarPrelude(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfMixedVarPreludeReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfMixedVarPreludeThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
