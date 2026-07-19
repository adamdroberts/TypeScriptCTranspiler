import { setTimeout as delay } from "node:timers/promises";

async function branchBlockPostAwaitIf(flag: boolean, suffix: boolean, prefix: string): Promise<string> {
    if (flag) {
        const value = await delay(1, "branch");
        if (suffix) return prefix + value + "-yes";
        return prefix + value + "-no";
    } else {
        const value = await delay(2, "else");
        if (suffix) return prefix + value + "-yes";
        return prefix + value + "-no";
    }
}

class PostAwaitIfRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean, suffix: boolean): Promise<string> {
        if (flag) {
            const value = await delay(3, "method-branch");
            if (suffix) return this.prefix + value + "-yes";
            return this.prefix + value + "-no";
        } else {
            const value = await delay(4, "method-else");
            if (suffix) return this.prefix + value + "-yes";
            return this.prefix + value + "-no";
        }
    }
}

const branchBlockPostAwaitIfValue = async (flag: boolean, suffix: boolean, prefix: string): Promise<string> => {
    if (flag) {
        const value = await delay(5, "value-branch");
        if (suffix) return prefix + value + "-yes";
        return prefix + value + "-no";
    } else {
        const value = await delay(6, "value-else");
        if (suffix) return prefix + value + "-yes";
        return prefix + value + "-no";
    }
};

const runner = new PostAwaitIfRunner("this-");

branchBlockPostAwaitIf(true, true, "fn-").then((value) => console.log("branch-block-post-await-if-true-yes:", value));
branchBlockPostAwaitIf(false, false, "fn-").then((value) => console.log("branch-block-post-await-if-false-no:", value));
runner.method(true, false).then((value) => console.log("method-branch-block-post-await-if-true-no:", value));
runner.method(false, true).then((value) => console.log("method-branch-block-post-await-if-false-yes:", value));
branchBlockPostAwaitIfValue(true, true, "arrow-").then((value) => console.log("value-branch-block-post-await-if-true-yes:", value));
branchBlockPostAwaitIfValue(false, false, "arrow-").then((value) => console.log("value-branch-block-post-await-if-false-no:", value));
