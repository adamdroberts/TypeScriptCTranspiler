function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

function laterReject(value: string): Promise<string> {
    return new Promise<string>((_, reject) => setImmediate(() => reject(value)));
}

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        try {
            await later(item + "-try-1");
            console.log(item + "-try-between");
            await later(item + "-try-2");
        } finally {
            const firstLabel = item + "-cleanup-1";
            console.log(firstLabel);
            await later(firstLabel);
            console.log(item + "-between");
            await later(item + "-cleanup-2");
            console.log(item + "-cleanup-done");
        }
        if (await laterBoolean(item === "of-b")) {
            await later(item + "-step");
            return await later(item + "-return");
        }
        continue;
    }
    return await later("of-fallthrough");
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a", "in-b": "b" };
    for (const key in values) {
        try {
            await later(key + "-try-1");
            console.log(key + "-try-between");
            await later(key + "-try-2");
        } finally {
            const firstLabel = key + "-cleanup-1";
            console.log(firstLabel);
            await later(firstLabel);
            console.log(key + "-between");
            await later(key + "-cleanup-2");
            console.log(key + "-cleanup-done");
        }
        if (await laterBoolean(key === "in-b")) {
            await later(key + "-step");
            return await later(key + "-return");
        }
        continue;
    }
    return await later("in-fallthrough");
}

async function runBodyRejected(): Promise<string> {
    for (const item of ["body-rejected"]) {
        try {
            await later(item + "-try-1");
            console.log(item + "-try-between");
            await laterReject(item + "-try-2-rejected");
        } finally {
            const firstLabel = item + "-cleanup-1";
            console.log(firstLabel);
            await later(firstLabel);
            console.log(item + "-between");
            await later(item + "-cleanup-2");
            console.log(item + "-cleanup-done");
        }
        if (await laterBoolean(true)) {
            await later(item + "-unreachable-step");
            return await later(item + "-unreachable");
        }
        continue;
    }
    return await later("body-rejected-fallthrough");
}

function start(): void {
    runOf()
        .then((value) => {
            console.log(value);
            return runIn();
        })
        .then((value) => {
            console.log(value);
            return runBodyRejected().catch((reason) => {
                console.log("body-error-" + reason);
                return "done";
            });
        })
        .then((value) => console.log(value));
}

start();
