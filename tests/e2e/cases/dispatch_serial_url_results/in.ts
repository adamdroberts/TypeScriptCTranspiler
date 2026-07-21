import { URL, URLSearchParams } from "node:url";

const queue = new DispatchQueue("serial-url-results");

const url = dispatch.sync(queue, () => new URL("https://example.com/serial"));
console.log("url", url.hostname, url.pathname);

dispatch.async(queue, () => new URLSearchParams("serial=yes")).then((params) => {
    console.log("params", params.get("serial"));
});
