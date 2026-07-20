import { setTimeout as delay } from "node:timers/promises";

async function declaration(choice: boolean, prefix: string): Promise<unknown> {
    if (choice) return await delay(1, prefix + "branch");
    return choice
        ? await delay(2, prefix + "one") && await delay(3, "-two") && await delay(4, "-three")
        : await delay(5, "") || await delay(6, prefix + "or-two") || await delay(7, "-or-three");
}

class Worker {
    async run(choice: boolean, prefix: string): Promise<unknown> {
        if (choice) return await delay(8, prefix + "branch");
        return choice
            ? await delay(9, prefix + "one") && await delay(10, "-two") && await delay(11, "-three")
            : await delay(12, "") || await delay(13, prefix + "or-two") || await delay(14, "-or-three");
    }
}

const value = async (choice: boolean, prefix: string): Promise<unknown> => {
    if (choice) return await delay(15, prefix + "branch");
    return choice
        ? await Promise.resolve(null) ?? await delay(16, prefix + "two") ?? await delay(17, "-three")
        : await delay(18, "") || await delay(19, prefix + "or-two") || await delay(20, "-or-three");
};

declaration(false, "fn-").then((result) => console.log("declaration:", result));
new Worker().run(false, "method-").then((result) => console.log("method:", result));
value(false, "arrow-").then((result) => console.log("value:", result));
