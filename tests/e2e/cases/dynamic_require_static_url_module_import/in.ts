import urlDefault from "node:url";
import * as urlNamespace from "url";

const fromDefault = require("./umi_" + new urlDefault.URL("next?q=2", "https://example.com/").pathname.slice(1));
const fromCanParse = require("./umi_can_" + urlNamespace.URL.canParse("child", "https://example.com/root/"));
const fromParams = require("./umi_params_" + new urlDefault.URLSearchParams("a=one&b=two").get("b"));
const fromEntries = require("./umi_entry_" + Array.from(new urlNamespace.URLSearchParams("a=one&b=two"))[0][0]);
const fromString = require("./umi_string_" + new urlNamespace.URLSearchParams("q=there").toString().replace("q=", ""));
const fromSize = require("./umi_size_" + new urlDefault.URLSearchParams("x=1&y=2").size);

console.log(
    fromDefault.label,
    fromCanParse.label,
    fromParams.label,
    fromEntries.label,
    fromString.label,
    fromSize.label,
);
