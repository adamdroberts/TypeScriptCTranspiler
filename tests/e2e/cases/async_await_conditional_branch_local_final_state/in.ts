import { setTimeout as delay } from "node:timers/promises";

async function declaration(kind: number): Promise<string> {
    let result = "seed";
    if (kind === 0) {
        const zero = await delay(1, "zero-one");
        const zeroAgain = await delay(1, zero + "-two");
        result = zeroAgain + "-final";
    } else {
        const other = await delay(1, "other-one");
        const otherAgain = await delay(1, other + "-two");
        result = otherAgain + "-final";
    }
    return result;
}

class Worker {
    async run(kind: number): Promise<string> {
        let result = "method-seed";
        if (kind === 0) {
            const zero = await delay(1, "method-zero-one");
            const zeroAgain = await delay(1, zero + "-two");
            result = zeroAgain + "-final";
        } else {
            const other = await delay(1, "method-other-one");
            const otherAgain = await delay(1, other + "-two");
            result = otherAgain + "-final";
        }
        return result;
    }
}

const value = async (kind: number): Promise<string> => {
    let result = "value-seed";
    if (kind === 0) {
        const zero = await delay(1, "value-zero-one");
        const zeroAgain = await delay(1, zero + "-two");
        result = zeroAgain + "-final";
    } else {
        const other = await delay(1, "value-other-one");
        const otherAgain = await delay(1, other + "-two");
        result = otherAgain + "-final";
    }
    return result;
};

async function branch(outer: boolean, kind: number): Promise<string> {
    let result = "branch-seed";
    if (outer) {
        if (kind === 0) {
            const zero = await delay(1, "branch-zero-one");
            const zeroAgain = await delay(1, zero + "-two");
            result = zeroAgain + "-final";
        } else {
            const other = await delay(1, "branch-other-one");
            const otherAgain = await delay(1, other + "-two");
            result = otherAgain + "-final";
        }
        return result;
    }
    return "fallthrough";
}

declaration(0).then((result) => console.log("declaration:", result));
new Worker().run(1).then((result) => console.log("method:", result));
value(0).then((result) => console.log("value:", result));
branch(true, 1).then((result) => console.log("branch:", result));
branch(false, 0).then((result) => console.log("fallthrough:", result));
