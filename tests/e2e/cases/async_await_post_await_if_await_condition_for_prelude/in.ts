let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("for-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failForCondition(value: string): boolean {
    mark(value);
    throw "for-condition-thrown";
}

async function awaitedIfForPrelude(route: number): Promise<string> {
    const first = await laterString("for-first");
    if (await laterBoolean(route === 1)) {
        for (let step = 0; step < route; step++) {
            mark("true:for:" + first + ":" + step);
        }
        return await laterString(first + "-true-return");
    } else {
        for (let step = 0; step < route; step++) {
            mark("false:for:" + first + ":" + step);
        }
        throw await laterString(first + "-false-throw");
    }
}

async function awaitedIfForPreludeReject(): Promise<string> {
    const first = await laterString("for-condition-first");
    if (await rejectedBoolean()) {
        for (let step = 0; step < 1; step++) {
            mark("reject:true:" + first + ":" + step);
        }
        return await laterString(first + "-return");
    } else {
        for (let step = 0; step < 1; step++) {
            mark("reject:false:" + first + ":" + step);
        }
        throw await laterString(first + "-throw");
    }
}

async function awaitedIfForPreludeThrow(): Promise<string> {
    const first = await laterString("for-throw-first");
    if (await laterBoolean(true)) {
        for (let step = 0; failForCondition("throw:condition:" + first) && step < 1; step++) {
            mark("throw:body:" + step);
        }
        return await laterString(first + "-return");
    } else {
        return await laterString(first + "-false");
    }
}

awaitedIfForPrelude(1).then((value) => console.log("return", value));
awaitedIfForPrelude(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfForPreludeReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfForPreludeThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
