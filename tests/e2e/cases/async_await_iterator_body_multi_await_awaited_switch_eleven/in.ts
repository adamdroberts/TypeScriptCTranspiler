function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

let ofCount = 0;
let inCount = 0;
let controlCount = 0;
let lastOf = "";
let lastIn = "";

function laterOf(value: string): Promise<string> {
    ofCount++;
    return later(value);
}

function laterIn(value: string): Promise<string> {
    inCount++;
    return later(value);
}

function laterControl(value: string): Promise<string> {
    controlCount++;
    return later(value);
}

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        const first = await laterOf(item);
        const second = await laterOf(first + "-second");
        switch (item) {
            case "of-a":
                lastOf = second;
                await laterControl(lastOf);
                await laterControl(lastOf);
                await laterControl(lastOf);
                await laterControl(lastOf);
                await laterControl(lastOf);
                await laterControl(lastOf);
                await laterControl(lastOf);
                await laterControl(lastOf);
                await laterControl(lastOf);
                await laterControl(lastOf);
                await laterControl(lastOf);
                continue;
            default:
                lastOf = second;
                await laterControl(lastOf);
                await laterControl(lastOf);
                await laterControl(lastOf);
                await laterControl(lastOf);
                await laterControl(lastOf);
                await laterControl(lastOf);
                await laterControl(lastOf);
                await laterControl(lastOf);
                await laterControl(lastOf);
                await laterControl(lastOf);
                await laterControl(lastOf);
                break;
        }
    }
    return await later(ofCount + "|" + controlCount + "|" + lastOf);
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a", "in-b": "b" };
    for (const key in values) {
        const first = await laterIn(key);
        const second = await laterIn(first + "-second");
        switch (key) {
            case "in-a":
                lastIn = second;
                await laterControl(lastIn);
                await laterControl(lastIn);
                await laterControl(lastIn);
                await laterControl(lastIn);
                await laterControl(lastIn);
                await laterControl(lastIn);
                await laterControl(lastIn);
                await laterControl(lastIn);
                await laterControl(lastIn);
                await laterControl(lastIn);
                await laterControl(lastIn);
                continue;
            default:
                lastIn = second;
                await laterControl(lastIn);
                await laterControl(lastIn);
                await laterControl(lastIn);
                await laterControl(lastIn);
                await laterControl(lastIn);
                await laterControl(lastIn);
                await laterControl(lastIn);
                await laterControl(lastIn);
                await laterControl(lastIn);
                await laterControl(lastIn);
                await laterControl(lastIn);
                break;
        }
    }
    return await later(inCount + "|" + controlCount + "|" + lastIn);
}

runOf().then((value) => console.log(value));
runIn().then((value) => console.log(value));
