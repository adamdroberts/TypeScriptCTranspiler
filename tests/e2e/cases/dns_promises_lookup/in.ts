import * as nodeDns from "node:dns";
import { promises } from "dns";

dns.promises.lookup("127.0.0.1").then((result: any): void => {
    console.log("global promise:", result.address, result.family);
});

nodeDns.promises.lookup("127.0.0.1", { family: 4 }).then((result: any): void => {
    console.log("namespace promise:", result.address, result.family);
});

promises.lookup("127.0.0.1", { family: 4 }).then((result: any): void => {
    console.log("named promise:", result.address, result.family);
});
