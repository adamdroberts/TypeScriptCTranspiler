import * as fs from "node:fs";
import * as path from "node:path";
import {resolvePackageRoot} from "./program";

/** Names/attributes are projected from the native Realm initializer's table.
 * Ambient declarations describe types, not the current value of a binding. */
export interface RuntimeGlobalBinding {
    kind: "intrinsic" | "function" | "value";
    writable: boolean;
    configurable: boolean;
    enumerable: boolean;
    /** Normal call result only; abrupt conversion outcomes remain separate. */
    normalResult?: "non-string" | "boolean" | "object" | "unknown" | "not-callable" | "primitive-string";
}

export const runtimeGlobalBindings: ReadonlyMap<string, RuntimeGlobalBinding> = new Map(
    [...(fs.readFileSync(path.join(resolvePackageRoot(), "runtime/tsc_global_bindings.def"), "utf8")
        + "\n" + [...fs.readFileSync(path.join(resolvePackageRoot(), "runtime/tsc_typed_array.def"), "utf8")
            .matchAll(/^TSC_TYPED_ARRAY\((\w+), /gm)]
            .map(([, name]) => `TSC_GLOBAL_INTRINSIC(${name}, collection, OBJECT)`).join("\n"))
        .matchAll(/^TSC_GLOBAL_(INTRINSIC|FUNCTION|VALUE)\((\w+), (.*)\)$/gm)]
        .map(([, kind, name, operands]) => {
            const attributes = operands!.match(/, (true|false), (true|false)$/);
            const functionAttributes = kind === "FUNCTION"
                ? operands!.match(/, (true|false), (true|false), \d+, \w+$/) : null;
            const result = kind === "VALUE" ? undefined : operands!.match(/, (NON_STRING|BOOLEAN|OBJECT|UNKNOWN|NOT_CALLABLE|PRIMITIVE_STRING)$/)?.[1];
            if (kind !== "VALUE" && !result) throw new Error("invalid canonical Realm call result category");
            if (kind === "VALUE" && !attributes) throw new Error("invalid canonical Realm binding attributes");
            if (kind === "FUNCTION" && !functionAttributes) throw new Error("invalid canonical Realm function attributes");
            return [name!, {
                kind: kind!.toLowerCase() as RuntimeGlobalBinding["kind"],
                writable: kind !== "VALUE" || attributes![1] === "true",
                configurable: kind !== "VALUE" || attributes![2] === "true",
                enumerable: functionAttributes?.[2] === "true",
                ...(result ? {normalResult: result.toLowerCase().replaceAll("_", "-") as RuntimeGlobalBinding["normalResult"]} : {}),
            }] as const;
        }),
);
