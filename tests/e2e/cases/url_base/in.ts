const base = "https://example.com/dir/page.html?old=1#top";

const rel = new URL("next?q=1#frag", base);
console.log("rel:", rel.href, rel.pathname, rel.search, rel.hash, rel.origin);

const root = new URL("/root", base);
console.log("root:", root.href, root.pathname, root.origin);

const query = new URL("?fresh=1", base);
console.log("query:", query.href, query.pathname, query.search);

const hash = new URL("#part", base);
console.log("hash:", hash.href, hash.pathname, hash.search, hash.hash);

const schemeRelative = new URL("//cdn.test/lib.js", base);
console.log("scheme:", schemeRelative.href, schemeRelative.protocol, schemeRelative.host, schemeRelative.pathname);

console.log("can:", URL.canParse("next", base), URL.canParse("/root", base), URL.canParse("next"), URL.canParse(new URL("child", base).href));
