import { setTimeout as delay } from "node:timers/promises";

async function branchBlockLocal(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        const value = await delay(1, "branch");
        return prefix + value + "!";
    }
    const fallback = await delay(2, "fallthrough");
    return prefix + fallback + "!";
}

class BranchBlockRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean): Promise<string> {
        if (flag) {
            const value = await delay(3, "method-branch");
            return this.prefix + value + "!";
        }
        const fallback = await delay(4, "method-fallthrough");
        return this.prefix + fallback + "!";
    }
}

const branchBlockValue = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        const value = await delay(5, "value-branch");
        return prefix + value + "!";
    }
    const fallback = await delay(6, "value-fallthrough");
    return prefix + fallback + "!";
};

const runner = new BranchBlockRunner("this-");

branchBlockLocal(true, "fn-").then((value) => console.log("branch-block-local-true:", value));
branchBlockLocal(false, "fn-").then((value) => console.log("branch-block-local-false:", value));
runner.method(true).then((value) => console.log("method-branch-block-local-true:", value));
runner.method(false).then((value) => console.log("method-branch-block-local-false:", value));
branchBlockValue(true, "value-").then((value) => console.log("value-branch-block-local-true:", value));
branchBlockValue(false, "value-").then((value) => console.log("value-branch-block-local-false:", value));
