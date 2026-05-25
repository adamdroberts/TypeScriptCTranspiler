import { nextTick } from "node:process";
import { nextTick as bareNextTick } from "process";
import * as proc from "node:process";

const order: string[] = [];

function record(this: any, label: string, count: number): void {
    order.push(label + count + ":" + typeof this);
    console.log("tick:", order.join(","));
}

nextTick(record, "node", 1);
bareNextTick((label: string) => {
    order.push(label);
    console.log("bare:", order.join(","));
}, "bare");

proc.nextTick((label: string) => {
    order.push(label);
    console.log("namespace:", order.join(","));
}, "namespace");

order.push("sync");
console.log("sync:", order.join(","));
