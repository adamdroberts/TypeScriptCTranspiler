import dnsDefault, { resolve as resolveNamed, resolveCname as resolveCnameNamed } from "dns";
import * as nodeDns from "node:dns";
import { promises as dnsPromises } from "node:dns";
import dnsPromisesDefault, { resolve as resolvePromiseNamed, resolveCname as resolveCnamePromiseNamed } from "node:dns/promises";

const CNAME = "CNAME" as const;
let marks = "";

function hasName(values: string[]): boolean {
    return values.length > 0 && values[0].length > 0;
}

function mark(value: string): string {
    marks += value;
    return value;
}

nodeDns.resolveCname("localhost", (err: any, names: string[]): void => {
    console.log("callback cname:", err === null, hasName(names));
});

resolveNamed("localhost", CNAME, (err: any, names: string[]): void => {
    console.log("callback resolve CNAME:", err === null, hasName(names));
});

dnsDefault.resolveCname("localhost", (err: any, names: string[]): void => {
    console.log("callback default cname:", err === null, hasName(names));
});

resolveCnameNamed("localhost", (err: any, names: string[]): void => {
    console.log("callback trailing:", err === null, hasName(names));
}, mark("c"));

nodeDns.resolveCname("not-a-host.invalid", (err: any, names: string[]): void => {
    console.log("invalid callback:", err !== null, names.length === 0);
});

dnsPromises.resolveCname("localhost").then((names: string[]): void => {
    console.log("promise cname:", hasName(names));
});

resolvePromiseNamed("localhost", CNAME, mark("p")).then((names: string[]): void => {
    console.log("promise resolve CNAME:", hasName(names));
});

dnsPromisesDefault.resolveCname("localhost").then((names: string[]): void => {
    console.log("promise default cname:", hasName(names));
});

resolveCnamePromiseNamed("not-a-host.invalid").then((_: string[]): void => {
    console.log("invalid promise: false");
}).catch((err: any): void => {
    console.log("invalid promise:", err !== null);
});

console.log("marks:", marks);
