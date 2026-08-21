async function jumpOverride(mode: number): Promise<string> {
    let outer = 0;
    outerLoop: while (await Promise.resolve(outer < 2)) {
        outer++;
        let inner = 0;
        while (await Promise.resolve(inner < 1)) {
            inner++;
            try {
                if (mode === 0) break outerLoop;
                continue outerLoop;
            } finally {
                console.log("jump-cleanup", mode, outer);
                await Promise.resolve(undefined);
                if (mode === 0) continue outerLoop;
                break outerLoop;
            }
        }
    }
    console.log("jump-tail", mode, outer);
    return "jump-" + mode;
}

async function returnBreakOverride(): Promise<string> {
    let outer = 0;
    outerLoop: while (await Promise.resolve(outer < 1)) {
        outer++;
        let inner = 0;
        while (await Promise.resolve(inner < 1)) {
            try {
                return await Promise.resolve("unreachable-return");
            } finally {
                console.log("return-break-cleanup");
                await Promise.resolve(undefined);
                break outerLoop;
            }
        }
    }
    return "break-overrode-return";
}

async function returnThrowOverride(): Promise<string> {
    let outer = 0;
    while (await Promise.resolve(outer < 1)) {
        let inner = 0;
        while (await Promise.resolve(inner < 1)) {
            try {
                return "unreachable-return";
            } finally {
                console.log("return-throw-cleanup");
                await Promise.resolve(undefined);
                throw "throw-overrode-return";
            }
        }
    }
    return "unreachable";
}

async function immediate(): Promise<string> {
    return "immediate";
}

jumpOverride(0).then(value => console.log("result", value));
jumpOverride(1).then(value => console.log("result", value));
returnBreakOverride().then(value => console.log("result", value));
returnThrowOverride().catch(reason => console.log("rejected", reason));
immediate().then(value => console.log("result", value));
