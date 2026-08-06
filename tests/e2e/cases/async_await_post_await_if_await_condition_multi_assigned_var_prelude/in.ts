let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("multi-assigned-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSelector(value: string): boolean {
    mark(value);
    throw "multi-assigned-selector-thrown";
}

async function awaitedIfMultiAssignedVarPrelude(route: number): Promise<string> {
    const first = await laterString("multi-assigned-first");
    if (await laterBoolean(route === 1)) {
        var label: string, suffix: string;
        label = first + "-true";
        suffix = "return";
        mark(label + ":" + suffix);
        return await laterString(label + "-" + suffix);
    } else {
        var label: string, suffix: string;
        label = first + "-false";
        suffix = "throw";
        mark(label + ":" + suffix);
        throw await laterString(label + "-" + suffix);
    }
}

async function awaitedIfMultiAssignedVarPreludeReject(): Promise<string> {
    const first = await laterString("multi-assigned-condition-first");
    if (await rejectedBoolean()) {
        var label: string, suffix: string;
        label = first + "-true";
        suffix = "return";
        mark(label + ":" + suffix);
        return await laterString(label + "-" + suffix);
    } else {
        var label: string, suffix: string;
        label = first + "-false";
        suffix = "throw";
        mark(label + ":" + suffix);
        throw await laterString(label + "-" + suffix);
    }
}

async function awaitedIfMultiAssignedVarPreludeThrow(): Promise<string> {
    const first = await laterString("multi-assigned-selector-first");
    if (await laterBoolean(failSelector("selector:" + first))) {
        var label: string, suffix: string;
        label = first + "-true";
        suffix = "return";
        return await laterString(label + "-" + suffix);
    } else {
        var label: string, suffix: string;
        label = first + "-false";
        suffix = "false";
        return await laterString(label + "-" + suffix);
    }
}

awaitedIfMultiAssignedVarPrelude(1).then((value) => console.log("return", value));
awaitedIfMultiAssignedVarPrelude(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfMultiAssignedVarPreludeReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfMultiAssignedVarPreludeThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
