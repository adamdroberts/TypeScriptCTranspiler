function delayed(value: string): Promise<string> {
    return new Promise((resolve) => setImmediate(() => resolve(value)));
}

function delayedReject(reason: string): Promise<string> {
    return new Promise((_resolve, reject) => setImmediate(() => reject(reason)));
}

async function fulfilledBlock(): Promise<string> {
    let result = "start";
    {
        const inner = await delayed("inner");
        result += ":" + inner;
    }
    return result;
}

async function shadowedBlock(): Promise<string> {
    const value = "outer";
    {
        const value = await delayed("inner");
        console.log("shadow", value);
    }
    return value;
}

async function rejectedBlock(): Promise<string> {
    {
        const unreachable = await delayedReject("block-error");
        console.log("unreachable", unreachable);
    }
    return "unreachable-return";
}

async function multiSuspensionBlock(): Promise<string> {
    let result = "multi";
    {
        const first = await delayed("one");
        result += ":" + first;
        const second = await delayed(first + ":two");
        result += ":" + second;
    }
    return result;
}

async function rejectedSecondSuspension(): Promise<string> {
    {
        const first = await delayed("before-reject");
        console.log("first", first);
        const second = await delayedReject("second-error");
        console.log("unreachable-second", second);
    }
    return "unreachable-second-return";
}

async function localsAcrossSuspensions(): Promise<string> {
    const seed = "outer";
    let result = "unset";
    {
        const seed = "inner";
        const first = await delayed(seed + ":one");
        const middle = first + ":middle";
        const second = await delayed(middle + ":two");
        result = seed + "|" + middle + "|" + second;
    }
    return seed + "#" + result;
}

async function deeplyNestedBlocks(): Promise<string> {
    let trace = "root";
    {
        const outer = "outer";
        {
            const innerSeed = outer + ":inner";
            const resumed = await delayed(innerSeed + ":awaited");
            trace += ":" + resumed;
        }
        trace += ":" + outer;
    }
    return trace;
}

fulfilledBlock().then((value) => console.log("fulfilled", value));
shadowedBlock().then((value) => console.log("outer", value));
rejectedBlock().catch((error) => console.log("rejected", error));
multiSuspensionBlock().then((value) => console.log("multi", value));
rejectedSecondSuspension().catch((error) => console.log("second-rejected", error));
localsAcrossSuspensions().then((value) => console.log("locals", value));
deeplyNestedBlocks().then((value) => console.log("deep", value));
