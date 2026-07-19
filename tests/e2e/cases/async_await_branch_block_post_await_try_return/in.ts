import { setTimeout as delay } from "node:timers/promises";

async function branchBlockPostAwaitTry(flag: boolean, fail: boolean, prefix: string): Promise<string> {
    if (flag) {
        const value = await delay(1, "branch");
        let out = "";
        try {
            if (fail) throw prefix + value + "-bad";
            out = prefix + value + "-ok";
        } catch (reason) {
            out = "caught-" + reason;
        } finally {
            out = out + "-F";
        }
        return out;
    } else {
        const value = await delay(2, "else");
        let out = "";
        try {
            if (fail) throw prefix + value + "-bad";
            out = prefix + value + "-ok";
        } catch (reason) {
            out = "caught-" + reason;
        } finally {
            out = out + "-f";
        }
        return out;
    }
}

class PostAwaitTryRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean, fail: boolean): Promise<string> {
        if (flag) {
            const value = await delay(3, "method-branch");
            let out = "";
            try {
                if (fail) throw this.prefix + value + "-bad";
                out = this.prefix + value + "-ok";
            } catch (reason) {
                out = "caught-" + reason;
            } finally {
                out = out + "-M";
            }
            return out;
        } else {
            const value = await delay(4, "method-else");
            let out = "";
            try {
                if (fail) throw this.prefix + value + "-bad";
                out = this.prefix + value + "-ok";
            } catch (reason) {
                out = "caught-" + reason;
            } finally {
                out = out + "-m";
            }
            return out;
        }
    }
}

const branchBlockPostAwaitTryValue = async (flag: boolean, fail: boolean, prefix: string): Promise<string> => {
    if (flag) {
        const value = await delay(5, "value-branch");
        let out = "";
        try {
            if (fail) throw prefix + value + "-bad";
            out = prefix + value + "-ok";
        } catch (reason) {
            out = "caught-" + reason;
        } finally {
            out = out + "-V";
        }
        return out;
    } else {
        const value = await delay(6, "value-else");
        let out = "";
        try {
            if (fail) throw prefix + value + "-bad";
            out = prefix + value + "-ok";
        } catch (reason) {
            out = "caught-" + reason;
        } finally {
            out = out + "-v";
        }
        return out;
    }
};

const runner = new PostAwaitTryRunner("this-");

branchBlockPostAwaitTry(true, false, "fn-").then((value) => console.log("branch-block-post-await-try-true-ok:", value));
branchBlockPostAwaitTry(false, true, "fn-").then((value) => console.log("branch-block-post-await-try-false-catch:", value));
runner.method(true, true).then((value) => console.log("method-branch-block-post-await-try-true-catch:", value));
runner.method(false, false).then((value) => console.log("method-branch-block-post-await-try-false-ok:", value));
branchBlockPostAwaitTryValue(true, false, "arrow-").then((value) => console.log("value-branch-block-post-await-try-true-ok:", value));
branchBlockPostAwaitTryValue(false, true, "arrow-").then((value) => console.log("value-branch-block-post-await-try-false-catch:", value));
