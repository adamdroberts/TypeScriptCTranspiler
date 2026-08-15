import dnsDefault, { resolve as resolveNamed } from "dns";
import * as nodeDns from "node:dns";
import { promises as dnsPromises } from "node:dns";
import dnsPromisesDefault, { resolve as resolvePromiseNamed } from "node:dns/promises";

const A = "A" as const;
const AAAA = "AAAA" as const;
let marks = "";

function mark(value: string): string {
    marks += value;
    return value;
}

nodeDns.resolve("127.0.0.1", (err: any, addresses: string[]): void => {
    console.log("callback default:", err === null, addresses[0]);
});

resolveNamed("127.0.0.1", A, (err: any, addresses: string[]): void => {
    console.log("callback named A:", err === null, addresses[0]);
});

dnsDefault.resolve("::1", AAAA, (err: any, addresses: string[]): void => {
    console.log("callback default AAAA:", err === null, addresses[0]);
});

nodeDns.resolve("127.0.0.1", A, (err: any, addresses: string[]): void => {
    console.log("callback trailing:", err === null, addresses[0]);
}, mark("c"));

dnsPromises.resolve("127.0.0.1").then((addresses: string[]): void => {
    console.log("promise default:", addresses[0]);
});

resolvePromiseNamed("::1", AAAA, mark("p")).then((addresses: string[]): void => {
    console.log("promise named AAAA:", addresses[0]);
});

dnsPromisesDefault.resolve("127.0.0.1", A).then((addresses: string[]): void => {
    console.log("promise default A:", addresses[0]);
});

console.log("marks:", marks);
