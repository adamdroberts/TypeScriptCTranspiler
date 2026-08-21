async function labelledNested(): Promise<string> {
    let outerIndex = 0;
    outer: while (await Promise.resolve(outerIndex < 2)) {
        console.log("label-outer", outerIndex);
        outerIndex++;
        let innerIndex = 0;
        while (await Promise.resolve(innerIndex < 2)) {
            console.log("label-inner", innerIndex);
            innerIndex++;
            if (outerIndex === 1) continue outer;
            break outer;
        }
    }
    console.log("label-tail", outerIndex);
    return "label-done";
}

async function naturalNested(): Promise<string> {
    let outerIndex = 0;
    let total = 0;
    while (await Promise.resolve(outerIndex < 2)) {
        let innerIndex = 0;
        while (await Promise.resolve(innerIndex < 2)) {
            const isFirst = await (Promise.resolve(innerIndex === 0) as Promise<boolean>);
            if (isFirst) {
                total += outerIndex * 10;
            } else {
                total += outerIndex * 10 + innerIndex;
            }
            innerIndex++;
        }
        outerIndex++;
    }
    console.log("natural-tail", outerIndex, total);
    return "natural-done";
}

async function nestedForDo(): Promise<string> {
    let count = 0;
    for (let outer = 0; await Promise.resolve(outer < 2); outer++) {
        let inner = 0;
        do {
            console.log("for-do", outer, inner);
            count++;
            inner++;
        } while (await Promise.resolve(inner < 2));
    }
    console.log("for-do-tail", count);
    return "for-do-done";
}

async function hoistedVar(): Promise<string> {
    let outer = 0;
    var carried = 40;
    while (await Promise.resolve(outer < 2)) {
        let inner = 0;
        while (await Promise.resolve(inner < 1)) {
            var carried: number;
            carried++;
            inner++;
        }
        outer++;
    }
    console.log("hoisted-var", carried);
    return "var-done";
}

async function tripleNested(): Promise<string> {
    let outer = 0;
    let count = 0;
    while (await Promise.resolve(outer < 2)) {
        let middle = 0;
        while (await Promise.resolve(middle < 2)) {
            for (let inner = 0;
                await Promise.resolve(inner < 2);
                await Promise.resolve(inner++)) {
                await Promise.resolve(undefined);
                count++;
            }
            middle++;
        }
        outer++;
    }
    console.log("triple-tail", count);
    return "triple-done";
}

async function awaitedForInitializer(): Promise<string> {
    let outer = 0;
    while (await Promise.resolve(outer < 1)) {
        for (let inner = await Promise.resolve(0);
            await Promise.resolve(inner < 1);
            inner++) {
            console.log("awaited-for-init", inner);
        }
        outer++;
    }
    return "for-init-done";
}

async function terminalReturnAwait(): Promise<string> {
    let outer = 0;
    while (await Promise.resolve(outer < 1)) {
        let inner = 0;
        while (await Promise.resolve(inner < 1)) {
            return await Promise.resolve("return-awaited");
        }
    }
    return "unreachable";
}

async function terminalThrowAwait(): Promise<string> {
    let outer = 0;
    while (await Promise.resolve(outer < 1)) {
        let inner = 0;
        while (await Promise.resolve(inner < 1)) {
            throw await Promise.resolve("throw-awaited");
        }
    }
    return "unreachable";
}

function rejectedString(): Promise<string> {
    return Promise.reject("return-rejected");
}

async function terminalRejectedReturnAwait(): Promise<string> {
    let outer = 0;
    while (await Promise.resolve(outer < 1)) {
        let inner = 0;
        while (await Promise.resolve(inner < 1)) {
            return await rejectedString();
        }
    }
    return "unreachable";
}

async function terminalThrowObject(marker: any): Promise<string> {
    let outer = 0;
    while (await Promise.resolve(outer < 1)) {
        let inner = 0;
        while (await Promise.resolve(inner < 1)) {
            throw await Promise.resolve(marker);
        }
    }
    return "unreachable";
}

async function awaitedLocalObject(marker: any): Promise<string> {
    let outer = 0;
    while (await Promise.resolve(outer < 1)) {
        let inner = 0;
        while (await Promise.resolve(inner < 1)) {
            const value: any = await Promise.resolve(marker);
            let assigned: any;
            assigned = await Promise.resolve(value);
            console.log("awaited-local", assigned === marker, assigned.code);
            return "local-done";
        }
    }
    return "unreachable";
}

function selectMode(mode: number): number {
    console.log("switch-discriminant", mode);
    return mode;
}

async function nestedSwitch(mode: number): Promise<string> {
    let outer = 0;
    outerLoop: while (await Promise.resolve(outer < 2)) {
        outer++;
        let inner = 0;
        while (await Promise.resolve(inner < 1)) {
            inner++;
            switch (await Promise.resolve(selectMode(mode))) {
                case (console.log("switch-case-check", 0), 0): {
                    const value = await Promise.resolve("zero");
                    console.log("switch-case", mode, value, outer);
                }
                default:
                    await Promise.resolve(undefined);
                    console.log("switch-default", mode, outer);
                    break;
                case (console.log("switch-case-check", 2), 2):
                    console.log("switch-continue", outer);
                    continue outerLoop;
                case (console.log("switch-case-check", 3), 3):
                    console.log("switch-break", outer);
                    break outerLoop;
            }
            console.log("switch-after", mode, outer);
        }
    }
    console.log("switch-tail", mode, outer);
    return "switch-" + mode;
}

function rejectMarker(marker: any): Promise<any> {
    return Promise.reject(marker);
}

function runtimeFailure(): void {
    throw "runtime-failure";
}

async function nestedTryCatch(mode: number, marker: any): Promise<string> {
    let outer = 0;
    while (await Promise.resolve(outer < 1)) {
        outer++;
        let inner = 0;
        while (await Promise.resolve(inner < 1)) {
            inner++;
            try {
                if (mode === 0) throw marker;
                if (mode === 1) throw await Promise.resolve(marker);
                if (mode === 2) await rejectMarker(marker);
                if (mode === 3) runtimeFailure();
                const value = await Promise.resolve("try-ok");
                console.log("try-success", mode, value);
            } catch (reason) {
                if (mode === 3) {
                    console.log("try-caught-runtime", String(reason));
                } else {
                    console.log("try-caught", mode, reason === marker, (reason as any).code);
                }
                const recovered = await Promise.resolve("caught-" + mode);
                console.log("try-recovered", recovered);
            }
        }
    }
    return "try-" + mode;
}

async function nestedFinally(mode: number, marker: any): Promise<string> {
    let outer = 0;
    while (await Promise.resolve(outer < 1)) {
        outer++;
        let inner = 0;
        while (await Promise.resolve(inner < 1)) {
            inner++;
            try {
                console.log("finally-try", mode);
                if (mode === 1 || mode === 2) await rejectMarker(marker);
                if (mode === 4) runtimeFailure();
                await Promise.resolve(undefined);
                console.log("finally-try-done", mode);
            } catch (reason) {
                console.log("finally-catch", mode, reason === marker, String(reason));
                if (mode === 2) throw reason;
            } finally {
                console.log("finally-start", mode);
                await Promise.resolve(undefined);
                console.log("finally-end", mode);
                if (mode === 3) throw "finally-override";
            }
            console.log("finally-after", mode);
        }
    }
    return "finally-" + mode;
}

async function nestedFinallyNoCatch(marker: any): Promise<string> {
    let outer = 0;
    while (await Promise.resolve(outer < 1)) {
        let inner = 0;
        while (await Promise.resolve(inner < 1)) {
            try {
                await rejectMarker(marker);
            } finally {
                await Promise.resolve(undefined);
                console.log("finally-no-catch-cleanup");
            }
        }
    }
    return "unreachable";
}

async function doublyNestedFinally(marker: any): Promise<string> {
    let outer = 0;
    while (await Promise.resolve(outer < 1)) {
        let inner = 0;
        while (await Promise.resolve(inner < 1)) {
            try {
                try {
                    await rejectMarker(marker);
                } finally {
                    await Promise.resolve(undefined);
                    console.log("double-finally-inner");
                }
            } finally {
                await Promise.resolve(undefined);
                console.log("double-finally-outer");
            }
        }
    }
    return "unreachable";
}

async function finallyJumps(mode: number): Promise<string> {
    let outer = 0;
    outerLoop: while (await Promise.resolve(outer < (mode === 2 ? 2 : 1))) {
        outer++;
        let inner = 0;
        while (await Promise.resolve(inner < 2)) {
            inner++;
            try {
                if (mode === 0) continue;
                if (mode === 1) break;
                if (mode === 2) continue outerLoop;
                if (mode === 3) break outerLoop;
                for (let local = 0; local < 1; local++) {
                    console.log("finally-local-loop", local);
                    break;
                }
                console.log("finally-local-after");
            } finally {
                console.log("finally-jump-start", mode, outer, inner);
                await Promise.resolve(undefined);
                console.log("finally-jump-end", mode, outer, inner);
            }
            console.log("finally-jump-after-try", mode);
        }
        console.log("finally-jump-after-inner", mode, outer);
    }
    console.log("finally-jump-tail", mode, outer);
    return "finally-jump-" + mode;
}

async function finallyReturns(mode: number, marker: any): Promise<string> {
    let outer = 0;
    while (await Promise.resolve(outer < 1)) {
        let inner = 0;
        while (await Promise.resolve(inner < 1)) {
            try {
                if (mode === 0) return "return-sync";
                if (mode === 1) return await Promise.resolve("return-awaited");
                if (mode === 2) return await rejectMarker(marker);
                return "return-try";
            } catch (reason) {
                console.log("finally-return-catch", reason === marker);
                return "return-caught";
            } finally {
                console.log("finally-return-start", mode);
                await Promise.resolve(undefined);
                console.log("finally-return-end", mode);
                if (mode === 3) return await Promise.resolve("return-override");
            }
        }
    }
    return "unreachable";
}

async function doublyNestedFinallyReturn(): Promise<string> {
    let outer = 0;
    while (await Promise.resolve(outer < 1)) {
        let inner = 0;
        while (await Promise.resolve(inner < 1)) {
            try {
                try {
                    return await Promise.resolve("double-return");
                } finally {
                    await Promise.resolve(undefined);
                    console.log("double-return-inner");
                }
            } finally {
                await Promise.resolve(undefined);
                console.log("double-return-outer");
            }
        }
    }
    return "unreachable";
}

async function rejectedNested(): Promise<string> {
    let entered = false;
    while (await Promise.resolve(!entered)) {
        entered = true;
        while (await rejectedCondition()) {
            console.log("unreachable");
        }
    }
    return "unreachable";
}

function rejectedCondition(): Promise<boolean> {
    return Promise.reject("inner-error");
}

async function immediate(): Promise<string> {
    return "immediate";
}

labelledNested().then(value => console.log("result", value));
naturalNested().then(value => console.log("result", value));
nestedForDo().then(value => console.log("result", value));
hoistedVar().then(value => console.log("result", value));
tripleNested().then(value => console.log("result", value));
awaitedForInitializer().then(value => console.log("result", value));
terminalReturnAwait().then(value => console.log("result", value));
terminalThrowAwait().catch(reason => console.log("rejected", reason));
terminalRejectedReturnAwait().catch(reason => console.log("rejected", reason));
const marker: any = { code: 7 };
terminalThrowObject(marker).catch(reason => console.log("object-rejected", reason === marker, reason.code));
awaitedLocalObject(marker).then(value => console.log("result", value));
nestedSwitch(0).then(value => console.log("result", value));
nestedSwitch(1).then(value => console.log("result", value));
nestedSwitch(2).then(value => console.log("result", value));
nestedSwitch(3).then(value => console.log("result", value));
nestedTryCatch(0, marker).then(value => console.log("result", value));
nestedTryCatch(1, marker).then(value => console.log("result", value));
nestedTryCatch(2, marker).then(value => console.log("result", value));
nestedTryCatch(3, marker).then(value => console.log("result", value));
nestedTryCatch(4, marker).then(value => console.log("result", value));
nestedFinally(0, marker).then(value => console.log("result", value));
nestedFinally(1, marker).then(value => console.log("result", value));
nestedFinally(2, marker).catch(reason => console.log("finally-rejected", 2, reason === marker));
nestedFinally(3, marker).catch(reason => console.log("finally-rejected", 3, reason));
nestedFinally(4, marker).then(value => console.log("result", value));
nestedFinallyNoCatch(marker).catch(reason => console.log("finally-no-catch-rejected", reason === marker));
doublyNestedFinally(marker).catch(reason => console.log("double-finally-rejected", reason === marker));
finallyJumps(0).then(value => console.log("result", value));
finallyJumps(1).then(value => console.log("result", value));
finallyJumps(2).then(value => console.log("result", value));
finallyJumps(3).then(value => console.log("result", value));
finallyJumps(4).then(value => console.log("result", value));
finallyReturns(0, marker).then(value => console.log("result", value));
finallyReturns(1, marker).then(value => console.log("result", value));
finallyReturns(2, marker).then(value => console.log("result", value));
finallyReturns(3, marker).then(value => console.log("result", value));
doublyNestedFinallyReturn().then(value => console.log("result", value));
rejectedNested().catch(reason => console.log("rejected", reason));
immediate().then(value => console.log("result", value));
