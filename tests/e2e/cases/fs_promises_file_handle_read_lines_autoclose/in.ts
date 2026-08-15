import { promises as fsp, rmSync, writeFileSync } from "node:fs";

declare const AbortController: { new(): any };

const path = "/tmp/tsc2c-fs-promises-file-handle-read-lines-autoclose.txt";
writeFileSync(path, "first\nsecond\n");

function exhaust(iterator: any): Promise<any> {
    return iterator.next()
        .then((_first: any): Promise<any> => iterator.next())
        .then((_second: any): Promise<any> => iterator.next());
}

function probe(label: string, options: any, returnEarly: boolean): Promise<string> {
    return fsp.open(path, "r").then((handle: FSFileHandle): Promise<string> => {
        const iterator: any = handle.readLines(options);
        let terminal: Promise<any>;
        if (returnEarly) {
            terminal = iterator.next().then((_first: any): Promise<any> => iterator.return("stopped"));
        } else {
            terminal = exhaust(iterator);
        }
        return terminal.then((_result: any): Promise<string> => {
            return handle.readFile("utf8").then(
                (_content: string): Promise<string> => handle.close().then((): string => `${label}:open`),
                (_reason: any): Promise<string> => handle.close().then((): string => `${label}:closed`),
            );
        });
    });
}

function probeAbort(): Promise<string> {
    return fsp.open(path, "r").then((handle: FSFileHandle): Promise<string> => {
        const controller: any = new AbortController();
        const iterator: any = handle.readLines({ signal: controller.signal });
        const next: Promise<any> = iterator.next();
        controller.abort("stopped");
        return next.then(
            (_result: any): Promise<string> => handle.close().then((): string => "abort:open"),
            (_reason: any): Promise<string> => handle.readFile("utf8").then(
                (_content: string): Promise<string> => handle.close().then((): string => "abort:open"),
                (_readError: any): Promise<string> => handle.close().then((): string => "abort:closed"),
            ),
        );
    });
}

let summary: string[] = [];
let error = "pending";

probe("default", undefined, false)
    .then((value: string): Promise<string> => {
        summary.push(value);
        return probe("false", { autoClose: false }, false);
    })
    .then((value: string): Promise<string> => {
        summary.push(value);
        return probe("true", { autoClose: true }, false);
    })
    .then((value: string): Promise<string> => {
        summary.push(value);
        return probe("return-false", { autoClose: false }, true);
    })
    .then((value: string): Promise<string> => {
        summary.push(value);
        return probe("return-default", undefined, true);
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
