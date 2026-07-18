const swap16 = require("./bswap_" + Buffer.from("00112233", "hex").swap16().toString("hex"));
const swap32 = require("./bswap_" + Buffer.from("0011223344556677", "hex").swap32().toString("hex"));
const swap64 = require("./bswap_" + Buffer.from("0011223344556677", "hex").swap64().toString("hex"));

console.log(swap16.label, swap32.label, swap64.label);
