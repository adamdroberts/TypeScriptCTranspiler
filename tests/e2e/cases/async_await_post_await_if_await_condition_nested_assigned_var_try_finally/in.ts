let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("nested-try-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSelector(value: string): boolean {
    mark(value);
    throw "nested-try-selector-thrown";
}

function throwSync(value: string): void {
    throw value;
}

async function awaitedIfNestedAssignedVarTryFinally(route: number): Promise<string> {
    const first = await laterString("nested-try-first");
    if (await laterBoolean(route === 1 || route === 3)) {
        if (route === 1) {
            var escaped: string;
            let label: string;
            try {
                throwSync("try-true");
            } catch (reason) {
                mark("caught-true");
            } finally {
                escaped = first + "-true";
                label = first + "-true-label";
                mark(label);
            }
        } else {
            var escaped: string;
            let label: string;
            try {
                mark("try-alternate");
            } catch (reason) {
                mark("caught-alternate");
            } finally {
                escaped = first + "-alternate";
                label = first + "-alternate-label";
                mark(label);
            }
        }
        return await laterString(escaped + "-return");
    } else {
        if (route === 2) {
            var escapedThrow: string;
            let label: string;
            try {
                throwSync("try-false");
            } catch (reason) {
                mark("caught-false");
            } finally {
                escapedThrow = first + "-false";
                label = first + "-false-label";
                mark(label);
            }
        } else {
            var escapedThrow: string;
            let label: string;
            try {
                mark("try-alternate-false");
            } catch (reason) {
                mark("caught-alternate-false");
            } finally {
                escapedThrow = first + "-alternate-false";
                label = first + "-alternate-false-label";
                mark(label);
            }
        }
        throw await laterString(escapedThrow + "-throw");
    }
}

awaitedIfNestedAssignedVarTryFinally(1).then((value) => console.log("return", value));
awaitedIfNestedAssignedVarTryFinally(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfNestedAssignedVarTryFinally(3).then((value) => console.log("return", value));

async function awaitedIfNestedAssignedVarTryFinallyReject(): Promise<string> {
    const first = await laterString("nested-try-condition-first");
    if (await rejectedBoolean()) {
        if (true) {
            var label: string;
            try {
                mark("try-reject");
            } catch (reason) {
                mark("caught-reject");
            } finally {
                label = first + "-true";
                mark(label);
            }
        }
        return await laterString(first + "-return");
    } else {
        if (true) {
            var falseLabel: string;
            try {
                mark("try-reject-false");
            } catch (reason) {
                mark("caught-reject-false");
            } finally {
                falseLabel = first + "-false";
                mark(falseLabel);
            }
        }
        throw await laterString(first + "-throw");
    }
}

async function awaitedIfNestedAssignedVarTryFinallyThrow(): Promise<string> {
    const first = await laterString("nested-try-selector-first");
    if (await laterBoolean(failSelector("selector:" + first))) {
        if (true) {
            var label: string;
            try {
                mark("try-selector");
            } catch (reason) {
                mark("caught-selector");
            } finally {
                label = first + "-true";
                mark(label);
            }
        }
        return await laterString(first + "-return");
    } else {
        if (true) {
            var falseLabel: string;
            try {
                mark("try-selector-false");
            } catch (reason) {
                mark("caught-selector-false");
            } finally {
                falseLabel = first + "-false";
                mark(falseLabel);
            }
        }
        return await laterString(first + "-false");
    }
}

awaitedIfNestedAssignedVarTryFinallyReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfNestedAssignedVarTryFinallyThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
