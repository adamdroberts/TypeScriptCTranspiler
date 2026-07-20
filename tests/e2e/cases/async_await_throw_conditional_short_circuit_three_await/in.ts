import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean): Promise<string> {
    throw flag
        ? await delay(1, "fn-one") && await delay(2, "fn-two") && await delay(3, "fn-three")
        : await delay(4, "") || await delay(5, "fn-or-two") || await delay(6, "fn-or-three");
}

class Worker {
    async run(flag: boolean): Promise<string> {
        throw flag
            ? await delay(7, "method-one") && await delay(8, "method-two") && await delay(9, "method-three")
            : await delay(10, "") || await delay(11, "method-or-two") || await delay(12, "method-or-three");
    }
}

const value = async (flag: boolean): Promise<string> => {
    throw flag
        ? await Promise.resolve(null) ?? await delay(13, "arrow-two") ?? await delay(14, "arrow-three")
        : await delay(15, "") || await delay(16, "arrow-or-two") || await delay(17, "arrow-or-three");
};

declaration(true).catch((reason) => console.log("declaration-true:", reason));
declaration(false).catch((reason) => console.log("declaration-false:", reason));
new Worker().run(true).catch((reason) => console.log("method-true:", reason));
new Worker().run(false).catch((reason) => console.log("method-false:", reason));
value(true).catch((reason) => console.log("value-true:", reason));
value(false).catch((reason) => console.log("value-false:", reason));
