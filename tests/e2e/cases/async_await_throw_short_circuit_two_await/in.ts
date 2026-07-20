import { setTimeout as delay } from "node:timers/promises";

async function declaration(choice: boolean, prefix: string): Promise<string> {
    throw choice
        ? await delay(1, "ready") && await delay(2, prefix + "and")
        : await delay(3, "") || await delay(4, prefix + "or");
}

class Worker {
    prefix(value: string): string { return value + "method"; }

    async run(choice: boolean): Promise<string> {
        throw choice
            ? await delay(5, "ready") && await delay(6, this.prefix("and-"))
            : await delay(7, "") || await delay(8, this.prefix("or-"));
    }
}

const value = async (choice: boolean, prefix: string): Promise<string> => {
    throw choice
        ? await delay(9, "ready") && await delay(10, prefix + "and")
        : await delay(11, "") || await delay(12, prefix + "or");
};

declaration(true, "fn-").catch((reason) => console.log("declaration-and:", reason));
declaration(false, "fn-").catch((reason) => console.log("declaration-or:", reason));
new Worker().run(true).catch((reason) => console.log("method-and:", reason));
new Worker().run(false).catch((reason) => console.log("method-or:", reason));
value(true, "arrow-").catch((reason) => console.log("value-and:", reason));
value(false, "arrow-").catch((reason) => console.log("value-or:", reason));
