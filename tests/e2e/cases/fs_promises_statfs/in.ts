import { promises as fsPromises } from "fs";
import { statfs } from "fs/promises";
import * as nodeFsPromises from "node:fs/promises";

const events: string[] = [];
let namespaceResult = "pending";
let namedResult = "pending";
let subpathResult = "pending";
let missingResult = "pending";

function mark(label: string): any {
    events.push(label);
    return undefined;
}

fs.promises.statfs("/tmp").then((stats: FSStatFs): any => {
    namespaceResult = typeof stats.bsize === "number" && stats.bsize > 0
        && typeof stats.frsize === "number" && stats.frsize > 0
        && typeof stats.blocks === "number" && stats.blocks >= 0
        && typeof stats.bfree === "number" && stats.bfree >= 0
        && typeof stats.bavail === "number" && stats.bavail >= 0
        && typeof stats.files === "number" && stats.files >= 0
        && typeof stats.ffree === "number" && stats.ffree >= 0
        ? "ok"
        : "bad";
    return stats;
});

fsPromises.statfs("/tmp", { bigint: false }, mark("ignored-extra")).then((stats: FSStatFs): any => {
    namedResult = typeof stats.blocks === "number" && stats.blocks >= 0 ? "ok" : "bad";
    return stats;
});

nodeFsPromises.statfs("/tmp", void mark("void-option")).then((stats: FSStatFs): any => {
    subpathResult = typeof stats.bavail === "number" && stats.bavail >= 0 ? "ok" : "bad";
    return stats;
});

statfs("/nonexistent/path/that/does/not/exist").catch((reason: string): any => {
    missingResult = reason;
    return "recovered";
});

setImmediate((): void => {
    console.log("namespace:", namespaceResult);
    console.log("named:", namedResult);
    console.log("subpath:", subpathResult);
    console.log("missing:", missingResult);
    console.log("events:", events.join("|"));
});
