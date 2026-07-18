const fromQuery = require("./usp_" + new URLSearchParams("a=1&b=two").toString());
const fromEncoded = require("./usp_" + new URLSearchParams("q=hello world").toString());
const fromEmpty = require("./usp_" + new URLSearchParams().toString());
const fromSize = require("./usp_size_" + new URLSearchParams("a=1&b=two&a=3").size);
const fromEmptySize = require("./usp_size_" + new URLSearchParams().size);

console.log(fromQuery.label, fromEncoded.label, fromEmpty.label, fromSize.label, fromEmptySize.label);
