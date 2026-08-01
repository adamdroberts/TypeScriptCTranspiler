function later(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => resolve(value)));
}

function laterBoolean(value: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(value)));
}

let ofCount = 0;
let inCount = 0;
let ofControlCount = 0;
let inControlCount = 0;
let ofAliasCount = 0;
let inAliasCount = 0;

function laterOf(value: string): Promise<string> {
    ofCount++;
    return later(value);
}

function laterIn(value: string): Promise<string> {
    inCount++;
    return later(value);
}

function laterOfAlias(value: string): Promise<string> {
    return later(value + "-alias");
}

function laterInAlias(value: string): Promise<string> {
    return later(value + "-alias");
}

function laterOfControl(value: string): Promise<string> {
    ofControlCount++;
    if (value === "of-a-alias" || value === "of-b-alias") ofAliasCount++;
    return later(value);
}

function laterInControl(value: string): Promise<string> {
    inControlCount++;
    if (value === "in-a-alias" || value === "in-b-alias") inAliasCount++;
    return later(value);
}

async function runOf(): Promise<string> {
    for (const item of ["of-a", "of-b"]) {
        await laterOf(item);
        if (await laterBoolean(item === "of-a")) {
            let branchValue: string;
            branchValue = await laterOfAlias(item);
            await laterOfControl(branchValue);
            await laterOfControl(branchValue);
        } else {
            let branchValue: string;
            branchValue = await laterOfAlias(item);
            await laterOfControl(branchValue);
            await laterOfControl(branchValue);
        }
        continue;
    }
    return await later(ofCount + "|" + ofControlCount + "|" + ofAliasCount);
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a", "in-b": "b" };
    for (const key in values) {
        await laterIn(key);
        if (await laterBoolean(key === "in-a")) {
            var branchValue: string;
            branchValue = await laterInAlias(key);
            await laterInControl(branchValue);
            await laterInControl(branchValue);
        } else {
            var branchValue: string;
            branchValue = await laterInAlias(key);
            await laterInControl(branchValue);
            await laterInControl(branchValue);
        }
        continue;
    }
    return await later(inCount + "|" + inControlCount + "|" + inAliasCount);
}

runOf().then((value) => console.log(value));
runIn().then((value) => console.log(value));
