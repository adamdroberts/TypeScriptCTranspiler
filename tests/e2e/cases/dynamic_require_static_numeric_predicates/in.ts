const fromInteger = require("./" + Number.isInteger(2).toString().replace("true", "integer"));
const fromSafe = require("./" + Number.isSafeInteger(9007199254740992).toString().replace("false", "unsafe"));
const fromFinite = require("./" + Number.isFinite(1.5).toString().replace("true", "finite"));

console.log(fromInteger.label, fromSafe.label, fromFinite.label);
