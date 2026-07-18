const fromGet = require("./uspget_" + new URLSearchParams("a=1&b=two").get("a"));
const fromMissingGet = require("./uspget_" + new URLSearchParams("a=1").get("missing"));
const fromHasName = require("./usphas_" + new URLSearchParams("a=1&b=two").has("b"));
const fromMissingHas = require("./usphas_" + new URLSearchParams("a=1").has("b"));
const fromHasValue = require("./usphas_value_" + new URLSearchParams("a=1&a=2").has("a", "2"));

console.log(
    fromGet.label,
    fromMissingGet.label,
    fromHasName.label,
    fromMissingHas.label,
    fromHasValue.label,
);
