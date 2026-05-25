import dnsPromises from "dns/promises";
import { lookup } from "node:dns/promises";
import * as nodeDnsPromises from "node:dns/promises";

lookup("127.0.0.1").then((result: any): void => {
    console.log("named:", result.address, result.family);
});

nodeDnsPromises.lookup("127.0.0.1", { family: 4 }).then((result: any): void => {
    console.log("namespace:", result.address, result.family);
});

dnsPromises.lookup("127.0.0.1", { family: 4 }).then((result: any): void => {
    console.log("default:", result.address, result.family);
});
