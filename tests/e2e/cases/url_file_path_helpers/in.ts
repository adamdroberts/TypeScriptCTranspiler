import url, { fileURLToPath, pathToFileURL } from "node:url";

let ignored = "";
function mark(label: string): string {
    ignored += label;
    return label;
}

const encoded = "file:///tmp/tsc2c-url%20path%23x%3Fy.txt";
const objectPath = url.fileURLToPath(new URL(encoded), mark("a"), mark("b"));
const stringPath = fileURLToPath(encoded, mark("c"));
const directUrl = pathToFileURL("/tmp/tsc2c-url path#x?y.txt", mark("d"));
const defaultUrl = url.pathToFileURL("/tmp/tsc2c-url-simple.txt", mark("e"), mark("f"));

console.log("paths:", objectPath, stringPath);
console.log("direct:", directUrl.href, directUrl.pathname);
console.log("default:", defaultUrl.href, defaultUrl.pathname);
console.log("ignored:", ignored);
