import { setTimeout as delay, scheduler } from "node:timers/promises";
import { setImmediate as immediate } from "node:timers";
import * as timers from "node:timers/promises";

function tail(value: object): Promise<object> {
    return delay(1, value);
}
async function run(): Promise<void> {
    const marker = { value: 7 };
    console.log(await tail(marker) === marker);
    console.log(await ((timers.setTimeout))(1, marker) === marker);
    await new Promise<void>((resolve) => {
        immediate((value: object, number: bigint) => {
            console.log(value === marker && number === 7n);
            resolve();
        }, marker, 7n);
    });
    await scheduler.wait(1);
    await scheduler.yield();
    console.log("scheduler complete");
}
run();
