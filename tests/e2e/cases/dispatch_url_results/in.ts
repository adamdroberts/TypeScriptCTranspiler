import { URL, URLSearchParams } from "node:url";

const queue = new DispatchQueue("url-results");

const url = dispatch.sync(queue, () => new URL("https://example.com/items?id=42"));
console.log("url", url.hostname, url.pathname, url.search);

dispatch.async(queue, () => new URLSearchParams("a=1&b=two")).then((params) => {
    console.log("params", params.get("a"), params.get("b"), params.toString());
});
