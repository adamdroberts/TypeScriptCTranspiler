import * as nodeDns from "node:dns";
import { promises } from "dns";

const ALL_OPTIONS = { all: true, family: 4 } as const;

nodeDns.lookup("127.0.0.1", ALL_OPTIONS, (err: any, addresses: any[]): void => {
    console.log("callback all:", err === null, addresses.length, addresses[0].address, addresses[0].family);
});

promises.lookup("127.0.0.1", ALL_OPTIONS).then((addresses: any): void => {
    console.log("promise all:", addresses.length, addresses[0].address, addresses[0].family);
});
