import { setTimeout as delay } from "node:timers/promises";

async function declaration(kind: number): Promise<string> {
    if (kind === 0) {
        const zero = await delay(1, "zero-one");
        await delay(1, zero + "-two");
    } else {
        const other = await delay(1, "other-one");
        await delay(1, other + "-two");
    }
    return "declaration-done";
}

class Worker {
    async run(kind: number): Promise<string> {
        if (kind === 0) {
            const zero = await delay(1, "method-zero-one");
            await delay(1, zero + "-two");
        } else {
            const other = await delay(1, "method-other-one");
            await delay(1, other + "-two");
        }
        return "method-done";
    }
}

const value = async (kind: number): Promise<string> => {
    if (kind === 0) {
        const zero = await delay(1, "value-zero-one");
        await delay(1, zero + "-two");
    } else {
        const other = await delay(1, "value-other-one");
        await delay(1, other + "-two");
    }
    return "value-done";
};

async function branch(outer: boolean, kind: number): Promise<string> {
    if (outer) {
        if (kind === 0) {
            const zero = await delay(1, "branch-zero-one");
            await delay(1, zero + "-two");
        } else {
            const other = await delay(1, "branch-other-one");
            await delay(1, other + "-two");
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
