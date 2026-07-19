import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean, prefix: string): Promise<string> {
    let result = prefix + "-initial";
    if (flag) {
        const first = await delay(1, prefix + "-long");
        result = first;
        await delay(2, "long-sequencing");
    } else {
        const first = await delay(3, prefix + "-short");
        result = first;
    }
    return result;
}

class Worker {
    async run(flag: boolean, prefix: string): Promise<string> {
        let result = prefix + "-initial";
        if (flag) {
            const first = await delay(4, prefix + "-method-long");
            result = first;
            await delay(5, "method-sequencing");
        } else {
            const first = await delay(6, prefix + "-method-short");
            result = first;
        }
        return result;
    }
}

const value = async (flag: boolean, prefix: string): Promise<string> => {
    let result = prefix + "-initial";
    if (flag) {
        const first = await delay(7, prefix + "-value-long");
        result = first;
        await delay(8, "value-sequencing");
    } else {
        const first = await delay(9, prefix + "-value-short");
        result = first;
    }
    return result;
};

declaration(true, "fn").then((result) => console.log("declaration-long:", result));
declaration(false, "fn").then((result) => console.log("declaration-short:", result));
new Worker().run(true, "this").then((result) => console.log("method-long:", result));
new Worker().run(false, "this").then((result) => console.log("method-short:", result));
value(true, "arrow").then((result) => console.log("value-long:", result));
value(false, "arrow").then((result) => console.log("value-short:", result));
