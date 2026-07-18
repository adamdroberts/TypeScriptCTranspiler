const direct = new URL("https://example.com:8443/dir/page?q=1#frag");

const fromHref = require("./url_" + direct.href.replace("https://example.com:8443/dir/page?q=1#frag", "href"));
const fromProtocol = require("./url_" + direct.protocol.slice(0, -1));
const fromHost = require("./url_" + direct.host.replace(":", "_"));
const fromHostname = require("./url_" + direct.hostname.replace(".com", ""));
const fromPort = require("./url_" + direct.port);
const fromPathname = require("./url_" + direct.pathname.slice(1).replace("/", "_"));
const fromSearch = require("./url_" + direct.search.slice(1).replace("=", "_"));
const fromHash = require("./url_" + direct.hash.slice(1));
const fromOrigin = require("./url_" + direct.origin.replace("https://example.com:8443", "origin"));

const relative = new URL("next?q=2#part", "https://example.com/base/page.html");
const fromBasePath = require("./url_" + relative.pathname.slice(1).replace("/", "_"));
const fromBaseSearch = require("./url_" + relative.search.slice(1).replace("=", "_"));
const fromBaseHash = require("./url_" + relative.hash.slice(1));
const fromToString = require("./url_" + direct.toString().replace("https://example.com:8443/dir/page?q=1#frag", "href"));
const fromToJson = require("./url_" + direct.toJSON().replace("https://example.com:8443/dir/page?q=1#frag", "href"));
const fromToLocaleString = require("./url_" + direct.toLocaleString().replace("https://example.com:8443/dir/page?q=1#frag", "href"));

console.log(
    fromHref.label,
    fromProtocol.label,
    fromHost.label,
    fromHostname.label,
    fromPort.label,
    fromPathname.label,
    fromSearch.label,
    fromHash.label,
    fromOrigin.label,
    fromBasePath.label,
    fromBaseSearch.label,
    fromBaseHash.label,
    fromToString.label,
    fromToJson.label,
    fromToLocaleString.label,
);
