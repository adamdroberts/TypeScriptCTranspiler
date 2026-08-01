function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function laterReject(value: string): Promise<string> {
    return new Promise<string>((_, reject) => setImmediate(() => reject(value)));
}

function bodyStep(value: string, shouldReject: boolean): Promise<string> {
    return shouldReject ? laterReject(value + "-rejected") : later(value);
}

async function runOf(): Promise<string> {
    for (const item of ["of-first", "of-second", "of-success"]) {
        try {
            const prefix = item + "-prefix";
            await bodyStep(prefix + "-try-1", item === "of-first");
            let middle: string;
            middle = prefix + "-middle";
            console.log(item + "-middle-" + middle);
            await bodyStep(middle + "-try-2", item === "of-second");
            var suffix = middle + "-suffix";
            console.log(item + "-suffix-" + suffix);
            await bodyStep(suffix + "-try-3", false);
        } catch (reason) {
            console.log(item + "-catch-" + reason);
        } finally {
            console.log(item + "-cleanup");
        }
        if (await laterBoolean(item === "of-success")) {
            await later(item + "-step");
            return await later(item + "-return");
        }
        continue;
    }
    return await later("of-fallthrough");
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = {
        "in-first": "a",
        "in-second": "b",
        "in-success": "c",
    };
    for (const key in values) {
        try {
            const prefix = key + "-prefix";
            await bodyStep(prefix + "-try-1", key === "in-first");
            let middle: string;
            middle = prefix + "-middle";
            console.log(key + "-middle-" + middle);
            await bodyStep(middle + "-try-2", key === "in-second");
            var suffix = middle + "-suffix";
            console.log(key + "-suffix-" + suffix);
            await bodyStep(suffix + "-try-3", false);
        } catch (reason) {
            console.log(key + "-catch-" + reason);
        } finally {
            console.log(key + "-cleanup");
        }
        if (await laterBoolean(key === "in-success")) {
            await later(key + "-step");
            return await later(key + "-return");
        }
        continue;
    }
    return await later("in-fallthrough");
}

function start(): void {
    runOf()
        .then((value) => {
            console.log(value);
            return runIn();
        })
        .then((value) => console.log(value))
        .catch((reason) => console.log("error-" + reason));
}

start();
