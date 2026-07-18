const fromBinary = require("./n" + Number.parseInt("101", 2));
const fromHex = require("./hex" + parseInt("ff", 16));
const fromFloat = require("./f" + Number.parseFloat("7.5px").toString().replace(".", "_"));

console.log(fromBinary.label, fromHex.label, fromFloat.label);
