import * as nodeDns from "node:dns";
import { promises } from "dns";

nodeDns.lookup("127.0.0.1", { all: true, family: 4 }, (err: any, addresses: any[]): void => {
    console.log("callback all:", err === null, addresses.length, addresses[0].address, addresses[0].family);
});

promises.lookup("127.0.0.1", { all: true, family: 4 }).then((addresses: any): void => {
    console.log("promise all:", addresses.length, addresses[0].address, addresses[0].family);
});
