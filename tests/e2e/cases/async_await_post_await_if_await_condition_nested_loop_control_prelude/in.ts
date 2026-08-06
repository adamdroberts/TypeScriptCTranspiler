let trace = "";

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function rejectedBoolean(): Promise<boolean> {
    return Promise.reject("nested-loop-condition-rejected");
}

function mark(value: string): void {
    trace += value + "|";
}

async function awaitedIfNestedLoopControl(route: number): Promise<string> {
    const first = await laterString("loop-control-first");
    if (await laterBoolean(route === 1)) {
        for (let step = 0; step < 3; step++) {
            if (step === 1) {
                mark("true:continue:" + first + ":" + step);
                continue;
            }
            mark("true:body:" + first + ":" + step);
            if (step === 2) {
                break;
            }
        }
        return await laterString(first + "-true-return");
    } else {
        while (route > 0) {
            mark("false:while:" + first + ":" + route);
            route--;
            if (route > 0) {
                continue;
            }
            break;
        }
        throw await laterString(first + "-false-throw");
    }
}

async function awaitedIfNestedLoopControlReject(): Promise<string> {
    const first = await laterString("nested-loop-condition-first");
    if (await rejectedBoolean()) {
        for (let step = 0; step < 1; step++) {
            break;
        }
        return await laterString(first + "-return");
    } else {
        while (false) {
            continue;
        }
        throw await laterString(first + "-throw");
    }
}

awaitedIfNestedLoopControl(1).then((value) => console.log("return", value));
awaitedIfNestedLoopControl(2).then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("throw", reason),
);
awaitedIfNestedLoopControlReject().then(
    (value) => console.log("unexpected", value),
    (reason) => console.log("condition-reject", reason),
);
setTimeout(() => console.log("trace", trace), 10);
