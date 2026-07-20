import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean, prefix: string): Promise<string> {
    const label = prefix + "-";
    throw flag
        ? await delay(1, label + "true")
        : await delay(2, label + "false");
}

class Worker {
    prefix(value: string): string { return value + "method"; }
    async run(flag: boolean): Promise<string> {
        const label = this.prefix("-");
        throw flag
            ? await delay(3, label + "true")
            : await delay(4, label + "false");
    }
}

const value = async (flag: boolean, prefix: string): Promise<string> => {
    const label = prefix + "-";
    throw flag
        ? await delay(5, label + "true")
        : await delay(6, label + "false");
};

declaration(true, "fn").catch((reason) => console.log("declaration-true:", reason));
declaration(false, "fn").catch((reason) => console.log("declaration-false:", reason));
new Worker().run(true).catch((reason) => console.log("method-true:", reason));
new Worker().run(false).catch((reason) => console.log("method-false:", reason));
value(true, "arrow").catch((reason) => console.log("value-true:", reason));
value(false, "arrow").catch((reason) => console.log("value-false:", reason));
