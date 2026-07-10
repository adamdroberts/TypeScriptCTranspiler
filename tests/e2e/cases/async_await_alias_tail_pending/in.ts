import { setTimeout as delay } from "node:timers/promises";

async function aliasAwait(): Promise<string> {
    const value = await delay(5, "alias");
    return value;
}

aliasAwait().then((value: string): void => console.log("result:", value));
