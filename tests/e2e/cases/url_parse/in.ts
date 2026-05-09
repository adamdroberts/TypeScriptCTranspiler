const u = new URL("https://example.com:8443/a/b?x=1#frag");

console.log("href:", u.href);
console.log("protocol:", u.protocol);
console.log("host:", u.host);
console.log("hostname:", u.hostname);
console.log("port:", u.port);
console.log("pathname:", u.pathname);
console.log("search:", u.search);
console.log("hash:", u.hash);
console.log("origin:", u.origin);
console.log("typeof:", typeof u);
console.log("string:", u);

const v = new URL("http://site.test");
console.log("pathname:", v.pathname);
console.log("search:", v.search);
console.log("hash:", v.hash);
console.log("origin:", v.origin);
