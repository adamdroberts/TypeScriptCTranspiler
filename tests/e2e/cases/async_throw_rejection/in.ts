async function fail(): Promise<number> {
    throw "boom";
}

async function catchInside(): Promise<string> {
    try {
        throw "inner";
    } catch (e) {
        return "caught " + e;
    }
}

async function rethrowInside(): Promise<string> {
    try {
        throw "again";
    } catch (e) {
        throw e + "!";
    }
}

fail().catch((reason: string): number => {
    console.log("fail:", reason);
    return 7;
}).then((value: number): void => {
    console.log("recovered:", value);
});

catchInside().then((value: string): void => {
    console.log("inside:", value);
});

rethrowInside().catch((reason: string): string => {
    console.log("rethrow:", reason);
    return "done";
}).then((value: string): void => {
    console.log("after:", value);
});
