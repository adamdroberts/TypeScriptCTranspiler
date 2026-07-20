function laterTrue(): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(true)));
}

function laterFalse(): Promise<boolean> {
    return new Promise<boolean>((resolve) => setImmediate(() => resolve(false)));
}

async function chooseLoopTrue(): Promise<string> {
    while (await laterTrue()) {
        return "loop-yes";
    }
    return "loop-no";
}

async function chooseLoopFalse(): Promise<string> {
    while (await laterFalse()) {
        return "loop-yes";
    }
    return "loop-no";
}

chooseLoopTrue().then((value) => console.log("await-while-true", value));
chooseLoopFalse().then((value) => console.log("await-while-false", value));
