async function resolveStringArray(label: string, value: string[], trace: string[]): Promise<string[]> {
    trace.push(label);
    return value;
}

async function resolveNumberArray(label: string, value: number[], trace: string[]): Promise<number[]> {
    trace.push(label);
    return value;
}

async function resolveObject(label: string, value: { first: string }, trace: string[]): Promise<{ first: string }> {
    trace.push(label);
    return value;
}

async function resolveString(label: string, value: string, trace: string[]): Promise<string> {
    trace.push(label);
    return value;
}

async function resolveNumber(label: string, value: number, trace: string[]): Promise<number> {
    trace.push(label);
    return value;
}

function combine(...values: string[]): string {
    return values.join("");
}

class Triple {
    value: string;

    constructor(...values: string[]) {
        this.value = values.join("");
    }
}

async function callSpread(): Promise<string> {
    const trace: string[] = [];
    return combine(
        ...await resolveStringArray("call-spread", ["a", "b"], trace),
        await resolveString("call-tail", "c", trace),
    ) + "|" + trace.join(",");
}

async function constructSpread(): Promise<string> {
    const trace: string[] = [];
    return new Triple(
        ...await resolveStringArray("new-spread", ["d", "e"], trace),
        await resolveString("new-tail", "f", trace),
    ).value + "|" + trace.join(",");
}

async function arraySpread(): Promise<string> {
    const trace: string[] = [];
    return [
        ...await resolveNumberArray("array-spread", [1, 2], trace),
        await resolveNumber("array-tail", 3, trace),
    ].join(",") + "|" + trace.join(",");
}

async function objectSpread(): Promise<string> {
    const trace: string[] = [];
    return ({
        ...await resolveObject("object-spread", { first: "g" }, trace),
        second: await resolveString("object-tail", "h", trace),
    }).first + ({
        ...await resolveObject("object-spread-second", { first: "unused" }, trace),
        second: await resolveString("object-tail-second", "i", trace),
    }).second + "|" + trace.join(",");
}

callSpread().then((value: string): void => console.log("call:", value));
constructSpread().then((value: string): void => console.log("new:", value));
arraySpread().then((value: string): void => console.log("array:", value));
objectSpread().then((value: string): void => console.log("object:", value));
