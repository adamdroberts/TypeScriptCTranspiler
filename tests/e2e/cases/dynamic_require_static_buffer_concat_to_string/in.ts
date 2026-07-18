const exact = require("./bcat_" + Buffer.concat([Buffer.from("ab"), Buffer.from("cd")], 4).toString());
const short = require("./bcat_" + Buffer.concat([Buffer.from("ab"), Buffer.from("cd")], 3).toString());
const longHex = require("./bcat_" + Buffer.concat([Buffer.from("ab"), Buffer.from("cd")], 6).toString("hex"));
const decoded = require("./bcat_" + Buffer.concat([Buffer.from("SGk=", "base64"), Buffer.from("21", "hex")]).toString());

console.log(exact.label, short.label, longHex.label, decoded.label);
