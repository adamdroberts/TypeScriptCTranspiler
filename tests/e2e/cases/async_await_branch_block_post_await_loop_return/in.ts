import { setTimeout as delay } from "node:timers/promises";

async function branchBlockPostAwaitLoop(flag: boolean, count: number, prefix: string): Promise<string> {
    if (flag) {
        const value = await delay(1, "branch");
        let out = prefix + value;
        for (let i = 0; i < count; i++) {
            out = out + "-" + i;
        }
        return out;
    } else {
        const value = await delay(2, "else");
        let out = prefix + value;
        let i = 0;
        while (i < count) {
            out = out + "-" + i;
            i++;
        }
        return out;
    }
}

class PostAwaitLoopRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean, count: number): Promise<string> {
        if (flag) {
            const value = await delay(3, "method-branch");
            let out = this.prefix + value;
            for (let i = 0; i < count; i++) {
                out = out + "-" + i;
            }
            return out;
        } else {
            const value = await delay(4, "method-else");
            let out = this.prefix + value;
            let i = 0;
            while (i < count) {
                out = out + "-" + i;
                i++;
            }
            return out;
        }
    }
}

const branchBlockPostAwaitLoopValue = async (flag: boolean, count: number, prefix: string): Promise<string> => {
    if (flag) {
        const value = await delay(5, "value-branch");
        let out = prefix + value;
        for (let i = 0; i < count; i++) {
            out = out + "-" + i;
        }
        return out;
    } else {
        const value = await delay(6, "value-else");
        let out = prefix + value;
        let i = 0;
        while (i < count) {
            out = out + "-" + i;
            i++;
        }
        return out;
    }
};

const runner = new PostAwaitLoopRunner("this-");

branchBlockPostAwaitLoop(true, 3, "fn-").then((value) => console.log("branch-block-post-await-loop-true:", value));
branchBlockPostAwaitLoop(false, 2, "fn-").then((value) => console.log("branch-block-post-await-loop-false:", value));
runner.method(true, 2).then((value) => console.log("method-branch-block-post-await-loop-true:", value));
runner.method(false, 3).then((value) => console.log("method-branch-block-post-await-loop-false:", value));
branchBlockPostAwaitLoopValue(true, 2, "arrow-").then((value) => console.log("value-branch-block-post-await-loop-true:", value));
branchBlockPostAwaitLoopValue(false, 3, "arrow-").then((value) => console.log("value-branch-block-post-await-loop-false:", value));
