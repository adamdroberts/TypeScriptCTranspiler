import { scheduler } from "node:timers/promises";

let state = "pending";
scheduler.yield().then((_value: any): void => {
    state = "settled";
});

console.log("before:", state);
state = "queued";
scheduler.yield().then((_value: any): void => {
    console.log("after:", state);
});
