import * as fs from "node:fs";
import * as path from "node:path";
import {resolvePackageRoot} from "./program";

export const runtimeCollectionMethods:ReadonlyMap<string,{operation:string;name:string;length:number;mapOnly:boolean}>=new Map(
    [...fs.readFileSync(path.join(resolvePackageRoot(),"runtime/tsc_collection_methods.def"),"utf8")
        .matchAll(/^TSC_COLLECTION_METHOD\((\w+), (\w+), (\d+), (true|false)\)$/gm)]
        .map(([,operation,name,length,mapOnly])=>[operation!,{operation:operation!,name:name!,length:Number(length),mapOnly:mapOnly==="true"}] as const),
);
if(!runtimeCollectionMethods.size)throw new Error("missing native collection method descriptors");

export const runtimeSetCompositionMethods:ReadonlyMap<string,string>=new Map(
    [...fs.readFileSync(path.join(resolvePackageRoot(),"runtime/tsc_collection_methods.def"),"utf8")
        .matchAll(/^TSC_SET_COMPOSITION\((\w+), (\w+)\)$/gm)].map(([,operation,name])=>[name!,operation!] as const),
);

/** Host import publication uses the same collection as the native module. */
export const runtimeUtilExports: ReadonlySet<string> = new Set(
    [...fs.readFileSync(path.join(resolvePackageRoot(), "runtime/tsc_util_exports.def"), "utf8")
        .matchAll(/^TSC_UTIL_EXPORT\((\w+), \w+\)$/gm)].map(match => match[1]!),
);
if (!runtimeUtilExports.size) throw new Error("missing native util export collection");

export const runtimeFsFdOperations: ReadonlyMap<string,number> = new Map(
    [...fs.readFileSync(path.join(resolvePackageRoot(), "runtime/tsc_fs_fd.def"), "utf8")
        .matchAll(/^TSC_FS_FD_OPERATION\((\w+), /gm)].map((match,index) => [match[1]!,index]),
);
if (!runtimeFsFdOperations.size) throw new Error("missing native filesystem descriptor collection");

const pathPosixDescriptors=fs.readFileSync(path.join(resolvePackageRoot(),"runtime/tsc_runtime.h"),"utf8")
    .match(/#define TSC_PATH_POSIX_OPERATIONS\(X\) ([\s\S]*?)\ntsc_str_t\* tsc_path_posix_values/)?.[1];
export const runtimePathPosixOperations:ReadonlyMap<string,number>=new Map(
    [...(pathPosixDescriptors??"").matchAll(/X\(\w+, (\w+), -?\d+\)/g)].map((match,index)=>[match[1]!,index]),
);
if(!runtimePathPosixOperations.size)throw new Error("missing native POSIX path operation collection");

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

/** Source owners project the same descriptor collection installed natively. */
export const runtimeMathMethods:ReadonlyMap<string,{length:number;kind:string}>=new Map(
    fs.readFileSync(path.join(resolvePackageRoot(),"runtime/tsc_math_methods.def"),"utf8")
        .split(/\r?\n/).filter(line=>line.startsWith('TSC_MATH_')).map(line=>{
            const row=/^TSC_MATH_(UNARY|BINARY|VARIADIC)\((\w+), ([^\n]+)\)$/.exec(line);
            if(!row)throw new Error("invalid native Math method descriptor");
            const [,form,name,arguments_]=row,parts=arguments_!.split(',').map(value=>value.trim());
            const length=form==='UNARY'?1:form==='BINARY'?2:Number(parts[0]),kind=form==='VARIADIC'?parts[1]?.replace('TSC_MATH_',''):form;
            if(!Number.isInteger(length)||length<0||!['UNARY','BINARY','RANDOM','MIN','MAX','HYPOT','SUM_PRECISE'].includes(kind??''))throw new Error("invalid native Math method descriptor");
            return [name!,{length,kind:kind!}] as const;
        }),
);
if(!runtimeMathMethods.size)throw new Error("missing native Math method descriptors");

export const runtimeObjectPrototypeMethods: ReadonlyMap<string, NonNullable<RuntimeGlobalBinding["normalResult"]>> = new Map(
    fs.readFileSync(path.join(resolvePackageRoot(), "runtime/tsc_object_prototype_methods.def"), "utf8")
        .split(/\r?\n/).filter(line => line.startsWith("TSC_OBJECT_PROTOTYPE_METHOD"))
        .map(line => {
            const row = /^TSC_OBJECT_PROTOTYPE_METHOD\((\w+), [^,]+, [^,]+, .*?, (BOOLEAN|OBJECT|UNKNOWN|NON_STRING)\)$/.exec(line);
            if (!row) throw new Error("invalid canonical Object.prototype method descriptor");
            return [row[1]!,row[2]!.toLowerCase().replaceAll("_","-") as NonNullable<RuntimeGlobalBinding["normalResult"]>] as const;
        }),
);

/** Native Error constructor identities come from the Realm binding table. */
export const runtimeErrorKinds: ReadonlyMap<string,string> = new Map(
    [...fs.readFileSync(path.join(resolvePackageRoot(), "runtime/tsc_global_bindings.def"), "utf8")
        .matchAll(/^TSC_GLOBAL_INTRINSIC\((\w+), tsc_error_constructor_value\(TSC_ERROR_(\w+)\), OBJECT\)$/gm)]
        .map(([,name,kind])=>[name!,kind!] as const),
);

/** Iterator prototype member locations use the native publication tables. */
export const runtimeIteratorMethods: ReadonlySet<string> = new Set(
    ["tsc_iterator_helpers.def","tsc_iterator_consumers.def"].flatMap(filename=>
        [...fs.readFileSync(path.join(resolvePackageRoot(),"runtime",filename),"utf8")
            .matchAll(/^TSC_ITERATOR_(?:HELPER|CONSUMER)\((\w+), /gm)].map(match=>match[1]!)),
);

/** Promise source members project the native publication collection. */
export const runtimePromiseMethods:ReadonlyMap<string,{length:number;static:boolean}>=new Map(
    [...fs.readFileSync(path.join(resolvePackageRoot(),"runtime/tsc_promise.c"),"utf8")
        .matchAll(/\{ "(\w+)", (\d+), promise_(?:static|prototype)_\w+, (true|false)(?:, \w+)? \}/g)]
        .map(([,name,length,isStatic])=>[name!,{length:Number(length),static:isStatic==="true"}] as const),
);

/** The native ToPropertyDescriptor reads are the canonical ordered fields. */
export const runtimeDescriptorFields: readonly {name:string;kind:"boolean"|"value"|"callable"}[] =
    [...fs.readFileSync(path.join(resolvePackageRoot(),"runtime/tsc_value.c"),"utf8")
        .matchAll(/out\.has_(\w+) = descriptor_field\(desc, "(\w+)", /g)]
        .map(([,slot,name])=>({name:name!,kind:slot==="value"?"value":slot==="getter"||slot==="setter"?"callable":"boolean"}));

/** Primitive owner brands and constructible wrappers come from the native
 * descriptor collection and its actual constructor publications. */
const primitiveSource=fs.readFileSync(path.join(resolvePackageRoot(),"runtime/tsc_value.c"),"utf8");
const objectStaticMethods=/static const tsc_object_static_method_t object_static_methods\[\] = \{([\s\S]*?)\n\};/.exec(primitiveSource)?.[1];
if(!objectStaticMethods)throw new Error("missing canonical Object constructor method collection");
export const runtimeObjectConstructorOwnKeys:ReadonlySet<string|symbol>=new Set([
    "name","length","prototype",...[...objectStaticMethods.matchAll(/\{ "(\w+)"/g)].map(match=>match[1]!),
    ...[...(/static const tsc_object_integrity_operation_t object_integrity_operations\[\] = \{([\s\S]*?)\n\};/.exec(primitiveSource)?.[1]??"").matchAll(/\{ "(\w+)"/g)].map(match=>match[1]!),
]);
const primitiveConstructors=new Set([...primitiveSource.matchAll(/tsc_value_t tsc_(\w+)_constructor_value\(void\) \{ return primitive_constructor_value\(&primitive_\w+\); \}/g)].map(match=>match[1]!));
export const runtimePrimitiveDescriptors:ReadonlyMap<string,{kind:string;constructible:boolean}>=new Map(
    [...primitiveSource.matchAll(/\{ TSC_PRIMITIVE_(\w+), "(\w+)", \d+, NULL, 0, false, TSC_INTRINSIC_DEFAULT_\w+_PROTOTYPE \}/g)]
        .map(([,kind,name])=>[name!,{kind:kind!.toLowerCase(),constructible:primitiveConstructors.has(kind!.toLowerCase())}]),
);
function primitiveMethodNames(table:string):string[]{const body=new RegExp("static const [^;]+\\b"+table+"\\[\\] = \\{([\\s\\S]*?)\\n\\};").exec(primitiveSource)?.[1];if(!body)throw new Error("missing canonical primitive method table "+table);return [...body.matchAll(/\{ "(\w+)"/g)].map(match=>match[1]!);}
export const runtimePrimitivePrototypeMembers:ReadonlyMap<string,readonly string[]>=new Map([
    ["string",[...primitiveMethodNames("string_prototype_methods"),...[...primitiveSource.matchAll(/\(tsc_object_t\*\)value_ptr\(prototype\),\s*tsc_str_from_lit\("(\w+)"/g)].map(match=>match[1]!)]],
    ["number",primitiveMethodNames("number_format_methods")],
]);

/** The native well-known Symbol table is the canonical identity collection. */
export const runtimeWellKnownSymbolDescriptions: ReadonlyMap<string, string> = new Map(
    fs.readFileSync(path.join(resolvePackageRoot(), "runtime/tsc_builtin.c"), "utf8")
        .split(/\r?\n/).filter(line => line.includes(" = TSC_WELL_KNOWN_SYMBOL_ENTRY("))
        .map(line => {
            const row = /TSC_WELL_KNOWN_SYMBOL_ENTRY\("([^"\n]+)", "([^"\n]+)", "[^"\n]+"\)/.exec(line);
            if (!row) throw new Error("invalid canonical well-known Symbol descriptor");
            return [row[1]!, row[2]!] as const;
        }),
);

export const runtimeGlobalBindings: ReadonlyMap<string, RuntimeGlobalBinding> = new Map(
    [...(fs.readFileSync(path.join(resolvePackageRoot(), "runtime/tsc_global_bindings.def"), "utf8") + "\n" + [...fs.readFileSync(path.join(resolvePackageRoot(), "runtime/tsc_callback_timers.def"), "utf8")
            .matchAll(/^TSC_CALLBACK_TIMER_OPERATION\((\w+), /gm)]
            .map(([, name]) => `TSC_GLOBAL_INTRINSIC(${name}, collection, NON_STRING)`).join("\n")
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
