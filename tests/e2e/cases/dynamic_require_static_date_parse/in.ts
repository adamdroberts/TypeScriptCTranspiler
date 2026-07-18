const fromIso = require("./dp_" + Date.parse("2020-02-03T04:05:06.007Z").toString().replace("1580702706007", "iso"));
const fromDateOnly = require("./dp_" + Date.parse("2020-02-03").toString().replace("1580688000000", "date"));
const fromOffset = require("./dp_" + Date.parse("2020-02-03T06:05:06.007+02:00").toString().replace("1580702706007", "offset"));

console.log(fromIso.label, fromDateOnly.label, fromOffset.label);
