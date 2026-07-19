import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        await delay(1, "first");
        await delay(2, "second");
    } else {
        await delay(3, "only");
    }
    return prefix + (flag ? "-long" : "-short");
}

class Worker {
    async run(flag: boolean, prefix: string): Promise<string> {
        if (flag) {
            await delay(4, "first");
            await delay(5, "second");
        } else {
            await delay(6, "only");
        }
        return prefix + (flag ? "-method-long" : "-method-short");
    }
}

const value = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        await delay(7, "first");
        await delay(8, "second");
    } else {
        await delay(9, "only");
    }
    return prefix + (flag ? "-value-long" : "-value-short");
};

declaration(true, "fn").then((result) => console.log("declaration-long:", result));
declaration(false, "fn").then((result) => console.log("declaration-short:", result));
new Worker().run(true, "this").then((result) => console.log("method-long:", result));
new Worker().run(false, "this").then((result) => console.log("method-short:", result));
value(true, "arrow").then((result) => console.log("value-long:", result));
value(false, "arrow").then((result) => console.log("value-short:", result));
