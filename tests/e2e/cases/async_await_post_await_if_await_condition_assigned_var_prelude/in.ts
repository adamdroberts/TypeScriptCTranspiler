let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("assigned-var-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSelector(value: string): boolean {
    mark(value);
    throw "assigned-var-selector-thrown";
}

async function awaitedIfAssignedVarPrelude(route: number): Promise<string> {
    const first = await laterString("assigned-var-first");
    if (await laterBoolean(route === 1)) {
        var label: string;
        label = first + "-true";
        mark(label);
        return await laterString(label + "-return");
    } else {
        var label: string;
        label = first + "-false";
        mark(label);
        throw await laterString(label + "-throw");
    }
}

async function awaitedIfAssignedVarPreludeReject(): Promise<string> {
    const first = await laterString("assigned-var-condition-first");
    if (await rejectedBoolean()) {
        var label: string;
        label = first + "-true";
        mark(label);
        return await laterString(label + "-return");
    } else {
        var fallback: string;
        fallback = first + "-false";
        mark(fallback);
        throw await laterString(fallback + "-throw");
    }
}

async function awaitedIfAssignedVarPreludeThrow(): Promise<string> {
    const first = await laterString("assigned-var-selector-first");
    if (await laterBoolean(failSelector("selector:" + first))) {
        var label: string;
        label = first + "-true";
        return await laterString(label + "-return");
    } else {
        var fallback: string;
        fallback = first + "-false";
        return await laterString(fallback + "-false");
    }
}

awaitedIfAssignedVarPrelude(1).then((value) => console.log("return", value));
awaitedIfAssignedVarPrelude(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfAssignedVarPreludeReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfAssignedVarPreludeThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
