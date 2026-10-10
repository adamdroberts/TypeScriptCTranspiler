import * as fs from "node:fs";
import * as path from "node:path";
import {resolvePackageRoot} from "./program";

/** Import admission projects the same member collection as the runtime owner. */
export const consoleOperations = new Set(
    [...fs.readFileSync(path.join(resolvePackageRoot(), "runtime", "tsc_console_methods.def"), "utf8")
        .matchAll(/^TSC_CONSOLE_METHOD\((\w+),\s*(?:true|false)\)$/gm)]
        .map(match => match[1]!),
);
