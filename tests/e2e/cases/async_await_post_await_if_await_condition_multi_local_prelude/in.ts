let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("multi-local-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSelector(value: string): boolean {
    mark(value);
    throw "multi-local-selector-thrown";
}

async function awaitedIfMultiLocalPrelude(route: number): Promise<string> {
    const first = await laterString("multi-local-first");
    if (await laterBoolean(route === 1)) {
        const label = first + "-true", suffix = "return";
        mark(label + ":" + suffix);
        return await laterString(label + "-" + suffix);
    } else {
        let label = first + "-false", suffix = "throw";
        mark(label + ":" + suffix);
        throw await laterString(label + "-" + suffix);
    }
}

async function awaitedIfMultiLocalPreludeReject(): Promise<string> {
    const first = await laterString("multi-local-condition-first");
    if (await rejectedBoolean()) {
        const label = first + "-true", suffix = "return";
        mark(label + ":" + suffix);
        return await laterString(label + "-" + suffix);
    } else {
        const label = first + "-false", suffix = "throw";
        mark(label + ":" + suffix);
        throw await laterString(label + "-" + suffix);
    }
}

async function awaitedIfMultiLocalPreludeThrow(): Promise<string> {
    const first = await laterString("multi-local-selector-first");
    if (await laterBoolean(failSelector("selector:" + first))) {
        const label = first + "-true", suffix = "return";
        return await laterString(label + "-" + suffix);
    } else {
        const label = first + "-false", suffix = "false";
        return await laterString(label + "-" + suffix);
    }
}

awaitedIfMultiLocalPrelude(1).then((value) => console.log("return", value));
awaitedIfMultiLocalPrelude(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfMultiLocalPreludeReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfMultiLocalPreludeThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
