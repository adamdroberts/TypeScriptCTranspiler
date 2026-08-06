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
            var nestedWhile = repeats;
            while (nestedWhile === 0) {
                mark("condition-while");
                nestedWhile++;
            }
            var nestedDo = repeats;
            do {
                if (nestedDo === 0) {
                    mark("condition-do");
                }
                nestedDo++;
            } while (nestedDo === 0);
            var nestedFor = repeats;
            for (; nestedFor === 0; nestedFor++) {
                mark("condition-for");
            }
            for (const value of ["condition"]) {
                mark(value + "-for-of");
            }
            for (const key in { condition: repeats }) {
                if (key === "condition") {
                    mark("condition-for-in");
                }
            }
            try {
                mark("condition-try");
            } finally {
                mark("condition-finally");
            }
            conditionLabel: for (const value of ["condition-label"]) {
                mark(value);
            }
            try {
                throw "condition-caught";
            } catch {
                mark("condition-catch");
            } finally {
                mark("condition-catch-finally");
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
            var nestedWhile = incrementorCount;
            while (nestedWhile === 0) {
                mark("incrementor-while");
                nestedWhile++;
            }
            var nestedDo = incrementorCount;
            do {
                if (nestedDo === 0) {
                    mark("incrementor-do");
                }
                nestedDo++;
            } while (nestedDo === 0);
            var nestedFor = incrementorCount;
            for (; nestedFor === 0; nestedFor++) {
                mark("incrementor-for");
            }
            for (const value of ["incrementor"]) {
                mark(value + "-for-of");
            }
            for (const key in { incrementor: incrementorCount }) {
                if (key === "incrementor") {
                    mark("incrementor-for-in");
                }
            }
            try {
                mark("incrementor-try");
            } finally {
                mark("incrementor-finally");
            }
            incrementorLabel: for (const value of ["incrementor-label"]) {
                mark(value);
            }
            try {
                throw "incrementor-caught";
            } catch {
                mark("incrementor-catch");
            } finally {
                mark("incrementor-catch-finally");
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
            var nestedWhile = continueCount;
            while (nestedWhile === 0) {
                mark("continue-while");
                nestedWhile++;
            }
            var nestedDo = continueCount;
            do {
                if (nestedDo === 0) {
                    mark("continue-do");
                }
                nestedDo++;
            } while (nestedDo === 0);
            var nestedFor = continueCount;
            for (; nestedFor === 0; nestedFor++) {
                mark("continue-for");
            }
            for (const value of ["continue"]) {
                mark(value + "-for-of");
            }
            for (const key in { continue: continueCount }) {
                if (key === "continue") {
                    mark("continue-for-in");
                }
            }
            try {
                mark("continue-try");
            } finally {
                mark("continue-finally");
            }
            continueLabel: for (const value of ["continue-label"]) {
                mark(value);
            }
            try {
                throw "continue-caught";
            } catch {
                mark("continue-catch");
            } finally {
                mark("continue-catch-finally");
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
            var nestedWhile = breakCount;
            while (nestedWhile === 0) {
                mark("break-while");
                nestedWhile++;
            }
            var nestedDo = breakCount;
            do {
                if (nestedDo === 0) {
                    mark("break-do");
                }
                nestedDo++;
            } while (nestedDo === 0);
            var nestedFor = breakCount;
            for (; nestedFor === 0; nestedFor++) {
                mark("break-for");
            }
            for (const value of ["break"]) {
                mark(value + "-for-of");
            }
            for (const key in { break: breakCount }) {
                if (key === "break") {
                    mark("break-for-in");
                }
            }
            try {
                mark("break-try");
            } finally {
                mark("break-finally");
            }
            breakLabel: for (const value of ["break-label"]) {
                mark(value);
            }
            try {
                throw "break-caught";
            } catch {
                mark("break-catch");
            } finally {
                mark("break-catch-finally");
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
