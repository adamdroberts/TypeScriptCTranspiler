let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("nested-switch-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSelector(value: string): boolean {
    mark(value);
    throw "nested-switch-selector-thrown";
}

async function awaitedIfNestedAssignedVarSwitch(route: number): Promise<string> {
    const first = await laterString("nested-switch-first");
    if (await laterBoolean(route === 1 || route === 3)) {
        if (route === 1) {
            var escaped: string;
            let label: string;
            switch (route) {
                case 1:
                    escaped = first + "-true";
                    label = first + "-true-label";
                    mark(label);
                    break;
                default:
                    escaped = first + "-true-default";
                    label = first + "-true-default-label";
                    mark(label);
            }
        } else {
            var escaped: string;
            let label: string;
            switch (route) {
                case 3:
                    escaped = first + "-alternate";
                    label = first + "-alternate-label";
                    mark(label);
                    break;
                default:
                    escaped = first + "-alternate-default";
                    label = first + "-alternate-default-label";
                    mark(label);
            }
        }
        return await laterString(escaped + "-return");
    } else {
        if (route === 2) {
            var escapedThrow: string;
            let label: string;
            switch (route) {
                case 2:
                    escapedThrow = first + "-false";
                    label = first + "-false-label";
                    mark(label);
                    break;
                default:
                    escapedThrow = first + "-false-default";
                    label = first + "-false-default-label";
                    mark(label);
            }
        } else {
            var escapedThrow: string;
            let label: string;
            switch (route) {
                case 4:
                    escapedThrow = first + "-alternate-false";
                    label = first + "-alternate-false-label";
                    mark(label);
                    break;
                default:
                    escapedThrow = first + "-alternate-false-default";
                    label = first + "-alternate-false-default-label";
                    mark(label);
            }
        }
        throw await laterString(escapedThrow + "-throw");
    }
}

awaitedIfNestedAssignedVarSwitch(1).then((value) => console.log("return", value));
awaitedIfNestedAssignedVarSwitch(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfNestedAssignedVarSwitch(3).then((value) => console.log("return", value));

async function awaitedIfNestedAssignedVarSwitchReject(): Promise<string> {
    const first = await laterString("nested-switch-condition-first");
    if (await rejectedBoolean()) {
        if (true) {
            var label: string;
            switch (true) {
                case true:
                    label = first + "-true";
                    break;
                default:
                    label = first + "-default";
            }
            mark(label);
        }
        return await laterString(first + "-return");
    } else {
        if (true) {
            var falseLabel: string;
            switch (true) {
                case true:
                    falseLabel = first + "-false";
                    break;
                default:
                    falseLabel = first + "-default-false";
            }
            mark(falseLabel);
        }
        throw await laterString(first + "-throw");
    }
}

async function awaitedIfNestedAssignedVarSwitchThrow(): Promise<string> {
    const first = await laterString("nested-switch-selector-first");
    if (await laterBoolean(failSelector("selector:" + first))) {
        if (true) {
            var label: string;
            switch (true) {
                case true:
                    label = first + "-true";
                    break;
                default:
                    label = first + "-default";
            }
            mark(label);
        }
        return await laterString(first + "-return");
    } else {
        if (true) {
            var falseLabel: string;
            switch (true) {
                case true:
                    falseLabel = first + "-false";
                    break;
                default:
                    falseLabel = first + "-default-false";
            }
            mark(falseLabel);
        }
        return await laterString(first + "-false");
    }
}

awaitedIfNestedAssignedVarSwitchReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfNestedAssignedVarSwitchThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
