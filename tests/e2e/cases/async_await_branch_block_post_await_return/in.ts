import { setTimeout as delay } from "node:timers/promises";

async function branchBlockPostAwait(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        const value = await delay(1, "branch");
        const decorated = prefix + value;
        return decorated + "!";
    } else {
        const value = await delay(2, "else");
        const decorated = prefix + value;
        return decorated + "!";
    }
}

class PostAwaitRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean): Promise<string> {
        if (flag) {
            const value = await delay(3, "method-branch");
            const decorated = this.prefix + value;
            return decorated + "!";
        } else {
            const value = await delay(4, "method-else");
            const decorated = this.prefix + value;
            return decorated + "!";
        }
    }
}

const branchBlockPostAwaitValue = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        const value = await delay(5, "value-branch");
        const decorated = prefix + value;
        return decorated + "!";
    } else {
        const value = await delay(6, "value-else");
        const decorated = prefix + value;
        return decorated + "!";
    }
};

const runner = new PostAwaitRunner("this-");

branchBlockPostAwait(true, "fn-").then((value) => console.log("branch-block-post-await-true:", value));
branchBlockPostAwait(false, "fn-").then((value) => console.log("branch-block-post-await-false:", value));
runner.method(true).then((value) => console.log("method-branch-block-post-await-true:", value));
runner.method(false).then((value) => console.log("method-branch-block-post-await-false:", value));
branchBlockPostAwaitValue(true, "arrow-").then((value) => console.log("value-branch-block-post-await-true:", value));
branchBlockPostAwaitValue(false, "arrow-").then((value) => console.log("value-branch-block-post-await-false:", value));
