import { setTimeout as delay } from "node:timers/promises";

async function branchBlockTemplateAwaitFallthrough(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        const value = await delay(1, "branch");
        return `${prefix}${value}`;
    }
    const label = `${prefix}fall-`;
    return `${label}${await delay(2, "template")}!`;
}

class TemplateAwaitFallthroughRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean): Promise<string> {
        if (flag) {
            const value = await delay(3, "method-branch");
            return `${this.prefix}${value}`;
        }
        const label = `${this.prefix}method-fall-`;
        return `${label}${await delay(4, "template")}!`;
    }
}

const branchBlockTemplateAwaitFallthroughValue = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        const value = await delay(5, "value-branch");
        return `${prefix}${value}`;
    }
    const label = `${prefix}value-fall-`;
    return `${label}${await delay(6, "template")}!`;
};

const runner = new TemplateAwaitFallthroughRunner("this-");

branchBlockTemplateAwaitFallthrough(true, "fn-")
    .then((value) => console.log("branch-block-template-await-fallthrough-true:", value));
branchBlockTemplateAwaitFallthrough(false, "fn-")
    .then((value) => console.log("branch-block-template-await-fallthrough-false:", value));
runner.method(true)
    .then((value) => console.log("method-branch-block-template-await-fallthrough-true:", value));
runner.method(false)
    .then((value) => console.log("method-branch-block-template-await-fallthrough-false:", value));
branchBlockTemplateAwaitFallthroughValue(true, "arrow-")
    .then((value) => console.log("value-branch-block-template-await-fallthrough-true:", value));
branchBlockTemplateAwaitFallthroughValue(false, "arrow-")
    .then((value) => console.log("value-branch-block-template-await-fallthrough-false:", value));
