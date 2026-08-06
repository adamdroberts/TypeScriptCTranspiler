function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("condition-rejected");
}

function throwingBoolean(): Promise<boolean> {
    throw "condition-thrown";
}

async function awaitedIfAfterAwait(flag: boolean): Promise<string> {
    const first = await laterString("first");
    if (await laterBoolean(flag)) {
        return await laterString(first + "-true");
    }
    return await laterString(first + "-false");
}

async function awaitedIfConditionReject(): Promise<string> {
    const first = await laterString("reject-first");
    if (await rejectedBoolean()) {
        return await laterString(first + "-true");
    }
    return await laterString(first + "-false");
}

async function awaitedIfConditionThrow(): Promise<string> {
    const first = await laterString("throw-first");
    if (await throwingBoolean()) {
        return await laterString(first + "-true");
    }
    return await laterString(first + "-false");
}

class AwaitedIfRunner {
    async method(flag: boolean): Promise<string> {
        const first = await laterString("method-first");
        if (await laterBoolean(flag)) {
            return await laterString(first + "-true");
        }
        return await laterString(first + "-false");
    }
}

const awaitedIfArrow = async (flag: boolean): Promise<string> => {
    const first = await laterString("arrow-first");
    if (await laterBoolean(flag)) {
        return await laterString(first + "-true");
    }
    return await laterString(first + "-false");
};

const runner = new AwaitedIfRunner();

awaitedIfAfterAwait(true).then((value) => console.log("true", value));
awaitedIfAfterAwait(false).then((value) => console.log("false", value));
awaitedIfConditionReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("rejected", reason),
);
awaitedIfConditionThrow().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("thrown", reason),
);
runner.method(true).then((value) => console.log("method", value));
awaitedIfArrow(false).then((value) => console.log("arrow", value));
