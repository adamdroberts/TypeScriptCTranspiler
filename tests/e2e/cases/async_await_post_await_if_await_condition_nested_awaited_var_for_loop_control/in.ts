let continueCount = 0;
let breakCount = 0;
let incrementorCount = 0;

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
        for (
            var escaped = await laterString(first + "-condition-init"),
                repeats = 0;
            await laterBoolean(repeats < 2);
            repeats++
        ) {
            continue;
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
        for (
            var escaped = await laterString(first + "-break-init"),
                label = first + "-break-label";
            await laterBoolean(breakCount < 2);
            await laterBreakIncrement()
        ) {
            break;
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
