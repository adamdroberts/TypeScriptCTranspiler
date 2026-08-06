let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("nested-do-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSelector(value: string): boolean {
    mark(value);
    throw "nested-do-selector-thrown";
}

async function awaitedIfNestedAssignedVarDo(route: number): Promise<string> {
    const first = await laterString("nested-do-first");
    if (await laterBoolean(route === 1 || route === 3)) {
        if (route === 1) {
            var escaped: string;
            let label: string;
            let repeats = 0;
            do {
                escaped = first + "-true";
                label = first + "-true-label";
                mark(label);
                repeats++;
            } while (repeats < 2);
        } else {
            var escaped: string;
            let label: string;
            let repeats = 0;
            do {
                escaped = first + "-alternate";
                label = first + "-alternate-label";
                mark(label);
                repeats++;
            } while (repeats < 2);
        }
        return await laterString(escaped + "-return");
    } else {
        if (route === 2) {
            var escapedThrow: string;
            let label: string;
            let repeats = 0;
            do {
                escapedThrow = first + "-false";
                label = first + "-false-label";
                mark(label);
                repeats++;
            } while (repeats < 2);
        } else {
            var escapedThrow: string;
            let label: string;
            let repeats = 0;
            do {
                escapedThrow = first + "-alternate-false";
                label = first + "-alternate-false-label";
                mark(label);
                repeats++;
            } while (repeats < 2);
        }
        throw await laterString(escapedThrow + "-throw");
    }
}

awaitedIfNestedAssignedVarDo(1).then((value) => console.log("return", value));
awaitedIfNestedAssignedVarDo(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfNestedAssignedVarDo(3).then((value) => console.log("return", value));

async function awaitedIfNestedAssignedVarDoReject(): Promise<string> {
    const first = await laterString("nested-do-condition-first");
    if (await rejectedBoolean()) {
        if (true) {
            var label: string;
            let repeats = 0;
            do {
                label = first + "-true";
                mark(label);
                repeats++;
            } while (repeats < 2);
        }
        return await laterString(first + "-return");
    } else {
        if (true) {
            var falseLabel: string;
            let repeats = 0;
            do {
                falseLabel = first + "-false";
                mark(falseLabel);
                repeats++;
            } while (repeats < 2);
        }
        throw await laterString(first + "-throw");
    }
}

async function awaitedIfNestedAssignedVarDoThrow(): Promise<string> {
    const first = await laterString("nested-do-selector-first");
    if (await laterBoolean(failSelector("selector:" + first))) {
        if (true) {
            var label: string;
            let repeats = 0;
            do {
                label = first + "-true";
                mark(label);
                repeats++;
            } while (repeats < 2);
        }
        return await laterString(first + "-return");
    } else {
        if (true) {
            var falseLabel: string;
            let repeats = 0;
            do {
                falseLabel = first + "-false";
                mark(falseLabel);
                repeats++;
            } while (repeats < 2);
        }
        return await laterString(first + "-false");
    }
}

awaitedIfNestedAssignedVarDoReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfNestedAssignedVarDoThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
