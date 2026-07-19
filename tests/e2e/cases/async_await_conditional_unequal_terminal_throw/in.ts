import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean): Promise<string> {
    if (flag) {
        await delay(1, "first");
        await delay(2, "second");
    } else {
        await delay(3, "only");
    }
    throw flag ? "declaration-long" : "declaration-short";
}

class Worker {
    async run(flag: boolean): Promise<string> {
        if (flag) {
            await delay(4, "first");
            await delay(5, "second");
        } else {
            await delay(6, "only");
        }
        throw flag ? "method-long" : "method-short";
    }
}

const value = async (flag: boolean): Promise<string> => {
    if (flag) {
        await delay(7, "first");
        await delay(8, "second");
    } else {
        await delay(9, "only");
    }
    throw flag ? "value-long" : "value-short";
};

declaration(true).catch((reason) => console.log("declaration-long:", reason));
declaration(false).catch((reason) => console.log("declaration-short:", reason));
new Worker().run(true).catch((reason) => console.log("method-long:", reason));
new Worker().run(false).catch((reason) => console.log("method-short:", reason));
value(true).catch((reason) => console.log("value-long:", reason));
value(false).catch((reason) => console.log("value-short:", reason));
