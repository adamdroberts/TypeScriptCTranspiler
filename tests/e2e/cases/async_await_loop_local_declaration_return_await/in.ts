import { setTimeout as delay } from "node:timers/promises";

async function declaration(): Promise<string> {
    let total = 0;
    while (total < 2) {
        const step = 1;
        total = total + step;
    }
    return await delay(1, "declaration-" + total);
}

class Worker {
    async run(): Promise<string> {
        let total = 0;
        for (const value of [1, 2]) {
            total = total + value;
        }
        return await delay(2, "method-" + total);
    }
}

const value = async (): Promise<string> => {
    let total = 0;
    do {
        let step;
        step = 1;
        total = total + step;
    } while (total < 2);
    return await delay(3, "value-" + total);
};

declaration().then((result) => console.log("declaration:", result));
new Worker().run().then((result) => console.log("method:", result));
value().then((result) => console.log("value:", result));
