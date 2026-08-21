async function nestedTryFinally(mode: number): Promise<string> {
    {
        const outer = "outer";
        try {
            if (mode === 2) throw "sync-finally-error";
            const inner = await (mode === 1 ? Promise.reject("try-error") : Promise.resolve("inner"));
            console.log("try", outer + ":" + inner);
        } finally {
            console.log("finally", outer);
        }
        console.log("tail", outer);
    }
    return "try-done";
}

async function nestedTryCatchFinally(mode: number): Promise<string> {
    {
        const outer = "caught";
        try {
            if (mode === 2) throw "sync-error";
            const inner = await (mode === 1 ? Promise.reject("await-error") : Promise.resolve("inner"));
            console.log("try-catch", outer + ":" + inner);
        } catch (reason) {
            console.log("catch", outer + ":" + reason);
        } finally {
            console.log("catch-finally", outer);
        }
        console.log("catch-tail", outer);
    }
    return "catch-done";
}

async function immediate(): Promise<string> {
    return "immediate";
}

async function nestedTryCatch(mode: number): Promise<string> {
    try {
        if (mode === 2) throw "sync-catch-error";
        await (mode === 1 ? Promise.reject("catch-error") : Promise.resolve("ok"));
    } catch (reason) {
        console.log("direct-catch", reason);
        return "recovered";
    }
    return "direct-done";
}

nestedTryFinally(0).then(value => console.log("result-try", value));
nestedTryFinally(1).catch(reason => console.log("result-reject", reason));
nestedTryFinally(2).catch(reason => console.log("result-sync-finally", reason));
nestedTryCatchFinally(0).then(value => console.log("result-catch-try", value));
nestedTryCatchFinally(1).then(value => console.log("result-caught", value));
nestedTryCatchFinally(2).then(value => console.log("result-sync-caught", value));
nestedTryCatch(0).then(value => console.log("result-direct", value));
nestedTryCatch(1).then(value => console.log("result-direct-caught", value));
nestedTryCatch(2).then(value => console.log("result-direct-sync", value));
immediate().then(value => console.log("result-immediate", value));
