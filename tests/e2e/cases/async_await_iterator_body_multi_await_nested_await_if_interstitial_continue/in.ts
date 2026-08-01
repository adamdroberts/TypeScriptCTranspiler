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
let ofMarkerCount = 0;
let inMarkerCount = 0;
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

function markOf(value: string): void {
    ofMarkerCount++;
    if (value === "of-a-alias" || value === "of-b-alias") ofAliasCount++;
}

function markIn(value: string): void {
    inMarkerCount++;
    if (value === "in-a-alias" || value === "in-b-alias") inAliasCount++;
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
        await laterOf(item);
        if (await laterBoolean(item === "of-a")) {
            const branchValue = await laterOfAlias(item);
            switch (item) {
                case "of-a":
                    markOf(branchValue);
                    break;
                default:
                    markOf(branchValue);
                    break;
            }
            await laterOfControl(branchValue);
            if (item === "of-a") {
                markOf(branchValue);
            } else {
                markOf(branchValue);
            }
        } else {
            const branchValue = await laterOfAlias(item);
            switch (item) {
                case "of-a":
                    markOf(branchValue);
                    break;
                default:
                    markOf(branchValue);
                    break;
            }
            await laterOfControl(branchValue);
            if (item === "of-a") {
                markOf(branchValue);
            } else {
                markOf(branchValue);
            }
        }
        continue;
    }
    return await later(ofCount + "|" + ofControlCount + "|" + ofMarkerCount + "|" + ofAliasCount);
}

async function runIn(): Promise<string> {
    const values: Record<string, string> = { "in-a": "a", "in-b": "b" };
    for (const key in values) {
        await laterIn(key);
        if (await laterBoolean(key === "in-a")) {
            const branchValue = await laterInAlias(key);
            switch (key) {
                case "in-a":
                    markIn(branchValue);
                    break;
                default:
                    markIn(branchValue);
                    break;
            }
            await laterInControl(branchValue);
            if (key === "in-a") {
                markIn(branchValue);
            } else {
                markIn(branchValue);
            }
        } else {
            const branchValue = await laterInAlias(key);
            switch (key) {
                case "in-a":
                    markIn(branchValue);
                    break;
                default:
                    markIn(branchValue);
                    break;
            }
            await laterInControl(branchValue);
            if (key === "in-a") {
                markIn(branchValue);
            } else {
                markIn(branchValue);
            }
        }
        continue;
    }
    return await later(inCount + "|" + inControlCount + "|" + inMarkerCount + "|" + inAliasCount);
}

runOf().then((value) => console.log(value));
runIn().then((value) => console.log(value));
