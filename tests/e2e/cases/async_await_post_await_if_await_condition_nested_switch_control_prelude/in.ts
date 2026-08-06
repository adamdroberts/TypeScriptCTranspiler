let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("switch-control-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failSwitchSelector(value: string): number {
    mark(value);
    throw "switch-selector-thrown";
}

async function awaitedIfNestedSwitchControl(route: number): Promise<string> {
    const first = await laterString("switch-control-first");
    if (await laterBoolean(route === 1)) {
        switch (route) {
            case 1:
                mark("true:case:" + first);
                break;
            default:
                mark("true:default:" + first);
                break;
        }
        return await laterString(first + "-true-return");
    } else {
        switch (route) {
            case 2:
                mark("false:case:" + first);
                break;
            default:
                mark("false:default:" + first);
                break;
        }
        throw await laterString(first + "-false-throw");
    }
}

async function awaitedIfNestedSwitchControlReject(): Promise<string> {
    const first = await laterString("switch-control-condition-first");
    if (await rejectedBoolean()) {
        switch (1) {
            default:
                mark("reject:true:" + first);
                break;
        }
        return await laterString(first + "-return");
    } else {
        switch (2) {
            default:
                mark("reject:false:" + first);
                break;
        }
        throw await laterString(first + "-throw");
    }
}

async function awaitedIfNestedSwitchControlThrow(): Promise<string> {
    const first = await laterString("switch-control-throw-first");
    if (await laterBoolean(true)) {
        switch (failSwitchSelector("throw:selector:" + first)) {
            default:
                mark("throw:default");
                break;
        }
        return await laterString(first + "-return");
    } else {
        return await laterString(first + "-false");
    }
}

awaitedIfNestedSwitchControl(1).then((value) => console.log("return", value));
awaitedIfNestedSwitchControl(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfNestedSwitchControlReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfNestedSwitchControlThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
