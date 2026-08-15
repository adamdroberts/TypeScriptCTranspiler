import { promises as fsp, rmSync, writeFileSync } from "node:fs";

declare const AbortController: { new(): any };

const path = "/tmp/tsc2c-fs-promises-file-handle-read-lines-emit-close.txt";
writeFileSync(path, "first\nsecond\n");

function exhaust(iterator: any): Promise<any> {
    return iterator.next()
        .then((_first: any): Promise<any> => iterator.next())
        .then((_second: any): Promise<any> => iterator.next());
}

function probe(label: string, options: any, returnEarly: boolean): Promise<string> {
    return fsp.open(path, "r").then((handle: FSFileHandle): Promise<string> => {
        const iterator: any = handle.readLines(options);
        let closeEvents = 0;
        let onceCloseEvents = 0;
        iterator.on("close", (): void => {
            closeEvents++;
        });
        iterator.once("close", (): void => {
            onceCloseEvents++;
        });

        let terminal: Promise<any>;
        if (returnEarly) {
            terminal = iterator.next().then((_first: any): Promise<any> => iterator.return("stopped"));
        } else {
            terminal = exhaust(iterator);
        }
        return terminal.then((_result: any): Promise<string> => {
            return handle.close().then((_closed: any): string => {
                return `${label}:${closeEvents}:${onceCloseEvents}`;
            });
        });
    });
}

function probeAbort(): Promise<string> {
    return fsp.open(path, "r").then((handle: FSFileHandle): Promise<string> => {
        const controller: any = new AbortController();
        const iterator: any = handle.readLines({ autoClose: false, signal: controller.signal });
        let closeEvents = 0;
        let onceCloseEvents = 0;
        iterator.on("close", (): void => {
            closeEvents++;
        });
        iterator.once("close", (): void => {
            onceCloseEvents++;
        });
        const next: Promise<any> = iterator.next();
        controller.abort("stopped");
        return next.then(
            (_result: any): Promise<string> => handle.close().then((_closed: any): string => "abort:0:0"),
            (_reason: any): Promise<string> => handle.close().then((_closed: any): string => {
                return `abort:${closeEvents}:${onceCloseEvents}`;
            }),
        );
    });
}

let summary: string[] = [];
let error = "pending";

probe("default", { autoClose: false }, false)
    .then((value: string): Promise<string> => {
        summary.push(value);
        return probe("disabled", { autoClose: false, emitClose: false }, false);
    })
    .then((value: string): Promise<string> => {
        summary.push(value);
        return probe("return", { autoClose: false, emitClose: true }, true);
    })
    .then((value: string): void => {
        summary.push(value);
    })
    .then((_value: any): Promise<string> => {
        return probeAbort();
    })
    .then((value: string): void => {
        summary.push(value);
    })
    .catch((reason: any): void => {
        error = String(reason);
    })
    .then((_value: any): void => {
        console.log("summary:", summary.join(","));
        console.log("error:", error);
        rmSync(path, { force: true });
    });
