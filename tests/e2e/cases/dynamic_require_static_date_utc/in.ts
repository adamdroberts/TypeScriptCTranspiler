const fromEpoch = require("./d" + Date.UTC(1970, 0));
const fromFull = require("./" + Date.UTC(1970, 0, 2, 3, 4, 5, 6).toString().replace("97445006", "full"));

console.log(fromEpoch.label, fromFull.label);
