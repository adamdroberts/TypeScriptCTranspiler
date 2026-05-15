console.log("absolute:", URL.canParse("https://example.com/a"), URL.canParse("http://site.test"));
console.log("unsupported:", URL.canParse("/relative/path"), URL.canParse("mailto:user@example.com"));
console.log("construct:", URL.canParse(new URL("https://example.com").href));
