import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

async function declaration(): Promise<string> {
    try {
        throw (await delay(1, "one") + await delay(1, "two") + await delay(1, "three") + await delay(1, "four") + await delay(1, "five"));
    } catch (reason) {
        return "caught:" + reason;
    } finally {
        console.log("finally: declaration");
    }
}

class Worker {
    async run(): Promise<string> {
        try {
            throw (await delay(1, "method-one") + await delay(1, "method-two") + await delay(1, "method-three") + await delay(1, "method-four") + await delay(1, "method-five"));
        } catch (reason) {
            return "caught:" + reason;
        } finally {
            console.log("finally: method");
        }
    }
}

const value = async (): Promise<string> => {
    try {
        throw (await delay(1, "arrow-one") + await delay(1, "arrow-two") + await delay(1, "arrow-three") + await delay(1, "arrow-four") + await delay(1, "arrow-five"));
    } catch (reason) {
        return "caught:" + reason;
    } finally {
        console.log("finally: arrow");
    }
};

async function rejected(): Promise<string> {
    try {
        throw (await delayedRejectAfter(1, "source-rejection") + await delay(1, "unused-two") + await delay(1, "unused-three") + await delay(1, "unused-four") + await delay(1, "unused-five"));
    } catch (reason) {
        return "caught:" + reason;
    } finally {
        console.log("finally: rejected");
    }
}

declaration().then((result) => console.log("declaration:", result));
new Worker().run().then((result) => console.log("method:", result));
value().then((result) => console.log("value:", result));
rejected().then((result) => console.log("rejected:", result));
