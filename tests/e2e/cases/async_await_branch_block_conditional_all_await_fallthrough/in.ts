import { setTimeout as delay } from "node:timers/promises";

async function branchBlockConditionalAllAwaitFallthrough(flag: boolean, choice: boolean, prefix: string): Promise<string> {
    if (flag) {
        const value = await delay(1, "branch");
        return prefix + value;
    }
    const label = prefix + "fall-";
    return choice
        ? label + await delay(2, "left")
        : label + await delay(3, "right");
}

class ConditionalAllAwaitFallthroughRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean, choice: boolean): Promise<string> {
        if (flag) {
            const value = await delay(4, "method-branch");
            return this.prefix + value;
        }
        const label = this.prefix + "method-fall-";
        return choice
            ? label + await delay(5, "left")
            : label + await delay(6, "right");
    }
}

const branchBlockConditionalAllAwaitFallthroughValue = async (flag: boolean, choice: boolean, prefix: string): Promise<string> => {
    if (flag) {
        const value = await delay(7, "value-branch");
        return prefix + value;
    }
    const label = prefix + "value-fall-";
    return choice
        ? label + await delay(8, "left")
        : label + await delay(9, "right");
};

const runner = new ConditionalAllAwaitFallthroughRunner("this-");

branchBlockConditionalAllAwaitFallthrough(true, false, "fn-")
    .then((value) => console.log("branch-block-conditional-all-await-fallthrough-branch:", value));
branchBlockConditionalAllAwaitFallthrough(false, true, "fn-")
    .then((value) => console.log("branch-block-conditional-all-await-fallthrough-left:", value));
branchBlockConditionalAllAwaitFallthrough(false, false, "fn-")
    .then((value) => console.log("branch-block-conditional-all-await-fallthrough-right:", value));
runner.method(true, false)
    .then((value) => console.log("method-branch-block-conditional-all-await-fallthrough-branch:", value));
runner.method(false, true)
    .then((value) => console.log("method-branch-block-conditional-all-await-fallthrough-left:", value));
runner.method(false, false)
    .then((value) => console.log("method-branch-block-conditional-all-await-fallthrough-right:", value));
branchBlockConditionalAllAwaitFallthroughValue(true, false, "arrow-")
    .then((value) => console.log("value-branch-block-conditional-all-await-fallthrough-branch:", value));
branchBlockConditionalAllAwaitFallthroughValue(false, true, "arrow-")
    .then((value) => console.log("value-branch-block-conditional-all-await-fallthrough-left:", value));
branchBlockConditionalAllAwaitFallthroughValue(false, false, "arrow-")
    .then((value) => console.log("value-branch-block-conditional-all-await-fallthrough-right:", value));
