import * as dns from "node:dns";
import { lookup } from "dns";

dns.lookup("127.0.0.1", (err: any, address: string, family: number): void => {
    console.log("namespace:", err === null, address, family);
});

lookup("127.0.0.1", (err: any, address: string, family: number): void => {
    console.log("named:", err === null, address, family);
});
