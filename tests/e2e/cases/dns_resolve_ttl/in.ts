import * as dns from "node:dns";
import { resolve4 } from "dns";
import { promises as dnsPromises } from "node:dns";
import { resolve6 as resolve6Promises } from "node:dns/promises";

const TTL_TRUE_OPTIONS = { ttl: true } as const;

dns.resolve4("127.0.0.1", TTL_TRUE_OPTIONS, (err: any, records: any[]): void => {
    const record = records[0];
    console.log("callback4:", err === null, record.address, typeof record.ttl, record.ttl === 0);
});

resolve4("127.0.0.1", { ttl: true }, (err: any, records: any[]): void => {
    const record = records[0];
    console.log("callback4 direct:", err === null, record.address, typeof record.ttl, record.ttl === 0);
});

dns.resolve6("::1", TTL_TRUE_OPTIONS, (err: any, records: any[]): void => {
    const record = records[0];
    console.log("callback6:", err === null, record.address, typeof record.ttl, record.ttl === 0);
});

dnsPromises.resolve4("127.0.0.1", TTL_TRUE_OPTIONS).then((records: any[]): void => {
    const record = records[0];
    console.log("promise4:", record.address, typeof record.ttl, record.ttl === 0);
});

resolve6Promises("::1", { ttl: true }).then((records: any[]): void => {
    const record = records[0];
    console.log("promise6:", record.address, typeof record.ttl, record.ttl === 0);
});
