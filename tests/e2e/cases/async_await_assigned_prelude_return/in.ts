import { setTimeout as delay } from "node:timers/promises";

async function assignedPrelude(prefix: string): Promise<string> {
    let label: string;
    label = prefix + "assigned-";
    const value = await delay(1, "value");
    return label + value + "!";
}

assignedPrelude("fn-").then((value) => console.log("assigned-prelude:", value));
