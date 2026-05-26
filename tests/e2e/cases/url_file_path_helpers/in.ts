import url, { fileURLToPath, fileURLToPath as fileURLToPathAlias, pathToFileURL, pathToFileURL as pathToFileURLAlias } from "node:url";

let ignored = "";
function mark(label: string): string {
    ignored += label;
    return label;
}

const encoded = "file:///tmp/tsc2c-url%20path%23x%3Fy.txt";
const objectPath = url.fileURLToPath(new URL(encoded), mark("a"), mark("b"));
const stringPath = fileURLToPath(encoded, mark("c"));
const aliasPath = fileURLToPathAlias(encoded, mark("g"));
const directUrl = pathToFileURL("/tmp/tsc2c-url path#x?y.txt", mark("d"));
const aliasUrl = pathToFileURLAlias("/tmp/tsc2c-url-alias.txt", mark("h"));
const defaultUrl = url.pathToFileURL("/tmp/tsc2c-url-simple.txt", mark("e"), mark("f"));

console.log("paths:", objectPath, stringPath, aliasPath);
console.log("direct:", directUrl.href, directUrl.pathname);
console.log("alias:", aliasUrl.href, aliasUrl.pathname);
console.log("default:", defaultUrl.href, defaultUrl.pathname);
console.log("ignored:", ignored);
