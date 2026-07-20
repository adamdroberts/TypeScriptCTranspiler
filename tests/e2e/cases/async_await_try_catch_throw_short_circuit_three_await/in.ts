import { setTimeout as delay } from "node:timers/promises";

const rejectedSource: Promise<string> = Promise.reject("source-failure");

async function declaration(): Promise<string> {
    try {
        throw await delay(1, "one") && await delay(1, "two") && await delay(1, "three");
    } catch (reason) {
        return "caught:" + reason;
    }
}

class Worker {
    async run(): Promise<string> {
        try {
            throw await delay(1, "method-one") && await delay(1, "method-two") && await delay(1, "method-three");
        } catch (reason) {
            return "caught:" + reason;
        }
    }
}

const value = async (): Promise<string> => {
    try {
        throw await delay(1, "arrow-one") && await delay(1, "arrow-two") && await delay(1, "arrow-three");
    } catch (reason) {
        return "caught:" + reason;
    }
};

async function sourceRejection(): Promise<string> {
    try {
        throw await rejectedSource && await delay(1, "unused-two") && await delay(1, "unused-three");
    } catch (reason) {
        return "caught:" + reason;
    }
}

declaration().then((result) => console.log("declaration:", result));
new Worker().run().then((result) => console.log("method:", result));
value().then((result) => console.log("value:", result));
sourceRejection().then((result) => console.log("source:", result));
