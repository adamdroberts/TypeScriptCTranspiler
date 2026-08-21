function resolved(label: string, value: boolean, trace: string[]): Promise<boolean> {
    trace.push(label);
    return Promise.resolve(value);
}

async function nestedMixedCondition(): Promise<string> {
    const trace: string[] = [];
    let active = true;
    while (
        await resolved("a", active, trace) &&
        (await resolved("b", false, trace) ||
            (await resolved("c", true, trace) && await resolved("d", true, trace)))
    ) {
        trace.push("body");
        active = false;
        continue;
    }
    return await Promise.resolve(trace.join(","));
}

async function twoStateCondition(): Promise<string> {
    const trace: string[] = [];
    let active = true;
    while (await resolved("left", active, trace) && await resolved("right", true, trace)) {
        trace.push("body");
        active = false;
        continue;
    }
    return await Promise.resolve(trace.join(","));
}

nestedMixedCondition().then((value: string): void => console.log(value));
twoStateCondition().then((value: string): void => console.log(value));
