function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

let ofCount = 0;
let inCount = 0;

function laterOf(value: string): Promise<string> {
    ofCount++;
    return later(value);
}

function laterIn(value: string): Promise<string> {
    inCount++;
    return later(value);
}

async function runOf(): Promise<string> {
    for (const item of ["of"]) {
        const first = await laterOf(item);
        if (ofCount > 0) {
            ofCount += 10;
        }
        const suffix = "-second";
        const second = await laterOf(first + suffix);
        return await later(ofCount + "|" + second);
    }
    return await later("fallthrough");
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { in: "value" };
    for (const key in values) {
        const first = await laterIn(key);
        if (inCount > 0) {
            inCount += 10;
        }
        const suffix = "-second";
        const second = await laterIn(first + suffix);
        throw await later("in-" + inCount + "|" + second);
    }
    return await later("fallthrough");
}

runOf().then((value) => console.log(value));
runIn().then((value) => console.log(value), (reason) => console.log(reason));
