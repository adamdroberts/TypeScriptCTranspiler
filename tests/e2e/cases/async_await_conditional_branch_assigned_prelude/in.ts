import { setTimeout as delay } from "node:timers/promises";

async function declaration(kind: number): Promise<string> {
    if (kind === 0) {
        let prefix: string;
        prefix = "zero";
        const zero = await delay(1, prefix + "-one");
        await delay(1, zero + "-two");
    } else {
        const prefix = "other";
        const other = await delay(1, prefix + "-one");
        await delay(1, other + "-two");
    }
    return "declaration-done";
}

class Worker {
    async run(kind: number): Promise<string> {
        if (kind === 0) {
            let prefix: string;
            prefix = "method-zero";
            const zero = await delay(1, prefix + "-one");
            await delay(1, zero + "-two");
        } else {
            const prefix = "method-other";
            const other = await delay(1, prefix + "-one");
            await delay(1, other + "-two");
        }
        return "method-done";
    }
}

const value = async (kind: number): Promise<string> => {
    if (kind === 0) {
        let prefix: string;
        prefix = "value-zero";
        const zero = await delay(1, prefix + "-one");
        await delay(1, zero + "-two");
    } else {
        const prefix = "value-other";
        const other = await delay(1, prefix + "-one");
        await delay(1, other + "-two");
    }
    return "value-done";
};

async function branch(outer: boolean, kind: number): Promise<string> {
    if (outer) {
        if (kind === 0) {
            let prefix: string;
            prefix = "branch-zero";
            const zero = await delay(1, prefix + "-one");
            await delay(1, zero + "-two");
        } else {
            const prefix = "branch-other";
            const other = await delay(1, prefix + "-one");
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
