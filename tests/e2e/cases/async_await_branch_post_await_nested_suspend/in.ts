function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterReject(reason: string): Promise<string> {
    return new Promise<string>((_resolve, reject) => setImmediate(() => reject(reason)));
}

async function branchPostAwaitNestedSuspend(flag: boolean): Promise<string> {
    const first = await later("first");
    if (flag) {
        let branchValue = await later(first + "-branch");
        branchValue = branchValue + "-post";
        await later(branchValue + "-branch-two");
    } else {
        let branchValue = await later(first + "-else");
        branchValue = branchValue + "-post";
    }
    return await later(first + "-return");
}

branchPostAwaitNestedSuspend(true).then((value) => console.log("true", value));
branchPostAwaitNestedSuspend(false).then((value) => console.log("false", value));

async function branchPostAwaitNestedControl(flag: boolean, inner: boolean): Promise<string> {
    const first = await later("control-first");
    if (flag) {
        await later(first + "-branch");
        if (inner) {
            var nestedValue = first + "-if";
        } else {
            nestedValue = first + "-else";
        }
        await later(nestedValue + "-await");
    } else {
        await later(first + "-alternate");
        try {
            var nestedValue = first + "-try";
        } finally {
            nestedValue = first + "-finally";
        }
        await later(nestedValue + "-await");
    }
    return await later(nestedValue + "-return");
}

branchPostAwaitNestedControl(true, true).then((value) => console.log("control-true-if", value));
branchPostAwaitNestedControl(true, false).then((value) => console.log("control-true-else", value));
branchPostAwaitNestedControl(false, false).then((value) => console.log("control-false-try", value));

class NestedSuspendRunner {
    async run(flag: boolean): Promise<string> {
        const first = await later("method-first");
        if (flag) {
            let branchValue = await later(first + "-branch");
            branchValue = branchValue + "-post";
            await later(branchValue + "-branch-two");
        } else {
            let branchValue = await later(first + "-else");
            branchValue = branchValue + "-post";
        }
        return await later(first + "-return");
    }
}

const runner = new NestedSuspendRunner();
runner.run(true).then((value) => console.log("method-true", value));
runner.run(false).then((value) => console.log("method-false", value));

const nestedSuspendValue = async (flag: boolean): Promise<string> => {
    const first = await later("value-first");
    if (flag) {
        let branchValue = await later(first + "-branch");
        branchValue = branchValue + "-post";
        await later(branchValue + "-branch-two");
    } else {
        let branchValue = await later(first + "-else");
        branchValue = branchValue + "-post";
    }
    return await later(first + "-return");
};

nestedSuspendValue(true).then((value) => console.log("value-true", value));
nestedSuspendValue(false).then((value) => console.log("value-false", value));

async function branchPostAwaitNestedReject(): Promise<string> {
    const first = await later("reject-first");
    if (true) {
        await laterReject("branch-reject");
    }
    return await later(first + "-unreachable");
}

branchPostAwaitNestedReject().then(
    (value) => console.log("reject-value", value),
    (reason) => console.log("reject-reason", reason),
);

async function branchPostAwaitNestedThrow(flag: boolean): Promise<string> {
    const first = await later("throw-first");
    if (flag) {
        let branchValue = await later(first + "-branch");
        await later(branchValue + "-branch-two");
    } else {
        const branchValue = await later(first + "-else");
        await later(branchValue + "-else-two");
    }
    throw await later(first + "-throw");
}

branchPostAwaitNestedThrow(true).then(
    (value) => console.log("throw-value", value),
    (reason) => console.log("throw-reason-true", reason),
);
branchPostAwaitNestedThrow(false).then(
    (value) => console.log("throw-value", value),
    (reason) => console.log("throw-reason-false", reason),
);
