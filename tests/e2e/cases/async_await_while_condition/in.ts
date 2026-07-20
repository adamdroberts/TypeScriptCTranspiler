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

class LoopChooser {
    async pick(): Promise<string> {
        while (await laterTrue()) {
            return "method-loop-yes";
        }
        return "method-loop-no";
    }
}

const chooseLoopValue = async (): Promise<string> => {
    while (await laterFalse()) {
        return "value-loop-yes";
    }
    return "value-loop-no";
};

chooseLoopTrue().then((value) => console.log("await-while-true", value));
chooseLoopFalse().then((value) => console.log("await-while-false", value));
new LoopChooser().pick().then((value) => console.log("await-while-method", value));
chooseLoopValue().then((value) => console.log("await-while-value", value));
