import { setTimeout as delay } from "node:timers/promises";

async function branchBlockPostAwaitSwitch(flag: boolean, kind: string, prefix: string): Promise<string> {
    if (flag) {
        const value = await delay(1, "branch");
        switch (kind) {
            case "a":
                return prefix + value + "-a";
            default:
                return prefix + value + "-default";
        }
    } else {
        const value = await delay(2, "else");
        switch (kind) {
            case "b":
                return prefix + value + "-b";
            default:
                return prefix + value + "-default";
        }
    }
}

class PostAwaitSwitchRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean, kind: string): Promise<string> {
        if (flag) {
            const value = await delay(3, "method-branch");
            switch (kind) {
                case "a":
                    return this.prefix + value + "-a";
                default:
                    return this.prefix + value + "-default";
            }
        } else {
            const value = await delay(4, "method-else");
            switch (kind) {
                case "b":
                    return this.prefix + value + "-b";
                default:
                    return this.prefix + value + "-default";
            }
        }
    }
}

const branchBlockPostAwaitSwitchValue = async (flag: boolean, kind: string, prefix: string): Promise<string> => {
    if (flag) {
        const value = await delay(5, "value-branch");
        switch (kind) {
            case "a":
                return prefix + value + "-a";
            default:
                return prefix + value + "-default";
        }
    } else {
        const value = await delay(6, "value-else");
        switch (kind) {
            case "b":
                return prefix + value + "-b";
            default:
                return prefix + value + "-default";
        }
    }
};

const runner = new PostAwaitSwitchRunner("this-");

branchBlockPostAwaitSwitch(true, "a", "fn-").then((value) => console.log("branch-block-post-await-switch-true-a:", value));
branchBlockPostAwaitSwitch(false, "z", "fn-").then((value) => console.log("branch-block-post-await-switch-false-default:", value));
runner.method(true, "z").then((value) => console.log("method-branch-block-post-await-switch-true-default:", value));
runner.method(false, "b").then((value) => console.log("method-branch-block-post-await-switch-false-b:", value));
branchBlockPostAwaitSwitchValue(true, "a", "arrow-").then((value) => console.log("value-branch-block-post-await-switch-true-a:", value));
branchBlockPostAwaitSwitchValue(false, "z", "arrow-").then((value) => console.log("value-branch-block-post-await-switch-false-default:", value));
