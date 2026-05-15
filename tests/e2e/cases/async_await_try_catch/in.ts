async function recover(): Promise<string> {
    try {
        await Promise.reject("bad");
        return "never";
    } catch (e) {
        return "caught " + e;
    }
}

async function rethrow(): Promise<string> {
    try {
        await Promise.reject("again");
        return "never";
    } catch (e) {
        throw e + "!";
    }
}

async function finallyAfterCatch(): Promise<string> {
    let seen = "";
    try {
        await Promise.reject("inside");
        seen = "never";
    } catch (e) {
        seen = "catch " + e;
    } finally {
        seen += " finally";
    }
    return seen;
}

recover().then((value: string): void => {
    console.log("recover:", value);
});

rethrow().catch((reason: string): string => {
    console.log("rethrow:", reason);
    return "done";
}).then((value: string): void => {
    console.log("after:", value);
});

finallyAfterCatch().then((value: string): void => {
    console.log("finally:", value);
});
