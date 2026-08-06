let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("nested-for-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSelector(value: string): boolean {
    mark(value);
    throw "nested-for-selector-thrown";
}

async function awaitedIfNestedAssignedVarFor(route: number): Promise<string> {
    const first = await laterString("nested-for-first");
    if (await laterBoolean(route === 1 || route === 3)) {
        if (route === 1) {
            var escaped: string;
            let label: string;
            let repeats = 0;
            for (
                escaped = first + "-true",
                label = first + "-true-label";
                repeats < 1;
                repeats++
            ) {
                mark(label);
            }
        } else {
            var escaped: string;
            let label: string;
            let repeats = 0;
            for (
                escaped = first + "-alternate",
                label = first + "-alternate-label";
                repeats < 1;
                repeats++
            ) {
                mark(label);
            }
        }
        return await laterString(escaped + "-return");
    } else {
        if (route === 2) {
            var escapedThrow: string;
            let label: string;
            let repeats = 0;
            for (
                escapedThrow = first + "-false",
                label = first + "-false-label";
                repeats < 1;
                repeats++
            ) {
                mark(label);
            }
        } else {
            var escapedThrow: string;
            let label: string;
            let repeats = 0;
            for (
                escapedThrow = first + "-alternate-false",
                label = first + "-alternate-false-label";
                repeats < 1;
                repeats++
            ) {
                mark(label);
            }
        }
        throw await laterString(escapedThrow + "-throw");
    }
}

awaitedIfNestedAssignedVarFor(1).then((value) => console.log("return", value));
awaitedIfNestedAssignedVarFor(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfNestedAssignedVarFor(3).then((value) => console.log("return", value));

async function awaitedIfNestedAssignedVarForReject(): Promise<string> {
    const first = await laterString("nested-for-condition-first");
    if (await rejectedBoolean()) {
        if (true) {
            var label: string;
            let repeats = 0;
            for (label = first + "-true"; repeats < 1; repeats++) {
                mark(label);
            }
        }
        return await laterString(first + "-return");
    } else {
        if (true) {
            var falseLabel: string;
            let repeats = 0;
            for (falseLabel = first + "-false"; repeats < 1; repeats++) {
                mark(falseLabel);
            }
        }
        throw await laterString(first + "-throw");
    }
}

async function awaitedIfNestedAssignedVarForThrow(): Promise<string> {
    const first = await laterString("nested-for-selector-first");
    if (await laterBoolean(failSelector("selector:" + first))) {
        if (true) {
            var label: string;
            let repeats = 0;
            for (label = first + "-true"; repeats < 1; repeats++) {
                mark(label);
            }
        }
        return await laterString(first + "-return");
    } else {
        if (true) {
            var falseLabel: string;
            let repeats = 0;
            for (falseLabel = first + "-false"; repeats < 1; repeats++) {
                mark(falseLabel);
            }
        }
        return await laterString(first + "-false");
    }
}

awaitedIfNestedAssignedVarForReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfNestedAssignedVarForThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
