let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("nested-assigned-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSelector(value: string): boolean {
    mark(value);
    throw "nested-assigned-selector-thrown";
}

async function awaitedIfNestedAssignedVarPrelude(route: number): Promise<string> {
    const first = await laterString("nested-assigned-first");
    if (await laterBoolean(route === 1)) {
        if (route === 1) {
            let trueLabel: string;
            trueLabel = first + "-true";
            mark(trueLabel);
        } else {
            var otherLabel: string;
            otherLabel = first + "-other";
            mark(otherLabel);
        }
        return await laterString(first + "-true-return");
    } else {
        if (route === 2) {
            var falseLabel: string;
            falseLabel = first + "-false";
            mark(falseLabel);
        } else {
            let otherFalseLabel: string;
            otherFalseLabel = first + "-other-false";
            mark(otherFalseLabel);
        }
        throw await laterString(first + "-false-throw");
    }
}

async function awaitedIfNestedAssignedVarPreludeReject(): Promise<string> {
    const first = await laterString("nested-assigned-condition-first");
    if (await rejectedBoolean()) {
        if (true) {
            let trueLabel: string;
            trueLabel = first + "-true";
            mark(trueLabel);
        }
        return await laterString(first + "-return");
    } else {
        if (true) {
            var falseLabel: string;
            falseLabel = first + "-false";
            mark(falseLabel);
        }
        throw await laterString(first + "-throw");
    }
}

async function awaitedIfNestedAssignedVarPreludeThrow(): Promise<string> {
    const first = await laterString("nested-assigned-selector-first");
    if (await laterBoolean(failSelector("selector:" + first))) {
        if (true) {
            var trueLabel: string;
            trueLabel = first + "-true";
            mark(trueLabel);
        }
        return await laterString(first + "-return");
    } else {
        if (true) {
            let falseLabel: string;
            falseLabel = first + "-false";
            mark(falseLabel);
        }
        return await laterString(first + "-false");
    }
}

awaitedIfNestedAssignedVarPrelude(1).then((value) => console.log("return", value));
awaitedIfNestedAssignedVarPrelude(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfNestedAssignedVarPreludeReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfNestedAssignedVarPreludeThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
