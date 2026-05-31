import * as dns from "node:dns";
import { lookupService } from "dns";
import { promises as dnsPromises } from "node:dns";
import { lookupService as lookupServicePromises } from "node:dns/promises";

// 1. Namespace callback form with node:dns
dns.lookupService("127.0.0.1", 80, (err: any, hostname: string, service: string): void => {
    console.log("dns.lookupService:", err === null, typeof hostname === "string" && hostname.length > 0, typeof service === "string" && service.length > 0);
});

// 2. Named callback form with dns
lookupService("127.0.0.1", 80, (err: any, hostname: string, service: string): void => {
    console.log("lookupService:", err === null, typeof hostname === "string" && hostname.length > 0, typeof service === "string" && service.length > 0);
});

// 3. Namespace promises form with node:dns
dnsPromises.lookupService("127.0.0.1", 80).then((result: { hostname: string; service: string }): void => {
    console.log("dnsPromises.lookupService:", typeof result.hostname === "string" && result.hostname.length > 0, typeof result.service === "string" && result.service.length > 0);
}).catch((err: any): void => {
    console.log("dnsPromises.lookupService error:", err);
});

// 4. Named promises form with node:dns/promises
lookupServicePromises("127.0.0.1", 80).then((result: { hostname: string; service: string }): void => {
    console.log("lookupServicePromises:", typeof result.hostname === "string" && result.hostname.length > 0, typeof result.service === "string" && result.service.length > 0);
}).catch((err: any): void => {
    console.log("lookupServicePromises error:", err);
});

// 5. Invalid IP error case (callback)
dns.lookupService("invalid_ip_address", 80, (err: any, hostname: string, service: string): void => {
    console.log("invalid IP callback err:", err !== null);
});

// 6. Invalid IP error case (promise)
dnsPromises.lookupService("invalid_ip_address", 80).then((_: any): void => {
    console.log("invalid IP promise succeeded unexpectedly");
}).catch((err: any): void => {
    console.log("invalid IP promise err:", err !== null);
});

// 7. Invalid port error case (callback)
dns.lookupService("127.0.0.1", -1, (err: any, hostname: string, service: string): void => {
    console.log("invalid port callback err:", err !== null);
});

// 8. Invalid port error case (promise)
dnsPromises.lookupService("127.0.0.1", 99999).then((_: any): void => {
    console.log("invalid port promise succeeded unexpectedly");
}).catch((err: any): void => {
    console.log("invalid port promise err:", err !== null);
});
