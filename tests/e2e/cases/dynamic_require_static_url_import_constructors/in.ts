import { URL as NodeURL, URLSearchParams as NodeURLSearchParams } from "node:url";
import { URLSearchParams as UrlURLSearchParams } from "url";

const fromUrlPath = require("./urlimp_" + new NodeURL("next?q=2", "https://example.com/base/page.html").pathname.slice(1).replace("/", "_"));
const fromUrlCanParse = require("./urlimp_can_" + NodeURL.canParse("child", "https://example.com/root/"));
const fromUrlSearchParams = require("./urlimp_sp_" + new NodeURL("https://example.com/path?label=node").searchParams.get("label"));

const fromNodeParams = require("./urlimp_params_" + new NodeURLSearchParams("a=one&b=two").get("b"));
const fromNodeEntries = require("./urlimp_entry_" + Array.from(new NodeURLSearchParams("a=one&b=two"))[0][0]);
const fromUrlParams = require("./urlimp_params_" + new UrlURLSearchParams("q=there").toString().replace("q=", ""));
const fromUrlSize = require("./urlimp_size_" + new UrlURLSearchParams("x=1&y=2").size);

console.log(
    fromUrlPath.label,
    fromUrlCanParse.label,
    fromUrlSearchParams.label,
    fromNodeParams.label,
    fromNodeEntries.label,
    fromUrlParams.label,
    fromUrlSize.label,
);
