import dnsDefault, { resolve as resolveNamed, reverse as reverseNamed } from "dns";
import * as nodeDns from "node:dns";
import { promises as dnsPromises } from "node:dns";
import dnsPromisesDefault, { resolve as resolvePromiseNamed, reverse as reversePromiseNamed } from "node:dns/promises";

const PTR = "PTR" as const;
let marks = "";

function hasAddress(addresses: string[]): boolean {
    return addresses.length > 0 && addresses[0].length > 0;
}

function mark(value: string): string {
    marks += value;
    return value;
}

nodeDns.reverse("127.0.0.1", (err: any, addresses: string[]): void => {
    console.log("callback reverse:", err === null, hasAddress(addresses));
});

resolveNamed("127.0.0.1", PTR, (err: any, addresses: string[]): void => {
    console.log("callback resolve PTR:", err === null, hasAddress(addresses));
});

dnsDefault.reverse("127.0.0.1", (err: any, addresses: string[]): void => {
    console.log("callback default reverse:", err === null, hasAddress(addresses));
});

dnsDefault.reverse("::1", (err: any, addresses: string[]): void => {
    console.log("callback IPv6 reverse:", err === null, hasAddress(addresses));
});

reverseNamed("127.0.0.1", (err: any, addresses: string[]): void => {
    console.log("callback trailing:", err === null, hasAddress(addresses));
}, mark("c"));

nodeDns.reverse("not-an-ip", (err: any, addresses: string[]): void => {
    console.log("invalid callback:", err !== null, addresses.length === 0);
});

dnsPromises.reverse("127.0.0.1").then((addresses: string[]): void => {
    console.log("promise reverse:", hasAddress(addresses));
});

resolvePromiseNamed("127.0.0.1", PTR, mark("p")).then((addresses: string[]): void => {
    console.log("promise resolve PTR:", hasAddress(addresses));
});

dnsPromisesDefault.reverse("127.0.0.1").then((addresses: string[]): void => {
    console.log("promise default reverse:", hasAddress(addresses));
});

reversePromiseNamed("not-an-ip").then((_: string[]): void => {
    console.log("invalid promise: false");
}).catch((err: any): void => {
    console.log("invalid promise:", err !== null);
});

console.log("marks:", marks);
