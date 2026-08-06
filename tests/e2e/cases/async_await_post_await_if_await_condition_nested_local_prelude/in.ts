let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("nested-local-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSelector(value: string): boolean {
    mark(value);
    throw "nested-local-selector-thrown";
}

async function awaitedIfNestedLocalPrelude(route: number): Promise<string> {
    const first = await laterString("nested-local-first");
    if (await laterBoolean(route === 1)) {
        if (route === 1) {
            const label = first + "-true";
            mark(label);
        } else {
            let label = first + "-other";
            mark(label);
        }
        return await laterString(first + "-true-return");
    } else {
        if (route === 2) {
            const label = first + "-false";
            mark(label);
        } else {
            let label = first + "-other-false";
            mark(label);
        }
        throw await laterString(first + "-false-throw");
    }
}

async function awaitedIfNestedLocalPreludeReject(): Promise<string> {
    const first = await laterString("nested-local-condition-first");
    if (await rejectedBoolean()) {
        if (true) {
            const label = first + "-true";
            mark(label);
        }
        return await laterString(first + "-return");
    } else {
        if (true) {
            let label = first + "-false";
            mark(label);
        }
        throw await laterString(first + "-throw");
    }
}

async function awaitedIfNestedLocalPreludeThrow(): Promise<string> {
    const first = await laterString("nested-local-selector-first");
    if (await laterBoolean(failSelector("selector:" + first))) {
        if (true) {
            const label = first + "-true";
            mark(label);
        }
        return await laterString(first + "-return");
    } else {
        if (true) {
            let label = first + "-false";
            mark(label);
        }
        return await laterString(first + "-false");
    }
}

awaitedIfNestedLocalPrelude(1).then((value) => console.log("return", value));
awaitedIfNestedLocalPrelude(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfNestedLocalPreludeReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfNestedLocalPreludeThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
