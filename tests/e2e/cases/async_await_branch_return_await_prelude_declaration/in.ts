import { setTimeout as delay } from "node:timers/promises";

async function declaration(kind: number): Promise<string> {
    if (kind === 0) {
        const prefix = "zero";
        return await delay(1, prefix + "-done");
    }
    const prefix = "other";
    return await delay(1, prefix + "-done");
}

class Worker {
    async run(kind: number): Promise<string> {
        if (kind === 0) {
            const prefix = "method-zero";
            return await delay(1, prefix + "-done");
        }
        const prefix = "method-other";
        return await delay(1, prefix + "-done");
    }
}

const value = async (kind: number): Promise<string> => {
    if (kind === 0) {
        const prefix = "value-zero";
        return await delay(1, prefix + "-done");
    }
    const prefix = "value-other";
    return await delay(1, prefix + "-done");
};

async function branch(outer: boolean, kind: number): Promise<string> {
    if (outer) {
        if (kind === 0) {
            const prefix = "branch-zero";
            return await delay(1, prefix + "-done");
        }
        const prefix = "branch-other";
        return await delay(1, prefix + "-done");
    }
    return "fallthrough";
}

declaration(0).then((result) => console.log("declaration:", result));
new Worker().run(1).then((result) => console.log("method:", result));
value(0).then((result) => console.log("value:", result));
branch(true, 1).then((result) => console.log("branch:", result));
branch(false, 0).then((result) => console.log("fallthrough:", result));
