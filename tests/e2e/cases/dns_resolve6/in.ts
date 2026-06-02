import * as dns from "node:dns";
import { resolve6 } from "dns";
import { promises as dnsPromises } from "node:dns";
import { resolve6 as resolve6Promises } from "node:dns/promises";

const TTL_FALSE_OPTIONS = { ttl: false } as const;
const ttl = false as const;

// Test callback form with node:dns
dns.resolve6("::1", (err: any, addresses: string[]): void => {
    console.log("callback ::1:", err === null, addresses.length > 0 ? addresses[0] : "empty");
});

dns.resolve6("::1", TTL_FALSE_OPTIONS, (err: any, addresses: string[]): void => {
    console.log("callback ttl false:", err === null, addresses.length > 0 ? addresses[0] : "empty");
});

// Test callback form with direct import from dns
resolve6("::1", (err: any, addresses: string[]): void => {
    console.log("callback direct ::1:", err === null, addresses.length > 0 ? addresses[0] : "empty");
});

resolve6("::1", { ttl }, (err: any, addresses: string[]): void => {
    console.log("callback ttl shorthand:", err === null, addresses.length > 0 ? addresses[0] : "empty");
});

// Test promise form with node:dns
dnsPromises.resolve6("::1").then((addresses: string[]): void => {
    console.log("promise ::1:", addresses.length > 0 ? addresses[0] : "empty");
}).catch((err: any): void => {
    console.log("promise ::1 error:", err);
});

// Test promise form with direct import from node:dns/promises
resolve6Promises("::1").then((addresses: string[]): void => {
    console.log("promise direct ::1:", addresses.length > 0 ? addresses[0] : "empty");
}).catch((err: any): void => {
    console.log("promise direct ::1 error:", err);
});

dnsPromises.resolve6("::1", { ttl: undefined }).then((addresses: string[]): void => {
    console.log("promise ttl undefined:", addresses.length > 0 ? addresses[0] : "empty");
});

resolve6Promises("::1", TTL_FALSE_OPTIONS).then((addresses: string[]): void => {
    console.log("promise ttl false:", addresses.length > 0 ? addresses[0] : "empty");
});
