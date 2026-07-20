import { setTimeout as delay } from "node:timers/promises";

class Service {
    combine(left: string, right: string): string {
        return left + ":" + right;
    }
}

function service(): Promise<Service> {
    return Promise.resolve(new Service());
}

async function declaration(): Promise<string> {
    return await (await service()).combine(
        await delay(1, "declaration-left"),
        await delay(1, "declaration-right"),
    );
}

class Worker {
    async run(): Promise<string> {
        return await (await service()).combine(
            await delay(1, "method-left"),
            await delay(1, "method-right"),
        );
    }
}

const value = async (): Promise<string> =>
    await (await service()).combine(
        await delay(1, "arrow-left"),
        await delay(1, "arrow-right"),
    );

declaration().then((result) => console.log("declaration:", result));
new Worker().run().then((result) => console.log("method:", result));
value().then((result) => console.log("value:", result));
