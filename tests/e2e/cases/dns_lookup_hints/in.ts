import * as nodeDns from "node:dns";
import { ADDRCONFIG as DNS_ADDRCONFIG, ALL, V4MAPPED as DNS_V4MAPPED, lookup, promises } from "dns";

const CALLBACK_HINTS = DNS_V4MAPPED;
const PROMISE_HINTS = nodeDns.V4MAPPED | dns.ALL;
const CALLBACK_OPTIONS = { family: 6, hints: DNS_V4MAPPED } as const;
const PROMISE_OPTIONS = { family: 6, hints: nodeDns.V4MAPPED | dns.ALL } as const;
const CALLBACK_CONST_OPTIONS = { family: 6, hints: CALLBACK_HINTS } as const;
const PROMISE_CONST_OPTIONS = { family: 6, hints: PROMISE_HINTS } as const;
const ORDER = "verbatim";
const VERBATIM = true;
const CALLBACK_ORDER_OPTIONS = { family: 4, order: ORDER } as const;
const PROMISE_VERBATIM_OPTIONS = { family: 4, verbatim: VERBATIM } as const;

console.log("constants:", dns.ADDRCONFIG, nodeDns.V4MAPPED, DNS_ADDRCONFIG, ALL);

lookup("127.0.0.1", CALLBACK_OPTIONS, (err: any, address: string, family: number): void => {
    console.log("callback hints:", err === null, address.indexOf("127.0.0.1") >= 0, family);
});

promises.lookup("127.0.0.1", PROMISE_OPTIONS).then((result: any): void => {
    console.log("promise hints:", result.address.indexOf("127.0.0.1") >= 0, result.family);
});

lookup("127.0.0.1", CALLBACK_CONST_OPTIONS, (err: any, address: string, family: number): void => {
    console.log("callback const hints:", err === null, address.indexOf("127.0.0.1") >= 0, family);
});

promises.lookup("127.0.0.1", PROMISE_CONST_OPTIONS).then((result: any): void => {
    console.log("promise const hints:", result.address.indexOf("127.0.0.1") >= 0, result.family);
});

lookup("127.0.0.1", CALLBACK_ORDER_OPTIONS, (err: any, address: string, family: number): void => {
    console.log("callback order alias:", err === null, address.indexOf("127.0.0.1") >= 0, family);
});

promises.lookup("127.0.0.1", PROMISE_VERBATIM_OPTIONS).then((result: any): void => {
    console.log("promise verbatim alias:", result.address.indexOf("127.0.0.1") >= 0, result.family);
});
