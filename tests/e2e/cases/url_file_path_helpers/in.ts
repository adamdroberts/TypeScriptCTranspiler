import url, { fileURLToPath, pathToFileURL } from "node:url";

const encoded = "file:///tmp/tsc2c-url%20path%23x%3Fy.txt";
const objectPath = url.fileURLToPath(new URL(encoded));
const stringPath = fileURLToPath(encoded);
const directUrl = pathToFileURL("/tmp/tsc2c-url path#x?y.txt");
const defaultUrl = url.pathToFileURL("/tmp/tsc2c-url-simple.txt");

console.log("paths:", objectPath, stringPath);
console.log("direct:", directUrl.href, directUrl.pathname);
console.log("default:", defaultUrl.href, defaultUrl.pathname);
