import { promises as fsp, rmSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-promises-file-handle-stat.txt";
writeFileSync(path, "hello");

let statFile = false;
let statSize = -1;
let closedError = "pending";
let error = "pending";

fsp.open(path, "r")
    .then((handle: FSFileHandle): Promise<string> => {
        return handle.stat()
            .then((stat: FSStats): Promise<void> => {
                statFile = stat.isFile();
                statSize = stat.size;
                return handle.close();
            })
            .then((_value: any): Promise<string> => {
                return handle.stat()
                    .then((_stat: FSStats): string => "unexpected fulfillment")
                    .catch((reason: string): string => reason);
            });
    })
    .then((reason: string): void => {
        closedError = reason.indexOf("FileHandle is closed") >= 0 ? "true" : reason;
    })
    .catch((reason: string): void => {
        error = reason;
    })
    .then((_value: any): void => {
        console.log("statFile:", statFile);
        console.log("statSize:", statSize);
        console.log("closedError:", closedError);
        console.log("error:", error);
        rmSync(path, { force: true });
    });
