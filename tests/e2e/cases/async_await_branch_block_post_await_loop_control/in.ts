import { setTimeout as delay } from "node:timers/promises";

async function branchBlockPostAwaitLoopControl(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        const value = await delay(1, "branch");
        let out = prefix + value;
        for (let i = 0; i < 6; i++) {
            if (i === 1 || i === 3) continue;
            if (i === 5) break;
            out = out + "-" + i;
        }
        return out;
    } else {
        const value = await delay(2, "else");
        let out = prefix + value;
        let i = 0;
        while (i < 6) {
            if (i === 1 || i === 3) {
                i++;
                continue;
            }
            if (i === 5) break;
            out = out + "-" + i;
            i++;
        }
        return out;
    }
}

class PostAwaitLoopControlRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean): Promise<string> {
        if (flag) {
            const value = await delay(3, "method-branch");
            let out = this.prefix + value;
            for (let i = 0; i < 6; i++) {
                if (i === 1 || i === 3) continue;
                if (i === 5) break;
                out = out + "-" + i;
            }
            return out;
        } else {
            const value = await delay(4, "method-else");
            let out = this.prefix + value;
            let i = 0;
            while (i < 6) {
                if (i === 1 || i === 3) {
                    i++;
                    continue;
                }
                if (i === 5) break;
                out = out + "-" + i;
                i++;
            }
            return out;
        }
    }
}

const branchBlockPostAwaitLoopControlValue = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        const value = await delay(5, "value-branch");
        let out = prefix + value;
        for (let i = 0; i < 6; i++) {
            if (i === 1 || i === 3) continue;
            if (i === 5) break;
            out = out + "-" + i;
        }
        return out;
    } else {
        const value = await delay(6, "value-else");
        let out = prefix + value;
        let i = 0;
        while (i < 6) {
            if (i === 1 || i === 3) {
                i++;
                continue;
            }
            if (i === 5) break;
            out = out + "-" + i;
            i++;
        }
        return out;
    }
};

const runner = new PostAwaitLoopControlRunner("this-");

branchBlockPostAwaitLoopControl(true, "fn-")
    .then((value) => console.log("branch-block-post-await-loop-control-true:", value));
branchBlockPostAwaitLoopControl(false, "fn-")
    .then((value) => console.log("branch-block-post-await-loop-control-false:", value));
runner.method(true)
    .then((value) => console.log("method-branch-block-post-await-loop-control-true:", value));
runner.method(false)
    .then((value) => console.log("method-branch-block-post-await-loop-control-false:", value));
branchBlockPostAwaitLoopControlValue(true, "arrow-")
    .then((value) => console.log("value-branch-block-post-await-loop-control-true:", value));
branchBlockPostAwaitLoopControlValue(false, "arrow-")
    .then((value) => console.log("value-branch-block-post-await-loop-control-false:", value));
