const indexOf = require("./pos_" + "alpha".indexOf("l"));
const lastIndexOf = require("./last_" + "banana".lastIndexOf("a", 4));
const includes = require("./includes_" + "module".includes("du"));
const startsWith = require("./starts_" + "prefix".startsWith("pre"));
const endsWith = require("./ends_" + "suffix".endsWith("fix"));

console.log(indexOf.label, lastIndexOf.label, includes.label, startsWith.label, endsWith.label);
