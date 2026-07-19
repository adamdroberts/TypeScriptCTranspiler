import { setTimeout as delay } from "node:timers/promises";

async function declaration(kind: number): Promise<string> {
    let result = "seed";
    if (kind === 0) {
        const zero = await delay(1, "zero-one");
        result = zero + "-after";
        await delay(1, "zero-two");
    } else {
        const other = await delay(1, "other-one");
        result = other + "-after";
        await delay(1, "other-two");
    }
    return result;
}

class Worker {
    async run(kind: number): Promise<string> {
        let result = "method-seed";
        if (kind === 0) {
            const zero = await delay(1, "method-zero-one");
            result = zero + "-after";
            await delay(1, "method-zero-two");
        } else {
            const other = await delay(1, "method-other-one");
            result = other + "-after";
            await delay(1, "method-other-two");
        }
        return result;
    }
}

const value = async (kind: number): Promise<string> => {
    let result = "value-seed";
    if (kind === 0) {
        const zero = await delay(1, "value-zero-one");
        result = zero + "-after";
        await delay(1, "value-zero-two");
    } else {
        const other = await delay(1, "value-other-one");
        result = other + "-after";
        await delay(1, "value-other-two");
    }
    return result;
};

async function branch(outer: boolean, kind: number, result: string): Promise<string> {
    if (outer) {
        if (kind === 0) {
            const zero = await delay(1, "branch-zero-one");
            result = zero + "-after";
            await delay(1, "branch-zero-two");
        } else {
            const other = await delay(1, "branch-other-one");
            result = other + "-after";
            await delay(1, "branch-other-two");
        }
        return result;
    }
    return "fallthrough";
}

declaration(0).then((result) => console.log("declaration:", result));
new Worker().run(1).then((result) => console.log("method:", result));
value(0).then((result) => console.log("value:", result));
branch(true, 1, "branch-seed").then((result) => console.log("branch:", result));
branch(false, 0, "branch-seed").then((result) => console.log("fallthrough:", result));
