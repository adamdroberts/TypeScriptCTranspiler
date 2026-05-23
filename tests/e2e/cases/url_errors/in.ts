import * as fs from "fs";

function invalidAbsolute(): string {
    try {
        return new URL("relative/path").href;
    } catch (err) {
        return String(err);
    }
}

function invalidBase(): string {
    try {
        return new URL("child", "relative/base").href;
    } catch (err) {
        return String(err);
    }
}

function nonFilePath(): string {
    try {
        return String(fs.existsSync(new URL("https://example.com/path")));
    } catch (err) {
        return String(err);
    }
}

function remoteFilePath(): string {
    try {
        return String(fs.existsSync(new URL("file://remote-host/tmp/file.txt")));
    } catch (err) {
        return String(err);
    }
}

const valid = new URL("https://example.com/root");
console.log("absolute:", invalidAbsolute());
console.log("base:", invalidBase());
console.log("non-file:", nonFilePath());
console.log("remote-file:", remoteFilePath());
console.log("valid:", valid.href, URL.canParse("child", valid.href), URL.canParse("child"));
