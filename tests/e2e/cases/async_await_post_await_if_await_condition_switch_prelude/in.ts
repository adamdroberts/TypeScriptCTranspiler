let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("switch-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSwitchSelector(value: string): number {
    mark(value);
    throw "switch-selector-thrown";
}

async function awaitedIfSwitchPrelude(route: number): Promise<string> {
    const first = await laterString("switch-first");
    if (await laterBoolean(route === 1)) {
        switch (route) {
            case 1:
                mark("true:case:" + first);
            default:
                mark("true:default");
        }
        return await laterString(first + "-true-return");
    } else {
        switch (route) {
            case 2:
                mark("false:case:" + first);
            default:
                mark("false:default");
        }
        throw await laterString(first + "-false-throw");
    }
}

async function awaitedIfSwitchPreludeReject(): Promise<string> {
    const first = await laterString("switch-condition-first");
    if (await rejectedBoolean()) {
        switch (1) {
            default:
                mark("reject:true:" + first);
        }
        return await laterString(first + "-return");
    } else {
        switch (2) {
            default:
                mark("reject:false:" + first);
        }
        throw await laterString(first + "-throw");
    }
}

async function awaitedIfSwitchPreludeThrow(): Promise<string> {
    const first = await laterString("switch-throw-first");
    if (await laterBoolean(true)) {
        switch (failSwitchSelector("throw:selector:" + first)) {
            default:
                mark("throw:default");
        }
        return await laterString(first + "-return");
    } else {
        return await laterString(first + "-false");
    }
}

awaitedIfSwitchPrelude(1).then((value) => console.log("return", value));
awaitedIfSwitchPrelude(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfSwitchPreludeReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfSwitchPreludeThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
