function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function laterReject(value: string): Promise<string> {
    return new Promise<string>((_, reject) => setImmediate(() => reject(value)));
}

async function runOfReturn(shouldReturn: boolean): Promise<string> {
    for (const item of ["of-return"]) {
        await later(item + "-prelude");
        if (await laterBoolean(shouldReturn)) {
            try {
                await later(item + "-try");
                return await later(item + "-value");
            } finally {
                console.log(item + "-cleanup");
            }
        } else {
            await later(item + "-control");
        }
        continue;
    }
    return await later("of-return-fallback");
}

async function runOfThrow(shouldThrow: boolean): Promise<string> {
    for (const item of ["of-throw"]) {
        await later(item + "-prelude");
        if (await laterBoolean(shouldThrow)) {
            try {
                await later(item + "-try");
                throw await laterReject(item + "-reason");
            } finally {
                console.log(item + "-cleanup");
            }
        } else {
            await later(item + "-control");
        }
        continue;
    }
    return await later("of-throw-fallback");
}

async function runInReturn(shouldReturn: boolean): Promise<string> {
    const values: Record<string, string> = { "in-return": "value" };
    for (const key in values) {
        await later(key + "-prelude");
        if (await laterBoolean(shouldReturn)) {
            try {
                await later(key + "-try");
                return await later(key + "-value");
            } finally {
                console.log(key + "-cleanup");
            }
        } else {
            await later(key + "-control");
        }
        continue;
    }
    return await later("in-return-fallback");
}

async function runInThrow(shouldThrow: boolean): Promise<string> {
    const values: Record<string, string> = { "in-throw": "value" };
    for (const key in values) {
        await later(key + "-prelude");
        if (await laterBoolean(shouldThrow)) {
            try {
                await later(key + "-try");
                throw await laterReject(key + "-reason");
            } finally {
                console.log(key + "-cleanup");
            }
        } else {
            await later(key + "-control");
        }
        continue;
    }
    return await later("in-throw-fallback");
}

runOfReturn(true)
    .then((value) => {
        console.log("of-return:" + value);
        return runOfReturn(false);
    })
    .then((value) => {
        console.log("of-return-false:" + value);
        return runOfThrow(true);
    })
    .catch((reason) => {
        console.log("of-throw:" + reason);
        return runOfThrow(false);
    })
    .then((value) => {
        console.log("of-throw-false:" + value);
        return runInReturn(true);
    })
    .then((value) => {
        console.log("in-return:" + value);
        return runInReturn(false);
    })
    .then((value) => {
        console.log("in-return-false:" + value);
        return runInThrow(true);
    })
    .catch((reason) => {
        console.log("in-throw:" + reason);
        return runInThrow(false);
    })
    .then((value) => console.log("in-throw-false:" + value));
