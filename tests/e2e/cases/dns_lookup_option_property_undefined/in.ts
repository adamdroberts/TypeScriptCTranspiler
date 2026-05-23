import * as nodeDns from "node:dns";
import { promises } from "dns";

dns.lookup("127.0.0.1", {
    family: undefined,
    all: undefined,
    hints: undefined,
    verbatim: undefined,
    order: undefined,
}, (err: any, address: string, family: number): void => {
    console.log("callback defaults:", err === null, address, family);
});

nodeDns.lookup("127.0.0.1", {
    family: 4,
    all: undefined,
    hints: undefined,
    verbatim: undefined,
    order: undefined,
}, (err: any, address: string, family: number): void => {
    console.log("namespace defaults:", err === null, address, family);
});

promises.lookup("127.0.0.1", {
    family: undefined,
    all: true,
    hints: undefined,
    verbatim: undefined,
    order: undefined,
}).then((addresses: any): void => {
    console.log("promise all:", addresses.length, addresses[0].address, addresses[0].family);
});
