import { setTimeout as delay } from "node:timers/promises";

async function declaration(prefix: string): Promise<string> {
    try {
        console.log("try-prelude: declaration");
        const label = prefix + "-try";
        throw (await delay(1, label)) + "-suffix";
    } catch (reason) {
        return reason + "-caught";
    }
}

class Worker {
    prefix(value: string): string { return value + "method"; }
    async run(): Promise<string> {
        try {
            console.log("try-prelude: method");
            const label = this.prefix("-try");
            throw (await delay(2, label)) + "-suffix";
        } catch (reason) {
            return reason + "-caught";
        }
    }
}

const value = async (prefix: string): Promise<string> => {
    try {
        console.log("try-prelude: arrow");
        const label = prefix + "-try";
        throw (await delay(3, label)) + "-suffix";
    } catch (reason) {
        return reason + "-caught";
    }
};

declaration("fn").then((result) => console.log("declaration:", result));
new Worker().run().then((result) => console.log("method:", result));
value("arrow").then((result) => console.log("value:", result));
