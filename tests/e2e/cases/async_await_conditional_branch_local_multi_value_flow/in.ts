import { setTimeout as delay } from "node:timers/promises";

async function declaration(kind: number): Promise<string> {
    if (kind === 0) {
        const zero = await delay(1, "zero-one");
        const zeroAgain = await delay(1, zero + "-two");
        await delay(1, zeroAgain + "-three");
    } else {
        const other = await delay(1, "other-one");
        const otherAgain = await delay(1, other + "-two");
        await delay(1, otherAgain + "-three");
    }
    return "declaration-done";
}

class Worker {
    async run(kind: number): Promise<string> {
        if (kind === 0) {
            const zero = await delay(1, "method-zero-one");
            const zeroAgain = await delay(1, zero + "-two");
            await delay(1, zeroAgain + "-three");
        } else {
            const other = await delay(1, "method-other-one");
            const otherAgain = await delay(1, other + "-two");
            await delay(1, otherAgain + "-three");
        }
        return "method-done";
    }
}

const value = async (kind: number): Promise<string> => {
    if (kind === 0) {
        const zero = await delay(1, "value-zero-one");
        const zeroAgain = await delay(1, zero + "-two");
        await delay(1, zeroAgain + "-three");
    } else {
        const other = await delay(1, "value-other-one");
        const otherAgain = await delay(1, other + "-two");
        await delay(1, otherAgain + "-three");
    }
    return "value-done";
};

async function branch(outer: boolean, kind: number): Promise<string> {
    if (outer) {
        if (kind === 0) {
            const zero = await delay(1, "branch-zero-one");
            const zeroAgain = await delay(1, zero + "-two");
            await delay(1, zeroAgain + "-three");
        } else {
            const other = await delay(1, "branch-other-one");
            const otherAgain = await delay(1, other + "-two");
            await delay(1, otherAgain + "-three");
        }
        return "branch-done";
    }
    return "fallthrough";
}

declaration(0).then((result) => console.log("declaration:", result));
new Worker().run(1).then((result) => console.log("method:", result));
value(0).then((result) => console.log("value:", result));
branch(true, 1).then((result) => console.log("branch:", result));
branch(false, 0).then((result) => console.log("fallthrough:", result));
