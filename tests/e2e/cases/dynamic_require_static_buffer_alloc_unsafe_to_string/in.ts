const unsafeHex = require("./bunsafe_" + Buffer.allocUnsafe(3).toString("hex"));
const unsafeSlowHex = require("./bunsafe_" + Buffer.allocUnsafeSlow(2).toString("hex"));
const concatUnsafe = require("./bunsafe_" + Buffer.concat([Buffer.allocUnsafe(1), Buffer.from("41", "hex")]).toString("hex"));

console.log(unsafeHex.label, unsafeSlowHex.label, concatUnsafe.label);
