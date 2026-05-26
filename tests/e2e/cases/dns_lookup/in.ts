import * as dns from "node:dns";
import { lookup } from "dns";

dns.lookup("127.0.0.1", (err: any, address: string, family: number): void => {
    console.log("namespace:", err === null, address, family);
});

lookup("127.0.0.1", (err: any, address: string, family: number): void => {
    console.log("named:", err === null, address, family);
});

let ignoredOrder = "";
dns.lookup("127.0.0.1", (err: any, address: string, family: number): void => {
    console.log("namespace ignored:", err === null, address, family, ignoredOrder);
}, (ignoredOrder += "A", 1));

lookup("127.0.0.1", { family: 4 }, (err: any, address: string, family: number): void => {
    console.log("named ignored:", err === null, address, family, ignoredOrder);
}, (ignoredOrder += "B", 2));
