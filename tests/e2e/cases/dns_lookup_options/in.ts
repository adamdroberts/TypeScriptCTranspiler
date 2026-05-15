import * as nodeDns from "node:dns";
import { lookup } from "dns";

dns.lookup("127.0.0.1", { family: 4 }, (err: any, address: string, family: number): void => {
    console.log("global family:", err === null, address, family);
});

nodeDns.lookup("127.0.0.1", { family: 4 }, (err: any, address: string, family: number): void => {
    console.log("namespace family:", err === null, address, family);
});

lookup("127.0.0.1", { family: 4 }, (err: any, address: string, family: number): void => {
    console.log("named family:", err === null, address, family);
});
