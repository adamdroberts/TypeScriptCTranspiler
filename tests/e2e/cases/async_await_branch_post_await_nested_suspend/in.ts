function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterReject(reason: string): Promise<string> {
    return new Promise<string>((_resolve, reject) => setImmediate(() => reject(reason)));
}

async function branchPostAwaitNestedSuspend(flag: boolean): Promise<string> {
    const first = await later("first");
    if (flag) {
        await later(first + "-branch");
        await later(first + "-branch-two");
    }
    return await later(first + "-return");
}

branchPostAwaitNestedSuspend(true).then((value) => console.log("true", value));
branchPostAwaitNestedSuspend(false).then((value) => console.log("false", value));

class NestedSuspendRunner {
    async run(flag: boolean): Promise<string> {
        const first = await later("method-first");
        if (flag) {
            await later(first + "-branch");
            await later(first + "-branch-two");
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
        await later(first + "-branch");
        await later(first + "-branch-two");
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
