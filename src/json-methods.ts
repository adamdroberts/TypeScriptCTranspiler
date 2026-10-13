import * as fs from "node:fs";
import * as path from "node:path";
import {resolvePackageRoot} from "./program";

export type JSONSourceOperation = "json-parse" | "json-stringify" | "json-raw" | "json-is-raw";
export interface JSONMethodDescriptor {
    readonly name: string;
    readonly length: number;
    readonly operation: JSONSourceOperation;
}

/** Native publication and source owners project one method collection. */
export const jsonMethods: ReadonlyMap<string, JSONMethodDescriptor> = new Map(
    fs.readFileSync(path.join(resolvePackageRoot(), "runtime/tsc_json_methods.def"), "utf8")
        .split(/\r?\n/).filter(line => line.startsWith("TSC_JSON_METHOD"))
        .map(line => {
            const row = /^TSC_JSON_METHOD\((\w+), (\d+), \w+, (PARSE|STRINGIFY|RAW|IS_RAW)\)$/.exec(line);
            if (!row) throw new Error("invalid canonical JSON method descriptor");
            const descriptor = {name: row[1]!, length: Number(row[2]), operation: `json-${row[3]!.toLowerCase().replaceAll("_", "-")}` as JSONSourceOperation};
            return [descriptor.name, descriptor] as const;
        }),
);

export const jsonOperations: ReadonlyMap<JSONSourceOperation, JSONMethodDescriptor> = new Map(
    [...jsonMethods.values()].map(descriptor => [descriptor.operation, descriptor]),
);
