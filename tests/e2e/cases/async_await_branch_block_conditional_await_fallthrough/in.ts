import { setTimeout as delay } from "node:timers/promises";

async function branchBlockConditionalAwaitFallthrough(flag: boolean, choice: boolean, prefix: string): Promise<string> {
    if (flag) {
        const value = await delay(1, "branch");
        return prefix + value;
    }
    const label = prefix + "fall-";
    return choice
        ? label + await delay(2, "await")
        : label + "sync";
}

class ConditionalAwaitFallthroughRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean, choice: boolean): Promise<string> {
        if (flag) {
            const value = await delay(3, "method-branch");
            return this.prefix + value;
        }
        const label = this.prefix + "method-fall-";
        return choice
            ? label + await delay(4, "await")
            : label + "sync";
    }
}

const branchBlockConditionalAwaitFallthroughValue = async (flag: boolean, choice: boolean, prefix: string): Promise<string> => {
    if (flag) {
        const value = await delay(5, "value-branch");
        return prefix + value;
    }
    const label = prefix + "value-fall-";
    return choice
        ? label + await delay(6, "await")
        : label + "sync";
};

const runner = new ConditionalAwaitFallthroughRunner("this-");

branchBlockConditionalAwaitFallthrough(true, false, "fn-")
    .then((value) => console.log("branch-block-conditional-await-fallthrough-branch:", value));
branchBlockConditionalAwaitFallthrough(false, true, "fn-")
    .then((value) => console.log("branch-block-conditional-await-fallthrough-await:", value));
branchBlockConditionalAwaitFallthrough(false, false, "fn-")
    .then((value) => console.log("branch-block-conditional-await-fallthrough-sync:", value));
runner.method(true, false)
    .then((value) => console.log("method-branch-block-conditional-await-fallthrough-branch:", value));
runner.method(false, true)
    .then((value) => console.log("method-branch-block-conditional-await-fallthrough-await:", value));
runner.method(false, false)
    .then((value) => console.log("method-branch-block-conditional-await-fallthrough-sync:", value));
branchBlockConditionalAwaitFallthroughValue(true, false, "arrow-")
    .then((value) => console.log("value-branch-block-conditional-await-fallthrough-branch:", value));
branchBlockConditionalAwaitFallthroughValue(false, true, "arrow-")
    .then((value) => console.log("value-branch-block-conditional-await-fallthrough-await:", value));
branchBlockConditionalAwaitFallthroughValue(false, false, "arrow-")
    .then((value) => console.log("value-branch-block-conditional-await-fallthrough-sync:", value));
