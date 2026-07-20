import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

async function declaration(prefix: string): Promise<string> {
    try {
        throw (await delay(1, prefix + "throw")) + "-suffix";
    } catch (reason) {
        return reason + "-caught";
    } finally {
        console.log("finally: declaration");
    }
}

class Worker {
    prefix(value: string): string { return value + "method"; }

    async run(): Promise<string> {
        try {
            throw (await delay(2, this.prefix("-throw"))) + "-suffix";
        } catch (reason) {
            return reason + "-caught";
        } finally {
            console.log("finally: method");
        }
    }
}

const value = async (prefix: string): Promise<string> => {
    try {
        throw (await delay(3, prefix + "throw")) + "-suffix";
    } catch (reason) {
        return reason + "-caught";
    } finally {
        console.log("finally: arrow");
    }
};

async function rejected(): Promise<string> {
    try {
        throw (await delayedRejectAfter(4, "rejected")) + "-suffix";
    } catch (reason) {
        return reason + "-caught";
    } finally {
        console.log("finally: rejected");
    }
}

declaration("fn-").then((result) => console.log("declaration:", result));
new Worker().run().then((result) => console.log("method:", result));
value("arrow-").then((result) => console.log("value:", result));
rejected().then((result) => console.log("rejected:", result));
