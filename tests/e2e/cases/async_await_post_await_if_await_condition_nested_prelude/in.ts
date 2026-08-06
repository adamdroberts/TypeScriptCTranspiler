let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("nested-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

async function awaitedIfNestedPrelude(route: number): Promise<string> {
    const first = await laterString(route === 3 ? "" : "nested-prelude-first");
    if (await laterBoolean(route === 1)) {
        if (first.length > 0) {
            mark("true:" + first);
        } else {
            mark("true:empty");
        }
        return await laterString(first + "-true-return");
    } else {
        if (first.length > 0) {
            mark("false:" + first);
        } else {
            mark("false:empty");
        }
        throw await laterString(first + "-false-throw");
    }
}

async function awaitedIfNestedPreludeReject(): Promise<string> {
    const first = await laterString("nested-prelude-reject-first");
    if (await rejectedBoolean()) {
        if (first.length > 0) {
            mark("reject:true:" + first);
        } else {
            mark("reject:true:empty");
        }
        return await laterString(first + "-return");
    } else {
        if (first.length > 0) {
            mark("reject:false:" + first);
        } else {
            mark("reject:false:empty");
        }
        throw await laterString(first + "-throw");
    }
}

awaitedIfNestedPrelude(1).then((value) => console.log("return", value));
awaitedIfNestedPrelude(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfNestedPrelude(3).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("empty-throw", reason),
);
awaitedIfNestedPreludeReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
