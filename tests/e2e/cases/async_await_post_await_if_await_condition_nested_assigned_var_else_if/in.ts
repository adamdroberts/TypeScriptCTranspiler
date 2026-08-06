let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("nested-else-if-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSelector(value: string): boolean {
    mark(value);
    throw "nested-else-if-selector-thrown";
}

async function awaitedIfNestedAssignedVarElseIf(route: number): Promise<string> {
    const first = await laterString("nested-else-if-first");
    if (await laterBoolean(route === 1 || route === 3)) {
        if (route === 1) {
            var escaped: string;
            let label: string;
            if (route === 1) {
                escaped = first + "-true";
                label = first + "-true-label";
            } else if (route === 2) {
                escaped = first + "-true-second";
                label = first + "-true-second-label";
            } else {
                escaped = first + "-true-default";
                label = first + "-true-default-label";
            }
            mark(label);
        } else {
            var escaped: string;
            let label: string;
            if (route === 3) {
                escaped = first + "-alternate";
                label = first + "-alternate-label";
            } else if (route === 4) {
                escaped = first + "-alternate-second";
                label = first + "-alternate-second-label";
            } else {
                escaped = first + "-alternate-default";
                label = first + "-alternate-default-label";
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
            } else if (route === 3) {
                escapedThrow = first + "-false-second";
                label = first + "-false-second-label";
            } else {
                escapedThrow = first + "-false-default";
                label = first + "-false-default-label";
            }
            mark(label);
        } else {
            var escapedThrow: string;
            let label: string;
            if (route === 4) {
                escapedThrow = first + "-alternate-false";
                label = first + "-alternate-false-label";
            } else if (route === 5) {
                escapedThrow = first + "-alternate-false-second";
                label = first + "-alternate-false-second-label";
            } else {
                escapedThrow = first + "-alternate-false-default";
                label = first + "-alternate-false-default-label";
            }
            mark(label);
        }
        throw await laterString(escapedThrow + "-throw");
    }
}

awaitedIfNestedAssignedVarElseIf(1).then((value) => console.log("return", value));
awaitedIfNestedAssignedVarElseIf(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfNestedAssignedVarElseIf(3).then((value) => console.log("return", value));

async function awaitedIfNestedAssignedVarElseIfReject(): Promise<string> {
    const first = await laterString("nested-else-if-condition-first");
    if (await rejectedBoolean()) {
        if (true) {
            var label: string;
            if (true) {
                label = first + "-true";
            } else if (false) {
                label = first + "-second";
            } else {
                label = first + "-default";
            }
            mark(label);
        }
        return await laterString(first + "-return");
    } else {
        if (true) {
            var falseLabel: string;
            if (true) {
                falseLabel = first + "-false";
            } else if (false) {
                falseLabel = first + "-second-false";
            } else {
                falseLabel = first + "-default-false";
            }
            mark(falseLabel);
        }
        throw await laterString(first + "-throw");
    }
}

async function awaitedIfNestedAssignedVarElseIfThrow(): Promise<string> {
    const first = await laterString("nested-else-if-selector-first");
    if (await laterBoolean(failSelector("selector:" + first))) {
        if (true) {
            var label: string;
            if (true) {
                label = first + "-true";
            } else if (false) {
                label = first + "-second";
            } else {
                label = first + "-default";
            }
            mark(label);
        }
        return await laterString(first + "-return");
    } else {
        if (true) {
            var falseLabel: string;
            if (true) {
                falseLabel = first + "-false";
            } else if (false) {
                falseLabel = first + "-second-false";
            } else {
                falseLabel = first + "-default-false";
            }
            mark(falseLabel);
        }
        return await laterString(first + "-false");
    }
}

awaitedIfNestedAssignedVarElseIfReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfNestedAssignedVarElseIfThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
