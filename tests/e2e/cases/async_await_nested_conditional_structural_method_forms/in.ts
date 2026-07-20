import { setTimeout as delay } from "node:timers/promises";

class Worker {
    static async run(flag: boolean): Promise<any> {
        return await (flag
            ? [await delay(1, "static-first"), await delay(1, "static-second")]
            : { first: await delay(1, "static-left"), second: await delay(1, "static-right") });
    }
}

const handlers = {
    async run(flag: boolean): Promise<any> {
        return await (flag
            ? { first: await delay(1, "object-first"), second: await delay(1, "object-second") }
            : [await delay(1, "object-left"), await delay(1, "object-right")]);
    },
};

Worker.run(true).then((result) => console.log("static-true:", JSON.stringify(result)));
Worker.run(false).then((result) => console.log("static-false:", JSON.stringify(result)));
handlers.run(true).then((result) => console.log("object-true:", JSON.stringify(result)));
handlers.run(false).then((result) => console.log("object-false:", JSON.stringify(result)));
