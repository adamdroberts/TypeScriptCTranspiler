function mark(label: string): string {
    console.log("ignored:", label);
    return label;
}

console.log("absolute:", URL.canParse("https://example.com/a"), URL.canParse("http://site.test"));
console.log("unsupported:", URL.canParse("/relative/path"), URL.canParse("mailto:user@example.com"));
console.log("construct:", URL.canParse(new URL("https://example.com").href));
console.log("base ignored:", URL.canParse("child", "https://example.com/root/", mark("base")));
console.log("undefined base:", URL.canParse("https://example.com/skip", undefined, mark("undefined-base")));
