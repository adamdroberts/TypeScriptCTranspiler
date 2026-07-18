const fromPi = require("./" + Math.PI.toString().slice(0, 1).replace("3", "pi"));
const fromSafe = require("./safe" + Number.MAX_SAFE_INTEGER.toString().slice(-1));

console.log(fromPi.label, fromSafe.label);
