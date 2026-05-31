import { promises as fsPromises } from "fs";
import { statfs } from "fs/promises";
import * as nodeFsPromises from "node:fs/promises";

const events: string[] = [];

function mark(label: string): any {
    events.push(label);
    return undefined;
}

fs.promises.statfs("/tmp").then((stats: FSStatFs): any => {
    console.log(
        "namespace:",
        typeof stats.bsize === "number" && stats.bsize > 0 && typeof stats.ffree === "number" ? "ok" : "bad",
    );
    return stats;
});

fsPromises.statfs("/tmp", { bigint: false }, mark("ignored-extra")).then((stats: FSStatFs): any => {
    console.log("named:", typeof stats.blocks === "number" && stats.blocks >= 0 ? "ok" : "bad");
    return stats;
});

nodeFsPromises.statfs("/tmp", void mark("void-option")).then((stats: FSStatFs): any => {
    console.log("subpath:", typeof stats.bavail === "number" && stats.bavail >= 0 ? "ok" : "bad");
    return stats;
});

statfs("/nonexistent/path/that/does/not/exist").catch((reason: string): any => {
    console.log("missing:", reason);
    console.log("events:", events.join("|"));
    return "recovered";
});
