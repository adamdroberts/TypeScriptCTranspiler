let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("do-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

function failDoSelector(value: string): boolean {
    mark(value);
    throw "do-selector-thrown";
}

async function awaitedIfDoPrelude(route: number): Promise<string> {
    const first = await laterString("do-first");
    if (await laterBoolean(route === 1)) {
        do {
            mark("true:do:" + first + ":" + route);
            route--;
        } while (route > 0);
        return await laterString(first + "-true-return");
    } else {
        do {
            mark("false:do:" + first + ":" + route);
            route--;
        } while (route > 0);
        throw await laterString(first + "-false-throw");
    }
}

async function awaitedIfDoPreludeReject(): Promise<string> {
    const first = await laterString("do-condition-first");
    if (await rejectedBoolean()) {
        do {
            mark("reject:true:" + first);
        } while (false);
        return await laterString(first + "-return");
    } else {
        do {
            mark("reject:false:" + first);
        } while (false);
        throw await laterString(first + "-throw");
    }
}

async function awaitedIfDoPreludeThrow(): Promise<string> {
    const first = await laterString("do-throw-first");
    if (await laterBoolean(true)) {
        do {
            mark("throw:body:" + first);
        } while (failDoSelector("throw:selector:" + first));
        return await laterString(first + "-return");
    } else {
        return await laterString(first + "-false");
    }
}

awaitedIfDoPrelude(1).then((value) => console.log("return", value));
awaitedIfDoPrelude(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfDoPreludeReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
awaitedIfDoPreludeThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("selector-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
