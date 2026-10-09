import * as fs from "node:fs";
import * as path from "node:path";
import {resolvePackageRoot} from "./program";

/** Names/attributes are projected from the native Realm initializer's table.
 * Ambient declarations describe types, not the current value of a binding. */
export const runtimeGlobalBindings: ReadonlyMap<string, {mutableValue: boolean}> = new Map(
    [...fs.readFileSync(path.join(resolvePackageRoot(), "runtime/tsc_global_bindings.def"), "utf8")
        .matchAll(/^TSC_GLOBAL_(INTRINSIC|FUNCTION|VALUE)\((\w+), (.*)\)$/gm)]
        .map(([, kind, name, operands]) => [name!, {
            mutableValue: kind === "VALUE" && /, true, (?:true|false)$/.test(operands!),
        }] as const),
);
