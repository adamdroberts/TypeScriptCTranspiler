const fromQuery = require("./usp_" + new URLSearchParams("a=1&b=two").toString());
const fromEncoded = require("./usp_" + new URLSearchParams("q=hello world").toString());
const fromEmpty = require("./usp_" + new URLSearchParams().toString());

console.log(fromQuery.label, fromEncoded.label, fromEmpty.label);
