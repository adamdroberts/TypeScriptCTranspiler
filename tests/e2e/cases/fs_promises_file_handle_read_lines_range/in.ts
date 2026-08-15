import { promises as fsp, rmSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-promises-file-handle-read-lines-range.txt";
writeFileSync(path, "zero\none\ntwo\n");

let rangeSummary = "pending";
let positionSummary = "pending";
let boundsSummary = "pending";
let invalidSummary = "pending";
let reversedSummary = "pending";
let error = "pending";

fsp.open(path, "r")
    .then((handle: FSFileHandle): Promise<void> => {
        const iterator: any = handle.readLines({ start: 5, end: 8 });
        return iterator.next().then((first: any): Promise<any> => {
            return iterator.next().then((finished: any): Promise<string> => {
                rangeSummary = `${first.value}:${finished.done}`;
                return handle.readFile("utf8");
            });
        }).then((value: string): Promise<void> => {
            positionSummary = value === "zero\none\ntwo\n" ? "preserved" : value;
            return handle.close();
        });
    })
    .then((_value: any): Promise<FSFileHandle> => fsp.open(path, "r"))
    .then((handle: FSFileHandle): Promise<void> => {
        const startOnly: any = handle.readLines({ start: 9 });
        return startOnly.next().then((startResult: any): Promise<any> => {
            const endOnly: any = handle.readLines({ end: 3 });
            return endOnly.next().then((endResult: any): void => {
                boundsSummary = `${startResult.value}:${endResult.value}`;
                try {
                    handle.readLines({ start: -1 });
                    invalidSummary = "unexpected";
                } catch (reason: any) {
                    invalidSummary = String(reason).indexOf("non-negative safe integer") >= 0 ? "true" : String(reason);
                }
                try {
                    handle.readLines({ start: 8, end: 7 });
                    reversedSummary = "unexpected";
                } catch (reason: any) {
                    reversedSummary = String(reason).indexOf("greater than or equal") >= 0 ? "true" : String(reason);
                }
            });
        }).then((_value: any): Promise<void> => handle.close());
    })
    .catch((reason: any): void => {
        error = String(reason);
    })
    .then((_value: any): void => {
        console.log("range:", rangeSummary);
        console.log("position:", positionSummary);
        console.log("bounds:", boundsSummary);
        console.log("invalid:", invalidSummary);
        console.log("reversed:", reversedSummary);
        console.log("error:", error);
        rmSync(path, { force: true });
    });
