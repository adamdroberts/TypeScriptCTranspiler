import { promises as fsp, rmSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-promises-file-handle-read-lines-high-water-mark.txt";
writeFileSync(path, "alpha\r\nbeta\ngamma\rdelta\n");

function collect(handle: FSFileHandle, options: any): Promise<string> {
    const iterator: any = handle.readLines(options);
    return iterator.next().then((first: any): Promise<string> => {
        return iterator.next().then((second: any): Promise<string> => {
            return iterator.next().then((third: any): Promise<string> => {
                return iterator.next().then((fourth: any): Promise<string> => {
                    return iterator.next().then((finished: any): string => {
                        const values = first.done
                            ? ""
                            : `${first.value}|${second.value}|${third.value}|${fourth.value}`;
                        return `${values}:${finished.done}`;
                    });
                });
            });
        });
    });
}

let one = "pending";
let two = "pending";
let zero = "pending";
let invalid = "pending";
let error = "pending";

fsp.open(path, "r")
    .then((handle: FSFileHandle): Promise<string> => {
        return collect(handle, { autoClose: false, highWaterMark: 1 }).then((value: string): Promise<string> => {
            one = value;
            return handle.close().then((): string => value);
        });
    })
    .then((_value: string): Promise<FSFileHandle> => fsp.open(path, "r"))
    .then((handle: FSFileHandle): Promise<string> => {
        return collect(handle, { autoClose: false, highWaterMark: 2 }).then((value: string): Promise<string> => {
            two = value;
            return handle.close().then((): string => value);
        });
    })
    .then((_value: string): Promise<FSFileHandle> => fsp.open(path, "r"))
    .then((handle: FSFileHandle): Promise<string> => {
        return collect(handle, { autoClose: false, highWaterMark: 0 }).then((value: string): Promise<string> => {
            zero = value;
            return handle.close().then((): string => value);
        });
    })
    .then((_value: string): Promise<FSFileHandle> => fsp.open(path, "r"))
    .then((handle: FSFileHandle): Promise<void> => {
        try {
            handle.readLines({ highWaterMark: -1 });
            invalid = "accepted";
        } catch (reason: any) {
            invalid = String(reason);
        }
        return handle.close();
    })
    .catch((reason: any): void => {
        error = String(reason);
    })
    .then((_value: any): void => {
        console.log("one:", one);
        console.log("two:", two);
        console.log("zero:", zero);
        console.log("invalid:", invalid);
        console.log("error:", error);
        rmSync(path, { force: true });
    });
