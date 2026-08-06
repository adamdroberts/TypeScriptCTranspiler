let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("nested-selector-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSelector(value: string): boolean {
    mark(value);
    throw "nested-selector-thrown";
}

async function nestedSelectorAwaitedVarForInitializer(route: number): Promise<string> {
    const first = await laterString("nested-selector-first");
    if (await laterBoolean(route === 1 || route === 3)) {
        if (route === 1) {
            for (
                var escaped = await laterString(first + "-true"),
                    label = first + "-true-label",
                    repeats = 0;
                repeats < 1;
                repeats++
            ) {
                mark(label);
            }
        } else {
            for (
                var escaped = await laterString(first + "-alternate"),
                    label = first + "-alternate-label",
                    repeats = 0;
                repeats < 1;
                repeats++
            ) {
                mark(label);
            }
        }
        return await laterString(escaped + "-return");
    } else {
        if (route === 2) {
            for (
                var escapedThrow = await laterString(first + "-false"),
                    label = first + "-false-label",
                    repeats = 0;
                repeats < 1;
                repeats++
            ) {
                mark(label);
            }
        } else {
            for (
                var escapedThrow = await laterString(first + "-alternate-false"),
                    label = first + "-alternate-false-label",
                    repeats = 0;
                repeats < 1;
                repeats++
            ) {
                mark(label);
            }
        }
        throw await laterString(escapedThrow + "-throw");
    }
}

async function nestedSelectorAwaitedVarForInitializerConditionReject(): Promise<string> {
    const first = await laterString("nested-selector-condition-first");
    if (await rejectedBoolean()) {
        for (var label = await laterString(first + "-true"), repeats = 0; repeats < 1; repeats++) {
            mark(label);
        }
        return await laterString(first + "-return");
    } else {
        for (var falseLabel = await laterString(first + "-false"), repeats = 0; repeats < 1; repeats++) {
            mark(falseLabel);
        }
        throw await laterString(first + "-throw");
    }
}

async function nestedSelectorAwaitedVarForInitializerSelectorReject(): Promise<string> {
    const first = await laterString("nested-selector-selector-first");
    if (await laterBoolean(failSelector("selector:" + first))) {
        if (true) {
            for (var label = await laterString(first + "-true"), repeats = 0; repeats < 1; repeats++) {
                mark(label);
            }
        } else {
            for (var falseLabel = await laterString(first + "-false"), repeats = 0; repeats < 1; repeats++) {
                mark(falseLabel);
            }
        }
        return await laterString(first + "-return");
    } else {
        return await laterString(first + "-else");
    }
}

nestedSelectorAwaitedVarForInitializer(1).then((value) => console.log("return", value));
nestedSelectorAwaitedVarForInitializer(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
nestedSelectorAwaitedVarForInitializer(3).then((value) => console.log("return", value));
nestedSelectorAwaitedVarForInitializer(4).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
nestedSelectorAwaitedVarForInitializerConditionReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
nestedSelectorAwaitedVarForInitializerSelectorReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 30);
