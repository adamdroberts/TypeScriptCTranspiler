const fromTime = require("./di_" + new Date(Date.UTC(1970, 0, 2, 3, 4, 5, 6)).getTime().toString().replace("97445006", "time"));
const fromValue = require("./di_" + new Date(1234).valueOf().toString().replace("1234", "value"));
const fromIso = require("./di_" + new Date("2020-02-03T04:05:06.007Z").toISOString().replace("2020-02-03T04:05:06.007Z", "iso"));
const fromJson = require("./di_" + new Date("2020-02-03").toJSON().replace("2020-02-03T00:00:00.000Z", "json"));
const aliased = new Date(Date.parse("2020-02-03T04:05:06.007Z"));
const fromAlias = require("./di_" + aliased.toISOString().replace("2020-02-03T04:05:06.007Z", "alias"));

console.log(fromTime.label, fromValue.label, fromIso.label, fromJson.label, fromAlias.label);
