let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("nested-var-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSelector(value: string): boolean {
    mark(value);
    throw "nested-var-selector-thrown";
}

async function awaitedIfNestedVarPrelude(route: number): Promise<string> {
    const first = await laterString("nested-var-first");
    if (await laterBoolean(route === 1)) {
        if (route === 1) {
            var trueLabel = first + "-true";
            mark(trueLabel);
        } else {
            var otherLabel = first + "-other";
            mark(otherLabel);
        }
        return await laterString(first + "-true-return");
    } else {
        if (route === 2) {
            var falseLabel = first + "-false";
            mark(falseLabel);
        } else {
            var otherFalseLabel = first + "-other-false";
            mark(otherFalseLabel);
        }
        throw await laterString(first + "-false-throw");
    }
}

async function awaitedIfNestedVarPreludeReject(): Promise<string> {
    const first = await laterString("nested-var-condition-first");
    if (await rejectedBoolean()) {
        if (true) {
            var trueLabel = first + "-true";
            mark(trueLabel);
        }
        return await laterString(first + "-return");
    } else {
        if (true) {
            var falseLabel = first + "-false";
            mark(falseLabel);
        }
        throw await laterString(first + "-throw");
    }
}

async function awaitedIfNestedVarPreludeThrow(): Promise<string> {
    const first = await laterString("nested-var-selector-first");
    if (await laterBoolean(failSelector("selector:" + first))) {
        if (true) {
            var trueLabel = first + "-true";
            mark(trueLabel);
        }
        return await laterString(first + "-return");
    } else {
        if (true) {
            var falseLabel = first + "-false";
            mark(falseLabel);
        }
        return await laterString(first + "-false");
    }
}

awaitedIfNestedVarPrelude(1).then((value) => console.log("return", value));
awaitedIfNestedVarPrelude(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfNestedVarPreludeReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfNestedVarPreludeThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
