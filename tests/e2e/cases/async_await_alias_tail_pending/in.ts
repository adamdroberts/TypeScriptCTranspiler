import { setTimeout as delay } from "node:timers/promises";

async function aliasAwait(): Promise<string> {
    const value = await delay(5, "alias");
    return value;
}

aliasAwait().then((value: string): void => console.log("result:", value));

class Holder {
    async method(): Promise<string> {
        const value = await delay(10, "method");
        return value;
    }
}

const valueAlias = async (): Promise<string> => {
    const value = await delay(15, "value");
    return value;
};

new Holder().method().then((value: string): void => console.log("method:", value));
valueAlias().then((value: string): void => console.log("value:", value));
