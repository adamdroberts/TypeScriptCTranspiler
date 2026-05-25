let marks = "";

function mark(label: string): string {
    marks += label;
    return label;
}

const url = new URL("child?q=1", "https://example.com/base/", mark("a"), mark("b"));
console.log("url:", url.href, url.pathname, url.search);
console.log("marks:", marks);
