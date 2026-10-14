import * as fs from "node:fs";
import * as path from "node:path";
import { resolvePackageRoot } from "./program";

/** Native result projections come from the same collection as runtime dispatch. */
export const bufferStaticDescriptors = new Map<string, {result: "buffer" | "number" | "boolean" | "value"; length: number}>();
const definition = fs.readFileSync(path.join(resolvePackageRoot(), "runtime", "tsc_buffer_statics.def"), "utf8");
for (const line of definition.split(/\r?\n/)) {
    if (!line.startsWith("TSC_BUFFER_STATIC_METHOD")) continue;
    const match = /^TSC_BUFFER_STATIC_METHOD\((\w+),\s*(buffer|number|boolean|value),\s*(\d+)\)$/.exec(line);
    if (!match || bufferStaticDescriptors.has(match[1]!)) throw new Error("Buffer static descriptor collection cannot be represented");
    bufferStaticDescriptors.set(match[1]!, {result: match[2] as "buffer" | "number" | "boolean" | "value", length: Number(match[3])});
}
if (!bufferStaticDescriptors.size) throw new Error("Buffer static descriptor collection cannot be represented");
