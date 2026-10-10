import * as fs from "node:fs";
import * as path from "node:path";
import {resolvePackageRoot} from "./program";

/** Names/attributes are projected from the native Realm initializer's table.
 * Ambient declarations describe types, not the current value of a binding. */
export interface RuntimeGlobalBinding {
    kind: "intrinsic" | "function" | "value";
    writable: boolean;
    configurable: boolean;
}

export const runtimeGlobalBindings: ReadonlyMap<string, RuntimeGlobalBinding> = new Map(
    [...fs.readFileSync(path.join(resolvePackageRoot(), "runtime/tsc_global_bindings.def"), "utf8")
        .matchAll(/^TSC_GLOBAL_(INTRINSIC|FUNCTION|VALUE)\((\w+), (.*)\)$/gm)]
        .map(([, kind, name, operands]) => {
            const attributes = operands!.match(/, (true|false), (true|false)$/);
            if (kind === "VALUE" && !attributes) throw new Error("invalid canonical Realm binding attributes");
            return [name!, {
                kind: kind!.toLowerCase() as RuntimeGlobalBinding["kind"],
                writable: kind !== "VALUE" || attributes![1] === "true",
                configurable: kind !== "VALUE" || attributes![2] === "true",
            }] as const;
        }),
);
