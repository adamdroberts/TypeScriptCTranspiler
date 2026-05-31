import { SocketAddress } from "net";
import * as nodeNet from "node:net";

// 1. Default constructor options
const saDefault = new SocketAddress();
console.log("default:", saDefault.address, saDefault.family, saDefault.port, saDefault.flowlabel);

const saEmpty = new SocketAddress({});
console.log("empty options:", saEmpty.address, saEmpty.family, saEmpty.port, saEmpty.flowlabel);

const saIPv6Default = new SocketAddress({ family: "ipv6" });
console.log("ipv6 default:", saIPv6Default.address, saIPv6Default.family, saIPv6Default.port, saIPv6Default.flowlabel);

// 2. Specific constructor options
const saCustom1 = new SocketAddress({ address: "192.168.1.1", port: 8080, family: "ipv4" });
console.log("custom ipv4:", saCustom1.address, saCustom1.family, saCustom1.port, saCustom1.flowlabel);

const saCustom2 = new SocketAddress({ address: "fe80::1", port: 443, family: "ipv6", flowlabel: 100 });
console.log("custom ipv6:", saCustom2.address, saCustom2.family, saCustom2.port, saCustom2.flowlabel);

// 3. Constructor error throwing
try {
    new SocketAddress({ port: 99999 });
} catch (e: any) {
    console.log("port too high:", e);
}

try {
    new SocketAddress({ port: -5 });
} catch (e: any) {
    console.log("port too low:", e);
}

try {
    new SocketAddress({ flowlabel: 5000000000 });
} catch (e: any) {
    console.log("flowlabel too high:", e);
}

// 4. Static parse method
const parse1 = SocketAddress.parse("127.0.0.1:80");
if (parse1) {
    console.log("parse ipv4 with port:", parse1.address, parse1.family, parse1.port, parse1.flowlabel);
} else {
    console.log("parse1 failed");
}

const parse2 = SocketAddress.parse("127.0.0.1");
if (parse2) {
    console.log("parse ipv4 without port:", parse2.address, parse2.family, parse2.port, parse2.flowlabel);
} else {
    console.log("parse2 failed");
}

const parse3 = SocketAddress.parse("[::1]:8080");
if (parse3) {
    console.log("parse ipv6 with port:", parse3.address, parse3.family, parse3.port, parse3.flowlabel);
} else {
    console.log("parse3 failed");
}

const parse4 = SocketAddress.parse("::1");
if (parse4) {
    console.log("parse ipv6 without port:", parse4.address, parse4.family, parse4.port, parse4.flowlabel);
} else {
    console.log("parse4 failed");
}

const parse5 = SocketAddress.parse("[::1]");
if (parse5) {
    console.log("parse ipv6 with brackets no port:", parse5.address, parse5.family, parse5.port, parse5.flowlabel);
} else {
    console.log("parse5 failed");
}

// Namespace call
const parseNS = nodeNet.SocketAddress.parse("10.0.0.1:22");
if (parseNS) {
    console.log("namespace parse:", parseNS.address, parseNS.family, parseNS.port);
}

// Invalid parse inputs
console.log("parse invalid ip:", SocketAddress.parse("invalid_ip") === undefined);
console.log("parse invalid port:", SocketAddress.parse("127.0.0.1:99999") === undefined);
console.log("parse negative port:", SocketAddress.parse("127.0.0.1:-5") === undefined);
console.log("parse empty string:", SocketAddress.parse("") === undefined);
