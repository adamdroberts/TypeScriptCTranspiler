import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

async function declaration(prefix: string): Promise<string> {
    try {
        throw (await delay(1, prefix + "throw")) + "-suffix";
    } finally {
        console.log("finally: declaration");
    }
}

class Worker {
    prefix(value: string): string { return value + "method"; }

    async run(): Promise<string> {
        try {
            throw (await delay(2, this.prefix("-throw"))) + "-suffix";
        } finally {
            console.log("finally: method");
        }
    }
}

const value = async (prefix: string): Promise<string> => {
    try {
        throw (await delay(3, prefix + "throw")) + "-suffix";
    } finally {
        console.log("finally: arrow");
    }
};

async function rejected(): Promise<string> {
    try {
        throw (await delayedRejectAfter(4, "rejected")) + "-suffix";
    } finally {
        console.log("finally: rejected");
    }
}

declaration("fn-").catch((reason) => console.log("declaration:", reason));
new Worker().run().catch((reason) => console.log("method:", reason));
value("arrow-").catch((reason) => console.log("value:", reason));
rejected().catch((reason) => console.log("rejected:", reason));
