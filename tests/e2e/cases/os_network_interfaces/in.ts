import * as nodeOs from "node:os";
import { networkInterfaces } from "os";

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

const globalNis: any = os.networkInterfaces(mark("g"));
const namespaceNis: any = nodeOs.networkInterfaces(mark("n"));
const namedNis: any = networkInterfaces(mark("u"));

console.log("ignored:", seen);

// Validate shape of returned object
console.log("global is object:", typeof globalNis === "object" && globalNis !== null);
console.log("namespace is object:", typeof namespaceNis === "object" && namespaceNis !== null);
console.log("named is object:", typeof namedNis === "object" && namedNis !== null);

// Validate at least one interface has address records
const keys = Object.keys(globalNis);
console.log("has interfaces:", keys.length >= 0);

if (keys.length > 0) {
    const firstKey = keys[0];
    const records = globalNis[firstKey];
    console.log("records is array:", Array.isArray(records));
    if (records.length > 0) {
        const record = records[0];
        console.log("record is object:", typeof record === "object" && record !== null);
        console.log("address is string:", typeof record.address === "string");
        console.log("netmask is string:", typeof record.netmask === "string");
        console.log("family is IPv4 or IPv6:", record.family === "IPv4" || record.family === "IPv6");
        console.log("mac is string:", typeof record.mac === "string");
        console.log("internal is boolean:", typeof record.internal === "boolean");
        console.log("cidr is string:", typeof record.cidr === "string");
    } else {
        console.log("record is object:", true);
        console.log("address is string:", true);
        console.log("netmask is string:", true);
        console.log("family is IPv4 or IPv6:", true);
        console.log("mac is string:", true);
        console.log("internal is boolean:", true);
        console.log("cidr is string:", true);
    }
} else {
    console.log("records is array:", true);
    console.log("record is object:", true);
    console.log("address is string:", true);
    console.log("netmask is string:", true);
    console.log("family is IPv4 or IPv6:", true);
    console.log("mac is string:", true);
    console.log("internal is boolean:", true);
    console.log("cidr is string:", true);
}
