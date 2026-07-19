const fromCapture = require("./sr_" + "Ada 1843".replace(/(\w+) (\d+)/, "$2_$1"));
const fromMatchToken = require("./sr_" + "Ada 1843".replace(/\d+/, "[$&]").replace("Ada [1843]", "match"));
const fromPrefixSuffix = require("./sr_" + "Ada 1843".replace(/\d+/, "$`|$'").replace("Ada Ada |", "prefix_suffix"));
const fromReplaceAll = require("./sr_all_" + "a1 b22".replaceAll(/\d+/g, "N").replace(" ", "_"));

console.log(fromCapture.label, fromMatchToken.label, fromPrefixSuffix.label, fromReplaceAll.label);
