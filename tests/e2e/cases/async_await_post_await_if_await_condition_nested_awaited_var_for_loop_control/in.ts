let continueCount = 0;
let breakCount = 0;
let incrementorCount = 0;
let trace = "";

function mark(value: string): void {
    trace += value + "|";
}

function laterString(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function laterContinueIncrement(): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => {
        continueCount++;
        resolve("continue-increment");
    }));
}

function laterBreakIncrement(): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => {
        breakCount++;
        resolve("break-increment");
    }));
}

function laterIncrementorOnly(): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => {
        incrementorCount++;
        resolve("incrementor-only");
    }));
}

async function awaitedIfNestedAwaitedVarForConditionContinue(): Promise<string> {
    const first = await laterString("control");
    if (await laterBoolean(true)) {
        conditionLoop: for (
            var escaped = await laterString(first + "-condition-init"),
                repeats = 0;
            await laterBoolean(repeats < 2);
            repeats++
        ) {
            if (repeats === 0) {
                mark("condition-if");
            }
            switch (repeats) {
                case 0:
                    mark("condition-switch");
                    break;
                default:
                    break;
            }
            var prefix = "condition";
            mark(prefix);
            continue conditionLoop;
        }
        return await laterString(escaped + "-" + String(repeats));
    } else {
        throw await laterString(first + "-else");
    }
}

async function awaitedIfNestedAwaitedVarForIncrementorContinue(): Promise<string> {
    const first = await laterString("control");
    if (await laterBoolean(true)) {
        for (
            var escaped = await laterString(first + "-incrementor-init");
            incrementorCount < 4;
            await laterIncrementorOnly()
        ) {
            if (incrementorCount === 0) {
                mark("incrementor-if");
            }
            switch (incrementorCount) {
                case 0:
                    mark("incrementor-switch");
                    break;
                default:
                    break;
            }
            let prefix: string;
            prefix = "incrementor";
            mark(prefix);
            continue;
        }
        return await laterString(escaped + "-" + String(incrementorCount));
    } else {
        throw await laterString(first + "-else");
    }
}

async function awaitedIfNestedAwaitedVarForContinue(): Promise<string> {
    const first = await laterString("control");
    if (await laterBoolean(true)) {
        for (
            var escaped = await laterString(first + "-continue-init"),
                label = first + "-continue-label";
            await laterBoolean(continueCount < 2);
            await laterContinueIncrement()
        ) {
            if (continueCount === 0) {
                mark("continue-if");
            }
            switch (continueCount) {
                case 0:
                    mark("continue-switch");
                    break;
                default:
                    break;
            }
            var prefix: string;
            prefix = "continue";
            mark(prefix);
            continue;
        }
        return await laterString(escaped + "-" + String(continueCount));
    } else {
        throw await laterString(first + "-else");
    }
}

async function awaitedIfNestedAwaitedVarForBreak(): Promise<string> {
    const first = await laterString("control");
    if (await laterBoolean(true)) {
        breakLoop: for (
            var escaped = await laterString(first + "-break-init"),
                label = first + "-break-label";
            await laterBoolean(breakCount < 2);
            await laterBreakIncrement()
        ) {
            if (breakCount === 0) {
                mark("break-if");
            }
            switch (breakCount) {
                case 0:
                    mark("break-switch");
                    break;
                default:
                    break;
            }
            let prefix = "break";
            mark(prefix);
            break breakLoop;
        }
        return await laterString(escaped + "-" + String(breakCount));
    } else {
        throw await laterString(first + "-else");
    }
}

awaitedIfNestedAwaitedVarForConditionContinue().then((value) => {
    console.log("condition", value);
    return awaitedIfNestedAwaitedVarForIncrementorContinue();
}).then((value) => {
    console.log("incrementor", value);
    return awaitedIfNestedAwaitedVarForContinue();
}).then((value) => {
    console.log("continue", value);
    return awaitedIfNestedAwaitedVarForBreak();
}).then(
    (value) => console.log("break", value),
    (reason) => console.log("unexpected", reason),
);
setTimeout(() => console.log("trace", trace), 20);
