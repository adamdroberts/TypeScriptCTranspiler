function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

let ofCount = 0;
let inCount = 0;
let ofControlCount = 0;
let inControlCount = 0;
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

function laterOfControl(value: string): Promise<string> {
    ofControlCount++;
    return later(value);
}

function laterInControl(value: string): Promise<string> {
    inControlCount++;
    return later(value);
}

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        const first = await laterOf(item);
        const second = await laterOf(first + "-second");
        if (item === "of-a") {
            lastOf = second;
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            continue;
        } else {
            lastOf = second;
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            await laterOfControl(lastOf);
            break;
        }
    }
    return await later(ofCount + "|" + ofControlCount + "|" + lastOf);
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a", "in-b": "b" };
    for (const key in values) {
        const first = await laterIn(key);
        const second = await laterIn(first + "-second");
        if (key === "in-a") {
            lastIn = second;
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            continue;
        } else {
            lastIn = second;
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            await laterInControl(lastIn);
            break;
        }
    }
    return await later(inCount + "|" + inControlCount + "|" + lastIn);
}

runOf().then((value) => console.log(value));
runIn().then((value) => console.log(value));
