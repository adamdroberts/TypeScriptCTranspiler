let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("nested-conditional-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSelector(value: string): boolean {
    mark(value);
    throw "nested-conditional-selector-thrown";
}

async function awaitedIfNestedAssignedVarConditional(route: number): Promise<string> {
    const first = await laterString("nested-conditional-first");
    if (await laterBoolean(route === 1 || route === 3)) {
        if (route === 1) {
            var escaped: string;
            let label: string;
            if (route === 1) {
                escaped = first + "-true";
                label = first + "-true-label";
            } else {
                escaped = first + "-true-other";
                label = first + "-true-other-label";
            }
            mark(label);
        } else {
            var escaped: string;
            let label: string;
            if (route === 3) {
                escaped = first + "-alternate";
                label = first + "-alternate-label";
            } else {
                escaped = first + "-alternate-other";
                label = first + "-alternate-other-label";
            }
            mark(label);
        }
        return await laterString(escaped + "-return");
    } else {
        if (route === 2) {
            var escapedThrow: string;
            let label: string;
            if (route === 2) {
                escapedThrow = first + "-false";
                label = first + "-false-label";
            } else {
                escapedThrow = first + "-false-other";
                label = first + "-false-other-label";
            }
            mark(label);
        } else {
            var escapedThrow: string;
            let label: string;
            if (route === 4) {
                escapedThrow = first + "-alternate-false";
                label = first + "-alternate-false-label";
            } else {
                escapedThrow = first + "-alternate-false-other";
                label = first + "-alternate-false-other-label";
            }
            mark(label);
        }
        throw await laterString(escapedThrow + "-throw");
    }
}

awaitedIfNestedAssignedVarConditional(1).then((value) => console.log("return", value));
awaitedIfNestedAssignedVarConditional(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfNestedAssignedVarConditional(3).then((value) => console.log("return", value));

async function awaitedIfNestedAssignedVarConditionalReject(): Promise<string> {
    const first = await laterString("nested-conditional-condition-first");
    if (await rejectedBoolean()) {
        if (true) {
            var label: string;
            if (true) {
                label = first + "-true";
            } else {
                label = first + "-other";
            }
            mark(label);
        }
        return await laterString(first + "-return");
    } else {
        if (true) {
            var falseLabel: string;
            if (true) {
                falseLabel = first + "-false";
            } else {
                falseLabel = first + "-other-false";
            }
            mark(falseLabel);
        }
        throw await laterString(first + "-throw");
    }
}

async function awaitedIfNestedAssignedVarConditionalThrow(): Promise<string> {
    const first = await laterString("nested-conditional-selector-first");
    if (await laterBoolean(failSelector("selector:" + first))) {
        if (true) {
            var label: string;
            if (true) {
                label = first + "-true";
            } else {
                label = first + "-other";
            }
            mark(label);
        }
        return await laterString(first + "-return");
    } else {
        if (true) {
            var falseLabel: string;
            if (true) {
                falseLabel = first + "-false";
            } else {
                falseLabel = first + "-other-false";
            }
            mark(falseLabel);
        }
        return await laterString(first + "-false");
    }
}

awaitedIfNestedAssignedVarConditionalReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfNestedAssignedVarConditionalThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
