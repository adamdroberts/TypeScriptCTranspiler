let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("awaited-var-for-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSelector(value: string): boolean {
    mark(value);
    throw "awaited-var-for-selector-thrown";
}

async function awaitedIfNestedAwaitedVarForInitializer(route: number): Promise<string> {
    const first = await laterString("awaited-var-for-first");
    if (await laterBoolean(route === 1 || route === 3)) {
        for (
            var escaped = await laterString(first + "-true"),
                label = first + "-true-label",
                repeats = 0;
            repeats < 1;
            repeats++
        ) {
            mark(label);
        }
        return await laterString(escaped + "-return");
    } else {
        for (
            var escapedThrow = await laterString(first + "-false"),
                label = first + "-false-label",
                repeats = 0;
            repeats < 1;
            repeats++
        ) {
            mark(label);
        }
        throw await laterString(escapedThrow + "-throw");
    }
}

awaitedIfNestedAwaitedVarForInitializer(1).then((value) => console.log("return", value));
awaitedIfNestedAwaitedVarForInitializer(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfNestedAwaitedVarForInitializer(3).then((value) => console.log("return", value));

async function awaitedIfNestedAwaitedVarForInitializerReject(): Promise<string> {
    const first = await laterString("awaited-var-for-condition-first");
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

async function awaitedIfNestedAwaitedVarForInitializerThrow(): Promise<string> {
    const first = await laterString("awaited-var-for-selector-first");
    if (await laterBoolean(failSelector("selector:" + first))) {
        for (var label = await laterString(first + "-true"), repeats = 0; repeats < 1; repeats++) {
            mark(label);
        }
        return await laterString(first + "-return");
    } else {
        for (var falseLabel = await laterString(first + "-false"), repeats = 0; repeats < 1; repeats++) {
            mark(falseLabel);
        }
        return await laterString(first + "-false");
    }
}

awaitedIfNestedAwaitedVarForInitializerReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfNestedAwaitedVarForInitializerThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 20);
