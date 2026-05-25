import dns from "node:dns";

dns.lookup("127.0.0.1", (err: any, address: string, family: number): void => {
    console.log("default callback:", err === null, address, family);
});

dns.promises.lookup("127.0.0.1", { family: 4 }).then((result: any): void => {
    console.log("default promise:", result.address, result.family);
});

console.log("default hints:", dns.ADDRCONFIG >= 0, dns.V4MAPPED >= 0, dns.ALL >= 0);
