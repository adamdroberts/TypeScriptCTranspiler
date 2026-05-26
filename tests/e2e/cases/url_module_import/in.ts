import url, { URL as NodeURL, URL as URLAlias } from "node:url";

const direct = new NodeURL("child?q=1", "https://example.com/root/page.html");
const viaDefault = new url.URL("/other#frag", direct.href);
const viaAlias = new URLAlias("?alias=1", direct.href);

console.log("direct:", direct.href, direct.pathname, direct.search);
console.log("default:", viaDefault.href, viaDefault.pathname, viaDefault.hash);
console.log("alias:", viaAlias.href, viaAlias.search, URLAlias.canParse("#hash", direct.href));
console.log("can:", NodeURL.canParse("next", direct.href), url.URL.canParse("/root", direct.href), url.URL.canParse("relative"));
