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

async function chooseLoopExpression(flag: boolean, prefix: string): Promise<string> {
    while (await (flag ? laterTrue() : laterFalse())) {
        prefix += "-yes";
        return prefix;
    }
    return prefix + "-no";
}

class LoopChooser {
    private readonly prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async pick(flag: boolean): Promise<string> {
        while (await (flag ? laterTrue() : laterFalse())) {
            return this.prefix + "yes";
        }
        return this.prefix + "no";
    }
}

const chooseLoopValue = async (flag: boolean, prefix: string): Promise<string> => {
    while (await (flag ? laterTrue() : laterFalse())) {
        return prefix + "yes";
    }
    return prefix + "no";
};

chooseLoopTrue().then((value) => console.log("await-while-true", value));
chooseLoopFalse().then((value) => console.log("await-while-false", value));
chooseLoopExpression(true, "expression-loop").then((value) => console.log("await-while-expression-true", value));
chooseLoopExpression(false, "expression-loop").then((value) => console.log("await-while-expression-false", value));
new LoopChooser("method-loop-").pick(true).then((value) => console.log("await-while-method-true", value));
new LoopChooser("method-loop-").pick(false).then((value) => console.log("await-while-method-false", value));
chooseLoopValue(true, "value-loop-").then((value) => console.log("await-while-value-true", value));
chooseLoopValue(false, "value-loop-").then((value) => console.log("await-while-value-false", value));
