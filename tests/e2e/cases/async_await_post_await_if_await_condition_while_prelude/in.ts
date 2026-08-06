let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("while-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failWhileSelector(value: string): boolean {
    mark(value);
    throw "while-selector-thrown";
}

async function awaitedIfWhilePrelude(route: number): Promise<string> {
    const first = await laterString("while-first");
    if (await laterBoolean(route === 1)) {
        while (route > 0) {
            mark("true:while:" + first + ":" + route);
            route--;
        }
        return await laterString(first + "-true-return");
    } else {
        while (route > 1) {
            mark("false:while:" + first + ":" + route);
            route--;
        }
        throw await laterString(first + "-false-throw");
    }
}

async function awaitedIfWhilePreludeReject(): Promise<string> {
    const first = await laterString("while-condition-first");
    if (await rejectedBoolean()) {
        while (false) {
            mark("reject:true:" + first);
        }
        return await laterString(first + "-return");
    } else {
        while (false) {
            mark("reject:false:" + first);
        }
        throw await laterString(first + "-throw");
    }
}

async function awaitedIfWhilePreludeThrow(): Promise<string> {
    const first = await laterString("while-throw-first");
    if (await laterBoolean(true)) {
        while (failWhileSelector("throw:selector:" + first)) {
            mark("throw:body");
        }
        return await laterString(first + "-return");
    } else {
        return await laterString(first + "-false");
    }
}

awaitedIfWhilePrelude(1).then((value) => console.log("return", value));
awaitedIfWhilePrelude(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfWhilePreludeReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfWhilePreludeThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
