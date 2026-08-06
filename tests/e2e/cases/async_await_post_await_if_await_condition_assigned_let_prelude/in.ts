let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("assigned-let-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSelector(value: string): boolean {
    mark(value);
    throw "assigned-let-selector-thrown";
}

async function awaitedIfAssignedLetPrelude(route: number): Promise<string> {
    const first = await laterString("assigned-let-first");
    if (await laterBoolean(route === 1)) {
        let label: string, suffix: string;
        label = first + "-true";
        suffix = "return";
        mark(label + ":" + suffix);
        return await laterString(label + "-" + suffix);
    } else {
        let label: string, suffix: string;
        label = first + "-false";
        suffix = "throw";
        mark(label + ":" + suffix);
        throw await laterString(label + "-" + suffix);
    }
}

async function awaitedIfAssignedLetPreludeReject(): Promise<string> {
    const first = await laterString("assigned-let-condition-first");
    if (await rejectedBoolean()) {
        let label: string, suffix: string;
        label = first + "-true";
        suffix = "return";
        mark(label + ":" + suffix);
        return await laterString(label + "-" + suffix);
    } else {
        let label: string, suffix: string;
        label = first + "-false";
        suffix = "throw";
        mark(label + ":" + suffix);
        throw await laterString(label + "-" + suffix);
    }
}

async function awaitedIfAssignedLetPreludeThrow(): Promise<string> {
    const first = await laterString("assigned-let-selector-first");
    if (await laterBoolean(failSelector("selector:" + first))) {
        let label: string, suffix: string;
        label = first + "-true";
        suffix = "return";
        return await laterString(label + "-" + suffix);
    } else {
        let label: string, suffix: string;
        label = first + "-false";
        suffix = "false";
        return await laterString(label + "-" + suffix);
    }
}

awaitedIfAssignedLetPrelude(1).then((value) => console.log("return", value));
awaitedIfAssignedLetPrelude(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfAssignedLetPreludeReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfAssignedLetPreludeThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
