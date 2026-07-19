import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        await delay(1, "first");
        await delay(2, "second");
    } else {
        await delay(3, "only");
    }
    const final = await delay(4, prefix + "-tail");
    return final;
}

class Worker {
    async run(flag: boolean, prefix: string): Promise<string> {
        if (flag) {
            await delay(5, "first");
            await delay(6, "second");
        } else {
            await delay(7, "only");
        }
        const final = await delay(8, prefix + "-method-tail");
        return final;
    }
}

const value = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        await delay(9, "first");
        await delay(10, "second");
    } else {
        await delay(11, "only");
    }
    const final = await delay(12, prefix + "-value-tail");
    return final;
};

declaration(true, "fn").then((result) => console.log("declaration-long:", result));
declaration(false, "fn").then((result) => console.log("declaration-short:", result));
new Worker().run(true, "this").then((result) => console.log("method-long:", result));
new Worker().run(false, "this").then((result) => console.log("method-short:", result));
value(true, "arrow").then((result) => console.log("value-long:", result));
value(false, "arrow").then((result) => console.log("value-short:", result));
