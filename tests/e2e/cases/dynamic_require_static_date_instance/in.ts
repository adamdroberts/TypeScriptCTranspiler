const fromTime = require("./di_" + new Date(Date.UTC(1970, 0, 2, 3, 4, 5, 6)).getTime().toString().replace("97445006", "time"));
const fromValue = require("./di_" + new Date(1234).valueOf().toString().replace("1234", "value"));
const fromIso = require("./di_" + new Date("2020-02-03T04:05:06.007Z").toISOString().replace("2020-02-03T04:05:06.007Z", "iso"));
const fromJson = require("./di_" + new Date("2020-02-03").toJSON().replace("2020-02-03T00:00:00.000Z", "json"));
const aliased = new Date(Date.parse("2020-02-03T04:05:06.007Z"));
const fromAlias = require("./di_" + aliased.toISOString().replace("2020-02-03T04:05:06.007Z", "alias"));
const fromUtc = require("./di_" + new Date("2020-02-03T04:05:06.007Z").toUTCString().replace("Mon, 03 Feb 2020 04:05:06 GMT", "utc"));
const fromGmt = require("./di_" + aliased.toGMTString().replace("Mon, 03 Feb 2020 04:05:06 GMT", "gmt"));

console.log(fromTime.label, fromValue.label, fromIso.label, fromJson.label, fromAlias.label, fromUtc.label, fromGmt.label);
