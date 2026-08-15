import dnsDefault, { resolveAny as resolveAnyNamed } from "dns";
import * as nodeDns from "node:dns";
import { promises as dnsPromises } from "node:dns";
import dnsPromisesDefault, { resolveAny as resolveAnyPromiseNamed } from "node:dns/promises";

let marks = "";

function isAddressRecord(record: any): boolean {
    return (record.type === "A" || record.type === "AAAA") &&
        record.address.length > 0 &&
        (record.family === 4 || record.family === 6);
}

function hasAddressRecord(records: any[]): boolean {
    return records.length > 0 && isAddressRecord(records[0]);
}

function mark(value: string): string {
    marks += value;
    return value;
}

nodeDns.resolveAny("localhost", (err: any, records: any[]): void => {
    console.log("callback any:", err === null && hasAddressRecord(records));
});

dnsDefault.resolveAny("localhost", (err: any, records: any[]): void => {
    console.log("callback default any:", err === null && hasAddressRecord(records));
});

resolveAnyNamed("localhost", (err: any, records: any[]): void => {
    console.log("callback trailing:", err === null && hasAddressRecord(records));
}, mark("c"));

nodeDns.resolveAny("not-a-host.invalid", (err: any, records: any[]): void => {
    console.log("invalid callback:", err !== null, records.length === 0);
});

dnsPromises.resolveAny("localhost").then((records: any[]): void => {
    console.log("promise any:", hasAddressRecord(records));
});

dnsPromisesDefault.resolveAny("localhost").then((records: any[]): void => {
    console.log("promise default any:", hasAddressRecord(records));
});

resolveAnyPromiseNamed("not-a-host.invalid").then((_: any[]): void => {
    console.log("invalid promise: false");
}).catch((err: any): void => {
    console.log("invalid promise:", err !== null);
});

console.log("marks:", marks);
