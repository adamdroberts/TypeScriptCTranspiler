let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("var-for-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSelector(value: string): boolean {
    mark(value);
    throw "var-for-selector-thrown";
}

async function awaitedIfNestedVarForInitializer(route: number): Promise<string> {
    const first = await laterString("var-for-first");
    if (await laterBoolean(route === 1 || route === 3)) {
        if (route === 1) {
            for (
                var escaped = first + "-true",
                    label = first + "-true-label",
                    repeats = 0;
                repeats < 1;
                repeats++
            ) {
                mark(label);
            }
        } else {
            for (
                var escaped = first + "-alternate",
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
                var escapedThrow = first + "-false",
                    label = first + "-false-label",
                    repeats = 0;
                repeats < 1;
                repeats++
            ) {
                mark(label);
            }
        } else {
            for (
                var escapedThrow = first + "-alternate-false",
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

awaitedIfNestedVarForInitializer(1).then((value) => console.log("return", value));
awaitedIfNestedVarForInitializer(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfNestedVarForInitializer(3).then((value) => console.log("return", value));

async function awaitedIfNestedVarForInitializerReject(): Promise<string> {
    const first = await laterString("var-for-condition-first");
    if (await rejectedBoolean()) {
        for (var label = first + "-true", repeats = 0; repeats < 1; repeats++) {
            mark(label);
        }
        return await laterString(first + "-return");
    } else {
        for (var falseLabel = first + "-false", repeats = 0; repeats < 1; repeats++) {
            mark(falseLabel);
        }
        throw await laterString(first + "-throw");
    }
}

async function awaitedIfNestedVarForInitializerThrow(): Promise<string> {
    const first = await laterString("var-for-selector-first");
    if (await laterBoolean(failSelector("selector:" + first))) {
        for (var label = first + "-true", repeats = 0; repeats < 1; repeats++) {
            mark(label);
        }
        return await laterString(first + "-return");
    } else {
        for (var falseLabel = first + "-false", repeats = 0; repeats < 1; repeats++) {
            mark(falseLabel);
        }
        return await laterString(first + "-false");
    }
}

awaitedIfNestedVarForInitializerReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfNestedVarForInitializerThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
