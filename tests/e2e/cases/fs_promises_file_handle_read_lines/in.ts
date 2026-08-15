import { promises as fsp, rmSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-promises-file-handle-read-lines.txt";
writeFileSync(path, "alpha\r\nbeta\n\ngamma\rdelta\n");

async function collect(handle: FSFileHandle): Promise<string> {
    for await (const line of handle.readLines()) {
        return line;
    }
    return "empty";
}

function direct(handle: FSFileHandle): Promise<string> {
    const iterator: any = handle.readLines({ encoding: "utf-8" });
    return iterator.next().then((first: any): Promise<string> => {
        return iterator.next().then((second: any): Promise<string> => {
            return iterator.next().then((third: any): Promise<string> => {
                return iterator.next().then((fourth: any): Promise<string> => {
                    return iterator.next().then((fifth: any): Promise<string> => {
                        return iterator.next().then((finished: any): Promise<string> => {
                            return iterator.return("stopped").then((returned: any): Promise<string> => {
                                return iterator.next().then((after: any): string => {
                                    const same = iterator[Symbol.asyncIterator]() === iterator;
                                    return `${first.value}|${second.value}|${third.value}|${fourth.value}|${fifth.value}:${finished.done}:${returned.value}:${returned.done}:${after.done}:${same}`;
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}

let forAwaitSummary = "pending";
let directSummary = "pending";
let error = "pending";

fsp.open(path, "r")
    .then((handle: FSFileHandle): Promise<string> => {
        return collect(handle).then((value: string): Promise<string> => {
            forAwaitSummary = value;
            return handle.close().then((): string => value);
        });
    })
    .then((_value: string): Promise<FSFileHandle> => fsp.open(path, "r"))
    .then((handle: FSFileHandle): Promise<string> => {
        return direct(handle).then((value: string): Promise<string> => {
            directSummary = value;
            return handle.close().then((): string => value);
        });
    })
    .catch((reason: string): void => {
        error = reason;
    })
    .then((_value: any): void => {
        console.log("for-await:", forAwaitSummary);
        console.log("direct:", directSummary);
        console.log("error:", error);
        rmSync(path, { force: true });
    });
