function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

let bodyCount = 0;
let controlCount = 0;

function laterBody(value: string): Promise<string> {
    bodyCount++;
    return later(value);
}

function laterControl(value: string): Promise<string> {
    controlCount++;
    return later(value);
}

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        const first = await laterBody(item);
        const second = await laterBody(first + "-second");
        if (item === "of-a") {
            const returnPrefix = "of-return";
            const returnValue = await laterControl(second);
            return returnPrefix + "|" + returnValue;
        } else {
            var breakPrefix: string;
            breakPrefix = "of-break";
            var breakValue: string;
            breakValue = await laterControl(second);
            return breakPrefix + "|" + breakValue;
        }
    }
    return await later("of-fallthrough");
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a", "in-b": "b" };
    for (const key in values) {
        const first = await laterBody(key);
        const second = await laterBody(first + "-second");
        if (key === "in-a") {
            const returnPrefix = "in-return";
            const returnValue = await laterControl(second);
            return returnPrefix + "|" + returnValue;
        } else {
            var breakPrefix: string;
            breakPrefix = "in-break";
            var breakValue: string;
            breakValue = await laterControl(second);
            return breakPrefix + "|" + breakValue;
        }
    }
    return await later("in-fallthrough");
}

runOf().then((value) => console.log(bodyCount + "|" + controlCount + "|" + value));
runIn().then((value) => console.log(bodyCount + "|" + controlCount + "|" + value));
