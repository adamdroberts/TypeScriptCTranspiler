import { setTimeout as delay } from "node:timers/promises";

async function declaration(): Promise<string> {
    try {
        throw (await delay(1, "one") + await delay(1, "two") + await delay(1, "three") + await delay(1, "four") + await delay(1, "five"));
    } catch (reason) {
        return "caught:" + reason;
    }
}

class Worker {
    async run(): Promise<string> {
        try {
            throw (await delay(1, "method-one") + await delay(1, "method-two") + await delay(1, "method-three") + await delay(1, "method-four") + await delay(1, "method-five"));
        } catch (reason) {
            return "caught:" + reason;
        }
    }
}

const value = async (): Promise<string> => {
    try {
        throw (await delay(1, "arrow-one") + await delay(1, "arrow-two") + await delay(1, "arrow-three") + await delay(1, "arrow-four") + await delay(1, "arrow-five"));
    } catch (reason) {
        return "caught:" + reason;
    }
};

declaration().then((result) => console.log("declaration:", result));
new Worker().run().then((result) => console.log("method:", result));
value().then((result) => console.log("value:", result));
