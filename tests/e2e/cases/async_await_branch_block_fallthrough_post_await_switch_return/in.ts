import { setTimeout as delay } from "node:timers/promises";

async function branchBlockFallthroughPostAwaitSwitch(flag: boolean, kind: string, prefix: string): Promise<string> {
    if (flag) {
        const value = await delay(1, "branch");
        return prefix + value;
    }
    const label = prefix + "fall-";
    const value = await delay(2, "switch");
    switch (kind) {
        case "a":
            return label + value + "-a";
        default:
            return label + value + "-default";
    }
}

class FallthroughPostAwaitSwitchRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean, kind: string): Promise<string> {
        if (flag) {
            const value = await delay(3, "method-branch");
            return this.prefix + value;
        }
        const label = this.prefix + "method-fall-";
        const value = await delay(4, "switch");
        switch (kind) {
            case "b":
                return label + value + "-b";
            default:
                return label + value + "-default";
        }
    }
}

const branchBlockFallthroughPostAwaitSwitchValue = async (flag: boolean, kind: string, prefix: string): Promise<string> => {
    if (flag) {
        const value = await delay(5, "value-branch");
        return prefix + value;
    }
    const label = prefix + "value-fall-";
    const value = await delay(6, "switch");
    switch (kind) {
        case "a":
            return label + value + "-a";
        default:
            return label + value + "-default";
    }
};

const runner = new FallthroughPostAwaitSwitchRunner("this-");

branchBlockFallthroughPostAwaitSwitch(true, "a", "fn-")
    .then((value) => console.log("branch-block-fallthrough-post-await-switch-true:", value));
branchBlockFallthroughPostAwaitSwitch(false, "a", "fn-")
    .then((value) => console.log("branch-block-fallthrough-post-await-switch-fall-a:", value));
branchBlockFallthroughPostAwaitSwitch(false, "z", "fn-")
    .then((value) => console.log("branch-block-fallthrough-post-await-switch-fall-default:", value));
runner.method(true, "b")
    .then((value) => console.log("method-branch-block-fallthrough-post-await-switch-true:", value));
runner.method(false, "b")
    .then((value) => console.log("method-branch-block-fallthrough-post-await-switch-fall-b:", value));
runner.method(false, "z")
    .then((value) => console.log("method-branch-block-fallthrough-post-await-switch-fall-default:", value));
branchBlockFallthroughPostAwaitSwitchValue(true, "a", "arrow-")
    .then((value) => console.log("value-branch-block-fallthrough-post-await-switch-true:", value));
branchBlockFallthroughPostAwaitSwitchValue(false, "a", "arrow-")
    .then((value) => console.log("value-branch-block-fallthrough-post-await-switch-fall-a:", value));
branchBlockFallthroughPostAwaitSwitchValue(false, "z", "arrow-")
    .then((value) => console.log("value-branch-block-fallthrough-post-await-switch-fall-default:", value));
