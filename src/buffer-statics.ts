import * as fs from "node:fs";
import * as path from "node:path";
import { resolvePackageRoot } from "./program";

/** Native result projections come from the same collection as runtime dispatch. */
export const bufferStaticResults = new Map<string, "buffer" | "number" | "boolean" | "value">();
const definition = fs.readFileSync(path.join(resolvePackageRoot(), "runtime", "tsc_buffer_statics.def"), "utf8");
for (const line of definition.split(/\r?\n/)) {
    if (!line.startsWith("TSC_BUFFER_STATIC_METHOD")) continue;
    const match = /^TSC_BUFFER_STATIC_METHOD\((\w+),\s*(buffer|number|boolean|value)\)$/.exec(line);
    if (!match || bufferStaticResults.has(match[1]!)) throw new Error("Buffer static descriptor collection cannot be represented");
    bufferStaticResults.set(match[1]!, match[2] as "buffer" | "number" | "boolean" | "value");
}
if (!bufferStaticResults.size) throw new Error("Buffer static descriptor collection cannot be represented");
