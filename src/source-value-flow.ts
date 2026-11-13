import {SourceEvaluationOrder} from "./source-evaluation-order";
import {SourceReachingWrites,type SourceLexicalWrite} from "./source-reaching-writes";
import {runtimeObjectStaticMethods,runtimeReflectMethods,runtimeArrayPrototypeMethods,runtimeFunctionPrototypeMethods,runtimeFunctionRestrictedProperties,runtimeStringStaticMethods} from "./global-bindings";
import {sourceNumericOperation, type SourceNumericOperation, type SourcePrimitive} from "./source-numeric-operations";
import {bufferStaticDescriptors} from "./buffer-statics";
import ts from "typescript";
import { callableSourceText } from "./callable-source-text";
import {classPrivateNames,classPrivateNamesInScope,resolveClassPrivateName,type ClassPrivateName} from "./emit/private-names";
import { normalizeAssignmentTarget, unwrapTransparentExpression as unwrap } from "./emit/binding-tree";
import { classConstructorMember, isClassConstructor } from "./emit/class-definition";
import { isStrictCodeContext, callableNameInput, expectedArgumentCount, functionBodyCompletions, statementBodyCompletions, type StatementBodyCompletions, NAME_EVALUATING_ASSIGNMENTS } from "./function-static-semantics";
import {consoleOperations} from "./console-operations";
import {jsonMethods, jsonOperations, type JSONSourceOperation} from "./json-methods";
import {test262AgentOperations} from "./test262-agent-operations";
import {sourceModuleFailure} from "./module-source-record";
import { sourceUnitBodyIncluded, sourceUnitFileName } from "./program";
import {sourceChoiceTuples} from "./source-choice-tuples";
import {moduleVarDeclaredNames} from "./module-static-semantics";
import { ecmaParseGoal, literalPropertyKey } from "./ecmascript-source";
import { annexBBlockFunctions, annexBFunctionVarScope } from "./annex-b-functions";
import { functionBindingScope, functionVarBinding, type FunctionBindingScope } from "./function-binding-scopes";
import * as path from "node:path";
import { createHash } from "node:crypto";
import {nativePrimitiveFormat} from "./util-format-source";
import { staticStringExpressionTexts } from "./module-specifiers";
import { functionKindForDeclaration, functionConstructorDisplaySource, functionConstructorSourceKey, type DynamicFunctionKind, type FunctionConstructorEntry } from "./function-constructor-source";

import {declarativeSourceBindingSymbol, isAmbientSourceDeclaration, sourceDeclarationIntroducesBinding, sourceBindingTarget} from "./source-bindings";
import {runtimeDynamicFunctionDescriptors,runtimeGeneratorMethods,runtimeCallbackTimerDescriptors,runtimeAtomicsMethods,runtimeTypedArrayDescriptors,runtimeMathMethods,runtimeCollectionMethods, runtimeSetCompositionMethods, runtimeGlobalBindings, runtimeBufferExports, runtimeChildProcessOperations, runtimeUtilExports, runtimeFsExports, runtimeFsConstants, runtimeErrorKinds, runtimeIteratorMethods, runtimePromiseMethods, runtimeObjectConstructorOwnKeys, runtimeDescriptorFields, runtimePrimitiveDescriptors, runtimePrimitivePrototypeMembers, runtimeStringPrototypeMethods, runtimeObjectPrototypeMethods, runtimeObjectPrototypeDescriptors, runtimeWellKnownSymbolDescriptions, type RuntimeGlobalBinding} from "./global-bindings";

export interface SourceValueGraphEntries {
    readonly roots?: readonly string[];
    /** The host whose global object the program runs on. Under the Test262
     * host the global object holds exactly the runtime's global bindings, the
     * host's `print` and `$262` and the declarations of the analysed
     * scripts, so a reference to any other name is unresolvable. */
    readonly host?: "test262";
    readonly functions?: readonly FunctionConstructorEntry[];
    readonly evaluations?: readonly { readonly source: string; readonly entry: string | null; readonly kind?: string; readonly domain?: string }[];
}
function evaluationContextKey(source:string,kind:string|undefined):string {
    // Reused text does not merge direct caller environments with Realm-global
    // evaluation. Legacy graph queries without a kind retain a shared domain.
    const operation=kind==='script'?'eval-script':kind==='agent'?'agent-start':'eval';
    return JSON.stringify([operation,kind==='direct'?'direct':kind==='indirect'?'indirect':'shared',source]);
}
export function sourceAgentDomain(source:string):string {return "agent:"+createHash("sha256").update(source).digest("hex");}
export interface ConstructorInvocation {
    readonly domain?: string;
    readonly kind: DynamicFunctionKind;
    /** Null means that the actual List cannot be proved finite. The explicit
     * registry remains available; runtime selection still fails closed. */
    readonly choices: readonly (readonly string[])[] | null;
}
/** One constructor source domain retains concrete alternatives independently
 * of the proof that they exhaust every possible normal input. */
export interface ConstructorSourceFacts {
    readonly domain?:string;
    readonly kind:DynamicFunctionKind;
    readonly arguments:readonly (readonly string[])[]|null;
    readonly complete:boolean;
}
export interface EvaluationInvocation {
    readonly domain?: string;
    readonly node: ts.Node;
    readonly operation: "eval" | "eval-script" | "agent-start";
    readonly direct: boolean;
    /** Eval retains non-String values; evalScript converts primitives to text.
     * Null keeps the existing unknown-source diagnostic/registry boundary. */
    readonly choices: readonly string[] | null;
}

type FunctionNode = ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction |
    ts.MethodDeclaration | ts.GetAccessorDeclaration | ts.SetAccessorDeclaration | ts.ConstructorDeclaration;
type CallableDefinition = FunctionNode | ts.ClassDeclaration | ts.ClassExpression;
type Domain = "constructor" | "prototype" | "instance";
type CollectionKind = "Map" | "Set";
type Operation = `set-prototype:${"object"|"reflect"}` | `native-object-static:${string}` | `native-reflect:${string}` | "object-is" | `object-integrity:${"preventExtensions"|"seal"|"freeze"}` | `object-integrity-test:${"isExtensible"|"isSealed"|"isFrozen"}` | `regexp-flag:${string}` | `regexp-member:${string}` | `object-enumerable:${"keys"|"values"|"entries"}` | `object-has-own:${"static"|"prototype"}` | `array-iteration:${ArrayIterationMode}` | "array-push" | "object-own-keys:string" | "object-own-keys:symbol" | "reflect-own-keys" | "reflect-get" | `native-string-static:${string}` | "string-codes:unit" | "string-codes:point" | `native-array:${string}` | `native-function:${string}` | "throw-type-error" | `legacy-function-accessor:${"caller"|"arguments"}:${"get"|"set"}` | `callback-timer:${string}` | "ordinary-has-instance" | "object-get-prototype" | "reflect-get-prototype" | "eval" | "eval-script" | "agent-start" | "realm" | "host-print" | "host-gc" | "call" | "apply" | "bind" | "reflect-apply" | "construct" |
    "define-property" | "define-properties" | "create-object" | "set-property" | "delete-property" | "own-descriptor" | "own-descriptors" | "function-text" | "object-text" | "symbol-for" | "symbol-key-for" | "array-join" | "array-text" | "array-values" | "array-keys" | "array-entries" | "json-stringify" | "json-parse" | "json-raw" | "json-is-raw" | "error-text" | "error-brand" | "array-brand" | "util-format" | "native-require" | `set-composition:${string}` | `collection-iterator:${string}` | `collection-member:${string}` | "promise-finally-forward" | "species-getter" | "proto-accessor:get" | "proto-accessor:set" | `promise-member:${string}` | `generator-member:${string}` | `agent-member:${string}` | `primitive-value:${string}` | `primitive-text:${string}` | `math-member:${string}` | `atomics-member:${string}` | `primitive-member:${string}`;
type Primitive = SourcePrimitive;
/** Callables and collection-iterator cells reachable from one escaping value;
 * a sink forwards them into one escaping call. */
type EscapeReach={readonly callables:Set<Atom>;readonly iterators:Set<Cell>;readonly parents:Set<EscapeReach>;readonly sink?:{callable(atom:Atom):void;iterator(cell:Cell):void}};
/** direct: the value and everything reachable from it may be invoked.
 * argument: a native's non-callback argument, never invoked itself; what it
 * stores or inherits is reached as method. method: conversion methods,
 * getters and stored functions a native may invoke on such a value; the
 * transparent Function.prototype call/apply/bind operations, a function's
 * own `prototype` and a `constructor` property are not consulted, since a
 * native never calls those on a value it was not given as a callback.
 * elements: the receiver of an Array.prototype native, never invoked itself;
 * its accessors run (method), its stored values (elements, "length",
 * "constructor") are only read, compared, moved or converted, so each is an
 * argument whose own methods and accessors may run (ToString in sort,
 * toLocaleString, the @@species of "constructor"); its prototype chain is
 * reached the same way. */
type EscapeReachKind="direct"|"argument"|"method"|"elements";
const TRANSPARENT_CALL_OPERATIONS:ReadonlySet<string>=new Set(["call","apply","bind"]);
/** Every Proxy handler trap and the operands it receives after the target
 * (sec-proxy-object-internal-methods-and-internal-slots). */
const PROXY_TRAP_OPERANDS:ReadonlyMap<string,number>=new Map([["getPrototypeOf",0],["setPrototypeOf",1],["isExtensible",0],["preventExtensions",0],["getOwnPropertyDescriptor",1],["defineProperty",2],["has",1],["get",2],["set",3],["deleteProperty",1],["ownKeys",0],["apply",2],["construct",2]]);
const PROXY_TRAPS:readonly string[]=[...PROXY_TRAP_OPERANDS.keys()];
/** Natives that call or construct their target through the invocation
 * worklist, where a Proxy target's apply/construct trap is already kept, and
 * Reflect.get/Reflect.set, whose target is read or written through the
 * Proxy-aware property graph and whose receiver is only a getter's or
 * setter's `this` (Reflect.set's receiver is still asked for and given its
 * own property, below). */
const PROXY_FORWARDING_OPERATIONS:ReadonlySet<string>=new Set(["call","apply","reflect-apply","construct","bind","reflect-get","set-property"]);
/** A Proxy's internal method checks its result against the target's own
 * [[GetOwnProperty]], [[IsExtensible]] and [[GetPrototypeOf]]
 * (sec-proxy-object-internal-methods-and-internal-slots), so a target that
 * is itself a Proxy receives those besides the forwarded method. */
const PROXY_INVARIANT_TRAPS:readonly string[]=["getOwnPropertyDescriptor","isExtensible","getPrototypeOf"];
/** The internal methods a native performs on its operands where the model
 * knows its steps: each entry names an operand (the receiver or an argument
 * index), the traps a Proxy there runs, and whether the walk continues
 * through each reached object's prototype. An operand no entry names is never
 * asked. A key operand is converted by ToPropertyKey, whose ToPrimitive reads
 * (get) through the chain; a descriptor operand is read by
 * ToPropertyDescriptor (has, then get, through the chain); a Get of a key
 * an earlier getter may have deleted reaches the chain too. Builtins are
 * keyed "builtin:" + name. Every other native may perform any internal method
 * on any operand and the objects it inherits from. */
type NativeProxyOperand={readonly operand:"receiver"|number;readonly traps:readonly string[];readonly chain:boolean};
const PROXY_KEY_CONVERSION:NativeProxyOperand["traps"]=["get"];
const PROXY_DESCRIPTOR_READ:NativeProxyOperand["traps"]=["has","get"];
const PROXY_OWN_READ:NativeProxyOperand["traps"]=["ownKeys","getOwnPropertyDescriptor","get"];
const NATIVE_PROXY_INTERNAL_METHODS:ReadonlyMap<string,readonly NativeProxyOperand[]>=new Map<string,readonly NativeProxyOperand[]>([
    // SameValue compares identities; ToObject and OrdinaryObjectCreate ask
    // nothing; Object.prototype.valueOf is ToObject(this); a species getter
    // returns its receiver; the legacy Function.prototype caller/arguments
    // accessors only inspect the function they are given.
    ["object-is",[]],
    ["builtin:Object",[]],
    ["builtin:valueOf",[]],
    ["species-getter",[]],
    ["legacy-function-accessor:caller:get",[]],
    ["legacy-function-accessor:caller:set",[]],
    ["legacy-function-accessor:arguments:get",[]],
    ["legacy-function-accessor:arguments:set",[]],
    // __defineGetter__/__defineSetter__(P, f): ToPropertyKey(P), then
    // this.[[DefineOwnProperty]]; __lookupGetter__/__lookupSetter__(P):
    // ToPropertyKey(P), then [[GetOwnProperty]] down this's chain.
    ["builtin:__defineGetter__",[{operand:"receiver",traps:["defineProperty"],chain:false},{operand:0,traps:PROXY_KEY_CONVERSION,chain:true}]],
    ["builtin:__defineSetter__",[{operand:"receiver",traps:["defineProperty"],chain:false},{operand:0,traps:PROXY_KEY_CONVERSION,chain:true}]],
    ["builtin:__lookupGetter__",[{operand:"receiver",traps:["getOwnPropertyDescriptor","getPrototypeOf"],chain:true},{operand:0,traps:PROXY_KEY_CONVERSION,chain:true}]],
    ["builtin:__lookupSetter__",[{operand:"receiver",traps:["getOwnPropertyDescriptor","getPrototypeOf"],chain:true},{operand:0,traps:PROXY_KEY_CONVERSION,chain:true}]],
    // HasOwnProperty(ToObject(O), ToPropertyKey(P)): [[GetOwnProperty]] only.
    ["object-has-own:static",[{operand:0,traps:["getOwnPropertyDescriptor"],chain:false},{operand:1,traps:PROXY_KEY_CONVERSION,chain:true}]],
    ["object-has-own:prototype",[{operand:"receiver",traps:["getOwnPropertyDescriptor"],chain:false},{operand:0,traps:PROXY_KEY_CONVERSION,chain:true}]],
    // propertyIsEnumerable(V): ToPropertyKey(V), then this.[[GetOwnProperty]].
    ["builtin:propertyIsEnumerable",[{operand:"receiver",traps:["getOwnPropertyDescriptor"],chain:false},{operand:0,traps:PROXY_KEY_CONVERSION,chain:true}]],
    // isPrototypeOf(V): V.[[GetPrototypeOf]]() down V's chain.
    ["builtin:isPrototypeOf",[{operand:0,traps:["getPrototypeOf"],chain:true}]],
    // Object/Reflect.getPrototypeOf and setPrototypeOf: the target's own method.
    ["object-get-prototype",[{operand:0,traps:["getPrototypeOf"],chain:false}]],
    ["reflect-get-prototype",[{operand:0,traps:["getPrototypeOf"],chain:false}]],
    ["set-prototype:object",[{operand:0,traps:["setPrototypeOf"],chain:false}]],
    ["set-prototype:reflect",[{operand:0,traps:["setPrototypeOf"],chain:false}]],
    // Object/Reflect.defineProperty(O, P, Attributes) and
    // Object/Reflect.getOwnPropertyDescriptor(O, P), Reflect.deleteProperty(O, P).
    ["define-property",[{operand:0,traps:["defineProperty"],chain:false},{operand:1,traps:PROXY_KEY_CONVERSION,chain:true},{operand:2,traps:PROXY_DESCRIPTOR_READ,chain:true}]],
    ["own-descriptor",[{operand:0,traps:["getOwnPropertyDescriptor"],chain:false},{operand:1,traps:PROXY_KEY_CONVERSION,chain:true}]],
    ["delete-property",[{operand:0,traps:["deleteProperty"],chain:false},{operand:1,traps:PROXY_KEY_CONVERSION,chain:true}]],
    // ObjectDefineProperties(O, Properties): Properties' own keys, descriptors
    // and enumerable values; each value's descriptor fields; O's definitions.
    ["define-properties",[{operand:0,traps:["defineProperty"],chain:false},{operand:1,traps:PROXY_OWN_READ,chain:false},{operand:1,traps:["get"],chain:true}]],
    ["create-object",[{operand:1,traps:PROXY_OWN_READ,chain:false},{operand:1,traps:["get"],chain:true}]],
    // Own keys and descriptors.
    ["own-descriptors",[{operand:0,traps:["ownKeys","getOwnPropertyDescriptor"],chain:false}]],
    ["object-own-keys:string",[{operand:0,traps:["ownKeys"],chain:false}]],
    ["object-own-keys:symbol",[{operand:0,traps:["ownKeys"],chain:false}]],
    ["reflect-own-keys",[{operand:0,traps:["ownKeys"],chain:false}]],
    ["object-enumerable:keys",[{operand:0,traps:["ownKeys","getOwnPropertyDescriptor"],chain:false}]],
    ["object-enumerable:values",[{operand:0,traps:PROXY_OWN_READ,chain:false},{operand:0,traps:["get"],chain:true}]],
    ["object-enumerable:entries",[{operand:0,traps:PROXY_OWN_READ,chain:false},{operand:0,traps:["get"],chain:true}]],
    // Integrity levels (SetIntegrityLevel, TestIntegrityLevel).
    ["object-integrity:preventExtensions",[{operand:0,traps:["preventExtensions"],chain:false}]],
    ["object-integrity:seal",[{operand:0,traps:["preventExtensions","ownKeys","defineProperty"],chain:false}]],
    ["object-integrity:freeze",[{operand:0,traps:["preventExtensions","ownKeys","getOwnPropertyDescriptor","defineProperty"],chain:false}]],
    ["object-integrity-test:isExtensible",[{operand:0,traps:["isExtensible"],chain:false}]],
    ["object-integrity-test:isSealed",[{operand:0,traps:["isExtensible","ownKeys","getOwnPropertyDescriptor"],chain:false}]],
    ["object-integrity-test:isFrozen",[{operand:0,traps:["isExtensible","ownKeys","getOwnPropertyDescriptor"],chain:false}]],
]);
/** Builtins whose arguments are only inspected: isPrototypeOf walks its
 * argument's prototypes (the internal methods above) and invokes nothing it
 * reaches; propertyIsEnumerable converts its key, so only that argument's
 * conversion methods and getters may run. Every other builtin may invoke
 * whatever its arguments reach. */
const BUILTIN_ARGUMENT_ESCAPE:ReadonlyMap<string,EscapeReachKind|null>=new Map([["isPrototypeOf",null],["propertyIsEnumerable","argument"]]);
type SourcePropertyKey = string | symbol;
type PrimitiveHint = "string" | "number" | "default";
const ORDINARY_PRIMITIVE_METHODS: ReadonlyMap<PrimitiveHint, readonly string[]> = new Map([
    ["string", ["toString", "valueOf"]], ["number", ["valueOf", "toString"]], ["default", ["valueOf", "toString"]],
]);
const NUMERIC_CONVERSIONS: ReadonlyMap<string, (value: Primitive) => Primitive> = new Map([
    ["Number", (value: Primitive) => Number(value)],
    ["number", (value: Primitive) => +(value as number)],
    ["BigInt", (value: Primitive) => BigInt(value as string | number | bigint | boolean)],
    ["code-point", (value: Primitive) => {const point=+(value as number);if(!Number.isInteger(point)||point<0||point>0x10ffff)throw new RangeError("invalid code point");return point;}],
    ["numeric", (value: Primitive) => typeof value === "bigint" ? value : Number(value)],
    ["length", (value: Primitive) => {
        const number=+(value as number);
        return number>0?Math.min(Math.trunc(number),Number.MAX_SAFE_INTEGER):0;
    }],
    // ArraySetLength: ToUint32 of the value, which must equal its ToNumber.
    ["array-length", (value: Primitive) => {
        const number=+(value as number),length=number>>>0;
        if(length!==number)throw new RangeError("Invalid array length");
        return length;
    }],
]);
const SOURCE_OBJECT_PROTOTYPE_OPERATIONS:ReadonlyMap<string,Operation>=new Map([["toString","object-text"],["hasOwnProperty","object-has-own:prototype"]]);
/** Argument positions an opaque Array.prototype native invokes as functions
 * (callbacks and comparators). Every other argument of a listed native is
 * only read: its conversion methods and getters may run, it never is called
 * itself. Natives outside this table keep every position callable. */
const NATIVE_DIRECT_CALLEE_POSITIONS:ReadonlyMap<string,ReadonlySet<number>>=new Map([...runtimeArrayPrototypeMethods.keys()].map(name=>
    [`native-array:${name}`,new Set(["forEach","map","flatMap","filter","some","every","find","findIndex","findLast","findLastIndex","reduce","reduceRight","sort","toSorted"].includes(name)?[0]:[])]));
/** What an Array.prototype native stores into its receiver (after ToObject):
 * the mutating methods Set elements at integer indices, delete integer
 * indices and Set "length", each only where its algorithm does
 * (sec-properties-of-the-array-prototype-object); every other method leaves
 * the receiver unchanged, and no Array.prototype method writes an argument.
 * copyWithin, fill, reverse and sort return that receiver ("Return O").
 * A user callback, getter, setter or species constructor these natives run
 * is modelled by its own escaped invocation. */
type NativeArrayReceiverEffect={readonly set:boolean;readonly stores:number;readonly remove:boolean;readonly length:boolean;readonly receiverResult:boolean};
const NATIVE_ARRAY_RECEIVER_EFFECTS:ReadonlyMap<string,NativeArrayReceiverEffect>=new Map([...runtimeArrayPrototypeMethods.keys()].map(name=>
    [`native-array:${name}`,{
        set:["copyWithin","fill","push","reverse","shift","sort","splice","unshift"].includes(name),
        // The first argument position whose values the native stores as
        // elements (fill's value, push's and unshift's items, splice's items
        // after start and deleteCount); Infinity when it stores none.
        stores:name==="fill"||name==="push"||name==="unshift"?0:name==="splice"?2:Infinity,
        remove:["copyWithin","pop","reverse","shift","sort","splice","unshift"].includes(name),
        length:["pop","push","shift","splice","unshift"].includes(name),
        receiverResult:["copyWithin","fill","reverse","sort"].includes(name),
    }]));
/** Natives that evaluate or load code: their effects are not bounded by
 * what their receiver and arguments reach. */
const GLOBAL_EFFECT_OPERATIONS:ReadonlySet<string>=new Set(["eval","eval-script","agent-start","native-require"]);
/** Names the Test262 host installs on the global object beside the runtime's
 * own global bindings. */
const TEST262_HOST_NAMES:ReadonlySet<string>=new Set(["print","$262","globalThis","eval","Function","undefined","NaN","Infinity"]);
/** Global builtins without [[Construct]] (ES2026 19.2 function properties)
 * and the namespace objects (not callable at all). */
const NON_CONSTRUCTOR_BUILTINS:ReadonlySet<string>=new Set(["eval","isFinite","isNaN","parseFloat","parseInt","decodeURI","decodeURIComponent","encodeURI","encodeURIComponent","escape","unescape","Math","JSON","Reflect","Atomics","Intl","globalThis","undefined","NaN","Infinity"]);
/** Array.prototype natives that call a callback once per element (ES2026
 * 23.1.3); one iteration model covers them, parametrized by how the
 * callback's completions form the result. */
type ArrayIterationMode="some"|"every"|"forEach"|"find"|"findLast"|"findIndex"|"findLastIndex"|"map"|"filter"|"flatMap"|"reduce"|"reduceRight";
const ARRAY_ITERATION_MODES:readonly ArrayIterationMode[]=["some","every","forEach","find","findLast","findIndex","findLastIndex","map","filter","flatMap","reduce","reduceRight"];
// Initial intrinsic member identities, installed on their canonical owners.
// Source lookups and later writes use the ordinary field graph.
const INITIAL_SOURCE_OPERATIONS: ReadonlyMap<string, ReadonlyMap<string, Operation>> = new Map<string, ReadonlyMap<string, Operation>>([
    ["Error", new Map([["isError", "error-brand"]])],
    ["Array", new Map([["isArray", "array-brand"]])],
    ["JSON", new Map([...jsonMethods.values()].map(descriptor=>[descriptor.name,descriptor.operation]))],
    ["console", new Map([...consoleOperations].map(name=>[name,"host-print" as const]))],
    ["Object", new Map([["is","object-is"],["preventExtensions","object-integrity:preventExtensions"],["seal","object-integrity:seal"],["freeze","object-integrity:freeze"],["isExtensible","object-integrity-test:isExtensible"],["isSealed","object-integrity-test:isSealed"],["isFrozen","object-integrity-test:isFrozen"],["keys","object-enumerable:keys"],["values","object-enumerable:values"],["entries","object-enumerable:entries"],["hasOwn","object-has-own:static"],["getPrototypeOf", "object-get-prototype"], ["setPrototypeOf", "set-prototype:object"], ["create", "create-object"], ["defineProperty", "define-property"], ["defineProperties", "define-properties"],
        ["getOwnPropertyDescriptor", "own-descriptor"], ["getOwnPropertyDescriptors", "own-descriptors"], ["getOwnPropertyNames", "object-own-keys:string"], ["getOwnPropertySymbols", "object-own-keys:symbol"]])],
    ["Reflect", new Map([["ownKeys", "reflect-own-keys"], ["get", "reflect-get"], ["getPrototypeOf", "reflect-get-prototype"], ["setPrototypeOf", "set-prototype:reflect"], ["apply", "reflect-apply"], ["construct", "construct"],
        ["defineProperty", "define-property"], ["set", "set-property"], ["deleteProperty", "delete-property"], ["getOwnPropertyDescriptor", "own-descriptor"]])],
]);
/** Primitive prototype methods (keyed "<kind>:<name>") whose result kind is
 * fixed and which run no user code on a primitive receiver with primitive
 * arguments: a String method converts any non-nullish, non-Symbol primitive
 * receiver with ToString; a Number/BigInt method accepts only its own kind
 * (thisNumberValue / thisBigIntValue throw otherwise). Of the RegExp
 * protocol methods, split, replace and replaceAll ask only an Object
 * argument for its @@-method (sec-string.prototype.split: "If separator is
 * an Object"), so with primitive arguments they are string operations (split
 * returns a fresh Array of Strings); match, matchAll and search create a
 * RegExp from a primitive argument and invoke its %RegExp.prototype%
 * @@-method, which the program may replace, so they stay opaque. */
type PrimitiveMemberResult={string?:true;number?:true;boolean?:true;undefined?:true;strings?:true};
const PRIMITIVE_MEMBER_RESULTS:ReadonlyMap<string,PrimitiveMemberResult>=new Map<string,PrimitiveMemberResult>([
    ...["charAt","concat","repeat","padStart","padEnd","slice","substring","substr","trim","trimStart","trimEnd","toLowerCase","toUpperCase","toLocaleLowerCase","toLocaleUpperCase","normalize","toWellFormed","anchor","big","blink","bold","fixed","fontcolor","fontsize","italics","link","small","strike","sub","sup"].map(name=>["string:"+name,{string:true as const}] as const),
    ["string:at",{string:true,undefined:true}],
    ["string:replace",{string:true}],["string:replaceAll",{string:true}],["string:split",{strings:true}],
    ...["charCodeAt","indexOf","lastIndexOf","localeCompare"].map(name=>["string:"+name,{number:true as const}] as const),
    ["string:codePointAt",{number:true,undefined:true}],
    ...["includes","startsWith","endsWith","isWellFormed"].map(name=>["string:"+name,{boolean:true as const}] as const),
    ...["toFixed","toExponential","toPrecision","toLocaleString"].map(name=>["number:"+name,{string:true as const}] as const),
    ["bigint:toLocaleString",{string:true}],
]);
/** Native `length` of every represented primitive prototype method. */
const PRIMITIVE_MEMBER_LENGTHS:ReadonlyMap<string,number>=new Map<string,number>([
    ...[...runtimeStringPrototypeMethods].map(([name,descriptor])=>["string:"+name,descriptor.length] as const),
    ...["toFixed","toExponential","toPrecision"].map(name=>["number:"+name,1] as const),
    ["number:toLocaleString",0],["bigint:toLocaleString",0],
]);
/* RegExp values (sec-regexp-regular-expression-objects): one prototype owner
 * carries the flag accessors and the method operations; an instance carries
 * its [[OriginalSource]] and [[OriginalFlags]] as cells. Matching itself is
 * not modelled: results are strings, numbers, booleans and match arrays of
 * unknown content, never an unknown value. */
const REGEXP_ACCESSORS=["flags","source","global","ignoreCase","multiline","dotAll","unicode","unicodeSets","sticky","hasIndices"] as const;
const REGEXP_FLAG_LETTERS:ReadonlyMap<string,string>=new Map([["hasIndices","d"],["global","g"],["ignoreCase","i"],["multiline","m"],["dotAll","s"],["unicode","u"],["unicodeSets","v"],["sticky","y"]]);
const REGEXP_METHODS:ReadonlyMap<string,{symbol:boolean;length:number}>=new Map([["exec",{symbol:false,length:1}],["test",{symbol:false,length:1}],["toString",{symbol:false,length:0}],["compile",{symbol:false,length:2}],
    ["match",{symbol:true,length:1}],["matchAll",{symbol:true,length:1}],["replace",{symbol:true,length:2}],["search",{symbol:true,length:1}],["split",{symbol:true,length:2}]]);
/** String.prototype methods that dispatch to a RegExp argument's @@-method. */
const REGEXP_STRING_MEMBERS:ReadonlyMap<string,string>=new Map([["match","match"],["matchAll","matchAll"],["replace","replace"],["replaceAll","replace"],["search","search"],["split","split"]]);
/** The canonical flags text (sec-get-regexp.prototype.flags order), or null for an invalid flags string. */
function canonicalRegExpFlags(flags:string):string|null{
    const order="dgimsuvy";
    for(const letter of flags)if(!order.includes(letter))return null;
    if(new Set(flags).size!==flags.length||flags.includes("u")&&flags.includes("v"))return null;
    let out="";for(const letter of order)if(flags.includes(letter))out+=letter;return out;
}
/** EscapeRegExpPattern as the runtime computes it: `/` outside a class and
 * line terminators are escaped, an empty pattern is "(?:)". */
function escapeRegExpPattern(pattern:string,unicodeSets:boolean):string{
    if(pattern==="")return "(?:)";
    let out="",depth=0;
    for(let index=0;index<pattern.length;index++){
        let unit=pattern[index]!;const escaped=unit==="\\"&&index+1<pattern.length;
        if(escaped)unit=pattern[++index]!;
        if(unit==="\n"||unit==="\r"){out+=unit==="\n"?"\\n":"\\r";continue;}
        if(unit==="\u2028"||unit==="\u2029"){out+="\\u"+unit.charCodeAt(0).toString(16);continue;}
        if(escaped||unit==="/"&&!depth)out+="\\";
        out+=unit;
        if(!escaped){if(unit==="["&&(!depth||unicodeSets))depth++;else if(unit==="]"&&depth)depth--;}
    }
    return out;
}
const SOURCE_NATIVE_METHODS:ReadonlyMap<Operation,{name:string;length:number;owner:"Array"|"Function"|"String"|"Object"|"Reflect"|null;opaque:boolean}>=(()=>{
    const methods=new Map<Operation,{name:string;length:number;owner:"Array"|"Function"|"String"|"Object"|"Reflect"|null;opaque:boolean}>();
    const collections=[
        {owner:"Object" as const,methods:runtimeObjectStaticMethods,prefix:"native-object-static:",precise:INITIAL_SOURCE_OPERATIONS.get("Object")!},
        {owner:"Reflect" as const,methods:runtimeReflectMethods,prefix:"native-reflect:",precise:INITIAL_SOURCE_OPERATIONS.get("Reflect")!},
        {owner:"Array" as const,methods:runtimeArrayPrototypeMethods,prefix:"native-array:",precise:new Map<string,Operation>([...ARRAY_ITERATION_MODES.map(mode=>[mode,`array-iteration:${mode}` as Operation] as const),["push","array-push"],["toString","array-text"],["join","array-join"],["keys","array-keys"],["values","array-values"],["entries","array-entries"]])},
        {owner:"String" as const,methods:runtimeStringStaticMethods,prefix:"native-string-static:",precise:new Map<string,Operation>([["fromCharCode","string-codes:unit"],["fromCodePoint","string-codes:point"]])},
        {owner:"Function" as const,methods:runtimeFunctionPrototypeMethods,prefix:"native-function:",precise:new Map<string,Operation>([["call","call"],["apply","apply"],["bind","bind"],["toString","function-text"]])},
    ];
    for(const collection of collections)for(const[name,descriptor]of collection.methods){
        const known=collection.precise.get(name),operation=known??(collection.prefix+name) as Operation;
        const prior=methods.get(operation);
        if(prior){if(prior.name!==name||prior.length!==descriptor.length)throw new Error("native method alias cannot be represented");continue;}
        methods.set(operation,{name,length:descriptor.length,owner:collection.owner,opaque:!known});
    }
    for(const[name,operation]of SOURCE_OBJECT_PROTOTYPE_OPERATIONS){
        const descriptor=runtimeObjectPrototypeDescriptors.get(name);if(!descriptor||methods.has(operation))throw new Error("native Object.prototype operation cannot be represented");
        methods.set(operation,{name,length:descriptor.length,owner:null,opaque:false});
    }
    for(const[operation,name,length]of [["throw-type-error","",0],["ordinary-has-instance","[Symbol.hasInstance]",1],["eval","eval",1]] as const)
        methods.set(operation,{name,length,owner:null,opaque:false});
    for(const name of runtimeFunctionRestrictedProperties as readonly ("caller"|"arguments")[])for(const mode of ["get","set"] as const)
        methods.set(`legacy-function-accessor:${name}:${mode}`,{name:`${mode} ${name}`,length:mode==="get"?0:1,owner:null,opaque:false});
    return methods;
})();
type PrimitiveOutcome={kind:"normal";value:Primitive}|{kind:"unknown"}|{kind:"abrupt"};
interface PrimitiveChoiceProof {
    readonly values: readonly Primitive[];
    readonly primitiveComplete: boolean;
    readonly textComplete: boolean;
}
interface PrimitiveReadiness {pending:boolean; pendingSource:boolean; unresolved:boolean; scalarUnresolved:boolean;}
interface ListPart { readonly cell: Cell; readonly spread: boolean; readonly abstractList?:true; }
const KIND_UNDEFINED=1,KIND_NULL=2,KIND_BOOLEAN=4,KIND_NUMBER=8,KIND_BIGINT=16,KIND_STRING=32,KIND_SYMBOL=64,KIND_OBJECT=128,KIND_FUNCTION=256;
const KIND_PRIMITIVE=KIND_UNDEFINED|KIND_NULL|KIND_BOOLEAN|KIND_NUMBER|KIND_BIGINT|KIND_STRING|KIND_SYMBOL;
const KIND_NUMERIC=KIND_NUMBER|KIND_BIGINT,KIND_ALL=KIND_PRIMITIVE|KIND_OBJECT|KIND_FUNCTION;
type ArgumentSequence = { readonly id: number; readonly context: ts.Node; readonly positions: Map<number, Cell> } & (
    { readonly kind: "parts"; readonly parts: readonly ListPart[] } |
    { readonly kind: "slice"; readonly source: ArgumentSequence; readonly offset: number } |
    { readonly kind: "prepend"; readonly source: ArgumentSequence; readonly prefix: readonly Cell[] });
type Atom =
    | {readonly tag:"text-operation";readonly operation:"string-codes";readonly coding:"unit"|"point";readonly parts:readonly Cell[]}
    | { readonly tag: "builtin"; readonly name: string; readonly normalResult: NonNullable<RuntimeGlobalBinding["normalResult"]>; readonly fields: ObjectOwner }
    | { readonly tag: "intrinsic"; readonly domain: Domain; readonly kind: DynamicFunctionKind;readonly realm?:SourceRealmRecord }
    | { readonly tag: "function"; readonly owner: FunctionOwner }
    | { readonly tag: "object"; readonly owner: ObjectOwner }
    | { readonly tag: "operation"; readonly operation: Operation; readonly realm?:SourceRealmRecord }
    | { readonly tag: "bound"; readonly target: Cell; readonly receiver: Cell; readonly prefix: readonly Cell[] | null; readonly fields: ObjectOwner }
    | { readonly tag: "primitive"; readonly value: Primitive }
    | { readonly tag: "non-string"; readonly kinds?: number }
    | { readonly tag: "unknown-string" }
    | { readonly tag: "abrupt" }
    | { readonly tag: "pending-source" }
    | { readonly tag: "descriptor"; readonly identity: object }
    | { readonly tag: "unknown"; readonly origin?: ts.Node; readonly native?: true }
    | { readonly tag: "opaque-object" }
    | { readonly tag: "text-operation"; readonly operation: "to-string" | "numeric" | "template" | "bound-name" | "prefix" | "coerce" | "error-text" | "primitive-string" | "util-format"; readonly numeric?: SourceNumericOperation; readonly conversion?: string; readonly operator?: ts.PrefixUnaryOperator; readonly parts: readonly Cell[] }
    | { readonly tag: "text-operation"; readonly operation: "array-join"; readonly parts: readonly Cell[]; readonly indexedRange: {readonly length:number;readonly positions:readonly number[]} }
    | { readonly tag: "text-operation"; readonly operation: "json-container"; readonly parts: readonly Cell[]; readonly keys:readonly string[]; readonly arrayLength:number|null; readonly level:number }
    | { readonly tag: "promise"; readonly value: Cell; readonly rejection: Cell }
    | { readonly tag: "promise-resolver"; readonly destination: SourcePromiseDestination; readonly reject: boolean; readonly fields:ObjectOwner }
    | { readonly tag: "generator"; readonly owner: FunctionOwner; readonly fields:ObjectOwner;readonly yielded:Cell;readonly returned:Cell }
    | { readonly tag: "global";readonly realm:SourceRealmRecord } | { readonly tag: "host" } | { readonly tag: "agent" } | { readonly tag: "realm-record";readonly realm:SourceRealmRecord };
// Any growth of any fact set or copy edge advances this epoch. A flattened
// reachable value list is reused only while the epoch is unchanged, so a
// cached list can never omit a value or edge added after it was computed.
let sourceFactsEpoch=0;
class SourceFactEdges extends Map<SourceFacts,"value"|"origin"> {
    override set(key:SourceFacts,kind:"value"|"origin"):this{sourceFactsEpoch++;return super.set(key,kind);}
}
const noAtoms:ReadonlySet<Atom>=new Set();
/** A fact collection is not a Set subclass: engines fast-path array spread
 * and iteration of Set instances by copying raw entries, which would bypass
 * the transitive traversal below (observed in JavaScriptCore's DFG tier). */
class SourceFacts implements Iterable<Atom> {
    private readonly own = new Set<Atom>();
    // One monotone dependency collection distinguishes complete value flow
    // from origin-only effects without copying every origin into each field.
    readonly sources:Map<SourceFacts,"value"|"origin"> = new SourceFactEdges();
    // The unknown subset of `own`, which is all an origin-only edge carries,
    // so a walk past a wide owner (a global object's keys) through origin
    // edges does not visit its every key. Allocated with the first unknown.
    private ownUnknown:Set<Atom>|undefined;
    private readonly memberships = new Set<Atom>();
    private knownNonempty=false;
    private flattened:readonly Atom[]|undefined;
    private flattenedEpoch=-1;
    add(atom:Atom):this{sourceFactsEpoch++;this.own.add(atom);if(atom.tag==="unknown")(this.ownUnknown??=new Set()).add(atom);return this;}
    /** Atoms stored here, without the copied sources. */
    ownValues():IterableIterator<Atom>{return this.own.values();}
    /** The unknown atoms stored here, in insertion order. */
    ownUnknownValues():IterableIterator<Atom>{return (this.ownUnknown??noAtoms).values();}
    ownHas(atom:Atom):boolean{return this.own.has(atom);}
    *[Symbol.iterator](): IterableIterator<Atom> {
        if(this.flattenedEpoch===sourceFactsEpoch&&this.flattened){yield* this.flattened;return undefined;}
        const epoch=sourceFactsEpoch,collected:Atom[]=[];
        const pending:{facts:SourceFacts;origins:boolean}[]=[{facts:this,origins:false}],visited=new Map<SourceFacts,number>(),values=new Set<Atom>();
        while(pending.length){const {facts,origins}=pending.pop()!,bit=origins?1:2,prior=visited.get(facts)??0;if(prior&bit)continue;visited.set(facts,prior|bit);
            for(const value of origins?facts.ownUnknownValues():facts.own.values())if(!values.has(value)){values.add(value);collected.push(value);yield value;}
            for(const [source,kind]of facts.sources)pending.push({facts:source,origins:origins||kind==="origin"});
        }
        // Store only a complete traversal during which nothing grew.
        if(epoch===sourceFactsEpoch){this.flattened=collected;this.flattenedEpoch=epoch;}
        return undefined;
    }
    has(atom: Atom): boolean {
        if (this.own.has(atom) || this.memberships.has(atom)) return true;
        const pending:SourceFacts[] = [this], visited = new Set<SourceFacts>();
        while (pending.length) {
            const facts = pending.pop()!;
            if (visited.has(facts)) continue; visited.add(facts);
            if (facts.own.has(atom) || facts.memberships.has(atom)) {
                // Facts and copy edges only grow. A positive membership proof
                // remains valid throughout this graph's monotone solution.
                this.memberships.add(atom); return true;
            }
            for(const [source,kind]of facts.sources)if(kind==="value"||atom.tag==="unknown")pending.push(source);
        }
        return false;
    }
    get nonempty():boolean{if(this.knownNonempty)return true;for(const _ of this){this.knownNonempty=true;return true;}return false;}
    get size(): number {let size=0; for (const _ of this) size++; return size;}
}
interface PrimitiveCellCache {proof?:PrimitiveChoiceProof;kind?:number;readiness?:PrimitiveReadiness;empty?:true;normal?:true;}
interface Cell { ownRevision:number;primitiveCache?:PrimitiveCellCache;readonly id: number; readonly values: SourceFacts; readonly users: Set<Rule>; }
/** One lazy record retains cache storage while invalidation releases stale
 * proof/readiness values immediately. Undefined is a miss; a zero kind mask
 * remains a present value. */
class SourceCellCache<Key extends keyof PrimitiveCellCache> {
    constructor(private readonly key:Key){}
    get(cell:Cell):PrimitiveCellCache[Key] {return cell.primitiveCache?.[this.key];}
    has(cell:Cell):boolean {return this.get(cell)!==undefined;}
    set(cell:Cell,value:NonNullable<PrimitiveCellCache[Key]>):void {(cell.primitiveCache??={})[this.key]=value;}
}
interface Rule { readonly inputs: Set<Cell>; readonly run: () => void; queued: boolean; }
interface SourcePropertyWrite {readonly context:ts.Node;readonly base:Cell;readonly receiver:Cell;readonly mode:"set"|"define"|"delete";readonly weak:Cell;readonly values:Cell;}
interface OwnPresence {
    readonly facts: Cell;
    readonly writes: Map<string,SourcePropertyWrite>;
    readonlyWrite?:Cell;
    readonly contexts: Map<ts.Node|undefined,Cell>;
    initial: boolean;
    readonly enumerable: Cell;
}
interface SourceCollectionRecord {readonly kind:CollectionKind;readonly entries:Map<string,{key:Cell;value:Cell;pair?:Cell}>;readonly changes:Cell;readonly shape:Cell;}
interface SourceSetLikeRecord {readonly object:Cell;readonly size:Cell;readonly has:Cell;readonly keys:Cell;readonly normal:Cell;}
interface UnknownOwnPropertyRecord {readonly keys:Cell;readonly value:Cell;readonly algorithm:Cell;readonly events:Map<string,{mode:"set"|"define"|"delete";context?:ts.Node}>;readonly prototypeInputs:Set<Cell>;readonly receiver:Cell;}
interface SourcePrivateSlot {readonly kind:"field"|"method"|"accessor";readonly value:Cell;readonly get:Cell;readonly set:Cell;}
interface ObjectOwner { arguments?:SourceArgumentsRecord; privateSlots?:Map<ClassPrivateName,SourcePrivateSlot>;propertyAlgorithm?:Cell; collectionIterator?:{kind:CollectionKind|"Array";elements:Cell;activity:Cell;source?:Cell;operation?:"keys"|"values"|"entries"}; collections?:Map<CollectionKind,SourceCollectionRecord>; readonly fields: Map<SourcePropertyKey, Cell>; readonly accessors: Map<SourcePropertyKey|null, {get:Cell;set:Cell}>; readonly shape: Cell; computedDefinitions?: {key:Cell;defined:Cell;context:ts.Node}[]; own?: Map<SourcePropertyKey, OwnPresence>; listLength?: Cell; listSources?: readonly Cell[]; prototype?: Cell; closedIndices?:boolean; closedOwn?:boolean; immutableOwn?:boolean; rawJSON?:Cell; boxed?:Map<string,Cell>; unboxed?:boolean; ordinary?:boolean; proxy?:{target:Cell;handler:Cell;context:ts.Node}; }
interface SourceDescriptorRecord {readonly normal:Cell;readonly fields:Map<string,{present:Cell;value:Cell}>;}
interface SourceJSONRecord {readonly value:Atom;readonly children:Map<string,SourceJSONRecord>;readonly source:string|null;readonly array:boolean;}
interface SourceCallArguments {readonly args:readonly Cell[]|null;readonly sequence:ArgumentSequence|null;readonly context:ts.Node;}
interface SourceArgumentsRecord {readonly value:Cell;readonly length:Cell;readonly owner:ObjectOwner;readonly mapped:Map<string,{binding:Cell;value:Cell}>;readonly seen:Set<SourceCallArguments>;}
interface FunctionOwner {
    readonly parameters:readonly ts.ParameterDeclaration[];readonly actuals:Map<string,SourceCallArguments>;readonly actualChanges:Cell;arguments?:SourceArgumentsRecord;
    readonly definition: CallableDefinition; readonly node: FunctionNode | null; readonly kind: DynamicFunctionKind; readonly fields: ObjectOwner;
    readonly yields:Cell;readonly yieldReceives:Cell;readonly yieldThrows:Cell; readonly returns: Cell; readonly throws: Cell; readonly receiver: Cell; readonly active: Cell; readonly sourceText: string;
    /** The NewTarget of every activation: undefined for a call, the construct target for a construction. */
    readonly newTarget: Cell;
    base?: Cell;
    completion?: StatementBodyCompletions;
}
interface EvaluationRecord {
    readonly node: ts.Node; readonly operation: "eval" | "eval-script" | "agent-start";
    readonly direct: boolean; readonly source: Cell | null; readonly unknown: boolean;
}
interface EvaluationEnvironment {
    readonly source: ts.SourceFile;
    readonly direct: boolean;
    readonly realms:Cell;
    readonly callers: Map<ts.Node,Set<SourceRealmRecord>>;
    readonly references: Map<ts.Identifier, {value: Cell; writes: Cell}>;
    readonly declarations:Map<string,{node:ts.Identifier;function?:ts.FunctionDeclaration;annexB?:true;updates?:ts.FunctionDeclaration[]}>;
}
interface SourceRealmRecord {objectPrototype?:Cell;readonly bindings:Map<string,Cell>;owner?:ObjectOwner;host?:ObjectOwner;readonly global:Atom;readonly record:Atom;readonly operations:Map<Operation,Atom>;readonly intrinsics:Map<string,Atom>;}
type SourceActivation=FunctionOwner|ts.SourceFile;
interface SourcePromiseDestination {readonly value:Cell;readonly rejection:Cell;readonly origin:ts.Node;resolvers?:Map<ts.Node,readonly Cell[]>;}
type SourceReferenceExpression=ts.PropertyAccessExpression|ts.ElementAccessExpression;
interface SourceReference {readonly target:SourceReferenceExpression;readonly operation:ts.Node;readonly completion:ts.Node;readonly read:boolean;base?:Cell;key?:Cell;readContext?:ts.Node;writeContext?:ts.Node;}
interface SourceWriteOrigin {readonly tag:"unknown";readonly origin:ts.Node;readonly location:Cell;readonly lexical:boolean;readonly reference?:ts.Identifier;readonly event?:SourceLexicalWrite;}
interface SourceCapturePhase {readonly id:number;readonly kind:"capture";readonly context:ts.Node;readonly argumentsRead:boolean;readonly location?:Cell;readonly activationOnly?:FunctionOwner;readonly scalar?:{readonly activation:FunctionOwner;readonly excluded:ReadonlySet<SourceLexicalWrite>;readonly universe:ReadonlySet<SourceLexicalWrite>;readonly universeKey:string};}
interface SourceCaptureConstraints {readonly kind:"capture-constraints";readonly phases:readonly SourceCapturePhase[];}
type SourceProjectionPhase = SourceCapturePhase | {readonly kind:"return"};

const BOOLEAN_BINARY_RESULTS = new Set<ts.SyntaxKind>([
    ts.SyntaxKind.InKeyword, ts.SyntaxKind.InstanceOfKeyword,
]);
const PROPERTY_MUTATIONS = new Set<Operation>(["define-property", "define-properties", "set-property", "delete-property"]);
const RETURN_PROJECTION_BUDGET = 8;
/** Operand combinations one text operation's value proof may enumerate. Each
 * combination is evaluated and its result interned, so a JSON text, join or
 * concatenation over many independent choices (24 two-way properties already
 * give 2^24 texts) would exhaust memory before any eval site's own choice
 * limit applies; past the bound the result is a value the analysis does not
 * list, and a boolean result is either boolean. It also bounds the steps of a
 * search for one normal completion (primitiveCompletions). */
const PRIMITIVE_CHOICE_PRODUCT_LIMIT = 65_536;
/** Solver steps (rule evaluations, initializations, primitive flushes) one
 * source-value solve may perform: a deterministic backstop well above legitimate
 * analyses (ordinary programs use under 50k, the largest property suites
 * a few million); the memory-growth limit bounds runaway ones first.
 * TSC2C_SOURCE_ANALYSIS_BUDGET overrides it. */
const DEFAULT_SOURCE_ANALYSIS_RULE_BUDGET = 20_000_000;
/** Resident-memory growth during one solve above which it stops (checked
 * every 4096 steps).
 * This only ever leaves more dynamic-code sources unproven, which fails
 * closed. TSC2C_SOURCE_ANALYSIS_MEMORY_MB overrides it. */
const DEFAULT_SOURCE_ANALYSIS_MEMORY_MB = 3072;
/** Value cells one solve may allocate before it stops (fail closed like the
 * step budget, and deterministic unlike resident memory): a cascade in which
 * every call site escapes the global object allocates cells without bound,
 * while ordinary programs stay under ten thousand and the largest property
 * stress inputs under four hundred thousand. TSC2C_SOURCE_ANALYSIS_CELLS
 * overrides it. */
const DEFAULT_SOURCE_ANALYSIS_CELL_BUDGET = 1_000_000;
/** Distinct source texts one eval site may contribute before it fails closed
 * as an unknown source (a site enumerating every code unit would otherwise
 * generate tens of thousands of eval code files). TSC2C_EVAL_SOURCE_CHOICES
 * overrides the limit. */
function evalSourceChoiceLimit(): number {
    const raw = process.env.TSC2C_EVAL_SOURCE_CHOICES;
    if (raw === undefined || raw === "") return 1024;
    if (!/^[1-9][0-9]{0,9}$/.test(raw)) throw new Error(`TSC2C_EVAL_SOURCE_CHOICES must be a positive integer, got ${JSON.stringify(raw)}`);
    return Number(raw);
}
function sourceAnalysisCellBudget(): number {
    const raw = process.env.TSC2C_SOURCE_ANALYSIS_CELLS;
    if (raw === undefined || raw === "") return DEFAULT_SOURCE_ANALYSIS_CELL_BUDGET;
    if (!/^[1-9][0-9]{0,9}$/.test(raw)) throw new Error(`TSC2C_SOURCE_ANALYSIS_CELLS must be a positive integer, got ${JSON.stringify(raw)}`);
    return Number(raw);
}
function sourceAnalysisMemoryLimit(): number {
    const raw = process.env.TSC2C_SOURCE_ANALYSIS_MEMORY_MB;
    if (raw === undefined || raw === "") return DEFAULT_SOURCE_ANALYSIS_MEMORY_MB * 1048576;
    if (!/^[1-9][0-9]{0,9}$/.test(raw)) throw new Error(`TSC2C_SOURCE_ANALYSIS_MEMORY_MB must be a positive integer, got ${JSON.stringify(raw)}`);
    return Number(raw) * 1048576;
}
/** Exhaustion warnings go to the active compile's diagnostic writer (once per
 * compile), so hosts that own stdout/stderr keep their protocol intact. */
let sourceAnalysisWarningWriter:((message:string)=>void)|undefined;
let sourceAnalysisWarned=false;
export function setSourceAnalysisWarningWriter(writer:((message:string)=>void)|undefined):void {
    sourceAnalysisWarningWriter=writer;sourceAnalysisWarned=false;
}
function reportSourceAnalysisExhaustion(message:string):void {
    if(sourceAnalysisWarned)return;sourceAnalysisWarned=true;
    (sourceAnalysisWarningWriter??(text=>process.stderr.write(text)))(message);
}
function sourceAnalysisRuleBudget(): number {
    const raw = process.env.TSC2C_SOURCE_ANALYSIS_BUDGET;
    if (raw === undefined || raw === "") return DEFAULT_SOURCE_ANALYSIS_RULE_BUDGET;
    if (!/^[1-9][0-9]{0,15}$/.test(raw)) throw new Error(`TSC2C_SOURCE_ANALYSIS_BUDGET must be a positive integer, got ${JSON.stringify(raw)}`);
    return Number(raw);
}

function conversionOperands(node: ts.Node): readonly ts.Expression[] | null {
    if (ts.isComputedPropertyName(node)) return [node.expression];
    const operation = sourceNumericOperation(node);
    if (operation) return ts.isBinaryExpression(node) ? [node.left, node.right] : [(node as ts.PrefixUnaryExpression | ts.PostfixUnaryExpression).operand];
    // `key in object` converts only its left operand (ToPropertyKey); the
    // right operand is required to be an Object and is never coerced.
    // `#x in object` is a brand check: its private name is never converted.
    if (ts.isBinaryExpression(node) && node.operatorToken.kind===ts.SyntaxKind.InKeyword)return ts.isPrivateIdentifier(node.left)?null:[node.left];
    return null;
}

function functionNode(node: ts.Node): node is FunctionNode {
    return ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node) || ts.isConstructorDeclaration(node);
}
function callableDefinition(node: ts.Node): node is CallableDefinition {
    return functionNode(node) || ts.isClassDeclaration(node) || ts.isClassExpression(node);
}
/** Non-strict normal functions: the only receivers on which
 * Function.prototype.caller/arguments read instead of throwing. */
function legacyCallerReceiver(owner: FunctionOwner): boolean {
    const definition=owner.definition;
    return (ts.isFunctionDeclaration(definition)||ts.isFunctionExpression(definition))&&owner.kind==="ordinary"&&!isStrictCodeContext(definition);
}
/** Any non-strict source function: a value Function.prototype.caller may report. */
function legacyCallerValue(owner: FunctionOwner): boolean {
    return functionNode(owner.definition)&&!isStrictCodeContext(owner.definition);
}
function propertyName(node: ts.Node | undefined): string | null {
    if (!node) return null;
    if (ts.isIdentifier(node) || ts.isStringLiteralLike(node) || ts.isNumericLiteral(node) || ts.isBigIntLiteral(node)) return literalPropertyKey(node);
    if (ts.isPropertyAccessExpression(node)) return node.name.text;
    return null;
}

/** One context-insensitive, monotone source-value graph. Cells represent source
 * values and binding/property locations; rules represent semantic projections.
 * All atoms are interned by source owner or intrinsic identity. Calls add edges
 * to actual formals/results, so recursion and aliases close the same worklist.
 * Property discovery never asks TypeScript to infer a receiver/member type. */
class SourceValueFlow {
    private readonly enclosingActivations=new WeakMap<ts.Node,FunctionOwner|null>();
    private factRevision=0;
    // Invocation timing grows only through recordInvocationTiming; its own
    // revision lets parent-chain timing queries be reused between growths.
    private timingRevision=0;
    private readonly timingQueries=new Map<ts.Node,{revision:number;answers:Map<string,boolean>}>();
    private readonly opaqueQueries=new Map<ts.Node|undefined,Map<boolean,{revision:number;known:WeakMap<SourceFacts,boolean>}>>();
    private readonly cells = new Map<ts.Node, Cell>();
    private readonly presenceRules = new Set<Rule>();
    private presenceClosed = false;
    private readonly errorPrototypes = new Map<string,Cell>();
    private readonly primitivePrototypes = new Map<string,Cell>();
    private readonly typedArrayPrototypes = new Map<string,Cell>();
    private readonly typedArrayConstructions = new Map<ts.Node,Set<number>>();
    private readonly atomicsWaitResults = new Map<ts.Node,Cell>();
    private readonly promiseConstructions = new Map<ts.Node,Map<string,Cell>>();
    private readonly promiseDestinations = new Map<Cell,Map<Cell,SourcePromiseDestination>>();
    private readonly instanceSources = new Map<ts.Node,Map<string,Cell>>();
    private readonly timerCallbacks = new Map<ts.Node,Map<string,{context:ts.Node;result:Cell}>>();
    private readonly primitiveBoxes = new Map<ts.Node,Map<string,Cell>>();
    private readonly primitiveStringFields = new WeakMap<ObjectOwner,{input:Cell;keys:Set<SourcePropertyKey>}>();
    private readonly ownerFieldEffects = new WeakMap<ObjectOwner,Cell>();
    private readonly unknownPropertyLocations = new Map<ObjectOwner,UnknownOwnPropertyRecord>();
    private readonly ownerRealms = new WeakMap<ObjectOwner,SourceRealmRecord>();
    private readonly booleanPrimitives = new Map<Cell,Cell>();
    private readonly primitiveDefaults = new Map<string,Cell>();
    private readonly defaultedPrimitiveInputs = new Map<Cell,Map<string,Cell>>();
    private readonly primitiveMethodResults = new Map<ts.Node,Map<string,Cell>>();
    private readonly sameValueQueries=new Map<ts.Node,Map<string,Cell>>();
    private readonly ownPropertyQueries=new Map<ts.Node,Map<string,Cell>>();
    private readonly hasProperties=new Map<ts.Node,Map<Cell,Map<SourcePropertyKey,Cell>>>();
    private readonly proxyCreations=new Map<ts.Node,Map<string,Cell>>();
    private readonly objectCoercions = new Map<ts.Node,Map<Cell,Cell>>();
    private readonly prototypeReads = new Map<ts.Node,Map<string,Cell>>();
    private readonly prototypeWrites = new Map<ts.Node,Map<string,Cell>>();
    private readonly writablePrototypes = new Map<ObjectOwner,Cell>();
    private readonly arrayIterations=new Map<ts.Node,Map<string,Cell>>();
    private readonly arraySpeciesResults=new Map<ts.Node,Map<string,Cell>>();
    private readonly freshArrays=new Map<ts.Node,Map<string,Cell>>();
    private readonly invocationTimings=new WeakMap<ts.Node,{readonly repeated:boolean;readonly deferred:boolean}>();
    private readonly arrayPushes=new Map<ts.Node,Map<string,Cell>>();
    private readonly arrayJoinSummaries=new Map<ts.Node,Map<string,Cell>>();
    private readonly arrayTexts = new Map<ts.Node,Map<Cell,Cell>>();
    private readonly objectTexts = new Map<ts.Node,Map<Cell,Cell>>();
    private readonly constructorChecks = new Map<ts.Node,Map<Cell,Cell>>();
    private readonly jsonPrimitiveResults = new Map<ts.Node,Map<string,Cell>>();
    private readonly nativeExceptions = new Map<ts.Node,Map<SourceRealmRecord,Map<string|undefined,Atom>>>();
    private readonly errorStrings = new Map<ts.Node,Map<Cell,Cell>>();
    private readonly jsonSerializations = new Map<ts.Node, Map<string, Cell>>();
    private readonly rawJSONResults = new Map<ts.Node, Map<Cell, Cell>>();
    private readonly jsonParses = new Map<ts.Node, Map<string, Cell>>();
    private readonly descriptorRecords = new Map<ts.Node,Map<Cell,SourceDescriptorRecord>>();
    private readonly descriptorWrites=new Map<ts.Node,Set<string>>();
    private readonly descriptorReads=new Map<ts.Node,Map<string,Cell>>();
    private readonly objectCreations = new Map<ts.Node,Map<string,Cell>>();
    private readonly proxyReads = new Map<string,Cell>();
    private readonly promiseOwners = new WeakMap<Atom,ObjectOwner>();
    private promisePrototypeValue?:Cell;
    private readonly promiseResolveOwners=new Map<ts.Node,ObjectOwner>();
    private readonly generatorInstances=new Map<ts.Node,Map<string,Cell>>();
    private readonly generatorReactions=new Map<ts.Node,Map<string,Cell>>();
    private readonly asyncIteratorPrototypes=new WeakMap<SourceRealmRecord,Cell>();
    private readonly sourceObjectOwners=new WeakSet<ObjectOwner>();
    private readonly opaqueCaptureCalls=new Map<ts.Node,Set<Cell>>();
    private readonly escapedCallableCalls=new Map<ts.Node,Map<boolean,{visit:(input:Cell,as?:EscapeReachKind)=>void}>>();
    /** One actual List per Script for the values unknown code passes from
     * its top-level escape points (see escapeCallableArgument). */
    private readonly topLevelEscapeActuals=new Map<ts.SourceFile,Cell>();
    private readonly escapeReaches=new Map<string,{cells:Map<Cell,EscapeReach>;atoms:Map<Atom,EscapeReach>}>();
    private readonly escapedInvocationOrigins=new WeakMap<ts.Node,ts.Node>();
    /** Opaque code invokes an async callee with unknown actuals, so all such
     * invocations share one resolution record per callee: a fresh record per
     * synthetic site would let each resolution job escape the callee again. */
    private readonly opaqueAsyncResolutions=new WeakMap<object,{returned:Cell;resolved:SourcePromiseDestination}>();
    private readonly escapeContexts=new WeakMap<ts.Node,ts.Node>();
    private readonly promiseReactions = new Map<ts.Node,Map<string,Cell>>();
    private readonly sourceCells = new WeakMap<SourceFacts,Cell>();
    private readonly formalInputs = new Map<Cell,Set<Cell>>();
    private readonly propertyReads = new Map<Cell,Map<SourcePropertyKey,Map<ts.Node|undefined,Map<string,Cell>>>>();
    private readonly computedReads = new Map<Cell,Map<Cell,Map<ts.Node,Map<Cell,Cell>>>>();
    private readonly returnProjections = new Map<string,Cell>();
    /** Distinct per-invocation projections of each return root. Past a fixed
     * budget, further invocations share one merged projection whose formal
     * inputs accumulate every actual: a bounded, sound widening that keeps
     * helper-heavy call graphs from cloning return slices per call site. */
    private readonly returnProjectionCounts = new Map<Cell,number>();
    private readonly mergedReturnProjections = new Map<Cell,{formals:ReadonlyMap<Cell,Cell>;result:Cell}>();
    private readonly returnProjectionPhases = new Map<string,SourceProjectionPhase>();
    private readonly projectedCellPhases = new WeakMap<Cell,ReadonlySet<SourceProjectionPhase>>();
    private readonly projectedAtomPhases = new WeakMap<Atom,ReadonlySet<SourceProjectionPhase>>();
    private readonly bindingDefaults = new Map<Cell,Map<Cell,Cell>>();
    private readonly returnTransforms = new Map<Cell,{kind:"projection"|"allocation"|"binding-read"|"conversion";inputs:readonly Cell[];evaluate:(inputs:readonly Cell[])=>Cell}>();
    private readonly normalResults = new Map<Cell, Atom>();
    private readonly exceptionHandlers = new Map<ts.Node, Cell>();
    private readonly exceptionCells = new Set<Cell>();
    private readonly catchGuards = new Map<ts.CatchClause, Cell>();
    private readonly bindings = new Map<ts.Symbol, Cell>();
    private readonly evaluationVarBindings=new Map<FunctionOwner,Map<string,Cell>>();
    private readonly evaluationDeclarationBindings=new Map<Cell,{origins:Set<ts.Node>;fallback?:Cell}>();
    /** An undeclared name inside a function reads a binding a direct eval in
     * that function may declare; without such a declaration it is this
     * global binding. */
    private readonly activationGlobalFallbacks=new Map<Cell,Cell>();
    private readonly utilModules = new Map<boolean,{value:Cell;owner:ObjectOwner}>();
    private readonly utilExportValues = new Map<string,Cell>();
    private readonly fsModules = new Map<string,{value:Cell;owner:ObjectOwner}>();
    private readonly fsExportValues = new Map<string,Cell>();
    private readonly globalLexicals = new Map<string,{value:Cell;mutable:boolean}>();
    private readonly collectionKeys=new Map<Cell,Cell>();
    private readonly collectionPrototypes=new Map<CollectionKind,Cell>();
    private readonly collectionConstruction=new Map<ts.Node,Map<string,Cell>>();
    private readonly collectionViews=new Map<Cell,Map<ts.Node,Map<string,{elements:Cell;activity:Cell}>>>();
    private readonly collectionIterators=new Map<Cell,Map<ts.Node,Map<string,Cell>>>();
    private readonly collectionIteratorPrototypes=new Map<CollectionKind,Cell>();
    private readonly setLikeRecords=new Map<Cell,Map<ts.Node,SourceSetLikeRecord>>();
    private readonly objects = new Map<ts.Node, ObjectOwner>();
    private readonly literalLists = new WeakMap<ObjectOwner,{node:ts.ArrayLiteralExpression;parts:readonly ListPart[];holes:ReadonlySet<Cell>}>();
    private readonly ownKeyArrays=new Map<ts.Node,Map<string,Cell>>();
    private readonly reflectiveGets=new Map<ts.Node,Map<string,Cell>>();
    private readonly arrayLikeLengths = new Map<Cell,Map<ts.Node,Cell>>();
    private readonly indexedReads = new Map<Cell,Map<ts.Node,Map<string,Cell>>>();
    private readonly iterationMethods = new Map<Cell,Map<ts.Node|undefined,Cell>>();
    private readonly iterationActivity = new Map<Cell,Cell>();
    private readonly iterationRecords = new Map<Cell,Cell>();
    private readonly arrayIterators = new Map<ts.Node,Map<Cell,Map<string,Cell>>>();
    private readonly arrayIterationViews=new Map<Cell,Map<ts.Node,Map<string,{elements:Cell;activity:Cell}>>>();
    private ordinaryIteratorPrototype?:Cell;
    private ordinaryArrayIteratorPrototype?:Cell;
    private readonly iterationElements = new Map<Cell, Map<ts.Node, Cell>>();
    private readonly directIterationElements=new Map<Cell,Map<ts.Node,Cell>>();
    private readonly argumentValues = new Map<ArgumentSequence, Cell>();
    private readonly argumentSequences = new Map<ts.Node, Map<string, ArgumentSequence>>();
    private nextArgumentSequence = 0;
    private readonly arrayLikeObjectInputs = new Map<Cell,Cell>();
    private undefinedCallReceiver?:Cell;
    private readonly functionThisBindings=new Map<FunctionOwner,Map<Cell,Cell>>();
    private readonly functions = new Map<CallableDefinition, FunctionOwner>();
    /** Non-strict functions that may sit below a function on the call stack:
     * the enclosing functions of its recorded call sites, transitively, since
     * a direct C call leaves no frame and the runtime then reports an older
     * frame. Function.prototype.caller reads from this set or null. */
    private readonly legacyCallerSets=new Map<FunctionOwner,Cell>();
    private readonly stackCallerSets=new Map<ts.Node,Cell>();
    private legacyCallersOf(owner:FunctionOwner):Cell {
        let cell=this.legacyCallerSets.get(owner);if(cell)return cell;
        const set=this.newCell();this.legacyCallerSets.set(owner,set);
        const seen=new Set<SourceCallArguments>();
        this.rule([owner.actualChanges],()=>{
            for(const record of owner.actuals.values()){
                if(seen.has(record))continue;seen.add(record);
                const enclosing=this.enclosingFunctionOwner(record.context);
                if(!enclosing)continue;
                if(legacyCallerValue(enclosing))this.publish(set,{tag:"function",owner:enclosing});
                this.copy(this.legacyCallersOf(enclosing),set);
            }
        });
        return set;
    }
    /** Functions that may be executing when `node` runs: its enclosing
     * function and everything below that on the stack. */
    private stackCallers(node:ts.Node):Cell {
        let cell=this.stackCallerSets.get(node);if(cell)return cell;
        cell=this.newCell();this.stackCallerSets.set(node,cell);
        const enclosing=this.enclosingFunctionOwner(node);
        if(enclosing){if(legacyCallerValue(enclosing))this.publish(cell,{tag:"function",owner:enclosing});this.copy(this.legacyCallersOf(enclosing),cell);}
        return cell;
    }
    private enclosingFunctionOwner(node:ts.Node):FunctionOwner|null {
        const fn=ts.findAncestor(node.parent??node,functionNode);
        return fn?this.function(fn):null;
    }
    private readonly activationCalls=new Map<SourceActivation,{targets:Set<SourceActivation>;callers:Set<SourceActivation>}>();
    private readonly cyclicActivationTiming=new Map<SourceActivation,Cell>();
    private readonly reachingWriteGraphs=new Map<SourceActivation,SourceReachingWrites>();
    private readonly bindingReads=new WeakMap<ts.Identifier,Map<Cell,Cell>>();
    private readonly projectedFormalInputs=new WeakMap<Cell,Set<Cell>>();
    private readonly ownerAtoms = new WeakMap<ObjectOwner | FunctionOwner, Map<Atom["tag"], Atom>>();
    private readonly promiseAtoms = new WeakMap<Cell, WeakMap<Cell, Atom>>();
    private readonly restLocations = new Map<ts.ParameterDeclaration, {value: Cell; owner: ObjectOwner}>();
    private readonly restPatternLocations = new Map<ts.BindingElement, {value: Cell; owner: ObjectOwner}>();
    private readonly moduleNamespaces = new Map<ts.SourceFile, {value: Cell; owner: ObjectOwner}>();
    private readonly moduleMetadata = new Map<ts.SourceFile, Cell>();
    private readonly importTargetCells = new Map<ts.CallExpression,Cell>();
    private readonly moduleNamespacePending: {source: ts.SourceFile; symbol: ts.Symbol|undefined; owner: ObjectOwner}[] = [];
    private readonly queue: Rule[] = [];
    private queueCursor = 0;
    private readonly initializers: Array<{ node: ts.Node; result: Cell }> = [];
    private readonly accessorDefinitions = new Map<Cell,ts.Node>();
    private readonly accessorCallees = new Map<Cell,Cell>();
    private readonly accessorSlots = new Set<Cell>();
    private readonly callResults = new Map<ts.Node,Map<string,Cell>>();
    private readonly invocations = new Map<Rule, Map<string, { kind: DynamicFunctionKind; args: readonly Cell[] | null }>>();
    private readonly inactiveEvaluationCandidates=new Map<ts.Node,Set<boolean>>();
    /** Literal `eval("...")` calls inside a function body. An activation the
     * solver never enters projects no values, yet a call reaching it through
     * a route the graph does not represent can only evaluate that literal. */
    private readonly literalEvaluationCandidates=new Map<ts.CallExpression,{direct:boolean;text:string}>();
    private readonly evaluationInvocations = new Map<Rule, Map<string, EvaluationRecord>>();
    // Interned primitive atoms per typeof. Map keys use SameValueZero, so -0
    // keeps its own atom while NaN and BigInt values intern by value.
    private readonly primitives = new Map<string, Map<unknown, Atom>>();
    private negativeZeroPrimitive?: Atom;
    private readonly symbolPrimitives = new Map<symbol, Atom>();
    private readonly symbolIdentities = new Map<symbol, number>();
    private readonly freshSymbols = new Set<symbol>();
    private readonly symbolAllocations = new Map<ts.Node, Map<string | undefined, symbol>>();
    private readonly symbolDescriptionInputs = new Map<Cell, Cell>();
    private readonly symbolRegistry = new Map<string, symbol>();
    private readonly wellKnownSymbols = new Map([...runtimeWellKnownSymbolDescriptions].map(([name, description]) => [name, Symbol(description)]));
    private readonly nonString: Atom = { tag: "non-string" };
    private readonly numericValues = new Map<number, Atom>();
    private readonly unknown: Atom = { tag: "unknown" };
    /** An unmodelled value produced by a bounded native (an Array, Iterator,
     * RegExp or other builtin method without a precise model): it is a
     * builtin value or one reachable from the native's receiver and
     * arguments, whose callables already escaped at that call. Reading,
     * calling or constructing through it is bounded the same way and never
     * takes the global opaque effect reserved for unknown code. */
    private readonly nativeUnknown: Atom = { tag: "unknown", native: true };
    /** A native value may be any object the program created that reached a
     * native through its receiver and arguments (its escape graph). Writes through
     * native values feed two shared cells, and each such object links to them
     * once: the written keys become its unknown-key record, whose value is a
     * native value (every written value escapes at the store), and the
     * execution origins of a deletion, definition, prototype change or native
     * mutation widen its shape. The cost is one edge per write and one link
     * per object, independent of their product. */
    private readonly nativeAliasOwners = new Set<ObjectOwner>();
    /** The values a realm gives a global binding when it creates it: its
     * intrinsics under their own names. */
    private readonly initialGlobalValues=new Map<Cell,ReadonlySet<Atom>>();
    /** A global field's values other than the realm-created ones. */
    private readonly writtenGlobalValues=new Map<Cell,Cell>();
    private readonly nativeAliasKeys = this.newCell();
    private readonly nativeAliasMutation = this.newCell();
    private readonly opaqueObject: Atom = { tag: "opaque-object" };
    private readonly abrupt: Atom = {tag:"abrupt"};
    private readonly pendingSource: Atom = {tag:"pending-source"};
    private readonly evaluations = new Map<string, {file:ts.SourceFile|null;completion:Cell}[]>();
    private readonly evaluationThrows = new Map<string,Cell[]>();
    private readonly scriptCompletions = new Map<ts.SourceFile,{summary:StatementBodyCompletions;throws:Cell}>();
    private readonly evaluationOrigins = new Map<string, Cell[]>();
    private readonly sourceOrigins = new Map<ts.SourceFile, Cell>();
    private readonly evaluationEnvironments = new Map<ts.SourceFile, EvaluationEnvironment>();
    private readonly evaluationSourceEnvironments = new Map<string, EvaluationEnvironment[]>();
    private readonly evaluationReferenceTargets = new Map<ts.Node, Map<string, ts.Identifier>>();
    private readonly evaluationGlobalTargets = new WeakMap<ts.Identifier,SourceRealmRecord>();
    private readonly evaluationRealmTargets=new Map<ts.Node,Map<SourceRealmRecord,Map<string,ts.Identifier>>>();
    private readonly evaluationCallerTargets = new WeakSet<ts.Identifier>();
    private readonly dynamicSourceTexts = new Map<FunctionNode, string>();
    private readonly callablePrototypes = new Map<DynamicFunctionKind, Cell>();
    private readonly callableTargets = new Map<Cell,Map<ts.Node,{callable:Cell;completion:Cell}>>();
    private ordinaryObjectPrototype?: Cell;
    private ordinaryArrayPrototype?: Cell;
    private readonly generated = new Map<string,{entry:FunctionConstructorEntry;value:Cell;environment:EvaluationEnvironment|null}>();
    private readonly currentRealm = this.newRealm();
    private readonly realmAllocations=new Map<ts.Node,SourceRealmRecord>();
    private readonly global: Atom = this.currentRealm.global;
    private readonly host: Atom = { tag: "host" };
    private readonly agent: Atom = { tag: "agent" };
    private nextCell = 0;
    private readonly currentRealmCell=this.newCell();
    private readonly booleanResult = this.newCell();
    private readonly unknownString: Atom = {tag:"unknown-string"};
    private readonly opaqueMutation = this.newCell();
    private readonly opaqueEffects = new Map<ts.Node, Atom>();
    private readonly opaqueEffectActivations=new WeakSet<ts.Node>();
    private readonly originCells = new WeakMap<ts.Node, Cell>();
    private readonly unconstrainedOrigins = this.newCell();
    private readonly scriptOrder = new Map<ts.SourceFile,{first:number;last:number}>();
    private readonly dynamicContexts = new WeakMap<ts.Node, boolean>();
    private readonly sourceFiles = new WeakMap<ts.Node, ts.SourceFile>();
    private readonly evaluationOrder = new SourceEvaluationOrder();
    private readonly equalityResults=new WeakMap<ts.Node,Map<string,Cell>>();
    private readonly normalCompletions=new WeakMap<Cell,Cell>();
    private readonly executionGuards = new WeakMap<ts.Node, readonly {condition: Cell; truthy: boolean}[]>();
    private readonly captureInputs=new WeakMap<Cell,{source:Cell;constraints:SourceCaptureConstraints}>();
    private readonly captureConstraints=new Map<string,SourceCaptureConstraints>();
    private readonly capturedAtoms=new WeakMap<Atom,Map<SourceCaptureConstraints,Atom>>();
    private readonly capturedAtomInputs=new WeakMap<Atom,{source:Atom;constraints:SourceCaptureConstraints}>();
    private failedCapture?:Cell;
    private nextCapturePhase=0;
    private readonly activationCapturePhases=new Map<FunctionOwner,SourceCapturePhase>();
    private readonly scalarCapturePhases=new Map<FunctionOwner,Map<Cell,Map<string,SourceCapturePhase>>>();
    private readonly normalizedCapturePhases=new WeakMap<SourceCapturePhase,SourceCapturePhase>();
    /** Answers that depend only on facts, valid while no fact set grows:
     * capture phases that normalize to themselves, and activations whose
     * cyclic timing is still empty. Pairwise phase comparisons repeat them. */
    private factEpochAnswers={epoch:-1,unfiltered:new Set<SourceCapturePhase>()};
    private readonly capturePhases=new Map<ts.Node,Map<boolean,Map<Cell|undefined,SourceCapturePhase>>>();
    private readonly propertyLocations=new Set<Cell>();
    private readonly privateAccesses=new Map<ts.Node,Map<string,Cell>>();
    private readonly privateTemplates=new Map<ClassPrivateName,SourcePrivateSlot>();
    private readonly privateSlotRegistry=new Map<ClassPrivateName,{slots:Set<SourcePrivateSlot>;changes:Cell}>();
    private readonly evaluationCallerChanges=new Map<EvaluationEnvironment,Cell>();
    private readonly evaluationThisValues=new Map<EvaluationEnvironment,Cell>();
    private readonly unresolvedPrivateContexts=new Set<ts.Node>();
    private unresolvedPrivate=false;
    private readonly knownWrites=new Map<Cell,Map<ts.Node,Map<Cell,Map<boolean,Map<ts.Identifier|undefined,Cell>>>>>();
    private readonly lexicalWriteEvents=new Map<ts.Node,Map<ts.Identifier,SourceLexicalWrite>>();
    private readonly bindingWriteSites=new Map<ts.Symbol,Map<ts.Node,Map<ts.Identifier,SourceLexicalWrite>>>();
    private nextLexicalWrite=0;
    private readonly assignmentTargets=new WeakMap<ts.Expression,{binding:ts.BindingName|null;references:Map<ts.Identifier,ts.Expression>}>();
    private readonly sourceReferences=new WeakMap<SourceReferenceExpression,SourceReference>();
    private readonly assignmentDefaults=new WeakSet<ts.BinaryExpression>();
    private readonly writtenAmbientBindings=new WeakSet<Cell>();
    /** Global bindings a Script declaration initializes. Another Script's read
     * of one is not an unresolved external input, even while the declaring
     * initializer is still pending (a spread or pattern whose List readiness
     * waits for owner presence to close). */
    private readonly scriptDeclaredBindings=new WeakSet<Cell>();
    private readonly knownWriteOrigins=new WeakMap<Cell,SourceWriteOrigin>();
    private readonly ownerCreations=new WeakMap<ObjectOwner,ts.Node>();
    private readonly thisBindings=new Map<ts.Node,Cell>();
    private proxyCreated=false;
    private readonly pendingProxyMethods:{objects:Cell;traps:readonly string[];context:ts.Node;chain:boolean}[]=[];
    private readonly proxyInternalCalls=new Map<ts.Node,Set<string>>();
    private readonly proxyTrapCalls=new Map<ts.Node,Map<string,Cell>>();
    private readonly arrayLengthWrites=new WeakMap<ObjectOwner,Map<string,Cell>>();
    private readonly templateObjects=new Map<ts.TaggedTemplateExpression,Cell>();
    private readonly confinedLiterals=new WeakMap<ts.Node,boolean>();
    private readonly readCaptures = new Map<Cell,Map<SourceCaptureConstraints,Cell>>();
    private readonly empty = this.newCell();
    private readonly globalMutation = this.newCell();
    private readonly globalReceiver = this.newCell();
    private readonly propertyWriteUncertainty = new Map<ts.Node,Cell>();
    private readonly propertyWrites = new Set<string>();
    private readonly hintPrimitives = new Map<Cell, Map<ts.Node | undefined, Map<PrimitiveHint, Cell>>>();
    private readonly stringConversions = new Map<Cell, Map<ts.Node, Map<boolean, Cell>>>();
    private readonly orderedConversions = new Map<ts.Node, Map<string, readonly Cell[]>>();
    private readonly numericConversions = new Map<Cell, Map<ts.Node, Map<string, Cell>>>();
    private readonly numericWrites = new Map<ts.Node, Cell>();
    private readonly primitiveProofCache = new SourceCellCache("proof");
    private readonly primitiveKindCache = new SourceCellCache("kind");
    private readonly primitiveProofParents = new Map<Cell, Set<Cell>>();
    private readonly primitiveReadyCache = new SourceCellCache("readiness");
    // A change flush does not clear it: facts only grow, so a normal
    // completion found among them stays possible.
    private readonly primitiveNormalCache = new SourceCellCache("normal");
    private readonly primitiveChanges = new Set<Cell>();
    private readonly hostOwners = new Map<"host" | "agent", ObjectOwner>();
    private readonly intrinsicOwners = new Map<Atom, ObjectOwner>();
    private readonly checker: ts.TypeChecker;
    private readonly invalidEvaluations = new Set<string>();
    private readonly test262Host:boolean;
    constructor(private readonly program: ts.Program, entries: SourceValueGraphEntries, private readonly domain?:string, sources?:ReadonlySet<ts.SourceFile>) {
        this.checker = program.getTypeChecker();
        this.test262Host=entries.host==="test262";
        this.publish(this.currentRealmCell,this.currentRealm.record);
        for (const [index,filename] of (entries.roots??[]).entries()) {
            const file=program.getSourceFile(sourceUnitFileName(program,path.resolve(filename),"script"));
            if(file&&ecmaParseGoal(file)==="script"&&(!sources||sources.has(file))){const prior=this.scriptOrder.get(file);this.scriptOrder.set(file,{first:prior?.first??index,last:index});}
        }
        const files=program.getSourceFiles().filter(file=>(!sources||sources.has(file))&&!file.isDeclarationFile&&
            (sourceUnitBodyIncluded(program,file)||(entries.evaluations??[]).some(entry=>entry.entry&&path.resolve(entry.entry)===path.resolve(file.fileName))||
             (entries.functions??[]).some(entry=>entry.entry&&path.resolve(entry.entry)===path.resolve(file.fileName))));
        for(const file of files)this.indexSourceReferences(file);
        for (const source of this.scriptOrder.keys()) for (const statement of source.statements) {
            if (isAmbientSourceDeclaration(statement)) continue;
            if (ts.isVariableStatement(statement) && statement.declarationList.flags & ts.NodeFlags.BlockScoped) {
                for (const declaration of statement.declarationList.declarations) {
                    const pending: ts.BindingName[] = [declaration.name];
                    while (pending.length) {
                        const name = pending.pop()!;
                        if (ts.isIdentifier(name)) {
                            if (!this.globalLexicals.has(name.text)) this.globalLexicals.set(name.text,{value:this.newCell(),mutable:!(statement.declarationList.flags&(ts.NodeFlags.Const|ts.NodeFlags.Using))});
                            this.scriptDeclaredBindings.add(this.globalLexicals.get(name.text)!.value);
                        } else for (const element of name.elements) if (!ts.isOmittedExpression(element)) pending.push(element.name);
                    }
                }
            } else if (ts.isVariableStatement(statement)) {
                for (const declaration of statement.declarationList.declarations) {
                    const pending: ts.BindingName[] = [declaration.name];
                    while (pending.length) {
                        const name = pending.pop()!;
                        if (ts.isIdentifier(name)) this.scriptDeclaredBindings.add(this.globalBinding(name.text));
                        else for (const element of name.elements) if (!ts.isOmittedExpression(element)) pending.push(element.name);
                    }
                }
            } else if (ts.isClassDeclaration(statement) && statement.name) {
                if (!this.globalLexicals.has(statement.name.text)) this.globalLexicals.set(statement.name.text,{value:this.newCell(),mutable:true});
                this.scriptDeclaredBindings.add(this.globalLexicals.get(statement.name.text)!.value);
                this.copy(this.cell(statement), this.globalLexicals.get(statement.name.text)!.value);
            } else if (ts.isFunctionDeclaration(statement) && statement.name && statement.body &&
                !source.statements.some(later => later.pos > statement.pos && ts.isFunctionDeclaration(later) && later.body && later.name?.text === statement.name!.text))
                // GlobalDeclarationInstantiation keeps the last declaration of a name.
                this.copy(this.cell(statement), this.globalBinding(statement.name.text));
        }
        // B.3.2.2: a Script's block-level function is also a global var
        // binding, read through the global object as well as by name.
        for (const source of this.scriptOrder.keys()) for (const declaration of annexBBlockFunctions(source)) {
            const scope = functionVarBinding(source, declaration.name.text);
            if (scope && scope.kind === "var" && scope.annexB.length) this.functionBindingCell(this.functionScopeSymbol(scope));
        }
        for (const entry of entries.evaluations ?? []) {
            const contextKey=evaluationContextKey(entry.source,entry.kind);
            if (entry.entry === null) {
                this.invalidEvaluations.add(contextKey);
                const completion = this.newCell(); this.publish(completion, this.abrupt);
                const values = this.evaluations.get(contextKey) ?? [];
                values.push({file:null,completion}); this.evaluations.set(contextKey, values);
                continue;
            }
            const file = entry.entry ? program.getSourceFile(path.resolve(entry.entry)) : undefined;
            if (!file) continue;
            if (entry.kind === "direct" || entry.kind === "indirect") {
                const environment: EvaluationEnvironment = {source:file,direct:entry.kind === "direct",realms:this.newCell(),callers:new Map(),references:new Map(),declarations:new Map()};
                this.evaluationEnvironments.set(file,environment);
                if(!isStrictCodeContext(file)){
                    for(const entry of moduleVarDeclaredNames(file))if(ts.isIdentifier(entry.node))environment.declarations.set(entry.name,{node:entry.node});
                    for(const statement of file.statements)if(ts.isFunctionDeclaration(statement)&&statement.name)
                        environment.declarations.set(statement.name.text,{node:statement.name,function:statement});
                    // B.3.2.3: a block-level function of the eval code is one of
                    // its var-declared names (undefined until evaluated).
                    for(const declaration of annexBBlockFunctions(file)){
                        const existing=environment.declarations.get(declaration.name.text);
                        if(existing)(existing.updates??=[]).push(declaration);
                        else environment.declarations.set(declaration.name.text,{node:declaration.name,function:declaration,annexB:true});
                    }
                }
                const environments=this.evaluationSourceEnvironments.get(entry.source)??[];
                environments.push(environment);this.evaluationSourceEnvironments.set(entry.source,environments);
            }
            if(entry.kind!=="agent"){
                let origins=this.sourceOrigins.get(file);
                if(!origins){origins=this.newCell();this.sourceOrigins.set(file,origins);}
                const callers=this.evaluationOrigins.get(contextKey)??[];
                callers.push(origins);this.evaluationOrigins.set(contextKey,callers);
            }
            const completion = this.newCell(),summary=statementBodyCompletions(file),exceptions=this.exceptionCell();
            this.scriptCompletions.set(file,{summary,throws:exceptions});
            if(!summary.complete)this.publish(completion,this.unknown);
            for(const value of summary.normalValues){
                if(value==="undefined")this.publish(completion,this.primitive(undefined));
                else if(value==="unknown")this.publish(completion,this.unknown);
                else this.copy(this.cell(value),completion);
            }
            if(!summary.normal)this.publish(completion,this.abrupt);
            const errors=this.evaluationThrows.get(contextKey)??[];
            errors.push(exceptions);this.evaluationThrows.set(contextKey,errors);
            const values = this.evaluations.get(contextKey) ?? [];
            values.push({file,completion}); this.evaluations.set(contextKey, values);
        }
        for (const entry of entries.functions ?? []) {
            const key=functionConstructorSourceKey(entry),file=entry.entry?program.getSourceFile(path.resolve(entry.entry)):undefined;
            const statement=file?.statements[0],value=this.newCell();
            if(!file||!statement||!ts.isExpressionStatement(statement)){this.publish(value,this.abrupt);this.generated.set(key,{entry,value,environment:null});continue;}
            let definition:ts.Expression=statement.expression;
            while(ts.isParenthesizedExpression(definition))definition=definition.expression;
            const environment:EvaluationEnvironment={source:file,direct:false,realms:this.newCell(),callers:new Map(),references:new Map(),declarations:new Map()};
            this.evaluationEnvironments.set(file,environment);
            if(functionNode(definition))this.dynamicSourceTexts.set(definition,functionConstructorDisplaySource(entry));
            this.copy(this.cell(statement.expression),value);this.generated.set(key,{entry,value,environment});
        }
        for (const file of files) {
            const script=this.scriptCompletions.get(file);
            const worklist: Array<{node: ts.Node; handler: Cell | null; completion:StatementBodyCompletions|undefined}> = [{node: file, handler: script?.throws??null,completion:script?.summary}];
            while (worklist.length) {
                const {node, handler,completion} = worklist.pop()!;
                if ((ts.isStatement(node) || ts.isCatchClause(node)) && !ts.isFunctionDeclaration(node)) {
                    const analyzed=ts.isCatchClause(node)?node.block:node;
                    if(completion?.analyzed.has(analyzed)&&!completion.reachable.has(node))continue;
                }
                if(ts.isClassStaticBlockDeclaration(node)){
                    worklist.push({node:node.body,handler,completion:statementBodyCompletions(node.body)});continue;
                }
                if (handler) this.exceptionHandlers.set(node, handler);
                if (ts.isTryStatement(node)) {
                    const caught = node.catchClause ? this.exceptionCell() : handler;
                    if (node.catchClause && caught) {
                        const condition=this.catchCondition(node.catchClause);
                        this.rule([caught],()=>{for(const atom of caught.values)this.publish(condition,this.primitive(atom.tag!=="abrupt"));});
                    }
                    if (node.catchClause?.variableDeclaration && (!completion || completion.reachable.has(node.catchClause))) this.bind(node.catchClause.variableDeclaration.name, caught!);
                    worklist.push({node: node.tryBlock, handler: caught,completion});
                    if (node.catchClause) worklist.push({node: node.catchClause, handler,completion});
                    if (node.finallyBlock) worklist.push({node: node.finallyBlock, handler,completion});
                    continue;
                }
                if (ts.isThrowStatement(node) && handler) this.copy(this.cell(node.expression), handler);
                const operands = handler && !sourceNumericOperation(node) && conversionOperands(node);
                if (handler && operands) {
                    const propertyKey = ts.isComputedPropertyName(node) || ts.isElementAccessExpression(node);
                    const addition = ts.isBinaryExpression(node) && (node.operatorToken.kind === ts.SyntaxKind.PlusToken || node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken);
                    const raw = operands.map(operand => this.cell(operand));
                    const inputs = propertyKey ? this.convertList(raw, node, "string")
                        : addition ? this.convertList(raw, node, "default") : raw;
                    // Primitive conversion failures are Error objects. An
                    // opaque coercion can invoke user code and throw any value;
                    // it cannot disappear beside a known explicit throw.
                    let conversionRule!: Rule;
                    conversionRule = this.rule(inputs, () => {
                        const states = inputs.map(input => this.primitiveState(input, conversionRule, !propertyKey));
                        if (states.some(state => state.proof.primitiveComplete && !state.proof.values.length)) return;
                        for (const input of inputs) {
                            const state = this.primitiveState(input, conversionRule, !propertyKey);
                            if (state.unresolved) this.publish(handler, this.unknown);
                        }
                        if (states.some(state => state.pending)) return;
                        const plus = ts.isBinaryExpression(node) && (node.operatorToken.kind === ts.SyntaxKind.PlusToken || node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken);
                        const mixedBigInt = plus && states[0]!.proof.values.some(left => states[1]!.proof.values.some(right =>
                            typeof left !== "string" && typeof right !== "string" && (typeof left === "bigint") !== (typeof right === "bigint")));
                        const symbolConversion = !propertyKey && states.some(state => state.proof.values.some(value => typeof value === "symbol"));
                        if (states.some(state => !state.proof.primitiveComplete) || mixedBigInt || symbolConversion ||
                            !propertyKey && !plus) this.publish(handler, this.nativeException(node));
                    });
                }
                if(ts.isYieldExpression(node)){
                    const owner=this.enclosingActivation(node);
                    if(owner){
                        if(handler)this.copy(owner.yieldThrows,handler);
                        const input=node.expression?this.cell(node.expression):(()=>{const value=this.newCell();this.publish(value,this.primitive(undefined));return value})();
                        const yielded=node.asteriskToken?this.iteratorElements(input,node):input;
                        this.onActive(node,()=>this.copy(owner.kind==="async-generator"?this.promiseAwait(yielded,node):yielded,owner.yields));
                        if(node.asteriskToken)this.iteratorCloseEffects(yielded,node);
                    }
                }
                if (ts.isVariableDeclaration(node) && node.initializer){this.recordBindingWrites(node.name,node);this.onActive(node, () => this.bind(node.name,this.cell(node.initializer!),undefined,node));}
                // A lexical declaration without an initializer (`let x;`) initializes
                // its binding to undefined when it is evaluated; for-in/of heads bind
                // through the loop instead.
                else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && ts.isVariableDeclarationList(node.parent) &&
                    node.parent.flags & ts.NodeFlags.BlockScoped && !(node.parent.parent && (ts.isForInStatement(node.parent.parent) || ts.isForOfStatement(node.parent.parent)))) {
                    const name=node.name;this.recordBindingWrites(name,node);
                    this.onActive(node, () => {const value=this.newCell();this.publish(value,this.primitive(undefined));this.bind(name,value,undefined,node);});
                }
                if (ts.isBinaryExpression(node) && !this.assignmentDefaults.has(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
                    this.recordAssignmentWrites(node.left,node);
                    const value = NAME_EVALUATING_ASSIGNMENTS.has(node.operatorToken.kind) ? this.cell(node.right) : this.cell(node);
                    this.onActive(node, () => this.writeTarget(node.left, value, node));
                }
                if (ts.isPrefixUnaryExpression(node) && (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken) || ts.isPostfixUnaryExpression(node)){
                    this.recordAssignmentWrites(node.operand,node);this.onActive(node, () => this.writeTarget(node.operand, this.updateStored(node), node));
                }
                if (ts.isDeleteExpression(node)) {
                    const target = unwrap(node.expression);
                    if (ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target)) {
                        const value = this.newCell(); this.publish(value, this.primitive(undefined));
                        this.onActive(node, () => this.writeTarget(target, value, node, "delete"));
                    }
                }
                if (ts.isVariableDeclarationList(node) && (node.flags & ts.NodeFlags.Using) !== 0) {
                    // DisposeResources: each resource's @@dispose (@@asyncDispose,
                    // else @@dispose, for await using), read at the declaration,
                    // runs with the resource as `this` when its scope completes:
                    // the block, the whole case block of a switch, or one
                    // iteration of a for-of body.
                    const asynchronous=(node.flags&ts.NodeFlags.AwaitUsing)===ts.NodeFlags.AwaitUsing;
                    const forOf=ts.isForOfStatement(node.parent)?node.parent:undefined;
                    const container=forOf?forOf.statement:node.parent.parent;
                    const scope=container&&(ts.isCaseClause(container)||ts.isDefaultClause(container))?container.parent:container;
                    if(scope){
                        const exit=ts.setTextRange(ts.factory.createEmptyStatement(),{pos:scope.end,end:scope.end});(exit as ts.Node&{parent:ts.Node}).parent=scope;
                        if(handler)this.exceptionHandlers.set(exit,handler);
                        const list=node;
                        this.onActive(node,()=>{
                            if(forOf)this.disposeResource(this.iteratorElements(this.cell(forOf.expression),forOf),asynchronous,list,exit,handler);
                            else for(const declaration of list.declarations)if(declaration.initializer)this.disposeResource(this.cell(declaration.initializer),asynchronous,declaration,exit,handler);
                        });
                    }
                }
                if (ts.isForInStatement(node) || ts.isForOfStatement(node)) {
                    if(ts.isVariableDeclarationList(node.initializer))for(const declaration of node.initializer.declarations)this.recordBindingWrites(declaration.name,node);
                    else this.recordAssignmentWrites(node.initializer,node);
                    this.onActive(node, () => {
                        const iterable=ts.isForOfStatement(node)&&!node.awaitModifier;
                        if(ts.isForInStatement(node))this.proxyInternalMethod(this.cell(node.expression),["ownKeys","getOwnPropertyDescriptor","getPrototypeOf"],node,true);
                        const value=iterable?this.iteratorElements(this.cell(node.expression),node):this.newCell();
                        if(!iterable)this.publish(value,this.unknown);
                        // for await calls the operand's @@asyncIterator (else @@iterator),
                        // the iterator's next and return, and awaits each result (a
                        // thenable's then runs): the operand escapes as an opaque
                        // native's argument does, and its values stay unknown.
                        if(ts.isForOfStatement(node)&&node.awaitModifier)this.escapeCallableArgument(this.cell(node.expression),node,false,"argument");
                        else this.iteratorCloseEffects(value,node);
                        if (ts.isVariableDeclarationList(node.initializer)) for (const declaration of node.initializer.declarations) this.bind(declaration.name, value,undefined,node);
                        else this.writeTarget(node.initializer, value, node);
                    });
                }
                if (functionNode(node)) {
                    const owner = this.function(node);
                    // Computed method names execute in the defining context;
                    // formals and bodies execute in the function activation.
                    node.forEachChild(child => { worklist.push({node: child,
                        handler: child === node.body || ts.isParameter(child) ? owner.throws : handler,
                        completion:child === node.body || ts.isParameter(child)?owner.completion:completion}); });
                    continue;
                }
                // A name inside a with body is resolved through the object
                // environment (HasProperty, @@unscopables) whether or not
                // its value is used.
                if (ts.isIdentifier(node) && !this.propertyNamePosition(node) && this.withBindingObjects(node).length) this.cell(node);
                // A name no declaration binds is a global object property: its
                // GetValue runs an accessor defined there (Object.defineProperty
                // on globalThis) whether or not the value is used (`name;`,
                // `typeof name`, `void name`).
                else if (ts.isIdentifier(node) && !this.propertyNamePosition(node) && !this.writtenExpression(node) && this.isAmbientIdentifier(node) && this.valueReference(node)) this.cell(node);
                if (ts.isCallExpression(node) || ts.isNewExpression(node) || ts.isTaggedTemplateExpression(node) ||
                    (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node))&&this.sourceReferences.get(node)?.read!==false || ts.isAwaitExpression(node) ||
                    ts.isTemplateExpression(node) || ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.InstanceOfKeyword || ts.isExpression(node) && conversionOperands(node) ||
                    // A spread runs the iteration protocol (array) or getters
                    // (object) whether or not the literal's value is used.
                    ts.isArrayLiteralExpression(node)&&node.elements.some(ts.isSpreadElement) || ts.isObjectLiteralExpression(node)&&node.properties.some(ts.isSpreadAssignment)) this.cell(node);
                node.forEachChild(child => { worklist.push({node: child, handler,completion}); });
            }
        }
    }
    private newCell(): Cell { const cell={id:this.nextCell++,ownRevision:0,values:new SourceFacts(),users:new Set<Rule>()};this.sourceCells.set(cell.values,cell);return cell; }
    /** Return copy graphs retain actual formal inputs independently of other
     * invocations. Local writes and derived facts stay conservative; the
     * ordinary invocation graph still owns all effects and exceptions. */
    private projectReturn(root:Cell,inputs:ReadonlyMap<Cell,Cell>,merging=false):Cell {
        if(!inputs.size)return root;
        const key=root.id+":"+[...inputs].map(([formal,input])=>formal.id+"="+input.id).join(","),prior=this.returnProjections.get(key);if(prior)return prior;
        const projections=this.returnProjectionCounts.get(root)??0;
        if(!merging&&projections>=RETURN_PROJECTION_BUDGET){
            let merged=this.mergedReturnProjections.get(root);
            if(!merged){
                const formals=new Map<Cell,Cell>();for(const formal of inputs.keys())formals.set(formal,this.newCell());
                merged={formals,result:this.newCell()};this.mergedReturnProjections.set(root,merged);
                this.copy(this.projectReturn(root,formals,true),merged.result);
            }
            if([...inputs.keys()].every(formal=>merged!.formals.has(formal))){
                for(const[formal,input]of inputs)this.copy(input,merged.formals.get(formal)!);
                this.returnProjections.set(key,merged.result);return merged.result;
            }
        }
        this.returnProjectionCounts.set(root,projections+1);
        let phase=this.returnProjectionPhases.get(key);if(!phase){phase={kind:"return"};this.returnProjectionPhases.set(key,phase);}
        const projected=new Map<Cell,Cell>(),atoms=new Map<Atom,Atom>(),pending:Cell[]=[];
        // A projection may flow back into the source through a captured
        // location or recursive call. Its own targets are already projected;
        // registering that identity closes the copy graph instead of cloning
        // the same substitution through itself indefinitely.
        const project=(source:Cell):Cell=>{
            const inherited=this.projectedCellPhases.get(source);if(inherited?.has(phase!))return source;
            let cell=projected.get(source);if(!cell){cell=this.newCell();projected.set(source,cell);projected.set(cell,cell);
                this.projectedCellPhases.set(cell,new Set([...(inherited??[]),phase!]));
                const written=this.knownWriteOrigins.get(source);if(written)this.knownWriteOrigins.set(cell,written);
                pending.push(source);}return cell;
        };
        const result=project(root);this.returnProjections.set(key,result);
        const extend=()=>{while(pending.length){const source=pending.pop()!,target=projected.get(source)!;let read!:Rule;
            read=this.rule([source],()=>{
                const capture=this.captureInputs.get(source);
                if(capture){this.copy(this.captureProjection(project(capture.source),capture.constraints),target);extend();return;}
                const transform=this.returnTransforms.get(source);
                if(transform){this.copy(transform.evaluate(transform.inputs.map(project)),target);extend();return;}
                for(const atom of source.values.ownValues()){
                    let value=atom;
                    if(atom.tag==="text-operation"&&!this.projectedAtomPhases.get(atom)?.has(phase!)) {let previous=atoms.get(atom);if(!previous){previous={...atom,parts:atom.parts.map(project)};atoms.set(atom,previous);
                        this.projectedAtomPhases.set(previous,new Set([...(this.projectedAtomPhases.get(atom)??[]),phase!]));
                    }value=previous;}
                    this.publish(target,value);
                }
                const actual=inputs.get(source),arguments_=actual?this.formalInputs.get(source):undefined;
                if(actual){
                    let entries=this.projectedFormalInputs.get(target);if(!entries){entries=new Set();this.projectedFormalInputs.set(target,entries);}
                    if(!entries.has(actual)){entries.add(actual);target.ownRevision++;for(const user of target.users)this.schedule(user);}
                    this.copy(actual,target);
                }
                for(const [facts,kind]of source.values.sources){const origin=this.sourceCells.get(facts)!;if(arguments_?.has(origin))continue;this.copy(kind==="value"?project(origin):origin,target,kind);}
                extend();
            });
        }};
        extend();return result;
    }
    private updateStored(node: ts.Node): Cell {
        let value = this.numericWrites.get(node);
        if (!value) {value = this.newCell(); this.numericWrites.set(node,value);}
        return value;
    }
    private exceptionCell(): Cell {const cell = this.newCell(); this.exceptionCells.add(cell); return cell;}
    private catchCondition(clause: ts.CatchClause): Cell {
        let condition=this.catchGuards.get(clause);
        if(!condition){condition=this.newCell();this.catchGuards.set(clause,condition);}
        return condition;
    }
    private enclosingActivation(node: ts.Node): FunctionOwner | null {
        const cached=this.enclosingActivations.get(node);if(cached!==undefined)return cached;
        const remember=(owner:FunctionOwner|null)=>{this.enclosingActivations.set(node,owner);return owner;};
        let child = node, parent = node.parent;
        while (parent) {
            if (functionNode(parent) && (child === parent.body || ts.isParameter(child))) return remember(this.function(parent));
            if (ts.isPropertyDeclaration(parent) && child === parent.initializer && ts.isClassLike(parent.parent) &&
                !(ts.getModifiers(parent)??[]).some(modifier=>modifier.kind===ts.SyntaxKind.StaticKeyword)) return remember(this.function(parent.parent));
            child = parent;parent = parent.parent;
        }
        return remember(null);
    }
    private onActive(node: ts.Node, action: () => void): void {
        const owner = this.enclosingActivation(node);
        const source=owner?undefined:this.sourceOrigins.get(this.sourceFile(node));
        const guards = this.guards(node);
        if (!owner && !source && !guards.length) action();
        else {
            let rule!: Rule;
            rule = this.rule([...(owner ? [owner.active] : source?[source]:[]), ...guards.map(guard => guard.condition)],()=>{
                if ((!owner || owner.active.values.nonempty) && (!source || source.values.nonempty) && this.guardsAllow(guards,rule)) action();
            });
        }
    }
    /** Normal/abrupt alternatives are monotone. Unrepresented and pending
     * values retain a possible normal path; only a known abrupt-only input
     * can suppress dependent evaluation. */
    private normalCompletion(input:Cell):Cell {
        const cached=this.normalCompletions.get(input);if(cached)return cached;
        const result=this.newCell();this.normalCompletions.set(input,result);
        this.rule([input],()=>{for(const atom of input.values)this.publish(result,this.primitive(atom.tag!=="abrupt"));});
        return result;
    }
    private guards(node: ts.Node): readonly {condition: Cell; truthy: boolean}[] {
        const previous = this.executionGuards.get(node); if (previous) return previous;
        const guards: {condition: Cell; truthy: boolean}[] = [];
        for (let child = node, parent = node.parent; parent; child = parent, parent = parent.parent) {
            if (functionNode(parent) && (child === parent.body || ts.isParameter(child))) break;
            if (ts.isPropertyDeclaration(parent) && child === parent.initializer && !(ts.getModifiers(parent) ?? []).some(modifier => modifier.kind === ts.SyntaxKind.StaticKeyword)) break;
            if(ts.isBinaryExpression(parent)&&child===parent.right&&parent.operatorToken.kind!==ts.SyntaxKind.EqualsToken)
                guards.push({condition:this.normalCompletion(this.cell(parent.left)),truthy:true});
            if (ts.isIfStatement(parent) && child !== parent.expression)
                guards.push({condition:this.cell(parent.expression),truthy:child === parent.thenStatement});
            if (ts.isConditionalExpression(parent) && child !== parent.condition)
                guards.push({condition:this.cell(parent.condition),truthy:child === parent.whenTrue});
            if (ts.isCatchClause(parent) && child === parent.block) {
                guards.push({condition:this.catchCondition(parent),truthy:true});
            }
            if(ts.isForOfStatement(parent)&&child===parent.statement&&!parent.awaitModifier){
                const elements=this.iteratorElements(this.cell(parent.expression),parent);
                guards.push({condition:this.iterationActivity.get(elements)!,truthy:true});
            }
        }
        this.executionGuards.set(node,guards);return guards;
    }
    private guardSatisfiedByKnownValue(guard: {condition: Cell; truthy: boolean}): boolean {
        for (const atom of guard.condition.values) {
            if (atom.tag === "primitive") { if (!!atom.value === guard.truthy) return true; }
            else if (guard.truthy && (atom.tag === "object" || atom.tag === "function")) return true;
            else if (atom.tag === "text-operation") {
                // Part choices combine independently, so a tuple of already
                // known part values is one of the operation's final results.
                const known = atom.parts.map(part => [...part.values].flatMap(value => value.tag === "primitive" ? [value.value] : []));
                if (!known.length || known.some(values => !values.length)) continue;
                let tuples: Primitive[][] = [[]];
                for (const values of known) {
                    tuples = tuples.flatMap(tuple => values.map(value => [...tuple, value]));
                    if (tuples.length > 64) break;
                }
                for (const tuple of tuples) {
                    if (tuple.length !== known.length) continue;
                    const outcome = this.evaluatePrimitiveTuple(atom, tuple);
                    if (outcome.kind === "normal" && !!outcome.value === guard.truthy) return true;
                }
            }
        }
        return false;
    }
    private guardsAllow(guards: readonly {condition: Cell; truthy: boolean}[], rule: Rule): boolean {
        for (const guard of guards) {
            this.watchText(rule,guard.condition);
            const state = this.primitiveState(guard.condition,rule);
            // Facts only grow, so one known value that satisfies the guard
            // makes the branch reachable for good. Waiting for the pending
            // rest would deadlock a branch whose result feeds its own guard
            // (a field read as the condition and written by the branch).
            // A value from a source that a later solve compiles may satisfy
            // the guard; the branch runs with the pending mark so its result
            // stays pending instead of sealing as unknown.
            if (state.pending) {
                if (state.pendingSource || this.guardSatisfiedByKnownValue(guard)) continue;
                return false;
            }
            if (state.proof.primitiveComplete && !state.proof.values.some(value => !!value === guard.truthy)) return false;
        }
        return true;
    }
    private publish(cell: Cell, atom: Atom): void {
        if (atom.tag === "object" || atom.tag === "function" || atom.tag === "generator") {
            const identity=atom.tag==="generator"?atom.fields:atom.owner;
            let values = this.ownerAtoms.get(identity);
            if (!values) {values = new Map(); this.ownerAtoms.set(identity, values);}
            const previous = values.get(atom.tag);
            if (previous) atom = previous;
            else values.set(atom.tag, atom);
        } else if (atom.tag === "promise") {
            let rejections = this.promiseAtoms.get(atom.value);
            if (!rejections) {rejections = new WeakMap(); this.promiseAtoms.set(atom.value, rejections);}
            const previous = rejections.get(atom.rejection);
            if (previous) atom = previous;
            else rejections.set(atom.rejection, atom);
        }
        if (cell.values.has(atom)) return;
        if (atom.tag === "text-operation") for (const part of atom.parts) {
            let parents = this.primitiveProofParents.get(part);
            if (!parents) {parents = new Set(); this.primitiveProofParents.set(part,parents);}
            parents.add(cell);
        }
        cell.values.add(atom);cell.ownRevision++;this.factRevision++;
        this.primitiveChanges.add(cell);
        for (const user of cell.users) this.schedule(user);
    }
    private flushPrimitiveChanges(): void {
        if (!this.primitiveChanges.size) return;
        const pending = [...this.primitiveChanges], visited = new Set<Cell>();
        this.primitiveChanges.clear();
        while (pending.length) {
            const value = pending.pop()!;
            if (visited.has(value)) continue; visited.add(value);
            const cache=value.primitiveCache;
            if(cache){cache.proof=undefined;cache.kind=undefined;cache.readiness=undefined;cache.empty=undefined;}
            for (const user of value.users) this.schedule(user);
            for (const parent of this.primitiveProofParents.get(value) ?? []) pending.push(parent);
        }
    }
    private schedule(rule: Rule): void { if (!rule.queued) { rule.queued = true; this.queue.push(rule); } }
    private rule(inputs: readonly Cell[], run: () => void): Rule {
        const rule: Rule = { inputs: new Set(), run, queued: false };
        for (const input of inputs) this.watch(rule, input);
        this.schedule(rule); return rule;
    }
    private watch(rule: Rule, cell: Cell): void {
        if (rule.inputs.has(cell)) return;
        rule.inputs.add(cell); cell.users.add(rule); this.schedule(rule);
    }
    private copy(from:Cell,into:Cell,kind:"value"|"origin"="value"):void {
        const previous=into.values.sources.get(from.values);if(previous==="value"||previous===kind)return;
        into.values.sources.set(from.values,kind);into.ownRevision++;this.factRevision++;
        let parents=this.primitiveProofParents.get(from);if(!parents){parents=new Set();this.primitiveProofParents.set(from,parents);}parents.add(into);
        this.primitiveChanges.add(into);for(const user of into.users)this.schedule(user);
    }
    /** Keep the completion point on the copy edge, rather than attaching it
     * to an interned value identity shared by unrelated writes. */
    private copyWrite(from:Cell,into:Cell,context?:ts.Node,lexical=false,reference?:ts.Identifier):void {
        if(!context){this.copy(from,into);return;}
        const event=lexical&&reference?this.lexicalWriteEvents.get(context)?.get(reference):undefined;
        // Every located lexical write comes from the scanner's binding tree.
        // An unrepresented write must not invent a finite source alternative.
        if(lexical&&!event){this.publish(into,this.unknown);return;}
        let contexts=this.knownWrites.get(from);if(!contexts){contexts=new Map();this.knownWrites.set(from,contexts);}
        let locations=contexts.get(context);if(!locations){locations=new Map();contexts.set(context,locations);}
        let modes=locations.get(into);if(!modes){modes=new Map();locations.set(into,modes);}
        let references=modes.get(lexical);if(!references){references=new Map();modes.set(lexical,references);}
        let written=references.get(reference);if(!written){written=this.newCell();references.set(reference,written);this.knownWriteOrigins.set(written,{tag:"unknown",origin:context,location:into,lexical,...(reference?{reference}:{}),...(event?{event}:{})});this.copy(from,written);}
        this.copy(written,into);
    }
    /** Activation origins use the same monotone Cell graph as values. A
     * recursive call shares its caller's origins rather than growing a path. */
    private executionOrigins(context?:ts.Node):Cell {
        if(context){
            const activation=this.enclosingActivation(context);
            if(activation)return activation.active;
            const source=this.sourceOrigins.get(this.sourceFile(context));
            if(source)return source;
            let cell=this.originCells.get(context);
            if(!cell){
                cell=this.newCell();this.originCells.set(context,cell);
                let effect=this.opaqueEffects.get(context);
                if(!effect){effect={tag:"unknown",origin:context};this.opaqueEffects.set(context,effect);}
                this.publish(cell,effect);
            }
            return cell;
        }
        this.publish(this.unconstrainedOrigins,this.unknown);
        return this.unconstrainedOrigins;
    }
    private opaqueCallableCaptures(callable:Cell,context:ts.Node):void {
        let calls=this.opaqueCaptureCalls.get(context);if(!calls){calls=new Set();this.opaqueCaptureCalls.set(context,calls);}
        if(calls.has(callable))return;calls.add(callable);
        let rule!:Rule;
        rule=this.rule([callable],()=>{
            const values:Cell[]=[callable],visited=new Set<Cell>(),nodes:ts.Node[]=[],captured=new Set<ts.Symbol>();
            while(values.length){const input=values.pop()!;if(visited.has(input))continue;visited.add(input);this.watch(rule,input);for(const value of input.values){if(value.tag==="bound")values.push(value.target);else if(value.tag==="function")nodes.push(value.owner.definition);else if(this.ordinaryOwner(value)?.proxy)values.push(this.ordinaryOwner(value)!.proxy!.target);}}
            while(nodes.length){const node=nodes.pop()!;if(ts.isIdentifier(node)){const symbol=this.bindingSymbol(node);if(symbol)captured.add(symbol)}node.forEachChild(child=>{nodes.push(child)})}
            for(const symbol of captured){const binding=this.bindings.get(symbol);if(binding)this.copy(this.executionOrigins(context),binding)}
        });
    }
    /** One source operation owns one activation/guard dependency. Reactive
     * consumers may discover its opaque effect repeatedly without allocating
     * another equivalent rule on each fixed-point revisit. */
    private activateOpaqueEffect(context:ts.Node):void {
        if(this.opaqueEffectActivations.has(context))return;
        this.opaqueEffectActivations.add(context);
        this.onActive(context,()=>this.opaqueEffect(context));
    }
    private opaqueEffect(context?: ts.Node): void {
        const origins=this.executionOrigins(context);
        this.copy(origins,this.opaqueMutation);
        this.copy(origins,this.globalMutation);
        for(const binding of this.globalLexicals.values())if(binding.mutable)this.copy(origins,binding.value);
    }
    /** Synthetic invocations are internal edges of their originating opaque
     * site. Recursive escape reuses that graph; real source sites keep their
     * own activation, ordering and exception context. */
    private escapeContext(context:ts.Node):ts.Node {
        const previous=this.escapeContexts.get(context);if(previous)return previous;
        for(let node:ts.Node|undefined=context;node;node=node.parent){
            const origin=this.escapedInvocationOrigins.get(node);
            if(origin){this.escapeContexts.set(context,origin);return origin;}
        }
        this.escapeContexts.set(context,context);return context;
    }
    /** Opaque code can invoke callbacks reachable through represented data,
     * accessors, prototypes and returned values. One call-site graph retains
     * those edges and one unknown actual List, including cyclic containers.
     * Interned values own inspection subscriptions independently of aliases. */
    /** Callables reachable from a cell are independent of the opaque call that
     * receives it. One shared reach record per cell and per atom (for each
     * callback mode) accumulates them, and each new callable is pushed once
     * along every parent edge, so escape contexts link to the same graph
     * instead of re-traversing the heap. The collection-iterator edge depends
     * on the escaping call, so records carry iterator cells and each context
     * expands them through its own context. */
    /** includeSelf false reaches only the callables stored on or inherited by
     * the value (conversion methods, getters, stored functions), never the
     * value itself: a native that is not given a callback never invokes the
     * argument as a function. */
    private escapeReach(mode:boolean,kind:EscapeReachKind="direct"):{cells:Map<Cell,EscapeReach>;atoms:Map<Atom,EscapeReach>} {
        const key=`${mode}:${kind}`;
        let reach=this.escapeReaches.get(key);if(!reach){reach={cells:new Map(),atoms:new Map()};this.escapeReaches.set(key,reach);}return reach;
    }
    private newEscapeReach(sink?:EscapeReach["sink"]):EscapeReach {return {callables:new Set(),iterators:new Set(),parents:new Set(),...(sink?{sink}:{})};}
    private pushEscapeReach(record:EscapeReach,callable?:Atom,iterator?:Cell):void {
        const pending=[record];
        while(pending.length){
            const current=pending.pop()!;
            if(callable){if(current.callables.has(callable))continue;current.callables.add(callable);current.sink?.callable(callable);}
            else if(iterator){if(current.iterators.has(iterator))continue;current.iterators.add(iterator);current.sink?.iterator(iterator);}
            for(const parent of current.parents)pending.push(parent);
        }
    }
    private linkEscapeReach(from:EscapeReach,into:EscapeReach):void {
        if(from===into||from.parents.has(into))return;from.parents.add(into);
        for(const callable of [...from.callables])this.pushEscapeReach(into,callable);
        for(const iterator of [...from.iterators])this.pushEscapeReach(into,undefined,iterator);
    }
    private escapeCellReach(input:Cell,sourceCallbacksOnly:boolean,kind:EscapeReachKind="direct"):EscapeReach {
        const reach=this.escapeReach(sourceCallbacksOnly,kind);
        let record=reach.cells.get(input);if(record)return record;
        const current=this.newEscapeReach();reach.cells.set(input,current);
        this.rule([input],()=>{
            for(const[facts,sourceKind]of input.values.sources)if(sourceKind==="value")this.linkEscapeReach(this.escapeCellReach(this.sourceCells.get(facts)!,sourceCallbacksOnly,kind),current);
            for(const atom of input.values.ownValues())this.linkEscapeReach(this.escapeAtomReach(atom,input,sourceCallbacksOnly,kind),current);
        });
        return current;
    }
    private escapeAtomReach(atom:Atom,current:Cell,sourceCallbacksOnly:boolean,kind:EscapeReachKind="direct"):EscapeReach {
        const reach=this.escapeReach(sourceCallbacksOnly,kind);
        let record=reach.atoms.get(atom);if(record)return record;
        const result=this.newEscapeReach();reach.atoms.set(atom,result);
        const nested:EscapeReachKind=kind==="direct"?"direct":"method";
        // Stored values; accessors and conversion targets are reached as nested.
        const stored:EscapeReachKind=kind==="elements"?"argument":nested;
        const visit=(input:Cell,as:EscapeReachKind=stored):void=>this.linkEscapeReach(this.escapeCellReach(input,sourceCallbacksOnly,as),result);
        const owner=this.ordinaryOwner(atom);
        // Program state a native can hand back: objects the program created
        // (literals, constructions, functions, collections). Intrinsics stay
        // outside; their unmodelled members already read as native values.
        if(owner&&!sourceCallbacksOnly&&(atom.tag==="function"||this.sourceObjectOwners.has(owner)||this.ownerCreations.has(owner)||owner.collections||owner.collectionIterator))this.nativeAlias(owner);
        if(atom.tag==="promise"){visit(atom.value);visit(atom.rejection);}
        if(atom.tag==="generator"){visit(atom.yielded);visit(atom.returned);}
        const transparent=kind==="method"&&atom.tag==="operation"&&TRANSPARENT_CALL_OPERATIONS.has(atom.operation);
        if(kind!=="argument"&&kind!=="elements"&&!transparent&&(atom.tag==="function"||atom.tag==="bound"||atom.tag==="promise-resolver"||owner?.proxy||!sourceCallbacksOnly&&(atom.tag==="intrinsic"||atom.tag==="operation"||atom.tag==="builtin"&&atom.normalResult!=="not-callable")))this.pushEscapeReach(result,atom);
        if(!owner)return result;
        const skipped=(key:SourcePropertyKey):boolean=>kind!=="direct"&&kind!=="elements"&&(key==="constructor"||key==="prototype"&&atom.tag==="function");
        let inspect!:Rule;
        inspect=this.rule([owner.shape],()=>{
            for(const [key,property] of owner.own?.entries()??[])if(!skipped(key))for(const write of property.writes.values())visit(write.values);
            for(const accessor of owner.accessors.values())if(this.accessorDefinitions.has(accessor.get)){visit(accessor.get,nested);visit(accessor.set,nested);}
            const stored=this.unknownPropertyLocations.get(owner);if(stored)visit(stored.value);
            if(!sourceCallbacksOnly&&atom.tag!=="function"&&!this.sourceObjectOwners.has(owner)&&!this.ownerCreations.has(owner)&&!this.ownerRealms.has(owner)&&!owner.collections&&!owner.collectionIterator)return;
            const realm=sourceCallbacksOnly?undefined:this.ownerRealms.get(owner);
            for(const key of owner.fields.keys())if(!skipped(key)){
                const field=this.dataProperty(owner,key),initial=realm?this.initialGlobalValues.get(field):undefined;
                if(!initial?.size){visit(field);continue;}
                // A native calls a member of a value only under a protocol key
                // (toString, then, @@iterator, a getter, ...) or as a callback
                // it is handed, and no key a realm gives its global object is a
                // protocol key. The realm's own value under its own name is
                // therefore reached for the callables stored on it, never
                // invoked itself, as the members of every other intrinsic are;
                // a value the program writes there stays a possible callee.
                for(const value of initial)this.linkEscapeReach(this.escapeAtomReach(value,field,sourceCallbacksOnly,"argument"),result);
                visit(this.writtenGlobalField(field,initial));
            }
            for(const accessor of owner.accessors.values()){visit(accessor.get,nested);visit(accessor.set,nested);}
            if(owner.prototype)visit(owner.prototype,kind==="elements"?"elements":nested);
            if(owner.proxy){visit(owner.proxy.target);visit(owner.proxy.handler);}
            for(const record of owner.collections?.values()??[]){
                this.watch(inspect,record.changes);this.watch(inspect,record.shape);
                for(const entry of record.entries.values()){visit(entry.key);visit(entry.value);}
            }
            if(owner.collectionIterator){
                visit(owner.collectionIterator.elements);this.pushEscapeReach(result,undefined,current);
                if(owner.collectionIterator.source&&owner.collectionIterator.operation!=="keys")visit(owner.collectionIterator.source);
            }
        });
        return result;
    }
    private writtenGlobalField(field:Cell,initial:ReadonlySet<Atom>):Cell {
        let written=this.writtenGlobalValues.get(field);if(written)return written;
        const target=this.newCell();this.writtenGlobalValues.set(field,target);
        this.rule([field],()=>{for(const atom of field.values)if(!initial.has(atom))this.publish(target,atom);});
        return target;
    }
    /** Links one represented object to the shared native-alias cells. */
    private nativeAlias(owner:ObjectOwner):void {
        if(this.nativeAliasOwners.has(owner))return;this.nativeAliasOwners.add(owner);
        this.copy(this.nativeAliasMutation,owner.shape);
        for(const record of owner.collections?.values()??[])this.copy(this.nativeAliasMutation,record.shape);
        let linked=false;
        this.rule([this.nativeAliasKeys],()=>{
            if(linked||!this.nativeAliasKeys.values.nonempty)return;linked=true;
            const record=this.recordUnknownProperty(owner,"set",undefined,this.nativeAliasKeys);
            this.publish(record.value,this.nativeUnknown);
        });
    }
    /** The receiver writes of an Array.prototype native the model leaves
     * opaque. On an ordinary object they are its algorithm's: elements it
     * read from the receiver or was handed, Set at some integer index;
     * integer indices it may delete; and a Number "length". Every other own
     * key keeps its value, so a later read of a method (`seen.push`) still
     * finds the inherited one. Any other receiver (exotic, unrepresented or
     * primitive) keeps the unbounded shape mutation of a native. */
    private nativeArrayReceiverWrites(receiver:Cell,effect:NativeArrayReceiverEffect,inputs:readonly Cell[],context:ts.Node):void {
        const ordinary=this.newCell(),other=this.newCell(),algorithms=new Set<Cell>();
        let rule!:Rule;
        rule=this.rule([receiver],()=>{for(const atom of receiver.values){
            const algorithm=this.ordinaryOwner(atom)?.propertyAlgorithm;
            if(algorithm&&!algorithms.has(algorithm)){algorithms.add(algorithm);this.watch(rule,algorithm);}
            if(algorithm?.values.has(this.primitive("ordinary"))&&!algorithm.values.has(this.primitive("opaque")))this.publish(ordinary,atom);
            else this.publish(other,atom);
        }});
        this.writeProperty(other,null,this.empty,false,"set",context);
        const indices=this.newCell();this.publish(indices,this.numberValue());
        if(effect.set){
            const values=this.newCell();this.copy(this.computedProperty(ordinary,indices,context),values);
            for(const [index,input] of inputs.entries())if(index>=effect.stores)this.copy(input,values);
            this.writeProperty(ordinary,null,values,false,"set",context,ordinary,indices);
        }
        if(effect.remove){const removed=this.newCell();this.publish(removed,this.primitive(undefined));this.writeProperty(ordinary,null,removed,false,"delete",context,ordinary,indices);}
        if(effect.length){const length=this.newCell();this.publish(length,this.numberValue());this.writeProperty(ordinary,"length",length,false,"set",context);}
    }
    private escapeCallableArgument(argument:Cell,context:ts.Node,sourceCallbacksOnly=false,kind:EscapeReachKind="direct"):void {
        context=this.escapeContext(context);
        let modes=this.escapedCallableCalls.get(context);if(!modes){modes=new Map();this.escapedCallableCalls.set(context,modes);}
        let graph=modes.get(sourceCallbacksOnly);
        if(!graph){
            const target=this.newCell(),returned=this.newCell(),seen=new Set<string>();let actuals=this.newCell();
            // A native calls an escaped callable with values reachable from its
            // own receiver and arguments (already escaping here) or created by
            // itself: native values. Unknown code may pass anything.
            // At a Script's top level the escape is one execution point: values
            // the unknown code passes carry its origin, so reads that precede
            // the escape do not see them. Inside an activation the origins are
            // every caller's, which would multiply along call chains; those
            // actuals stay the shared unknown value.
            // Every top-level escape point of a Script reaches the same
            // callables (those the global object and global lexicals reach),
            // so each callable already receives the union of their origins.
            // One List per Script carries that union: each value keeps its own
            // origin for the timing filters, and an escaped function's
            // receiver (and its sloppy-mode this boxing) is one cell rather
            // than one per escape point and function.
            if(!sourceCallbacksOnly)this.publish(actuals,this.nativeUnknown);
            else if(!this.enclosingActivation(context)&&!this.sourceOrigins.has(this.sourceFile(context))){
                const file=this.sourceFile(context);let shared=this.topLevelEscapeActuals.get(file);
                if(!shared){shared=this.newCell();this.topLevelEscapeActuals.set(file,shared);}
                this.copy(this.executionOrigins(context),shared);actuals=shared;
            }
            else this.publish(actuals,this.unknown);
            // Iterator elements are read through this escaping call's context.
            const sink=this.newEscapeReach({callable:atom=>this.publish(target,atom),iterator:cell=>visit(this.directIteratorElements(cell,context))});
            const visit=(input:Cell,as:EscapeReachKind="direct"):void=>{const key=input.id+":"+as;if(seen.has(key))return;seen.add(key);this.linkEscapeReach(this.escapeCellReach(input,sourceCallbacksOnly,as),sink);};
            graph={visit};modes.set(sourceCallbacksOnly,graph);
            const invocation=this.invocationContext(context);
            this.escapedInvocationOrigins.set(invocation,context);
            const thrown=this.exceptionCell(),constructed=this.newCell();
            this.exceptionHandlers.set(invocation,thrown);
            const handler=this.exceptionHandlers.get(context);if(handler)this.copy(thrown,handler);
            this.publish(constructed,{tag:"object",owner:this.owner(invocation)});
            visit(returned);visit(thrown);
            const parts:readonly ListPart[]=[{cell:actuals,spread:true,abstractList:true}];
            this.invoke(invocation,target,actuals,parts,returned);
            this.invoke(invocation,target,constructed,parts,returned,true);
        }
        graph.visit(argument,kind);
    }
    /** Synthetic protocol calls retain their scheduling boundary independently
     * of the source position at which the protocol was requested. */
    private invocationContext(origin:ts.Node,timing:{repeated?:boolean;deferred?:boolean}={}):ts.Node {
        const context=ts.setTextRange(ts.factory.createEmptyStatement(),origin);(context as ts.Node&{parent:ts.Node}).parent=origin;
        if(timing.repeated||timing.deferred){this.invocationTimings.set(context,{repeated:!!timing.repeated,deferred:!!timing.deferred});this.factRevision++;this.timingRevision++;}
        return context;
    }
    private hasInvocationTiming(context:ts.Node,kind?:"repeated"|"deferred"):boolean {
        let query=this.timingQueries.get(context);
        if(!query||query.revision!==this.timingRevision){query={revision:this.timingRevision,answers:new Map()};this.timingQueries.set(context,query);}
        const key=kind??"any",known=query.answers.get(key);if(known!==undefined)return known;
        const answer=this.computeInvocationTiming(context,kind);query.answers.set(key,answer);return answer;
    }
    private computeInvocationTiming(context:ts.Node,kind?:"repeated"|"deferred"):boolean {
        for(let node:ts.Node|undefined=context;node&&!functionNode(node);node=node.parent){
            const timing=this.invocationTimings.get(node);
            const roots=ts.isSourceFile(node)?this.scriptOrder.get(node):undefined;
            if(timing&&(!kind||timing[kind])||kind!=="deferred"&&roots&&roots.first!==roots.last||kind==="repeated"&&ts.isIterationStatement(node,false))return true;
        }
        return false;
    }
    /** Close represented call cycles through one adjacency graph. An origin
     * alone cannot distinguish successive recursive activations. */
    private sourceActivation(context:ts.Node):SourceActivation {return this.enclosingActivation(context)??this.sourceFile(context);}
    private connectActivation(caller:SourceActivation,callee:SourceActivation):void {
        const from=this.activationEdges(caller),to=this.activationEdges(callee);
        if(from.targets.has(callee))return;from.targets.add(callee);to.callers.add(caller);
        if(!("fileName"in caller)&&caller.kind!=="ordinary")this.publish(this.activationTiming(callee),this.primitive(true));
        this.copy(this.activationTiming(caller),this.activationTiming(callee));
        const pending=[callee],reachable=new Set<SourceActivation>();
        while(pending.length){const owner=pending.pop()!;if(reachable.has(owner))continue;reachable.add(owner);for(const next of this.activationCalls.get(owner)?.targets??[])pending.push(next);}
        if(!reachable.has(caller))return;
        const reverse=[caller],returns=new Set<SourceActivation>();
        while(reverse.length){const owner=reverse.pop()!;if(returns.has(owner))continue;returns.add(owner);for(const prior of this.activationCalls.get(owner)?.callers??[])reverse.push(prior);}
        for(const owner of reachable)if(returns.has(owner))this.publish(this.activationTiming(owner),this.primitive(true));
    }
    private activationEdges(owner:SourceActivation):{targets:Set<SourceActivation>;callers:Set<SourceActivation>} {
        let edges=this.activationCalls.get(owner);if(!edges){edges={targets:new Set(),callers:new Set()};this.activationCalls.set(owner,edges);}return edges;
    }
    private activationTiming(owner:SourceActivation):Cell {
        let timing=this.cyclicActivationTiming.get(owner);if(!timing){timing=this.newCell();this.cyclicActivationTiming.set(owner,timing);}return timing;
    }
    private currentFactEpochAnswers():typeof this.factEpochAnswers {
        if(this.factEpochAnswers.epoch!==sourceFactsEpoch)this.factEpochAnswers={epoch:sourceFactsEpoch,unfiltered:new Set()};
        return this.factEpochAnswers;
    }
    /** Whether an activation's cyclic timing has any fact. Timing copies
     * along call chains, so an empty answer is cached on the cell until the
     * change flush reaches it through its copy edges. */
    private activationTimed(owner:SourceActivation):boolean {
        const timing=this.activationTiming(owner);
        this.flushPrimitiveChanges();
        if(timing.primitiveCache?.empty)return false;
        if(timing.values.nonempty)return true;
        (timing.primitiveCache??={}).empty=true;return false;
    }
    private dynamicContext(node: ts.Node): boolean {
        const pending: ts.Node[] = [];
        let current: ts.Node | undefined = node, dynamic = false;
        while (current) {
            const known = this.dynamicContexts.get(current);
            if (known !== undefined) {dynamic = known; break;}
            pending.push(current);
            const roots=ts.isSourceFile(current)?this.scriptOrder.get(current):undefined;
            // An instance field initializer runs inside every construction
            // (after super() returns in a derived class), not at its position
            // in the class body.
            const instanceField=ts.isPropertyDeclaration(current)&&current.initializer!==undefined&&!(ts.getModifiers(current)??[]).some(modifier=>modifier.kind===ts.SyntaxKind.StaticKeyword);
            if (this.invocationTimings.has(current) || roots&&roots.first!==roots.last || ts.isFunctionLike(current) || ts.isIterationStatement(current, false) || instanceField) {dynamic = true; break;}
            current = current.parent;
        }
        for (const visited of pending) this.dynamicContexts.set(visited, dynamic);
        return dynamic;
    }
    private sourceFile(node: ts.Node): ts.SourceFile {
        let source = this.sourceFiles.get(node);
        if (!source) {source = node.getSourceFile(); this.sourceFiles.set(node, source);}
        return source;
    }
    private repeatedActivationContext(context:ts.Node):boolean {
        return this.hasInvocationTiming(context,"repeated");
    }
    private effectVisible(atom: Atom, context?: ts.Node, argumentsRead = false): boolean {
        if (atom.tag !== "unknown" || !atom.origin || !context) return true;
        // A protocol running in a job can observe writes after registration.
        // Its source offset is not an upper bound on the visible effects.
        if(this.hasInvocationTiming(context,"deferred"))return true;
        const effect = atom.origin;
        const roots=this.scriptOrder.get(this.sourceFile(context));
        if(this.sourceFile(effect)===this.sourceFile(context)&&roots&&roots.first!==roots.last)return true;
        const activation=this.enclosingActivation(context);
        if(activation&&activation.kind==="ordinary"&&!this.activationTimed(activation)&&!this.repeatedActivationContext(context)&&!this.dynamicContext(effect)){
            const origins=[...activation.active.values];
            if(origins.length&&origins.every(origin=>origin.tag==="unknown"&&origin.origin&&origin.origin!==effect&&
                (!this.dynamicContext(origin.origin)||ts.isCallExpression(origin.origin)&&!this.enclosingActivation(origin.origin))&&
                !this.effectVisible(atom,origin.origin,true)))return false;
        }
        // Unrepresented or overlapping activations remain opaque. A repeated
        // root phase still finishes before the next surrounding source phase.
        if (this.dynamicContext(effect) || this.dynamicContext(context)) {
            // Repetition cannot move an operation before an earlier read in
            // the surrounding source activation. Reads inside a repeated or
            // overlapping activation retain the conservative origin union.
            if(!this.enclosingActivation(effect)&&!activation){
                if(this.sourceFile(effect)!==this.sourceFile(context)){
                    const before=this.scriptOrder.get(this.sourceFile(context)),after=this.scriptOrder.get(this.sourceFile(effect));
                    if(before!==undefined&&after!==undefined&&before.last<after.first)return false;
                }else{
                    let phase=context;
                    for(let node=context.parent;node&&!ts.isSourceFile(node);node=node.parent)if(ts.isIterationStatement(node,false))phase=node;
                    if(this.evaluationOrder.before(phase,effect))return false;
                }
            }
            return true;
        }
        if (this.sourceFile(effect) !== this.sourceFile(context)) {
            const before=this.scriptOrder.get(this.sourceFile(context)),after=this.scriptOrder.get(this.sourceFile(effect));
            return before===undefined||after===undefined||after.first<=before.last;
        }
        if (this.evaluationOrder.before(context,effect)) return false;
        if (argumentsRead && effect === context) return false;
        if (ts.isCallExpression(effect) || ts.isNewExpression(effect)) {
            for (let parent: ts.Node | undefined = context; parent; parent = parent.parent) {
                if (parent === effect.expression) return false;
                if (effect.arguments?.some(argument=>argument===parent)) return false;
                if (parent === effect) break;
            }
        }
        return true;
    }
    /** Store edges commit after their RHS. Other effects of the same
     * operation can happen earlier while resolving a reference or key. */
    private writeVisible(write:SourceWriteOrigin,context:ts.Node,argumentsRead:boolean):boolean {
        const actor=this.enclosingActivation(write.origin),origins=actor?[...actor.active.values]:[];
        if(origins.length&&origins.every(origin=>!this.effectVisible(origin,context,argumentsRead)))return false;
        if(!this.effectVisible(write,context,argumentsRead))return false;
        const file=this.sourceFile(context),roots=this.scriptOrder.get(file);
        if(!this.dynamicContext(context)&&!this.dynamicContext(write.origin)&&!this.sourceOrigins.has(file)&&
            (!roots||roots.first===roots.last)&&this.readBeforeWrite(context,write.origin,write.reference))return false;
        return true;
    }
    private opaqueShape(owner: ObjectOwner, context?: ts.Node, argumentsRead = false): boolean {
        let modes=this.opaqueQueries.get(context);if(!modes){modes=new Map();this.opaqueQueries.set(context,modes);}
        let query=modes.get(argumentsRead);if(!query||query.revision!==this.factRevision){query={revision:this.factRevision,known:new WeakMap()};modes.set(argumentsRead,query);}
        const known=query.known,root=owner.shape.values,prior=known.get(root);if(prior!==undefined)return prior;
        // Unknown atoms flow through both value and origin-only edges. This
        // predicate therefore needs one reachability state per fact node.
        const parents=new Map<SourceFacts,SourceFacts|null>([[root,null]]),pending=[root];
        const found=(source:SourceFacts):boolean=>{for(let current:SourceFacts|null=source;current;current=parents.get(current)??null)known.set(current,true);return true;};
        while(pending.length){const current=pending.pop()!,cached=known.get(current);
            if(cached===true)return found(current);if(cached===false)continue;
            for(const atom of current.ownValues())if(atom.tag==="unknown"&&this.effectVisible(atom,context,argumentsRead))return found(current);
            for(const source of current.sources.keys())if(!parents.has(source)){parents.set(source,current);pending.push(source);}
        }
        // Exhausting the shared worklist proves every visited subgraph false,
        // including cycles. A graph or timing change invalidates the memo.
        for(const source of parents.keys())known.set(source,false);
        return false;
    }
    private copyRead(from: Cell, into: Cell, context?: ts.Node, argumentsRead = false): void {
        this.copy(this.captureRead(from,context,argumentsRead),into);
    }
    private capturePrecedes(before:SourceCapturePhase,after:SourceCapturePhase):boolean {
        before=this.normalizeCapturePhase(before);after=this.normalizeCapturePhase(after);
        if(before===after)return true;
        if(before.scalar||after.scalar){
            if(after.activationOnly)return (before.scalar?.activation??before.activationOnly??this.enclosingActivation(before.context))===after.activationOnly;
            return !!before.scalar&&!!after.scalar&&before.location===after.location&&before.scalar.activation===after.scalar.activation&&before.scalar.universeKey===after.scalar.universeKey&&
                [...after.scalar.excluded].every(event=>before.scalar!.excluded.has(event));
        }
        if(before.activationOnly||after.activationOnly)return !!after.activationOnly&&
            (before.activationOnly??this.enclosingActivation(before.context))===after.activationOnly;
        if(before.location!==after.location||before.argumentsRead!==after.argumentsRead||this.sourceFile(before.context)!==this.sourceFile(after.context)||!this.evaluationOrder.before(before.context,after.context))return false;
        const left=this.enclosingActivation(before.context),right=this.enclosingActivation(after.context);
        return left===right&&!this.repeatedActivationContext(before.context)&&!this.repeatedActivationContext(after.context)&&(!left||!this.activationTimed(left));
    }
    private readBeforeWrite(read:ts.Node,write:ts.Node,reference?:ts.Identifier):boolean {
        if(this.sourceFile(read)!==this.sourceFile(write))return false;
        if(this.evaluationOrder.before(read,write))return true;
        const within=(root:ts.Node|undefined)=>{for(let node:ts.Node|undefined=read;node;node=node.parent)if(node===root)return true;return false;};
        if(ts.isVariableDeclaration(write)&&within(write.initializer)||ts.isBinaryExpression(write)&&within(write.right)||
            (ts.isPrefixUnaryExpression(write)||ts.isPostfixUnaryExpression(write))&&within(write.operand))return true;
        if(!reference||!within(write))return false;
        let leaf:ts.Node=reference;
        for(let node:ts.Node|undefined=reference.parent;node&&node!==write;node=node.parent){
            if(ts.isBindingElement(node)){if(within(node.initializer)||node.propertyName&&ts.isComputedPropertyName(node.propertyName)&&within(node.propertyName.expression))return true;if(leaf===reference)leaf=node;}
            else if(ts.isShorthandPropertyAssignment(node)&&node.name===reference){if(within(node.objectAssignmentInitializer))return true;leaf=node;}
            else if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.EqualsToken&&within(node.right)&&node.left.getStart()<=reference.getStart()&&reference.getEnd()<=node.left.getEnd())return true;
        }
        return this.evaluationOrder.before(read,leaf)||within(leaf);
    }
    private unfilteredCaptureActivation(context:ts.Node):FunctionOwner|null {
        const activation=this.enclosingActivation(context);
        return activation&&this.dynamicContext(context)&&(activation.kind!=="ordinary"||this.repeatedActivationContext(context)||this.activationTimed(activation))?activation:null;
    }
    private scalarCapturePhase(context:ts.Node,activation:FunctionOwner,location:Cell,excluded:ReadonlySet<SourceLexicalWrite>,universe:ReadonlySet<SourceLexicalWrite>):SourceCapturePhase {
        let locations=this.scalarCapturePhases.get(activation);if(!locations){locations=new Map();this.scalarCapturePhases.set(activation,locations);}
        let phases=locations.get(location);if(!phases){phases=new Map();locations.set(location,phases);}
        const universeKey=[...universe].map(event=>event.id).sort((a,b)=>a-b).join(","),key=universeKey+"|"+[...excluded].map(event=>event.id).sort((a,b)=>a-b).join(",");let phase=phases.get(key);
        if(!phase){phase={id:this.nextCapturePhase++,kind:"capture",context,argumentsRead:false,location,scalar:{activation,excluded,universe,universeKey}};phases.set(key,phase);}return phase;
    }
    private activationCapturePhase(activation:FunctionOwner):SourceCapturePhase {
        let gate=this.activationCapturePhases.get(activation);
        if(!gate){gate={id:this.nextCapturePhase++,kind:"capture",context:activation.definition,argumentsRead:false,activationOnly:activation};this.activationCapturePhases.set(activation,gate);}
        return gate;
    }
    private normalizeCapturePhase(phase:SourceCapturePhase):SourceCapturePhase {
        if(phase.activationOnly||phase.scalar)return phase;
        const prior=this.normalizedCapturePhases.get(phase);if(prior)return prior;
        const answers=this.currentFactEpochAnswers();if(answers.unfiltered.has(phase))return phase;
        const activation=this.unfilteredCaptureActivation(phase.context);if(!activation){answers.unfiltered.add(phase);return phase;}
        let normalized:SourceCapturePhase;
        if(phase.location){
            // A filtered activation stays filtered, and these are syntactic.
            if(!ts.isIdentifier(phase.context)){this.normalizedCapturePhases.set(phase,phase);return phase;}
            const symbol=this.bindingSymbol(phase.context);if(!symbol){this.normalizedCapturePhases.set(phase,phase);return phase;}
            const excluded=new Set<SourceLexicalWrite>(),universe=new Set<SourceLexicalWrite>();
            for(const[origin,events]of this.bindingWriteSites.get(symbol)??[]){
                if(this.enclosingActivation(origin)!==activation||this.repeatedActivationContext(origin))continue;
                for(const event of events.values()){
                    universe.add(event);
                    if(!this.repeatedActivationContext(phase.context)&&this.readBeforeWrite(phase.context,origin,event.reference))excluded.add(event);
                }
            }
            normalized=this.scalarCapturePhase(phase.context,activation,phase.location,excluded,universe);
        }else{
            normalized=this.activationCapturePhase(activation);
        }
        this.normalizedCapturePhases.set(phase,normalized);return normalized;
    }
    private captureRead(from: Cell, context?: ts.Node, argumentsRead = false,location?:Cell): Cell {
        if(!context)return from;
        if(this.hasInvocationTiming(context,"deferred")){
            const activation=this.enclosingActivation(context);
            return activation?this.captureProjection(from,this.activationCapturePhase(activation)):from;
        }
        let kinds=this.capturePhases.get(context);if(!kinds){kinds=new Map();this.capturePhases.set(context,kinds);}
        let locations=kinds.get(argumentsRead);if(!locations){locations=new Map();kinds.set(argumentsRead,locations);}
        let phase=locations.get(location);if(!phase){phase={id:this.nextCapturePhase++,kind:"capture",context,argumentsRead,...(location?{location}:{})};locations.set(location,phase);}
        return this.captureProjection(from,phase);
    }
    /** Conjunctions have one normal form independent of the order in which
     * aliases encounter them. Scalar masks merge across intervening filters. */
    private captureConstraintSet(phases:readonly SourceCapturePhase[]):SourceCaptureConstraints {
        const scalar=new Map<FunctionOwner,Map<string,{phase:SourceCapturePhase;excluded:Set<SourceLexicalWrite>}>>(),normalized=new Set<SourceCapturePhase>();
        for(const input of phases){
            const phase=this.normalizeCapturePhase(input);
            if(!phase.scalar){normalized.add(phase);continue;}
            let locations=scalar.get(phase.scalar.activation);if(!locations){locations=new Map();scalar.set(phase.scalar.activation,locations);}
            const key=phase.location!.id+";"+phase.scalar.universeKey,prior=locations.get(key);
            if(prior)for(const event of phase.scalar.excluded)prior.excluded.add(event);
            else locations.set(key,{phase,excluded:new Set(phase.scalar.excluded)});
        }
        for(const locations of scalar.values())for(const {phase,excluded}of locations.values())
            normalized.add(this.scalarCapturePhase(phase.context,phase.scalar!.activation,phase.location!,excluded,phase.scalar!.universe));
        // Only phases of one activation can precede each other, so dominance
        // is reduced within each activation's phases.
        const groups=new Map<FunctionOwner|undefined,SourceCapturePhase[]>();
        for(const phase of [...normalized].sort((left,right)=>left.id-right.id)){
            const group=this.capturePhaseActivation(phase),members=groups.get(group)??[];
            if(members.some(prior=>this.capturePrecedes(prior,phase)))continue;
            const kept=members.filter(prior=>!this.capturePrecedes(phase,prior));kept.push(phase);groups.set(group,kept);
        }
        const effective=[...groups.values()].flat();
        const key=effective.sort((left,right)=>left.id-right.id).map(phase=>phase.id).join(",");
        let constraints=this.captureConstraints.get(key);
        if(!constraints){constraints={kind:"capture-constraints",phases:effective};this.captureConstraints.set(key,constraints);}
        return constraints;
    }
    private captureSatisfied(inherited:ReadonlySet<SourceProjectionPhase>|undefined,constraints:SourceCaptureConstraints):boolean {
        if(!constraints.phases.length)return true;
        const groups=new Map<FunctionOwner|undefined,SourceCapturePhase[]>();
        for(const prior of inherited??[])if(prior.kind==="capture"){const group=this.capturePhaseActivation(prior);let members=groups.get(group);if(!members){members=[];groups.set(group,members);}members.push(prior);}
        return constraints.phases.every(phase=>(groups.get(this.capturePhaseActivation(phase))??[]).some(prior=>this.capturePrecedes(prior,phase)));
    }
    /** The activation a capture phase belongs to. Normalization keeps it, and
     * capturePrecedes holds only between phases of one activation. */
    private capturePhaseActivation(phase:SourceCapturePhase):FunctionOwner|undefined {
        return phase.scalar?.activation??phase.activationOnly??this.enclosingActivation(phase.context)??undefined;
    }
    private captureAtom(atom:Extract<Atom,{tag:"text-operation"}>,constraints:SourceCaptureConstraints):Atom {
        if(this.captureSatisfied(this.projectedAtomPhases.get(atom),constraints))return atom;
        let source:Atom=atom;
        for(let prior=this.capturedAtomInputs.get(source);prior;prior=this.capturedAtomInputs.get(source)){
            constraints=this.captureConstraintSet([...constraints.phases,...prior.constraints.phases]);source=prior.source;
        }
        let views=this.capturedAtoms.get(source);if(!views){views=new Map();this.capturedAtoms.set(source,views);}
        let projected=views.get(constraints);
        if(!projected){
            const original=source as Extract<Atom,{tag:"text-operation"}>;
            projected={...original,parts:original.parts.map(part=>this.captureProjection(part,constraints))};views.set(constraints,projected);
            this.projectedAtomPhases.set(projected,new Set([...(this.projectedAtomPhases.get(source)??[]),...constraints.phases]));
            this.capturedAtomInputs.set(projected,{source,constraints});
        }
        return projected;
    }
    private captureProjection(from:Cell,input:SourceCapturePhase|SourceCaptureConstraints):Cell {
        const initial=this.captureConstraintSet(input.kind==="capture"?[input]:input.phases);
        const pending:Array<{source:Cell;target:Cell;constraints:SourceCaptureConstraints}>=[];
        const project=(source:Cell,constraints=initial):Cell=>{
            constraints=this.captureConstraintSet(constraints.phases);
            const seen=new Set<Cell>();
            for(let prior=this.captureInputs.get(source);prior;prior=this.captureInputs.get(source)){
                if(seen.has(source)){
                    if(!this.failedCapture){this.failedCapture=this.newCell();this.publish(this.failedCapture,this.unknown);}
                    return this.failedCapture;
                }
                seen.add(source);constraints=this.captureConstraintSet([...constraints.phases,...prior.constraints.phases]);source=prior.source;
            }
            const inherited=this.projectedCellPhases.get(source);
            if(this.captureSatisfied(inherited,constraints))return source;
            let views=this.readCaptures.get(source);if(!views){views=new Map();this.readCaptures.set(source,views);}
            let target=views.get(constraints);
            if(!target){
                target=this.newCell();views.set(constraints,target);
                this.captureInputs.set(target,{source,constraints});
                this.projectedCellPhases.set(target,new Set([...(inherited??[]),...constraints.phases]));
                pending.push({source,target,constraints});
            }
            return target;
        };
        const captured=project(from);
        const extend=()=>{while(pending.length){
            const {source,target,constraints}=pending.pop()!,activations=[...new Set(constraints.phases.map(phase=>phase.activationOnly??this.enclosingActivation(phase.context)).filter((owner):owner is FunctionOwner=>!!owner))];
            let read!:Rule;
            read=this.rule([source,...activations.flatMap(owner=>[owner.active,this.activationTiming(owner)])],()=>{
                if(activations.some(owner=>!owner.active.values.nonempty))return;
                const normalized=this.captureConstraintSet(constraints.phases);
                if(normalized!==constraints){this.copy(this.captureProjection(source,normalized),target);return;}
                if(constraints.phases.every(phase=>!!phase.activationOnly)){this.copy(source,target);return;}
                // Growth anywhere in a watched cell's copy closure reaches the
                // rule through the change flush, so only the walk's roots (the
                // source, capture inputs and transform replays, which are not
                // copy edges) are watched, not every cell the walk visits.
                const worklist=[{source,origins:false,root:true}],visited=new Map<Cell,number>();
                while(worklist.length){
                    const {source,origins,root}=worklist.pop()!,bit=origins?1:2;
                    if((visited.get(source)??0)&bit)continue;visited.set(source,(visited.get(source)??0)|bit);if(root)this.watch(read,source);
                    const prior=this.captureInputs.get(source);
                    if(prior){
                        const combined=this.captureConstraintSet([...constraints.phases,...prior.constraints.phases]);
                        if(combined===constraints){worklist.push({source:prior.source,origins,root:true});continue;}
                        const projected=this.captureProjection(prior.source,combined);this.watch(read,projected);
                        if(projected!==target)for(const atom of projected.values)if(!origins||atom.tag==="unknown")this.publish(target,atom);
                        continue;
                    }
                    if(!origins){
                        const written=this.knownWriteOrigins.get(source);
                        if(written){
                            const actor=this.enclosingActivation(written.origin);
                            if(actor){this.watch(read,actor.active);this.watch(read,this.activationTiming(actor));}
                            let visible=true;
                            for(const phase of constraints.phases){
                                if(!visible)break;
                                if(phase.activationOnly)continue;
                                const {context,argumentsRead}=phase,activation=this.enclosingActivation(context);
                                if(phase.scalar){
                                    if(written.lexical&&written.location===phase.location&&this.enclosingActivation(written.origin)===phase.scalar.activation&&
                                        !this.repeatedActivationContext(written.origin)&&!this.repeatedActivationContext(context)){
                                        if(!written.event||!phase.scalar.universe.has(written.event)){this.publish(target,this.unknown);visible=false;break;}
                                        if(phase.scalar.excluded.has(written.event)){visible=false;break;}
                                    }
                                }else if(!this.writeVisible(written,context,argumentsRead)||phase.location===written.location&&written.lexical&&
                                    this.enclosingActivation(written.origin)===activation&&!this.repeatedActivationContext(written.origin)&&!this.repeatedActivationContext(context)&&
                                    this.readBeforeWrite(context,written.origin,written.reference)){visible=false;break;}
                            }
                            if(!visible)continue;
                        }
                        const transform=this.returnTransforms.get(source);
                        if(transform?.kind==="projection"){
                            const replay=transform.evaluate(transform.inputs.map(part=>project(part,constraints)));
                            if(replay!==source){worklist.push({source:replay,origins:false,root:true});continue;}
                        }
                    }
                    for(const atom of origins?source.values.ownUnknownValues():source.values.ownValues()){
                        // Publishing is idempotent: an untransformed atom already in the
                        // target needs no repeated visibility proof on later reruns.
                        if(atom.tag!=="text-operation"&&target.values.ownHas(atom))continue;
                        if(origins&&atom.tag!=="unknown"||constraints.phases.some(phase=>!phase.activationOnly&&!this.effectVisible(atom,phase.context,phase.argumentsRead)))continue;
                        this.publish(target,atom.tag==="text-operation"?this.captureAtom(atom,constraints):atom);
                    }
                    for(const [facts,kind]of source.values.sources)worklist.push({source:this.sourceCells.get(facts)!,origins:origins||kind==="origin",root:false});
                }
                extend();
            });
        }};
        extend();return captured;
    }
    /** Definition selection is a read operator. Its copied store inputs retain
     * their own RHS reads; temporal captures must not replay the selection on
     * those earlier snapshots. Return projection substitutes the binding input
     * through the same operator, retaining actual formal provenance. */
    private bindingRead(input:Cell,context:ts.Identifier,location=input):Cell {
        const symbol=this.bindingSymbol(context);if(!symbol||!this.bindingWriteSites.has(symbol))return input;
        let calls=this.bindingReads.get(context);if(!calls){calls=new Map();this.bindingReads.set(context,calls);}
        const previous=calls.get(input);if(previous)return previous;
        const result=this.newCell(),frame=this.sourceActivation(context),timing=this.activationTiming(frame);calls.set(input,result);
        this.returnTransforms.set(result,{kind:"binding-read",inputs:[input],evaluate:inputs=>this.bindingRead(inputs[0]!,context,location)});
        let revision=-1,timed:boolean|undefined,entryVersion=-1;
        let read!:Rule;read=this.rule([input,timing,...("fileName"in frame?[]:[frame.actualChanges])],()=>{
            const repeated=timing.values.nonempty,entries=this.formalInputs.get(input)??this.projectedFormalInputs.get(input),version=entries?.size??0;
            if(revision===input.ownRevision&&timed===repeated&&entryVersion===version)return;
            revision=input.ownRevision;timed=repeated;entryVersion=version;
            const definitions=this.reachingDefinitions(context,read);
            if(definitions===null){this.copy(input,result);return;}
            for(const atom of input.values.ownValues())this.publish(result,atom);
            for(const[facts,kind]of input.values.sources){const source=this.sourceCells.get(facts)!,write=this.knownWriteOrigins.get(source);
                if(kind==="value"&&!entries?.has(source)&&write?.lexical&&write.event&&write.location===location&&this.sourceActivation(write.origin)===frame&&!definitions.has(write.event))continue;
                this.copy(source,result,kind);
            }
        });return result;
    }
    private reachingDefinitions(context:ts.Identifier,rule:Rule):ReadonlySet<SourceLexicalWrite>|null {
        const symbol=this.bindingSymbol(context);if(!symbol)return null;
        if(ts.isExportSpecifier(context.parent)||(symbol.declarations??[]).some(declaration=>sourceDeclarationIntroducesBinding(declaration)&&(declaration as ts.NamedDeclaration).name===context))return null;
        const frame=this.sourceActivation(context),timing=this.activationTiming(frame);this.watch(rule,timing);
        if(timing.values.nonempty||this.repeatedActivationContext(context))return null;
        let root:ts.Node,parameters:readonly ts.ParameterDeclaration[]=[];
        if("fileName"in frame){
            if(this.sourceOrigins.has(frame)||this.dynamicContext(context))return null;
            root=frame;
        }else{
            if(frame.kind!=="ordinary"||!frame.node?.body)return null;
            root=frame.node.body;parameters=frame.parameters;
        }
        let graph=this.reachingWriteGraphs.get(frame);
        if(!graph){graph=new SourceReachingWrites(root,this.lexicalWriteEvents,node=>this.sourceActivation(node)===frame,node=>this.bindingSymbol(node),parameters,target=>this.assignmentTarget(target));this.reachingWriteGraphs.set(frame,graph);}
        return graph.reaching(context);
    }
    private bindingSymbol(node: ts.Identifier): ts.Symbol | undefined {
        // A Realm global reference of indirectly evaluated code has no lexical
        // declaration around its caller.
        if(this.evaluationGlobalTargets.has(node))return undefined;
        // Ordinary checker lookup stops at with. Resolve the declarative
        // fallback separately; object-record candidates remain graph edges.
        return this.functionBindingSymbol(node)??this.parameterScopeSymbol(node,sourceBindingTarget(this.checker, declarativeSourceBindingSymbol(this.checker, node)).symbol);
    }
    /** A parameter list's expressions run before the body's declarations
     * exist (FunctionDeclarationInstantiation gives them their own
     * Environment Record), so a reference there denotes a parameter or an
     * outer binding, never a body declaration, which the checker resolves it
     * to. */
    private parameterScopeSymbol(node:ts.Identifier,symbol:ts.Symbol|undefined):ts.Symbol|undefined {
        for(let child:ts.Node=node,scope=node.parent;symbol&&scope;child=scope,scope=scope.parent){
            if(!ts.isParameter(child)||!ts.isFunctionLike(scope)||!("body" in scope)||!scope.body)continue;
            const body=scope.body,file=body.getSourceFile();
            if(!(symbol.declarations??[]).length||!(symbol.declarations??[]).every(declaration=>declaration.getSourceFile()===file&&declaration.pos>=body.pos&&declaration.end<=body.end))continue;
            const outer=this.checker.resolveName(node.text,scope.parent,ts.SymbolFlags.Value,false);
            symbol=outer?sourceBindingTarget(this.checker,outer).symbol:undefined;
        }
        return symbol;
    }
    private readonly functionBindingSymbols=new Map<ts.Node,Map<string,ts.Symbol>>();
    private readonly functionBindings=new Map<ts.Symbol,FunctionBindingScope>();
    private readonly functionBindingReferences=new Map<ts.Identifier,ts.Symbol|null>();
    /** The ECMAScript binding a reference denotes where a function
     * declaration takes part in it (function-binding-scopes): one symbol per
     * block or var scope and name, standing for the checker's, whose
     * declarations are the binding's own. Null where the checker's symbol is
     * the binding. */
    private functionBindingSymbol(node:ts.Identifier):ts.Symbol|null {
        let symbol=this.functionBindingReferences.get(node);
        if(symbol===undefined){const scope=functionBindingScope(node);symbol=scope?this.functionScopeSymbol(scope):null;this.functionBindingReferences.set(node,symbol);}
        return symbol;
    }
    private functionScopeSymbol(scope:FunctionBindingScope):ts.Symbol {
        let names=this.functionBindingSymbols.get(scope.scope);if(!names){names=new Map();this.functionBindingSymbols.set(scope.scope,names);}
        let symbol=names.get(scope.name);
        if(!symbol){
            const functions=scope.kind==="var"?[...scope.functions,...scope.annexB]:scope.functions;
            const declarations:ts.Declaration[]=scope.kind==="var"?[...scope.parameters.map(name=>name.parent as ts.Declaration),...scope.variables.map(name=>name.parent as ts.Declaration),...functions]:[...functions];
            symbol={flags:ts.SymbolFlags.FunctionScopedVariable,escapedName:scope.name as ts.__String,name:scope.name,declarations,
                valueDeclaration:scope.kind==="var"?scope.functions.at(-1)??scope.annexB.at(-1):scope.functions.at(-1)} as unknown as ts.Symbol;
            names.set(scope.name,symbol);this.functionBindings.set(symbol,scope);
        }
        return symbol;
    }
    /** A block's binding holds its last function declaration. A var scope's
     * holds its last top-level function declaration, else undefined until a
     * parameter or var assignment, and receives each B.3.2.1 block
     * function's block binding when that declaration is evaluated; a
     * Script's is its global object property. */
    private functionBindingCell(symbol:ts.Symbol):Cell {
        const existing=this.bindings.get(symbol);if(existing)return existing;
        const scope=this.functionBindings.get(symbol)!;
        const cell=scope.kind==="var"&&ts.isSourceFile(scope.scope)&&this.scriptOrder.has(scope.scope)?this.globalBinding(scope.name):this.newCell();
        this.bindings.set(symbol,cell);
        if(scope.kind==="lexical")this.copy(this.cell(scope.functions.at(-1)!),cell);
        else{
            const last=scope.functions.at(-1);if(last)this.copy(this.cell(last),cell);
            else if(!scope.parameters.length)this.publish(cell,this.primitive(undefined));
            for(const declaration of scope.annexB){const block=functionBindingScope(declaration.name);if(block)this.copy(this.functionBindingCell(this.functionScopeSymbol(block)),cell);}
        }
        return cell;
    }
    /** One reference record per identifier occurrence inside generated code,
     * connected to every caller environment; reads and writes share it. */
    private evaluationNodeReference(environment:EvaluationEnvironment,node:ts.Identifier):{value:Cell;writes:Cell} {
        let reference=environment.references.get(node);
        if(!reference){
            reference={value:this.newCell(),writes:this.newCell()};environment.references.set(node,reference);
            for(const[caller,realms]of environment.callers)for(const realm of realms)this.connectEvaluationReference(environment,node,reference,caller,realm);
        }
        return reference;
    }
    private evaluationReferenceEnvironment(node:ts.Identifier):EvaluationEnvironment|undefined {
        const environment=this.evaluationEnvironments.get(this.sourceFile(node));
        if(!environment)return undefined;
        const symbol=declarativeSourceBindingSymbol(this.checker,node);
        return (symbol?.declarations??[]).some(declaration=>declaration.getSourceFile()===environment.source &&
            !isAmbientSourceDeclaration(declaration)&&sourceDeclarationIntroducesBinding(declaration))?undefined:environment;
    }
    private implicitArgumentsOwner(node:ts.Identifier):FunctionOwner|null {
        if(node.text!=="arguments"||this.evaluationGlobalTargets.has(node))return null;
        const symbol=this.bindingSymbol(node);
        // A parameter, lexical or function declaration shadows the implicit
        // binding. A plain var repeats the existing binding instead.
        if((symbol?.declarations??[]).some(declaration=>sourceDeclarationIntroducesBinding(declaration)&&
            !(ts.isVariableDeclaration(declaration)&&ts.isVariableDeclarationList(declaration.parent)&&!(declaration.parent.flags&ts.NodeFlags.BlockScoped))))return null;
        for(let child:ts.Node=node,parent=node.parent;parent;child=parent,parent=parent.parent){
            if(ts.isArrowFunction(parent))continue;
            if(functionNode(parent)&&child!==parent.name)return this.function(parent);
            if(ts.isSourceFile(parent))return null;
        }return null;
    }
    /** One actual-list collection supplies the arguments owner, including
     * unknown extents. Only rightmost simple sloppy formals can be mapped. */
    private argumentsBinding(fn:FunctionOwner):Cell {
        if(fn.arguments)return fn.arguments.value;
        const context=ts.setTextRange(ts.factory.createEmptyStatement(),fn.definition);(context as ts.Node&{parent:ts.Node}).parent=fn.node?.body??fn.definition;
        const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype(),ordinary:true,closedIndices:true};
        this.sourceObjectOwners.add(owner);this.ownerCreations.set(owner,context);this.ownerMutation(owner);this.markPropertyAlgorithm(owner,"ordinary");
        const length=this.field(owner,"length"),value=this.newCell(),record:SourceArgumentsRecord={owner,value,length,mapped:new Map(),seen:new Set()};fn.arguments=record;owner.arguments=record;
        const presence=this.ownPresence(owner,"length");presence.initial=true;this.publish(presence.facts,this.primitive(true));this.publish(presence.enumerable,this.primitive(false));
        this.publish(value,{tag:"object",owner});
        const iterator=this.newCell();this.publish(iterator,this.operation("array-values"));this.defineField(owner,this.wellKnownSymbols.get("iterator")!,iterator,false);
        const simple=fn.parameters.every(parameter=>ts.isIdentifier(parameter.name)&&!parameter.initializer&&!parameter.dotDotDotToken),mapped=simple&&!isStrictCodeContext(fn.definition);
        if(mapped)this.defineField(owner,"callee",this.cell(fn.definition),false);
        else{const thrower=this.newCell();this.publish(thrower,this.operation("throw-type-error"));this.defineAccessor(owner,"callee","get",thrower);this.defineAccessor(owner,"callee","set",thrower);const presence=this.ownPresence(owner,"callee");presence.initial=true;this.publish(presence.facts,this.primitive(true));this.publish(presence.enumerable,this.primitive(false));}
        const parameters=new Map<number,Cell>(),names=new Set<string>();
        if(mapped)for(let index=fn.parameters.length-1;index>=0;index--){const name=fn.parameters[index]!.name as ts.Identifier;if(names.has(name.text))continue;names.add(name.text);parameters.set(index,this.binding(name));}
        const unknownLength:Atom={tag:"non-string",kinds:KIND_NUMBER},indices=this.newCell();this.publish(indices,unknownLength);
        this.rule([fn.actualChanges],()=>{for(const call of fn.actuals.values()){
            if(record.seen.has(call))continue;record.seen.add(call);
            if(call.args){this.publish(record.length,this.primitive(call.args.length));for(const[index,input]of call.args.entries())this.defineField(owner,String(index),input,true);}
            else{
                this.publish(record.length,unknownLength);
                const values=call.sequence?this.allArgumentValues(call.sequence):this.newCell();if(!call.sequence)this.publish(values,this.unknown);
                this.defineField(owner,null,values,true,indices);
            }
            for(const[index,formal]of parameters){if(call.args&&index>=call.args.length)continue;const key=String(index);if(record.mapped.has(key))continue;const value=this.newCell();this.copy(this.field(owner,key),value);this.copy(formal,value);record.mapped.set(key,{binding:formal,value});this.publish(owner.shape,{tag:"descriptor",identity:value});}
        }});
        return value;
    }
    private recordCallArguments(fn:FunctionOwner,signature:string,args:readonly Cell[]|null,sequence:ArgumentSequence|null,context:ts.Node):void {
        if(fn.actuals.has(signature))return;const record={args,sequence,context};fn.actuals.set(signature,record);this.publish(fn.actualChanges,{tag:"descriptor",identity:record});
    }
    private binding(node: ts.Identifier): Cell {
        const argumentsOwner=this.implicitArgumentsOwner(node);if(argumentsOwner)return this.argumentsBinding(argumentsOwner);
        const origin = declarativeSourceBindingSymbol(this.checker, node);
        if(this.evaluationGlobalTargets.has(node)){const realm=this.evaluationGlobalTargets.get(node)!;return (realm===this.currentRealm?this.globalLexicals.get(node.text)?.value:undefined)??this.realmBinding(realm,node.text);}
        const activation=this.enclosingActivation(node);
        const injected=activation&&this.evaluationVarBindings.get(activation)?.get(node.text);
        if(injected&&!!this.evaluationDeclarationBindings.get(injected)?.origins.size&&!(origin?.declarations??[]).some(declaration=>
            !isAmbientSourceDeclaration(declaration)&&sourceDeclarationIntroducesBinding(declaration)))return injected;
        const environment=this.evaluationReferenceEnvironment(node);
        const declared=(origin?.declarations??[]).some(declaration=>!isAmbientSourceDeclaration(declaration)&&sourceDeclarationIntroducesBinding(declaration));
        if(environment&&activation&&!declared){
            let names=this.evaluationVarBindings.get(activation);if(!names){names=new Map();this.evaluationVarBindings.set(activation,names);}
            let binding=names.get(node.text);if(!binding){binding=this.newCell();names.set(node.text,binding);
                this.evaluationDeclarationBindings.set(binding,{origins:new Set(),fallback:this.evaluationNodeReference(environment,node).value});
            }
            return binding;
        }
        if(environment)return this.evaluationNodeReference(environment,node).value;
        for(const declaration of origin?.declarations??[]){
            let current:ts.Node|undefined=declaration;
            while(current&&!ts.isImportDeclaration(current)&&!ts.isSourceFile(current))current=current.parent;
            if(!current||!ts.isImportDeclaration(current)||!ts.isStringLiteralLike(current.moduleSpecifier))continue;
            const descriptor=this.nativeModuleSource(current.moduleSpecifier.text);if(!descriptor)continue;
            if(current.importClause?.isTypeOnly||ts.isImportSpecifier(declaration)&&declaration.isTypeOnly)continue;
            if(ts.isImportSpecifier(declaration)){
                const name=(declaration.propertyName??declaration.name).text;
                return name==="default"?descriptor.module(false):descriptor.export(name);
            }
            if(ts.isNamespaceImport(declaration))return descriptor.module(true);
            if(ts.isImportClause(declaration)&&declaration.name)return descriptor.module(false);
        }
        const scoped = this.functionBindingSymbol(node);
        if (scoped) return this.functionBindingCell(scoped);
        const projected = sourceBindingTarget(this.checker, origin), symbol = this.parameterScopeSymbol(node, projected.symbol);
        const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
        if (declaration && ts.isSourceFile(declaration)) {
            if (projected.namespace) return this.moduleNamespace(declaration, symbol!);
            if (declaration.flags & ts.NodeFlags.JsonFile) {
                const expression = declaration.statements[0];
                if (expression && ts.isExpressionStatement(expression)) return this.cell(expression.expression);
            }
        }
        if (declaration && ts.isExportAssignment(declaration)) return this.cell(declaration.expression);
        if (declaration && callableDefinition(declaration) && !sourceDeclarationIntroducesBinding(declaration)) return this.cell(declaration);
        if (declaration && isAmbientSourceDeclaration(declaration)) return this.globalLexicals.get(node.text)?.value ?? this.globalBinding(node.text);
        if (!symbol || !(symbol.declarations ?? []).some(sourceDeclarationIntroducesBinding)) {
            const annexB = this.annexBVarBinding(node);
            if (annexB) return annexB;
            const owner=this.enclosingActivation(node);
            if(owner){
                let names=this.evaluationVarBindings.get(owner);if(!names){names=new Map();this.evaluationVarBindings.set(owner,names);}
                let binding=names.get(node.text);if(!binding){
                    binding=this.newCell();names.set(node.text,binding);const fallback=this.globalLexicals.get(node.text)?.value??this.globalBinding(node.text);
                    this.evaluationDeclarationBindings.set(binding,{origins:new Set(),fallback});this.activationGlobalFallbacks.set(binding,fallback);
                }
                return binding;
            }
            return this.globalLexicals.get(node.text)?.value ?? this.globalBinding(node.text);
        }
        const sourceGlobal = declaration && this.scriptDeclarationBinding(declaration, node.text);
        if (sourceGlobal) {
            if (callableDefinition(declaration!)) this.copy(this.cell(declaration!), sourceGlobal);
            this.bindings.set(symbol, sourceGlobal);
            return sourceGlobal;
        }
        let cell = this.bindings.get(symbol);
        if (!cell) {
            cell = this.newCell(); this.bindings.set(symbol, cell);
            const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
            if (declaration && callableDefinition(declaration)) this.copy(this.cell(declaration), cell);
        }
        return cell;
    }
    private connectEvaluationReference(environment:EvaluationEnvironment,node:ts.Identifier,
        reference:{value:Cell;writes:Cell},caller:ts.Node,realm:SourceRealmRecord):void {
        // Contextual identifiers re-enter the same binding/with/property graph.
        // Intern them by caller and name so nested or recursive source edges
        // join canonical locations rather than extending an invocation path.
        // An indirect eval's names resolve in its Realm's global scope, but
        // they are read when that call runs: each caller keeps its own
        // position and activation.
        const context=caller;
        let targets:Map<string,ts.Identifier>|undefined;
        if(environment.direct){targets=this.evaluationReferenceTargets.get(context);if(!targets){targets=new Map();this.evaluationReferenceTargets.set(context,targets);}}
        else {let realms=this.evaluationRealmTargets.get(context);if(!realms){realms=new Map();this.evaluationRealmTargets.set(context,realms);}targets=realms.get(realm);if(!targets){targets=new Map();realms.set(realm,targets);}}
        let target=targets.get(node.text);
        if(!target){target=ts.setTextRange(ts.factory.createIdentifier(node.text),caller);
            (target as ts.Identifier&{parent:ts.Node}).parent=context;targets.set(node.text,target);
            if(!environment.direct)this.evaluationGlobalTargets.set(target,realm);
            else this.evaluationCallerTargets.add(target);
            const handler=this.exceptionHandlers.get(node);if(handler)this.exceptionHandlers.set(target,handler);}
        this.copy(this.cell(target),reference.value);
        // Only a reference the evaluated code writes creates or assigns the
        // caller's binding; a read alone leaves an undeclared name unresolved
        // (a host value, or a ReferenceError under the Test262 host).
        let written=false;
        this.rule([reference.writes],()=>{if(written||!reference.writes.values.nonempty)return;written=true;this.writeBinding(target,reference.writes);});
    }
    private executionRealms(node:ts.Node):Cell {
        const environment=this.evaluationEnvironments.get(this.sourceFile(node));
        if(environment)return environment.realms;
        return this.currentRealmCell;
    }
    private connectGeneratedEnvironment(environment:EvaluationEnvironment,caller:ts.Node,realm:SourceRealmRecord):boolean {
        if(environment.direct)this.copy(this.executionRealms(caller),environment.realms);else this.publish(environment.realms,realm.record);
        let realms=environment.callers.get(caller);if(!realms){realms=new Set();environment.callers.set(caller,realms);}if(realms.has(realm))return false;realms.add(realm);
        this.publish(this.evaluationCallerChange(environment),{tag:"descriptor",identity:caller});
        for(const[node,reference]of environment.references)this.connectEvaluationReference(environment,node,reference,caller,realm);
        return true;
    }
    private connectEvaluationEnvironment(source:string,caller:ts.Node,direct:boolean,realm:SourceRealmRecord):void {
        for(const environment of this.evaluationSourceEnvironments.get(source)??[]) {
            if(environment.direct!==direct)continue;
            if(!this.connectGeneratedEnvironment(environment,caller,realm))continue;
            if(direct&&isStrictCodeContext(caller))continue;
            for(const[name,declaration]of environment.declarations){
                const binding=declaration.annexB?this.annexBVarBinding(declaration.node)??this.binding(declaration.node):this.binding(declaration.node);
                for(const update of declaration.updates??[])this.copy(this.cell(update),binding);
                if(direct){
                    const target=ts.setTextRange(ts.factory.createIdentifier(name),caller);(target as ts.Identifier&{parent:ts.Node}).parent=caller;
                    const symbol=this.bindingSymbol(target),lexical=(symbol?.declarations??[]).some(node=>
                        ts.isClassDeclaration(node)||ts.isVariableDeclaration(node)&&ts.isVariableDeclarationList(node.parent)&&!!(node.parent.flags&ts.NodeFlags.BlockScoped));
                    if(lexical){const handler=this.exceptionHandlers.get(caller);if(handler)this.publish(handler,this.nativeException(caller));continue;}
                    const owner=this.enclosingActivation(caller);
                    let destination:Cell;
                    if(symbol&&(symbol.declarations??[]).some(sourceDeclarationIntroducesBinding))destination=this.binding(target);
                    else if(owner){let names=this.evaluationVarBindings.get(owner);if(!names){names=new Map();this.evaluationVarBindings.set(owner,names);}destination=names.get(name)??this.newCell();names.set(name,destination);}
                    else destination=this.realmBinding(realm,name);
                    this.copy(binding,destination);this.registerEvaluationDeclaration(destination,caller);
                }else{
                    const destination=this.realmBinding(realm,name);this.copy(binding,destination);this.registerEvaluationDeclaration(destination,caller);
                    const receiver=this.newCell();this.publish(receiver,realm.global);
                    this.writeProperty(receiver,name,binding,true,"define",caller);
                }
                if(declaration.function&&!declaration.annexB)this.copy(this.cell(declaration.function),binding);
            }
        }
    }
    private registerEvaluationDeclaration(binding:Cell,caller:ts.Node):void {
        let record=this.evaluationDeclarationBindings.get(binding);if(!record){record={origins:new Set()};this.evaluationDeclarationBindings.set(binding,record);}record.origins.add(caller);
    }
    private evaluationDeclarationUnavailable(binding:Cell,read:ts.Node):boolean {
        const origins=this.evaluationDeclarationBindings.get(binding)?.origins;if(!origins?.size)return false;
        const activation=this.enclosingActivation(read);
        return [...origins].every(caller=>this.sourceFile(caller)===this.sourceFile(read)&&
            this.enclosingActivation(caller)===activation&&this.evaluationOrder.before(read,caller));
    }
    private scriptDeclarationBinding(declaration: ts.Node, name: string): Cell | null {
        let selected = declaration;
        while (ts.isBindingElement(selected)) selected = selected.parent.parent;
        const source = selected.getSourceFile();
        if (!this.scriptOrder.has(source) || isAmbientSourceDeclaration(selected)) return null;
        if (ts.isFunctionDeclaration(selected) && selected.parent === source) return this.globalBinding(name);
        if (ts.isClassDeclaration(selected) && selected.parent === source) return this.globalLexicals.get(name)?.value ?? null;
        if (!ts.isVariableDeclaration(selected) || !ts.isVariableDeclarationList(selected.parent)) return null;
        if (selected.parent.flags & ts.NodeFlags.BlockScoped)
            return selected.parent.parent?.parent === source ? this.globalLexicals.get(name)?.value ?? null : null;
        for (let owner: ts.Node | undefined = selected.parent; owner; owner = owner.parent) {
            if (ts.isFunctionLike(owner) || ts.isClassLike(owner) || ts.isModuleBlock(owner) || ts.isModuleDeclaration(owner)) return null;
            if (ts.isSourceFile(owner)) return this.globalBinding(name);
        }
        return null;
    }
    private moduleNamespace(source: ts.SourceFile, symbol: ts.Symbol|undefined): Cell {
        const existing = this.moduleNamespaces.get(source); if (existing) return existing.value;
        const owner: ObjectOwner = {fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.newCell()};
        const value = this.newCell(); this.moduleNamespaces.set(source,{value,owner});
        this.publish(owner.prototype!,this.primitive(null)); this.publish(value,{tag:"object",owner});
        this.moduleNamespacePending.push({source,symbol,owner});
        return value;
    }
    private initializeModuleNamespace(source: ts.SourceFile, symbol: ts.Symbol|undefined, owner: ObjectOwner): void {
        if (source.flags & ts.NodeFlags.JsonFile) {
            const expression = source.statements[0];
            if (expression && ts.isExpressionStatement(expression)) this.defineField(owner,"default",this.cell(expression.expression));
        } else {
            if(!symbol){this.publish(owner.shape,this.unknown);return;}
            for (const exported of this.checker.getExportsOfModule(symbol)) {
                const target = sourceBindingTarget(this.checker, exported);
                const declaration = target.symbol?.valueDeclaration ?? target.symbol?.declarations?.[0];
                if (!declaration) continue;
                let selected: Cell;
                if (ts.isSourceFile(declaration) && target.namespace) selected = this.moduleNamespace(declaration,target.symbol!);
                else if (ts.isSourceFile(declaration) && declaration.flags & ts.NodeFlags.JsonFile) {
                    const expression = declaration.statements[0];
                    selected = expression && ts.isExpressionStatement(expression) ? this.cell(expression.expression) : this.newCell();
                } else if (ts.isExportAssignment(declaration)) selected = this.cell(declaration.expression);
                else if (callableDefinition(declaration) && !sourceDeclarationIntroducesBinding(declaration)) selected = this.cell(declaration);
                else {
                    selected = this.bindings.get(target.symbol!) ?? this.newCell();
                    this.bindings.set(target.symbol!,selected);
                    if (callableDefinition(declaration)) this.copy(this.cell(declaration),selected);
                }
                this.defineField(owner,exported.getName(),selected);
            }
        }
    }
    private bindingMayBeUninitialized(node: ts.Identifier): boolean {
        for (const value of this.bindingSymbol(node)?.declarations ?? []) {
            if (value.getSourceFile().isDeclarationFile || !sourceDeclarationIntroducesBinding(value)) continue;
            let declaration: ts.Node | undefined = value;
            while (declaration && !ts.isVariableDeclaration(declaration) && !ts.isSourceFile(declaration) && !ts.isFunctionLike(declaration)) declaration = declaration.parent;
            if (!declaration || !ts.isVariableDeclaration(declaration) || !ts.isVariableDeclarationList(declaration.parent) ||
                declaration.parent.flags & ts.NodeFlags.BlockScoped) continue;
            if (!declaration.initializer || declaration.getSourceFile() !== node.getSourceFile() ||
                this.enclosingActivation(declaration) !== this.enclosingActivation(node) || node.getStart() <= declaration.initializer.getEnd()) return true;
            for (let parent: ts.Node | undefined = declaration.parent; parent && !ts.isSourceFile(parent) && !ts.isFunctionLike(parent); parent = parent.parent)
                if (!ts.isVariableDeclarationList(parent) && !ts.isVariableStatement(parent) && !ts.isBlock(parent)) return true;
        }
        return false;
    }
    private bindingDefinitelyInTDZ(node:ts.Identifier):boolean {
        // This syntactic dominance proof is only for captured caller references;
        // general lexical activation/initialization precision stays conservative.
        if(!this.evaluationCallerTargets.has(node))return false;
        for(const declaration of this.bindingSymbol(node)?.declarations??[]) {
            let binding:ts.Node=declaration;
            while(ts.isBindingElement(binding))binding=binding.parent.parent;
            const lexical=ts.isClassDeclaration(binding)||ts.isVariableDeclaration(binding)&&
                ts.isVariableDeclarationList(binding.parent)&&!!(binding.parent.flags&ts.NodeFlags.BlockScoped);
            if(!lexical||binding.getSourceFile()!==this.sourceFile(node)||this.enclosingActivation(binding)!==this.enclosingActivation(node))continue;
            if(node.getEnd()<=binding.getStart())return true;
        }
        return false;
    }
    private withBindingObjects(node: ts.Identifier): Cell[] {
        if (this.evaluationGlobalTargets.has(node)) return [];
        const symbol = this.bindingSymbol(node);
        let declaration = symbol?.valueDeclaration && sourceDeclarationIntroducesBinding(symbol.valueDeclaration)
            ? symbol.valueDeclaration : symbol?.declarations?.find(sourceDeclarationIntroducesBinding);
        while (declaration && ts.isBindingElement(declaration)) declaration = declaration.parent.parent as ts.Declaration;
        let owner: ts.Node | undefined;
        if (declaration && ts.isParameter(declaration)) owner = declaration.parent;
        else if (declaration && (ts.isFunctionExpression(declaration) || ts.isClassExpression(declaration))) owner = declaration;
        else if (declaration && ts.isVariableDeclaration(declaration) && ts.isCatchClause(declaration.parent)) owner = declaration.parent;
        else if (declaration) {
            const variableList = ts.isVariableDeclaration(declaration) && ts.isVariableDeclarationList(declaration.parent)
                ? declaration.parent : undefined;
            const functionScoped = !!variableList && !(variableList.flags & ts.NodeFlags.BlockScoped);
            for (let current: ts.Node | undefined = declaration.parent; current; current = current.parent) {
                if (ts.isSourceFile(current) || ts.isFunctionLike(current) || !functionScoped &&
                    (ts.isBlock(current) || ts.isCaseBlock(current) || ts.isForStatement(current) ||
                        ts.isForOfStatement(current) || ts.isForInStatement(current))) { owner = current; break; }
            }
        }
        const objects: Cell[] = [];
        let child: ts.Node = node;
        for (let current: ts.Node | undefined = node.parent; current && current !== owner; current = current.parent) {
            if (ts.isWithStatement(current) && current.statement === child) {
                const object=this.cell(current.expression);objects.push(object);
                this.proxyInternalMethod(object,["has","get"],node,true);
                // HasBinding of an object Environment Record reads the object's
                // @@unscopables and, when it is an Object, the name on it
                // (sec-object-environment-records-hasbinding-n): getters run.
                this.property(this.property(object,this.wellKnownSymbols.get("unscopables")!,node),node.text,node);
            }
            child = current;
        }
        return objects;
    }
    private writeBinding(node: ts.Identifier, value: Cell, context?:ts.Node): void {
        const environment=this.evaluationGlobalTargets.has(node)?undefined:this.evaluationReferenceEnvironment(node);
        if(environment) {
            this.binding(node);this.copyWrite(value,this.evaluationNodeReference(environment,node).writes,context,true,node);return;
        }
        this.copyWrite(value,this.binding(node),context,true,node);
        if(this.isAmbientIdentifier(node)){
            // A sloppy write creates the global; its value may still depend on
            // own-location absence (a pattern default), so the binding is not
            // an unresolved external input.
            this.writtenAmbientBindings.add(this.binding(node));
            const realm=this.evaluationGlobalTargets.get(node)??this.currentRealm;
            const receiver=this.newCell();this.publish(receiver,realm.global);
            this.writeProperty(receiver,node.text,value,true,"set",context??node);
        }
        // Presence and unscopables can change during execution. Keep both
        // object-record and declarative destinations in this may-flow graph;
        // runtime Reference capture makes the actual selection.
        for (const base of this.withBindingObjects(node)) this.rule([base], () => {
            for (const atom of base.values) {
                const owner = this.ordinaryOwner(atom);
                if (owner) this.copyWrite(value,this.field(owner,node.text),context);
            }
        });
    }
    private intrinsic(domain: Domain, kind: DynamicFunctionKind,realm=this.currentRealm): Atom {
        const key = domain + ":" + kind;
        let atom = realm.intrinsics.get(key);
        if (!atom) { atom = { tag: "intrinsic", domain, kind,realm }; realm.intrinsics.set(key, atom); }
        return atom;
    }
    private operation(operation: Operation): Atom {
        return this.realmOperation(this.currentRealm,operation);
    }
    private text(text: string): Atom {
        return this.primitive(text);
    }
    private primitive(value: Primitive): Atom {
        if (typeof value === "symbol") {
            let atom = this.symbolPrimitives.get(value);
            if (!atom) {atom = {tag: "primitive", value}; this.symbolPrimitives.set(value, atom);}
            return atom;
        }
        if (Object.is(value, -0)) return this.negativeZeroPrimitive ??= { tag: "primitive", value };
        let values = this.primitives.get(typeof value);
        if (!values) { values = new Map(); this.primitives.set(typeof value, values); }
        let atom = values.get(value);
        if (!atom) { atom = { tag: "primitive", value }; values.set(value, atom); }
        return atom;
    }
    private keyIdentity(key: SourcePropertyKey | null): string {
        if (typeof key !== "symbol") return JSON.stringify(key);
        let identity = this.symbolIdentities.get(key);
        if (identity === undefined) {identity = this.symbolIdentities.size; this.symbolIdentities.set(key, identity);}
        return "symbol:" + identity;
    }
    private owner(node: ts.Node): ObjectOwner {
        let owner = this.objects.get(node);
        if (!owner) {
            owner = { fields: new Map(), accessors: new Map(), shape: this.newCell() }; this.objects.set(node, owner);this.sourceObjectOwners.add(owner);
            if(ts.isObjectLiteralExpression(node)||ts.isArrayLiteralExpression(node)||callableDefinition(node))this.markPropertyAlgorithm(owner,"ordinary");
            if(ts.isObjectLiteralExpression(node)||ts.isArrayLiteralExpression(node)||ts.isNewExpression(node))this.ownerCreations.set(owner,node);
            this.ownerMutation(owner);
        }
        return owner;
    }
    /** An effect cannot mutate an identity whose represented creation is
     * strictly later, including effects in a completed root loop. Repeated,
     * suspended and unrepresented creation timing stays open. */
    private ownerMutation(owner:ObjectOwner):void {
        const creation=this.ownerCreations.get(owner);
        if(creation&&this.confinedLiteral(creation))return;
        const activation=creation?this.enclosingActivation(creation):undefined;
        // These owners have no represented acyclic creation boundary. Every
        // opaque origin is admissible, so retain the canonical graph directly.
        if(!creation||this.repeatedActivationContext(creation)){this.copy(this.opaqueMutation,owner.shape);return;}
        this.rule([this.opaqueMutation,...(activation?[activation.active,this.activationTiming(activation)]:[])],()=>{
            for(const atom of this.opaqueMutation.values){
                if(creation&&(!activation||!this.activationTimed(activation))&&atom.tag==="unknown"&&atom.origin&&!this.enclosingActivation(atom.origin)&&!this.repeatedActivationContext(creation)){
                    const points=activation?.kind==="ordinary"?[...activation.active.values].map(origin=>origin.tag==="unknown"?origin.origin:undefined):activation?[undefined]:[creation];
                    if(points.length&&points.every(point=>{
                        if(!point||this.dynamicContext(point))return false;
                        if(this.sourceFile(atom.origin!)!==this.sourceFile(point)){
                            const before=this.scriptOrder.get(this.sourceFile(atom.origin!)),after=this.scriptOrder.get(this.sourceFile(point));
                            return before!==undefined&&after!==undefined&&before.last<after.first;
                        }
                        return this.evaluationOrder.before(atom.origin!,point);
                    }))continue;
                }
                this.publish(owner.shape,atom);
            }
        });
    }
    /** An object or array literal that initializes a block-scoped `const`
     * is reachable only through that binding. When every reference to the
     * binding is a property access at a key the literal itself defines as a
     * data property (a read or call target never, a write only on an object
     * literal, a delete never), the object never becomes a `this` value, an
     * argument, a returned or stored value or a prototype-chain receiver, so
     * no code other than those accesses can observe or mutate any instance of
     * it, and no opaque effect, whenever it runs, reaches its fields. A Script's
     * top-level `const` is excluded (unknown code names global lexicals), as
     * is a scope that contains a direct eval or a with statement. */
    private confinedLiteral(node:ts.Node):boolean {
        let known=this.confinedLiterals.get(node);if(known!==undefined)return known;
        known=this.computeConfinedLiteral(node);this.confinedLiterals.set(node,known);return known;
    }
    private computeConfinedLiteral(node:ts.Node):boolean {
        const array=ts.isArrayLiteralExpression(node);
        if(!array&&!ts.isObjectLiteralExpression(node))return false;
        let top:ts.Node=node;
        while(ts.isParenthesizedExpression(top.parent)||ts.isAsExpression(top.parent)||ts.isSatisfiesExpression(top.parent)||ts.isTypeAssertionExpression(top.parent)||ts.isNonNullExpression(top.parent))top=top.parent;
        const declaration=top.parent;
        if(!ts.isVariableDeclaration(declaration)||declaration.initializer!==top||!ts.isIdentifier(declaration.name))return false;
        const list=declaration.parent;
        if(!ts.isVariableDeclarationList(list)||!(list.flags&ts.NodeFlags.Const)||!ts.isVariableStatement(list.parent))return false;
        const container=list.parent.parent;
        const scope=ts.isBlock(container)?container:ts.isCaseClause(container)||ts.isDefaultClause(container)?container.parent:undefined;
        if(!scope)return false;
        const symbol=this.bindingSymbol(declaration.name);if(!symbol)return false;
        // Keys the literal defines as data properties.
        const keys=new Set<string>();
        if(array){
            for(const [index,element] of node.elements.entries()){if(ts.isOmittedExpression(element)||ts.isSpreadElement(element))break;keys.add(String(index));}
            keys.add("length");
        }else{
            const accessors=new Set<string>();
            for(const property of node.properties){
                if(ts.isSpreadAssignment(property))continue;
                const name=property.name;
                if(ts.isGetAccessorDeclaration(property)||ts.isSetAccessorDeclaration(property)){
                    if(!name||ts.isComputedPropertyName(name)||ts.isPrivateIdentifier(name))return false;
                    accessors.add(name.text);continue;
                }
                if(!name||ts.isComputedPropertyName(name)||ts.isPrivateIdentifier(name)||ts.isNumericLiteral(name)||ts.isBigIntLiteral(name))continue;
                if(name.text==="__proto__")continue;
                if(ts.isPropertyAssignment(property)||ts.isShorthandPropertyAssignment(property)||ts.isMethodDeclaration(property))keys.add(name.text);
            }
            for(const key of accessors)keys.delete(key);
        }
        const name=declaration.name.text;
        const key=(access:ts.Expression):string|undefined=>{
            if(ts.isPropertyAccessExpression(access))return ts.isIdentifier(access.name)?access.name.text:undefined;
            if(ts.isElementAccessExpression(access)){
                const argument=access.argumentExpression;
                if(ts.isStringLiteral(argument))return argument.text;
                if(ts.isNumericLiteral(argument)&&/^(?:0|[1-9][0-9]*)$/.test(argument.text))return argument.text;
            }
            return undefined;
        };
        const confinedUse=(reference:ts.Identifier):boolean=>{
            const access=reference.parent;
            if(!(ts.isPropertyAccessExpression(access)||ts.isElementAccessExpression(access))||access.expression!==reference)return false;
            const accessed=key(access);if(accessed===undefined||!keys.has(accessed))return false;
            let use:ts.Node=access;while(ts.isParenthesizedExpression(use.parent))use=use.parent;
            const parent=use.parent;
            if((ts.isCallExpression(parent)||ts.isNewExpression(parent))&&parent.expression===use||ts.isTaggedTemplateExpression(parent)&&parent.tag===use||ts.isDeleteExpression(parent))return false;
            if(this.writtenExpression(access))return !array;
            return true;
        };
        let confined=true;
        const visit=(current:ts.Node):void=>{
            if(!confined)return;
            if(ts.isWithStatement(current)){confined=false;return;}
            if(ts.isCallExpression(current)){let callee:ts.Expression=current.expression;while(ts.isParenthesizedExpression(callee))callee=callee.expression;if(ts.isIdentifier(callee)&&callee.text==="eval"){confined=false;return;}}
            if(ts.isIdentifier(current)&&current.text===name&&current!==declaration.name&&!this.propertyNamePosition(current)){
                if(ts.isShorthandPropertyAssignment(current.parent)&&current.parent.name===current){confined=false;return;}
                const target=this.bindingSymbol(current);
                if(target===symbol){if(!confinedUse(current)){confined=false;return;}}
                else if(target===undefined){confined=false;return;}
            }
            current.forEachChild(visit);
        };
        visit(scope);
        return confined;
    }
    /** Identifier positions that name a property, label or declaration
     * member rather than referencing a binding. */
    private propertyNamePosition(node:ts.Identifier):boolean {
        const parent=node.parent;
        return ts.isPropertyAccessExpression(parent)&&parent.name===node||ts.isQualifiedName(parent)&&parent.right===node||
            (ts.isPropertyAssignment(parent)||ts.isMethodDeclaration(parent)||ts.isPropertyDeclaration(parent)||ts.isGetAccessorDeclaration(parent)||ts.isSetAccessorDeclaration(parent)||
             ts.isPropertySignature(parent)||ts.isMethodSignature(parent)||ts.isEnumMember(parent)||ts.isBindingElement(parent)&&parent.propertyName===node||ts.isImportSpecifier(parent)&&parent.propertyName===node||ts.isExportSpecifier(parent)&&parent.propertyName===node)&&(parent as {name?:ts.Node}).name===node||
            ts.isBindingElement(parent)&&parent.propertyName===node||
            ts.isLabeledStatement(parent)||ts.isBreakStatement(parent)||ts.isContinueStatement(parent);
    }
    /** Whether an expression is written by an assignment, update, compound
     * assignment or destructuring assignment, or as a for-in/of target. */
    private writtenExpression(node:ts.Node):boolean {
        let current=node;
        for(;;){
            const parent=current.parent;
            if(ts.isParenthesizedExpression(parent)||ts.isNonNullExpression(parent)||ts.isAsExpression(parent)||ts.isSatisfiesExpression(parent)||ts.isTypeAssertionExpression(parent)){current=parent;continue;}
            if(ts.isBinaryExpression(parent))return parent.left===current&&parent.operatorToken.kind>=ts.SyntaxKind.FirstAssignment&&parent.operatorToken.kind<=ts.SyntaxKind.LastAssignment;
            if(ts.isPrefixUnaryExpression(parent)||ts.isPostfixUnaryExpression(parent))return parent.operator===ts.SyntaxKind.PlusPlusToken||parent.operator===ts.SyntaxKind.MinusMinusToken;
            if((ts.isForInStatement(parent)||ts.isForOfStatement(parent))&&parent.initializer===current)return true;
            if(ts.isArrayLiteralExpression(parent)||ts.isSpreadElement(parent)||ts.isSpreadAssignment(parent)||ts.isShorthandPropertyAssignment(parent)||ts.isObjectLiteralExpression(parent)){current=parent;continue;}
            if(ts.isPropertyAssignment(parent)){if(parent.initializer!==current)return false;current=parent;continue;}
            return false;
        }
    }
    /** String exotics keep one actual-input graph. Project a field only when
     * a read or complete own-key operation observes it. */
    private stringField(owner:ObjectOwner,key:SourcePropertyKey):void {
        const record=this.primitiveStringFields.get(owner);if(!record||record.keys.has(key))return;
        if(key!=="length"&&(typeof key!=="string"||!Number.isSafeInteger(Number(key))||Number(key)<0||String(Number(key))!==key))return;
        record.keys.add(key);const value=this.newCell();let rule!:Rule;
        rule=this.rule([record.input],()=>{
            const state=this.primitiveState(record.input,rule);
            for(const text of state.proof.values){
                if(typeof text!=="string")continue;
                if(key==="length"){this.publish(value,this.primitive(text.length));this.defineField(owner,key,value,false);this.markReadonly(owner,key);}
                else if(Number(key)<text.length){this.publish(value,this.primitive(text[Number(key)]));this.defineField(owner,key,value,true);this.markReadonly(owner,key);}
                else this.publish(this.presence(owner,key),this.primitive(false));
            }
            if(state.unresolved){this.publish(value,this.unknown);this.copy(value,this.field(owner,key));this.publish(this.presence(owner,key),this.primitive(true));this.publish(this.presence(owner,key),this.primitive(false));}
        });
    }
    private ownerKeys(owner:ObjectOwner,rule:Rule):(SourcePropertyKey|null)[]|null|undefined {
        const record=this.primitiveStringFields.get(owner),keys=new Set<SourcePropertyKey|null>();
        if(record){
            const state=this.primitiveState(record.input,rule);
            if(state.pending&&!state.unresolved)return undefined;
            if(!state.proof.primitiveComplete)return null;
            for(const text of state.proof.values)if(typeof text==="string"){
                for(let index=0;index<text.length;index++){const key=String(index);keys.add(key);this.stringField(owner,key);}
                keys.add("length");this.stringField(owner,"length");
            }
        }
        for(const key of owner.fields.keys())if(!owner.immutableOwn||owner.own?.get(key)?.initial)keys.add(key);
        for(const key of owner.accessors.keys())if(key===null||!owner.immutableOwn||owner.own?.get(key)?.initial)keys.add(key);
        if(this.hasUnknownPropertyDefinitions(owner))keys.add(null);
        return [...keys];
    }
    private attachField(owner:ObjectOwner,key:SourcePropertyKey,cell:Cell):void {
        if(owner.fields.has(key))return;
        this.propertyLocations.add(cell);owner.fields.set(key,cell);this.publish(owner.shape,this.primitive(key));
        if(this.ownerRealms.has(owner)&&typeof key==="string"&&this.immutableGlobalBinding(key)){this.markReadonly(owner,key);return;}
        let effects=this.ownerFieldEffects.get(owner);
        if(!effects){effects=this.newCell();this.ownerFieldEffects.set(owner,effects);this.copy(owner.shape,effects,"origin");}
        this.copy(effects,cell);
        const unknown=this.unknownPropertyLocations.get(owner);if(unknown)this.borrowUnknownProperty(unknown,key,cell);
    }
    private field(owner: ObjectOwner, key: SourcePropertyKey): Cell {
        let cell=owner.fields.get(key);
        if(!cell){
            const realm=this.ownerRealms.get(owner);
            cell=realm&&typeof key==="string"?this.realmBinding(realm,key):this.newCell();
            this.attachField(owner,key,cell);
        }
        return cell;
    }
    private dataProperty(owner:ObjectOwner,key:SourcePropertyKey):Cell {
        return (typeof key==="string"?owner.arguments?.mapped.get(key)?.value:undefined)??this.field(owner,key);
    }
    /** Unknown-key writes keep their actual values in one owner location.
     * Existing and subsequently discovered named locations borrow it. */
    private markPropertyAlgorithm(owner:ObjectOwner,algorithm:"ordinary"|"opaque"):void {
        owner.propertyAlgorithm??=this.newCell();this.publish(owner.propertyAlgorithm,this.primitive(algorithm));
    }
    private unknownPropertyRecord(owner:ObjectOwner):UnknownOwnPropertyRecord {
        let record=this.unknownPropertyLocations.get(owner);if(record)return record;
        const value=this.newCell(),keys=this.newCell(),algorithm=owner.propertyAlgorithm??=this.newCell();
        this.propertyLocations.add(value);
        record={keys,value,algorithm,events:new Map(),prototypeInputs:new Set(),receiver:this.newCell()};
        this.publish(record.receiver,{tag:"object",owner});
        this.unknownPropertyLocations.set(owner,record);
        for(const[key,field]of owner.fields)if(!this.ownerRealms.has(owner)||typeof key!=="string"||!this.immutableGlobalBinding(key))this.borrowUnknownProperty(record,key,field);
        this.publish(owner.shape,{tag:"descriptor",identity:record});
        const current=record;
        this.rule([algorithm,owner.shape],()=>{
            if(!algorithm.values.nonempty)return;
            const ordinary=algorithm.values.has(this.primitive("ordinary"))&&!algorithm.values.has(this.primitive("opaque"));
            for(const event of current.events.values())if(!ordinary){
                const context=event.context??this.ownerCreations.get(owner);
                if(context){
                    this.copy(this.executionOrigins(context),owner.shape);
                    this.activateOpaqueEffect(context);
                    this.escapeCallableArgument(current.value,context);
                    this.escapeCallableArgument(current.receiver,context);
                }else this.publish(owner.shape,this.unknown);
            }
        });
        return record;
    }
    private keyMayContain(input:Cell|undefined,key:SourcePropertyKey|null,rule:Rule):boolean {
        if(!input||key===null)return true;
        const keys=this.propertyKeys(input,rule);if(keys===undefined)return false;
        if(keys!==null)return keys.includes(key);
        const domain=this.computedKeyDomain(input);
        const numeric=typeof key==="string"&&(String(Number(key))===key||(()=>{try{return String(BigInt(key))===key;}catch{return false;}})());
        return !domain||numeric||domain.keys.includes(key);
    }
    private borrowUnknownProperty(record:UnknownOwnPropertyRecord,key:SourcePropertyKey,result:Cell):void {
        let rule!:Rule;rule=this.rule([record.keys],()=>{if(this.keyMayContain(record.keys,key,rule))this.copy(record.value,result);});
    }
    private hasUnknownPropertyDefinitions(owner:ObjectOwner):boolean {
        return [...this.unknownPropertyLocations.get(owner)?.events.values()??[]].some(event=>event.mode!=="delete");
    }
    private unknownPropertyLocation(owner:ObjectOwner):Cell {return this.unknownPropertyRecord(owner).value;}
    private recordUnknownProperty(owner:ObjectOwner,mode:"set"|"define"|"delete",context?:ts.Node,keys?:Cell):UnknownOwnPropertyRecord {
        const record=this.unknownPropertyRecord(owner);if(keys)this.copy(keys,record.keys);else this.publish(record.keys,this.unknown);
        const key=mode+":"+(context?this.cell(context).id:"initial");
        if(!record.events.has(key)){const event={mode,context};record.events.set(key,event);this.publish(owner.shape,{tag:"descriptor",identity:event});}
        return record;
    }
    /** Internal prototype writes retain one location per owner; initial
     * canonical prototype collections are inputs, never the write target. */
    private prototypeLocation(owner:ObjectOwner):Cell {
        let location=this.writablePrototypes.get(owner);
        if(!location){location=this.newCell();this.writablePrototypes.set(owner,location);const inherited=owner.prototype;owner.prototype=location;if(inherited)this.copy(inherited,location);this.publish(owner.shape,{tag:"descriptor",identity:location});}
        return location;
    }
    /** Unknown Set can select the legacy prototype setter. */
    private unknownSetPrototype(owner:ObjectOwner,value:Cell):void {
        const record=this.unknownPropertyRecord(owner);if(record.prototypeInputs.has(value))return;record.prototypeInputs.add(value);
        const prototype=this.prototypeLocation(owner);
        this.rule([value],()=>{for(const atom of value.values)if(this.ordinaryOwner(atom)||atom===this.primitive(null)||atom.tag==="unknown"||atom.tag==="opaque-object"||atom.tag==="pending-source")this.publish(prototype,atom);});
    }
    private ownPresence(owner:ObjectOwner,key:SourcePropertyKey):OwnPresence {
        owner.own??=new Map();let record=owner.own.get(key);
        if(!record){record={facts:this.newCell(),enumerable:this.newCell(),writes:new Map(),contexts:new Map(),initial:false};owner.own.set(key,record);}
        return record;
    }
    private presence(owner:ObjectOwner,key:SourcePropertyKey):Cell {return this.ownPresence(owner,key).facts;}
    private markReadonly(owner:ObjectOwner,key:SourcePropertyKey):void {
        const record=this.ownPresence(owner,key);
        // Already marked: publishing the same true fact again is a no-op.
        if(record.readonlyWrite&&record.readonlyWrite.values.ownHas(this.primitive(true)))return;
        if(!record.readonlyWrite){record.readonlyWrite=this.newCell();this.publish(owner.shape,{tag:"descriptor",identity:record.readonlyWrite});}
        this.publish(record.readonlyWrite,this.primitive(true));
    }
    /** ArraySetLength (sec-arraysetlength): the new length is ToUint32 of the
     * value and must equal its ToNumber, else RangeError (the conversion runs
     * the value's own methods), and every integer index at or above it is
     * deleted, so a later read of such an index reaches the prototype chain.
     * A length the analysis does not know may delete any index. The result
     * is the stored Number. */
    private arraySetLength(owner:ObjectOwner,value:Cell,context:ts.Node|undefined):Cell {
        let writes=this.arrayLengthWrites.get(owner);if(!writes){writes=new Map();this.arrayLengthWrites.set(owner,writes);}
        const signature=value.id+":"+(context?this.cell(context).id:"none"),prior=writes.get(signature);if(prior)return prior;
        let stored:Cell;
        if(context&&value!==this.empty)stored=this.coerceCell(value,context,"array-length");
        else{stored=this.newCell();this.publish(stored,this.numberValue());}
        writes.set(signature,stored);
        const base=this.newCell(),removed=this.newCell();this.publish(base,{tag:"object",owner});this.publish(removed,this.primitive(undefined));
        const deleted=new Set<SourcePropertyKey>();let anyIndex=false;
        const deleteAnyIndex=():void=>{
            if(anyIndex)return;anyIndex=true;
            const indices=this.newCell();this.publish(indices,this.numberValue());
            this.writeProperty(base,null,removed,false,"delete",context,base,indices);
        };
        let rule!:Rule;
        rule=this.rule([stored,owner.shape],()=>{
            const state=this.primitiveState(stored,rule,true);
            if(state.pending)return;
            if(state.unresolved||!state.proof.primitiveComplete){deleteAnyIndex();return;}
            let bound=Infinity;
            for(const length of state.proof.values)if(typeof length==="number")bound=Math.min(bound,length);
            if(bound===Infinity)return;
            // Elements stored at keys the analysis does not know may be at or above it.
            if(this.unknownPropertyLocations.has(owner))deleteAnyIndex();
            for(const key of [...owner.fields.keys(),...owner.own?.keys()??[]]){
                if(typeof key!=="string"||deleted.has(key))continue;
                const index=Number(key);
                if(String(index)!==key||!Number.isInteger(index)||index<0||index>=0xffffffff||index<bound)continue;
                deleted.add(key);this.writeProperty(base,key,removed,false,"delete",context);
            }
        });
        return stored;
    }
    /** AddDisposableResource reads the resource's dispose method (a getter
     * there runs at the declaration; a resource without one throws TypeError
     * there); DisposeResources calls it with the resource as `this` at
     * `exit`. null and undefined resources are skipped. */
    private disposeResource(value:Cell,asynchronous:boolean,declaration:ts.Node,exit:ts.Node,handler:Cell|null):void {
        const resources=this.newCell();
        this.rule([value],()=>{for(const atom of value.values)if(atom!==this.primitive(undefined)&&atom!==this.primitive(null)&&atom.tag!=="abrupt"&&atom.tag!=="pending-source")this.publish(resources,atom);});
        if(handler)this.rule([resources],()=>{if(resources.values.nonempty)this.publish(handler,this.nativeException(declaration,"TypeError"));});
        for(const name of asynchronous?["asyncDispose","dispose"]:["dispose"]){
            const method=this.property(resources,this.wellKnownSymbols.get(name)!,declaration),callee=this.newCell();
            this.rule([method],()=>{for(const atom of method.values)if(atom!==this.primitive(undefined)&&atom!==this.primitive(null))this.publish(callee,atom);});
            this.invoke(exit,callee,resources,[],this.newCell());
        }
    }
    private writeUncertainty(context:ts.Node):Cell {
        let state=this.propertyWriteUncertainty.get(context);if(!state){state=this.newCell();this.propertyWriteUncertainty.set(context,state);}return state;
    }
    private recordPropertyWrite(owner:ObjectOwner,key:SourcePropertyKey,context:ts.Node,base:Cell,receiver:Cell,mode:"set"|"define"|"delete",value?:Cell):void {
        const record=this.ownPresence(owner,key),signature=this.cell(context).id+":"+base.id+":"+receiver.id+":"+mode;
        let event=record.writes.get(signature);
        if(!event){event={context,base,receiver,mode,weak:this.writeUncertainty(context),values:this.newCell()};record.writes.set(signature,event);this.publish(owner.shape,{tag:"descriptor",identity:event});}
        if(value)this.copyWrite(value,event.values,context);
    }

    /** Relative source-tree order is a dominance proof only within the same
     * activation and outside repeated or optional evaluation paths. */
    private writeDominates(write:ts.Node,read:ts.Node,rule:Rule):boolean {
        const before=this.enclosingActivation(write),after=this.enclosingActivation(read);
        if(before!==after)return false;
        if(this.sourceFile(write)!==this.sourceFile(read)){
            const left=this.scriptOrder.get(this.sourceFile(write)),right=this.scriptOrder.get(this.sourceFile(read));
            if(left===undefined||right===undefined||left.last>=right.first)return false;
        }else if(!this.evaluationOrder.before(write,read))return false;
        const readAncestors=new Set<ts.Node>();
        for(let node:ts.Node|undefined=read;node;node=node.parent)readAncestors.add(node);
        for(let child=write,parent=write.parent;parent;child=parent,parent=parent.parent){
            if(ts.isFunctionLike(parent)||ts.isSourceFile(parent))break;
            if(ts.isIterationStatement(parent,false))return false;
            if(ts.isConditionalExpression(parent)||ts.isIfStatement(parent)||ts.isTryStatement(parent)||ts.isCatchClause(parent)||ts.isSwitchStatement(parent)){
                if(!readAncestors.has(child))return false;
            }
            if(ts.isBinaryExpression(parent)&&[ts.SyntaxKind.AmpersandAmpersandToken,ts.SyntaxKind.BarBarToken,ts.SyntaxKind.QuestionQuestionToken].includes(parent.operatorToken.kind)&&child===parent.right)return false;
            if((ts.isCallExpression(parent)||ts.isPropertyAccessExpression(parent)||ts.isElementAccessExpression(parent))&&parent.questionDotToken)return false;
        }
        const readGuards=this.guards(read);
        for(const guard of this.guards(write)){
            if(readGuards.some(candidate=>candidate.condition===guard.condition&&candidate.truthy===guard.truthy))continue;
            this.watchText(rule,guard.condition);
            const proof=this.primitiveChoiceProof(guard.condition);
            if(!proof.primitiveComplete||!proof.values.length||proof.values.some(value=>!!value!==guard.truthy))return false;
        }
        return true;
    }
    private propertyPresence(owner:ObjectOwner,key:SourcePropertyKey,context?:ts.Node):Cell {
        this.stringField(owner,key);
        const record=this.ownPresence(owner,key),previous=record.contexts.get(context);if(previous)return previous;
        const result=this.newCell();record.contexts.set(context,result);
        let rule!:Rule;
        rule=this.rule([record.facts],()=>{
            const string=this.primitiveStringFields.get(owner);
            if(string&&(key==="length"||typeof key==="string"&&Number.isSafeInteger(Number(key))&&Number(key)>=0&&String(Number(key))===key)){
                const state=this.primitiveState(string.input,rule);
                for(const text of state.proof.values)if(typeof text==="string"){
                    if(key==="length"||Number(key)<text.length)this.publish(result,this.primitive(true));
                    else if(!record.writes.size)this.publish(result,this.primitive(false));
                }
                if(state.unresolved){this.publish(result,this.primitive(true));this.publish(result,this.primitive(false));}
                if(!record.writes.size)return;
            }
            if(!record.writes.size&&record.facts.values.has(this.primitive(false)))this.publish(result,this.primitive(false));
            const origins=context?this.executionOrigins(context):null;
            if(origins)this.watch(rule,origins);
            const activation=context?this.enclosingActivation(context):null;
            if(activation)this.watch(rule,this.activationTiming(activation));
            this.watch(rule,owner.shape);
            const unknownDeletes=[...this.unknownPropertyLocations.get(owner)?.events.values()??[]].filter(event=>event.mode==="delete"&&event.context&&this.effectVisible({tag:"unknown",origin:event.context},context));
            const visibleDeletes=[...record.writes].filter(([,event])=>event.mode==="delete"&&this.effectVisible({tag:"unknown",origin:event.context},context));
            const deleted=visibleDeletes.length>0||unknownDeletes.length>0;
            if(record.initial&&!deleted&&!(typeof key==="symbol"&&this.freshSymbols.has(key))){this.publish(result,this.primitive(true));return;}
            const points=context&&this.enclosingActivation(context)?[...(origins?.values??[])].map(atom=>atom.tag==="unknown"?atom.origin:undefined):[context];
            if(!points.length)return;
            for(const point of points){
                let present=record.initial;
                for(const event of record.writes.values()){
                    const write=event.context;this.watch(rule,event.base);this.watch(rule,event.receiver);this.watch(rule,event.weak);
                    const singleton=(cell:Cell)=>[...cell.values].every(atom=>atom.tag==="abrupt"||this.ordinaryOwner(atom)===owner)&&[...cell.values].some(atom=>this.ordinaryOwner(atom)===owner);
                    const reference=context&&this.enclosingActivation(write)===this.enclosingActivation(context)?context:point;
                    if(event.mode==="delete"){if(this.effectVisible({tag:"unknown",origin:write},reference))present=false;continue;}
                    if(reference&&!event.weak.values.has(this.primitive(true))&&singleton(event.base)&&singleton(event.receiver)&&this.writeDominates(write,reference,rule))present=true;
                }
                if(deleted)present=false;
                if(typeof key==="symbol"&&this.freshSymbols.has(key))present=false;
                if(present)this.publish(result,this.primitive(true));
                else if(this.presenceClosed){this.publish(result,this.primitive(false));if(record.facts.values.has(this.primitive(true)))this.publish(result,this.primitive(true));}
            }
        });
        this.presenceRules.add(rule);return result;
    }
    private defineField(owner: ObjectOwner, key: SourcePropertyKey|null, value: Cell, enumerable?:boolean,keys?:Cell): void {
        if(key===null){this.recordUnknownProperty(owner,"define",undefined,keys);this.copy(value,this.unknownPropertyLocation(owner));return;}
        const location=this.ownPresence(owner,key);location.initial=true;
        if(enumerable!==undefined)this.publish(location.enumerable,this.primitive(enumerable));
        if (typeof key === "symbol" && this.freshSymbols.has(key)) this.publish(this.presence(owner,key),this.primitive(false));
        this.publish(this.presence(owner,key),this.primitive(true));this.copy(value,this.field(owner,key));
    }
    private defineBooleanField(owner:ObjectOwner,key:string): void {
        this.publish(this.booleanResult,this.primitive(false));this.publish(this.booleanResult,this.primitive(true));this.defineField(owner,key,this.booleanResult);
    }
    private defineAccessor(owner:ObjectOwner,key:SourcePropertyKey|null,kind:"get"|"set",value:Cell,context?:ts.Node): void {
        if(owner.immutableOwn){const handler=context&&this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context!,"TypeError"));return;}
        let accessor=owner.accessors.get(key);
        if(!accessor){accessor={get:this.newCell(),set:this.newCell()};this.accessorSlots.add(accessor.get);this.accessorSlots.add(accessor.set);owner.accessors.set(key,accessor);this.publish(owner.shape,{tag:"descriptor",identity:accessor});}
        if(context){this.accessorDefinitions.set(accessor.get,context);this.accessorDefinitions.set(accessor.set,context);}
        if(context&&(ts.isGetAccessorDeclaration(context)||ts.isSetAccessorDeclaration(context)))this.copy(value,accessor[kind]);
        else this.copyWrite(value,accessor[kind],context);
        if(key===null)this.recordUnknownProperty(owner,"define",context);
        else {if(context&&(ts.isGetAccessorDeclaration(context)||ts.isSetAccessorDeclaration(context))){const location=this.ownPresence(owner,key);location.initial=true;this.publish(location.enumerable,this.primitive(true));}this.publish(this.presence(owner,key),this.primitive(true));}
        if (typeof key === "symbol" && this.freshSymbols.has(key)) this.publish(this.presence(owner,key),this.primitive(false));
    }
    /** The "__proto__" setter an unknown-key [[Set]] may select: the intrinsic
     * one's effect is unknownSetPrototype's, which consults the key domain (a
     * numeric key never names it); a redefined setter is invoked. */
    private unknownKeySetterCallee(source:Cell): Cell {
        let callee=this.unknownKeySetterCallees.get(source);
        if(!callee){callee=this.newCell();this.unknownKeySetterCallees.set(source,callee);const target=callee;
            this.rule([source],()=>{for(const value of source.values)if(value!==this.primitive(undefined)&&!(value.tag==="operation"&&value.operation==="proto-accessor:set"))this.publish(target,value);});}
        return callee;
    }
    private readonly unknownKeySetterCallees=new Map<Cell,Cell>();
    private accessorCallee(source:Cell): Cell {
        let callee=this.accessorCallees.get(source);
        if(!callee){callee=this.newCell();this.accessorCallees.set(source,callee);const target=callee;
            this.rule([source],()=>{for(const value of source.values)if(value!==this.primitive(undefined))this.publish(target,value);});}
        return callee;
    }
    private writeProperty(base: Cell, key: SourcePropertyKey | null, value: Cell, unknownGlobal = true, mode: "set"|"define"|"delete" = "set", context?: ts.Node, receiver = base,keys?:Cell): void {
        const handler=context?this.exceptionHandlers.get(context):undefined;
        if(handler)this.publish(handler,this.nativeException(context!));
        const signature=base.id+":"+this.keyIdentity(key)+":"+value.id+":"+unknownGlobal+":"+mode+":"+(context?this.cell(context).id:"none")+":"+receiver.id+":"+keys?.id;
        if(this.propertyWrites.has(signature))return;
        this.propertyWrites.add(signature);
        if(context&&mode!=="set")this.proxyInternalMethod(base,[mode==="delete"?"deleteProperty":"defineProperty"],context);
        if(mode==="set"&&context){
            const primitives=this.newCell();let opened=false;
            this.rule([base],()=>{
                for(const atom of base.values)if(!this.ordinaryOwner(atom)&&atom!==this.primitive(null)&&atom!==this.primitive(undefined)&&
                    (atom.tag==="primitive"||atom.tag==="text-operation"||atom.tag==="non-string"||atom.tag==="unknown-string"))this.publish(primitives,atom);
                if(opened||!primitives.values.nonempty)return;opened=true;
                const conversion=ts.setTextRange(ts.factory.createEmptyStatement(),context);(conversion as ts.Node&{parent:ts.Node}).parent=context;
                this.writeProperty(this.objectValue(primitives,conversion),key,value,unknownGlobal,mode,context,receiver,keys);
            });
        }
        const weak=context?this.writeUncertainty(context):this.newCell();
        const proxyEffects=new Set<ObjectOwner>();
        const setterEffects=new Set<Cell>();
        const unrepresented=new Set<Atom>();
        let rule!:Rule;
        rule=this.rule([base,receiver,...(keys?[keys]:[])],()=>{for(const atom of base.values){
            const owner=this.ordinaryOwner(atom);
            if(owner){
                let store = mode !== "set";
                if(mode === "set"){
                    const pending=[owner],visited=new Set<ObjectOwner>();
                    while(pending.length){
                        const current=pending.pop()!;if(visited.has(current))continue;visited.add(current);
                        if(current.proxy&&context&&!proxyEffects.has(current)){
                            proxyEffects.add(current);this.publish(weak,this.primitive(true));
                            const trap=this.property(current.proxy.handler,"set",context);
                            this.opaqueCallableCaptures(trap,context);this.activateOpaqueEffect(context);
                        }
                        this.watch(rule,current.shape);
                        if(this.opaqueShape(current,context)){this.publish(weak,this.primitive(true));if(handler)this.publish(handler,this.unknown);}
                        for(const[name,accessor]of current.accessors)if((key===null || name===key || name===null)&&this.keyMayContain(keys,name,rule)){
                            this.publish(weak,this.primitive(true));
                            if(!setterEffects.has(accessor.set)){
                                setterEffects.add(accessor.set);
                                this.invoke(context ?? this.accessorDefinitions.get(accessor.set)!,key===null&&name==="__proto__"?this.unknownKeySetterCallee(accessor.set):this.accessorCallee(accessor.set),receiver,[{cell:value,spread:false}],this.newCell());
                            }
                        }
                        const presence=key===null?null:this.presence(current,key);
                        if(presence)this.watch(rule,presence);
                        const data=key===null?undefined:current.fields.get(key);if(data)this.watch(rule,data);
                        const readonly=key===null?undefined:this.ownPresence(current,key).readonlyWrite;
                        if(readonly){this.watch(rule,readonly);if(readonly.values.has(this.primitive(true)))this.publish(weak,this.primitive(true));}
                        // A non-writable, non-configurable global (undefined, NaN,
                        // Infinity) rejects every [[Set]]: nothing is stored for any receiver.
                        if(typeof key==="string"&&this.ownerRealms.has(current)&&this.immutableGlobalBinding(key)&&mode==="set"){this.publish(weak,this.primitive(true));continue;}
                        if(key!==null && current.accessors.has(key) && presence?.values.has(this.primitive(true)) && !presence.values.has(this.primitive(false)) && !data?.values.nonempty)continue;
                        if(presence?.values.has(this.primitive(true)) && !presence.values.has(this.primitive(false))){store=true;continue;}
                        if(!current.prototype){store=true;continue;}
                        this.watch(rule,current.prototype);
                        for(const prototype of current.prototype.values){
                            const inherited=this.ordinaryOwner(prototype);
                            if(inherited)pending.push(inherited);
                            else if(prototype===this.primitive(null))store=true;
                            else if(prototype.tag!=="pending-source"){this.copy(this.executionOrigins(context),owner.shape);if(handler)this.publish(handler,this.unknown);store=true;}
                        }
                    }
                }
                if(!store)continue;
                const destinations=mode==="set"?[...receiver.values].map(value=>this.ordinaryOwner(value)).filter((value):value is ObjectOwner=>!!value):[owner];
                for(const owner of destinations){
                if(owner.immutableOwn)continue;
                if(mode!=="delete"&&owner.arguments)for(const[index,formal]of owner.arguments.mapped)if((key===null||key===index)&&this.keyMayContain(keys,index,rule)){
                    if(value===this.empty)this.copyWrite(this.executionOrigins(context),formal.binding,context);else this.copyWrite(value,formal.binding,context);
                }
                if(key===null){
                    const origins=this.executionOrigins(context);
                    if(value===this.empty)this.copy(origins,owner.shape);else this.recordUnknownProperty(owner,mode,context,keys);
                    if(mode!=="delete")this.copyWrite(value,this.unknownPropertyLocation(owner),context);
                    // A value-less (opaque) mutation already marks the shape.
                    if(mode!=="delete"&&value!==this.empty&&owner.listLength&&this.keyMayContain(keys,"length",rule))this.copyWrite(this.arraySetLength(owner,value,context),this.field(owner,"length"),context);
                    if(mode==="set"&&value!==this.empty&&this.keyMayContain(keys,"__proto__",rule))this.unknownSetPrototype(owner,value);
                    for(const record of owner.collections?.values()??[])this.copy(origins,record.shape);
                }
                else {
                    const presence=this.presence(owner,key);
                    if(context)this.recordPropertyWrite(owner,key,context,base,receiver,mode,value);
                    if(mode==="set"){const location=this.ownPresence(owner,key);if(!location.initial&&!location.enumerable.values.nonempty)this.publish(location.enumerable,this.primitive(true));}
                    if(mode==="delete")this.publish(presence,this.primitive(false));
                    if (!presence.values.nonempty) this.publish(presence,this.primitive(false));
                    this.publish(presence,this.primitive(true));
                    this.copyWrite(key==="length"&&owner.listLength&&mode!=="delete"?this.arraySetLength(owner,value,context):value,this.field(owner,key),context);
                    const index = typeof key === "string" ? Number(key) : NaN;
                    if (owner.listLength && String(index) === key && Number.isInteger(index) && index >= 0 && index < 0xffffffff) {
                        const length = owner.listLength;
                        this.rule([length], () => {
                            for (const atom of [...length.values]) if (atom.tag === "primitive" && typeof atom.value === "number")
                                this.publish(length, this.primitive(Math.max(atom.value, index + 1)));
                        });
                    }
                }
                }
            }
            if(atom.tag==="global"){
                if(key===null){
                    const domain=keys?this.computedKeyDomain(keys):null;
                    if(domain&&!domain.numeric){for(const name of domain.keys)if(typeof name==="string"&&!this.immutableGlobalBinding(name))this.copyWrite(value,this.realmBinding(atom.realm,name),context);}
                    else this.copy(this.executionOrigins(context),this.globalMutation);
                }
                else if (typeof key === "string" && !this.immutableGlobalBinding(key)) this.copyWrite(value,this.realmBinding(atom.realm,key),context);
            }
            if((atom.tag==="unknown"||atom.tag==="opaque-object")&&context&&!unrepresented.has(atom)){
                unrepresented.add(atom);const native=atom===this.nativeUnknown;
                // The analysis cannot follow a value stored into an object it does
                // not represent: whatever reads it back (a native, unknown code, or
                // the program through a native value) may call it, so it escapes
                // there, with native actuals for a native value.
                if(value!==this.empty&&mode!=="delete")this.onActive(context,()=>this.escapeCallableArgument(value,context,!native));
                // A native value may be any object that reached a native: the
                // write (a store, a definition, a deletion, or a native's mutation
                // of its receiver or arguments) reaches each of them through the
                // shared alias cells. Written keys hold at every time; a mutation
                // keeps its execution origins, so earlier reads stay unaffected.
                if(native){
                    if(value!==this.empty&&mode!=="delete"){
                        if(key!==null)this.publish(this.nativeAliasKeys,this.primitive(key));else if(keys)this.copy(keys,this.nativeAliasKeys);else this.publish(this.nativeAliasKeys,this.unknown);
                    }
                    if(value===this.empty||mode!=="set"||key==="__proto__"||key===null&&(!keys||this.keyMayContain(keys,"__proto__",rule)))
                        this.copy(this.executionOrigins(context),this.nativeAliasMutation);
                }
            }
            if(unknownGlobal&&(atom.tag==="unknown"||atom.tag==="opaque-object")){this.copy(this.executionOrigins(context),this.globalMutation);if(handler)this.publish(handler,this.unknown);}
        }});
    }
    /** One hint-driven ToPrimitive worklist uses the keyed property and call
     * graph for the exotic hook and ordinary method order. */
    /** Some primitive of the hinted kind: the result of a native conversion
     * method, which runs no user code of its own. */
    private nativePrimitive(result:Cell,hint:PrimitiveHint):void {
        this.publish(result,this.unknownString);
        if(hint==="string")return;
        let other=this.numericValues.get(KIND_PRIMITIVE&~KIND_STRING);
        if(!other){other={tag:"non-string",kinds:KIND_PRIMITIVE&~KIND_STRING};this.numericValues.set(KIND_PRIMITIVE&~KIND_STRING,other);}
        this.publish(result,other);
    }
    private primitiveConversion(source: Cell, context?: ts.Node, hint: PrimitiveHint = "string"): Cell {
        let contexts = this.hintPrimitives.get(source);
        if (!contexts) { contexts = new Map(); this.hintPrimitives.set(source, contexts); }
        let conversions = contexts.get(context);
        if (!conversions) {conversions = new Map(); contexts.set(context, conversions);}
        const previous = conversions.get(hint); if (previous) return previous;
        const result = this.newCell(); conversions.set(hint, result);
        const selected = new Set<Atom>(), opaqueConversions = new Set<Atom>();
        let rule!: Rule;
        rule = this.rule([source], () => {
            for (const atom of source.values) {
                if (atom.tag === "primitive" || atom.tag === "non-string" || atom.tag === "unknown-string" || atom.tag === "text-operation" || atom.tag === "abrupt" || atom.tag === "pending-source") {
                    this.publish(result, atom); continue;
                }
                const owner = this.ordinaryOwner(atom);
                if (atom === this.nativeUnknown && context) {
                    // A native value's conversion methods are builtins or callables
                    // that escaped where the value was produced: the result is
                    // some primitive (a String for the string hint), with no
                    // further effect.
                    this.nativePrimitive(result, hint);
                    const handler = this.exceptionHandlers.get(context); if (handler) this.publish(handler, this.unknown);
                    continue;
                }
                if (!owner || !context) {
                    this.publish(result, this.unknown);
                    if (context) {const handler = this.exceptionHandlers.get(context); if (handler) this.publish(handler, this.unknown); this.activateOpaqueEffect(context);}
                    continue;
                }
                const worklist = [owner], visited = new Set<ObjectOwner>();
                let ready = true, opaque = false, nativeParent = false;
                while (worklist.length) {
                    const current = worklist.pop()!;
                    if (visited.has(current)) continue; visited.add(current);
                    this.watch(rule, current.shape);
                    ready &&= this.definitionsReady(current, rule);
                    opaque ||= this.opaqueShape(current,context);
                    if (current.prototype) {
                        this.watch(rule, current.prototype);
                        ready &&= current.prototype.values.nonempty;
                        for (const prototype of current.prototype.values) {
                            const parent = this.ordinaryOwner(prototype);
                            if (parent) worklist.push(parent);
                            else if (prototype.tag === "pending-source") ready = false;
                            else if (prototype === this.nativeUnknown) nativeParent = true;
                            else if (prototype !== this.primitive(null)) opaque = true;
                        }
                    }
                }
                // A shape an unknown write may have changed can hold either the
                // replacement (unknown code) or the original members. The result
                // is unknown either way; the original members that are program
                // functions still run with this receiver, so their effects stay
                // in the graph (intrinsic conversion methods run no user code).
                if (opaque) {
                    this.publish(result, this.unknown); const handler = this.exceptionHandlers.get(context); if (handler) this.publish(handler, this.unknown); this.activateOpaqueEffect(context);
                    if (!opaqueConversions.has(atom)) {
                        opaqueConversions.add(atom);
                        const receiver = this.newCell(); this.publish(receiver, atom);
                        const hintValue = this.newCell(); this.publish(hintValue, this.primitive(hint));
                        for (const key of [this.wellKnownSymbols.get("toPrimitive")!, "toString", "valueOf"] as const) {
                            const member = this.property(receiver, key, context), callee = this.newCell();
                            this.rule([member], () => {for (const value of member.values) if (value.tag === "function" || value.tag === "bound") this.publish(callee, value);});
                            this.invoke(context, callee, receiver, typeof key === "symbol" ? [{cell: hintValue, spread: false}] : [], this.newCell());
                        }
                    }
                    continue;
                }
                // An unmodelled builtin prototype contributes builtin conversion
                // methods: some primitive of the hinted kind, without effects.
                if (nativeParent) {
                    this.nativePrimitive(result, hint);
                    const handler = this.exceptionHandlers.get(context); if (handler) this.publish(handler, this.unknown);
                }
                if (!ready || selected.has(atom)) continue;
                selected.add(atom);
                const receiver = this.newCell(); this.publish(receiver, atom);
                const methods = ORDINARY_PRIMITIVE_METHODS.get(hint)!;
                const scheduled = new Set<number>();
                const advance = (index: number): void => {
                    if (scheduled.has(index)) return; scheduled.add(index);
                    if (index === methods.length) {
                        this.publish(result, this.abrupt);
                        const handler = this.exceptionHandlers.get(context);
                        if (handler) this.publish(handler, this.nativeException(context!));
                        return;
                    }
                    const method = this.property(receiver, methods[index]!, context), callee = this.newCell(), returned = this.newCell();
                    this.invoke(context, callee, receiver, [], returned);
                    this.rule([method], () => {
                        for (const value of method.values) {
                            if (value === this.nativeUnknown) this.nativePrimitive(result, hint);
                            else if (value.tag === "pending-source" || value.tag === "unknown" || value.tag === "opaque-object" || value.tag === "abrupt") this.publish(result, value);
                            else if (value.tag === "function" || value.tag === "bound" || value.tag === "operation" ||
                                value.tag === "intrinsic" || value.tag === "builtin" && value.normalResult !== "not-callable") this.publish(callee, value);
                            else advance(index + 1);
                        }
                    });
                    this.rule([returned], () => {
                        for (const value of returned.values) {
                            if (value === this.nativeUnknown) this.nativePrimitive(result, hint);
                            else if (value.tag === "primitive" || value.tag === "non-string" || value.tag === "unknown-string" || value.tag === "text-operation" || value.tag === "abrupt" || value.tag === "pending-source" || value.tag === "unknown") this.publish(result, value);
                            else advance(index + 1);
                        }
                    });
                };
                const hook = this.property(receiver, this.wellKnownSymbols.get("toPrimitive")!, context);
                const callee = this.newCell(), returned = this.newCell(), hintValue = this.newCell();
                this.publish(hintValue, this.primitive(hint));
                this.invoke(context, callee, receiver, [{cell: hintValue, spread: false}], returned);
                const invalid = (): void => {
                    this.publish(result, this.abrupt);
                    const handler = this.exceptionHandlers.get(context);
                    if (handler) this.publish(handler, this.nativeException(context!));
                };
                this.rule([hook], () => {
                    for (const value of hook.values) {
                        if (value === this.primitive(undefined) || value === this.primitive(null)) advance(0);
                        // An inherited native member: a native @@toPrimitive, or none.
                        else if (value === this.nativeUnknown) {this.nativePrimitive(result, hint);advance(0);}
                        else if (value.tag === "function" || value.tag === "bound" || value.tag === "operation" ||
                            value.tag === "intrinsic" || value.tag === "builtin" && value.normalResult !== "not-callable") this.publish(callee, value);
                        else if (["abrupt", "pending-source", "unknown", "opaque-object"].includes(value.tag)) this.publish(result, value);
                        else invalid();
                    }
                });
                this.rule([returned], () => {
                    for (const value of returned.values) {
                        if (value === this.nativeUnknown) this.nativePrimitive(result, hint);
                        else if (["primitive", "non-string", "unknown-string", "text-operation", "abrupt", "pending-source", "unknown"].includes(value.tag)) this.publish(result, value);
                        else invalid();
                    }
                });
            }
        });
        if (context) {
            let effects!: Rule;
            effects = this.rule([result], () => {
                this.watchText(effects,result);
                const state = this.primitiveReadiness(result);
                if (state.pending || !state.scalarUnresolved) return;
                const handler = this.exceptionHandlers.get(context);
                if (handler) this.publish(handler, this.unknown);
                this.activateOpaqueEffect(context);
            });
        }
        return result;
    }
    private coerceCell(source: Cell, context: ts.Node, conversion: string): Cell {
        let contexts = this.numericConversions.get(source);
        if (!contexts) {contexts = new Map(); this.numericConversions.set(source, contexts);}
        let conversions = contexts.get(context);
        if (!conversions) {conversions = new Map(); contexts.set(context, conversions);}
        const previous = conversions.get(conversion); if (previous) return previous;
        const input = this.primitiveConversion(source, context, "number"), result = this.newCell();
        conversions.set(conversion, result);
        this.publish(result, {tag: "text-operation", operation: "coerce", conversion, parts: [input]});
        let rule!: Rule;
        rule = this.rule([input], () => {
            const state = this.primitiveState(input, rule, true), handler = this.exceptionHandlers.get(context);
            if (state.pending) return;
            if (state.unresolved) {if (handler) this.publish(handler, this.unknown); this.activateOpaqueEffect(context);}
            if (!handler) return;
            if (!state.proof.primitiveComplete && !this.primitiveNumericConversionSafe(input, conversion)) this.publish(handler, this.nativeException(context!));
            for (const value of state.proof.values) {
                try {NUMERIC_CONVERSIONS.get(conversion)!(value);} catch {this.publish(handler, this.nativeException(context!));}
            }
        });
        return result;
    }
    /** IsLooselyEqual converts an Object only opposite a non-nullish
     * primitive (Boolean reaches the same case through ToNumber). A pair
     * worklist preserves abrupt completion and reuses the ToPrimitive graph. */
    private looseEquality(left:Cell,right:Cell,node:ts.Node,operation:SourceNumericOperation):Cell {
        let calls=this.equalityResults.get(node);if(!calls){calls=new Map();this.equalityResults.set(node,calls);}
        const key=left.id+":"+right.id,prior=calls.get(key);if(prior)return prior;
        const result=this.newCell(),context=this.evaluationOrder.referenceCompletion(node,node);calls.set(key,result);
        this.returnTransforms.set(result,{kind:"projection",inputs:[left,right],evaluate:inputs=>this.looseEquality(inputs[0]!,inputs[1]!,node,operation)});
        const handler=this.exceptionHandlers.get(node);if(handler)this.exceptionHandlers.set(context,handler);
        const atoms=new Map<Atom,Cell>(),pairs=new Map<Atom,Map<Atom,number>>();
        const cell=(atom:Atom)=>{let input=atoms.get(atom);if(!input){input=this.newCell();atoms.set(atom,input);this.publish(input,atom);}return input;};
        const scalar=(a:Cell,b:Cell)=>{
            let compare!:Rule;compare=this.rule([a,b],()=>{
                if(a.values.has(this.abrupt)||b.values.has(this.abrupt))this.publish(result,this.abrupt);
                const states=[a,b].map(input=>this.primitiveState(input,compare,true));
                if(states.some(state=>state.pending||state.proof.primitiveComplete&&!state.proof.values.length))return;
                if(states.every(state=>state.proof.primitiveComplete)){
                    for(const values of sourceChoiceTuples(states.map(state=>state.proof.values)))this.publish(result,this.primitive(operation.evaluate(values)));
                }else{this.publish(result,this.primitive(false));this.publish(result,this.primitive(true));}
            });
        };
        const objects=KIND_OBJECT|KIND_FUNCTION,nonNull=KIND_PRIMITIVE&~(KIND_NULL|KIND_UNDEFINED);
        let inspect!:Rule;inspect=this.rule([left,right],()=>{
            if(left.values.has(this.abrupt)||right.values.has(this.abrupt))this.publish(result,this.abrupt);
            for(const a of left.values)for(const b of right.values){
                if(a.tag==="abrupt"||b.tag==="abrupt")continue;
                if(a.tag==="pending-source"||b.tag==="pending-source"){this.publish(result,this.pendingSource);continue;}
                const x=cell(a),y=cell(b);this.watch(inspect,x);this.watch(inspect,y);
                const kinds=[this.primitiveKinds(x),this.primitiveKinds(y)];
                // Kind dependencies can settle after an atom arrives. Each
                // newly represented semantic route is processed once.
                if(!kinds[0]||!kinds[1])continue;
                const modes=(kinds[0]&KIND_PRIMITIVE&&kinds[1]&KIND_PRIMITIVE?1:0)|
                    (kinds[0]&objects&&kinds[1]&objects||kinds[0]&objects&&kinds[1]&(KIND_NULL|KIND_UNDEFINED)||kinds[1]&objects&&kinds[0]&(KIND_NULL|KIND_UNDEFINED)?2:0)|
                    (kinds[0]&objects&&kinds[1]&nonNull?4:0)|(kinds[1]&objects&&kinds[0]&nonNull?8:0);
                let seen=pairs.get(a);if(!seen){seen=new Map();pairs.set(a,seen);}const previous=seen.get(b)??0,added=modes&~previous;if(!added)continue;seen.set(b,previous|modes);
                if(added&1)scalar(x,y);
                if(added&2){
                    // Object identity and the host HTMLDDA slot may be
                    // abstract. Both Boolean results retain that uncertainty.
                    this.publish(result,this.primitive(false));this.publish(result,this.primitive(true));
                }
                if(added&4)scalar(this.primitiveConversion(x,context,"default"),y);
                if(added&8)scalar(x,this.primitiveConversion(y,context,"default"));
            }
        });return result;
    }
    /** The same ordered List advances only through possible normal results.
     * An abrupt conversion suppresses every later conversion edge. */
    private convertList(args: readonly Cell[], context: ts.Node, mode: PrimitiveHint | "numeric" | "number" | "primitive-number" | "code-point" | "text" | readonly (PrimitiveHint | "numeric" | "number" | "primitive-number" | "code-point" | "text")[]): readonly Cell[] {
        let conversions = this.orderedConversions.get(context);
        if (!conversions) {conversions = new Map(); this.orderedConversions.set(context, conversions);}
        const modes=typeof mode==="string"?args.map(()=>mode):mode;
        if(modes.length!==args.length)throw new Error("source conversion List modes do not match operands");
        const identity = modes.join(",") + ":" + args.map(argument => argument.id).join(",");
        const previous = conversions.get(identity); if (previous) return previous;
        const converted: Cell[] = []; conversions.set(identity, converted);
        for (const [index, argument] of args.entries()) {
            const conversion=modes[index]!,input = this.newCell(), result = conversion === "text" ? this.stringHintCell(input, context)
                : conversion === "numeric" || conversion === "number" || conversion === "code-point" ? this.coerceCell(input, context, conversion) : this.primitiveConversion(input, context, conversion==="primitive-number"?"number":conversion);
            converted.push(result);
            // A conversion's rule publishes its result from every input that
            // ever reached it. A return projection re-runs the same ordered
            // List over the invocation's projected operands, so
            // `function f(a, b) { return a + b; }` returns per call what that
            // call's actuals concatenate to. Captures keep the conversion's
            // own result: replaying it under every capture constraint set
            // tripled the analysis time of source-analysis-determinism's
            // program.
            this.returnTransforms.set(result,{kind:"conversion",inputs:args,evaluate:inputs=>this.convertList(inputs,context,mode)[index]!});
            if (index === 0) this.copy(argument, input);
            else {
                const predecessor = converted[index - 1]!;
                let rule!: Rule;
                rule = this.rule([predecessor], () => {
                    this.watchText(rule, predecessor);
                    const proof = this.primitiveChoiceProof(predecessor);
                    if (proof.primitiveComplete && !proof.values.length) this.publish(input, this.abrupt);
                    if (proof.values.length || !proof.primitiveComplete && !this.primitiveState(predecessor, rule, true).pending &&
                        [...predecessor.values].some(value => value.tag !== "abrupt" && value.tag !== "pending-source")) this.copy(argument, input);
                });
            }
        }
        return converted;
    }
    /** ToString rejects Symbol results except the String call's direct
     * Symbol argument, which uses SymbolDescriptiveString. */
    private stringHintTexts(key: Cell, rule: Rule, context: ts.Node, descriptiveSymbols = false): readonly string[] | null | undefined {
        const {proof,pending,unresolved}=this.primitiveState(this.stringHintCell(key,context,descriptiveSymbols),rule);
        if(proof.primitiveComplete)return proof.values.map(String);
        return pending&&!unresolved?undefined:null;
    }
    private propertyKeys(key: Cell, rule: Rule, context?: ts.Node): readonly SourcePropertyKey[] | null | undefined {
        key = this.primitiveConversion(key, context);
        const {proof, pending, unresolved} = this.primitiveState(key, rule);
        if (proof.primitiveComplete) return [...new Set(proof.values.map(value => typeof value === "symbol" ? value : String(value)))];
        if (pending && !unresolved) return undefined;
        // Primitive key extent cannot introduce a user-code conversion.
        // Actual object hooks remain on the shared ToPrimitive graph.
        if (context && (this.primitiveKinds(key) & (KIND_OBJECT | KIND_FUNCTION))) {
            const handler = this.exceptionHandlers.get(context);
            if (handler) this.publish(handler, this.unknown);
            this.activateOpaqueEffect(context);
        }
        return null;
    }
    private primitiveState(root: Cell, rule: Rule, nonString = false): {proof: PrimitiveChoiceProof; pending: boolean; pendingSource: boolean; unresolved: boolean} {
        this.watchText(rule, root);
        const proof = this.primitiveChoiceProof(root);
        if (proof.primitiveComplete) return {proof, pending: false, pendingSource: false, unresolved: false};
        const state = this.primitiveReadiness(root);
        return {proof,pending:state.pending,pendingSource:state.pendingSource,unresolved:nonString ? state.scalarUnresolved : state.unresolved};
    }
    private primitiveReadiness(root: Cell): PrimitiveReadiness {
        this.flushPrimitiveChanges();
        const cached = this.primitiveReadyCache.get(root); if (cached) return cached;
        const pending = [root], states = new Map<Cell,PrimitiveReadiness>();
        while (pending.length) {
            const cell = pending.pop()!;
            if (states.has(cell) || this.primitiveReadyCache.has(cell)) continue;
            const state:PrimitiveReadiness = {pending:!cell.values.nonempty,pendingSource:false,unresolved:false,scalarUnresolved:false};
            for (const value of cell.values) {
                if (value.tag === "text-operation") for (const part of value.parts) pending.push(part);
                else if (value.tag === "pending-source") state.pending = state.pendingSource = true;
                else if (value.tag !== "primitive" && value.tag !== "abrupt") {
                    state.unresolved = true; state.scalarUnresolved ||= value.tag !== "non-string" && value.tag !== "unknown-string";
                }
            }
            states.set(cell,state);
        }
        const worklist = [...states.keys()], queued = new Set(worklist);
        while (worklist.length) {
            const cell = worklist.pop()!; queued.delete(cell);
            const state = states.get(cell)!;
            const before = [state.pending,state.pendingSource,state.unresolved].join(":");
            for (const value of cell.values) if (value.tag === "text-operation") for (const part of value.parts) {
                const child = states.get(part) ?? this.primitiveReadyCache.get(part)!;
                state.pending ||= child.pending; state.pendingSource ||= child.pendingSource; state.unresolved ||= child.unresolved;
            }
            if (before !== [state.pending,state.pendingSource,state.unresolved].join(":"))
                for (const parent of this.primitiveProofParents.get(cell) ?? []) if (states.has(parent) && !queued.has(parent)) {queued.add(parent); worklist.push(parent);}
        }
        for (const [cell,state] of states) this.primitiveReadyCache.set(cell,state);
        return states.get(root)!;
    }
    private stringHintCell(source: Cell, context: ts.Node, descriptiveSymbols = false): Cell {
        let contexts = this.stringConversions.get(source);
        if (!contexts) { contexts = new Map(); this.stringConversions.set(source, contexts); }
        let conversions = contexts.get(context);
        if (!conversions) {conversions = new Map(); contexts.set(context, conversions);}
        const previous = conversions.get(descriptiveSymbols); if (previous) return previous;
        const result = this.newCell(); conversions.set(descriptiveSymbols, result);
        const primitive=this.primitiveConversion(source,context),normal=this.newCell();
        const operation:Atom={tag:"text-operation",operation:"to-string",parts:[normal]};
        const filtered=new Map<number,Atom>(),atoms=new Map<Atom,Cell>();
        const convert=(atom:Atom):void=>{
            let value=atoms.get(atom);if(!value){value=this.newCell();atoms.set(atom,value);this.publish(value,atom);}
            // String primitives keep their original graph, so repeated
            // conversions preserve every existing text-domain constraint.
            if(this.primitiveKinds(value)===KIND_STRING)this.publish(result,atom);
            else {this.publish(normal,atom);this.publish(result,operation);}
        };
        this.rule([source,primitive],()=>{for(const atom of primitive.values){
            const symbols=descriptiveSymbols&&source.values.has(atom);
            const symbol=atom.tag==="primitive"&&typeof atom.value==="symbol"||atom.tag==="non-string"&&!!((atom.kinds??(KIND_PRIMITIVE&~KIND_STRING))&KIND_SYMBOL);
            // A joined direct Symbol and Object result can share one Symbol
            // fact. Keep the Object conversion's TypeError alternative.
            if(symbol&&(!symbols||!!(this.primitiveKinds(source)&(KIND_OBJECT|KIND_FUNCTION)))){
                this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));
            }
            if(atom.tag==="primitive"&&typeof atom.value==="symbol"&&!symbols)continue;
            if(atom.tag==="non-string"&&!symbols&&symbol){
                const kinds=(atom.kinds??(KIND_PRIMITIVE&~KIND_STRING))&~KIND_SYMBOL;
                let value=filtered.get(kinds);if(!value){value=kinds?{tag:"non-string",kinds}:this.abrupt;filtered.set(kinds,value);}convert(value);
            }else convert(atom);
        }});
        return result;
    }
    private projectMemberKeys(name: string | ts.PropertyName, context: ts.Node, project: (key: SourcePropertyKey | null) => void, owner?: ObjectOwner): void {
        if (typeof name === "string") { project(name); return; }
        if (!ts.isComputedPropertyName(name)) { project(propertyName(name)); return; }
        const key = this.cell(name.expression), selected = new Set<SourcePropertyKey | null>(), defined = this.newCell();
        if (owner) (owner.computedDefinitions ??= []).push({key,defined,context});
        let rule!: Rule;
        rule = this.rule([key], () => {
            const keys = this.propertyKeys(key, rule, context);
            for (const value of keys === null ? [null] : keys ?? []) if (!selected.has(value)) {
                selected.add(value); project(value); this.publish(defined,value===null?this.unknown:this.primitive(value));
            }
        });
    }
    private definitionsReady(owner: ObjectOwner, rule: Rule | undefined): boolean {
        for (const definition of owner.computedDefinitions ?? []) {
            if (!rule) return false;
            this.watch(rule,definition.defined);
            const keys=this.propertyKeys(definition.key,rule,definition.context);
            if(keys===undefined)return false;
            if(keys===null){if(!definition.defined.values.has(this.unknown))return false;}
            else if(keys.some(key=>!definition.defined.values.has(this.primitive(key))))return false;
        }
        return true;
    }
    private computedProperty(base: Cell, key: Cell, context: ts.Node,receiver=base): Cell {
        let keys=this.computedReads.get(base);if(!keys){keys=new Map();this.computedReads.set(base,keys);}
        let contexts=keys.get(key);if(!contexts){contexts=new Map();keys.set(key,contexts);}
        let receivers=contexts.get(context);if(!receivers){receivers=new Map();contexts.set(context,receivers);}
        const prior=receivers.get(receiver);if(prior)return prior;
        const result = this.newCell(), selected = new Set<SourcePropertyKey>();receivers.set(receiver,result);
        this.returnTransforms.set(result,{kind:"projection",inputs:[base,key,receiver],evaluate:inputs=>this.computedProperty(inputs[0]!,inputs[1]!,context,inputs[2]!)});
        const converted=this.primitiveConversion(key,context);
        let rule!: Rule;
        rule = this.rule([base,key,converted], () => {
            for(const input of [base,converted])if(input.values.has(this.abrupt))this.publish(result,this.abrupt);
            const names = this.propertyKeys(key, rule, context);
            const domain = names === null ? this.computedKeyDomain(key) : null;
            if (names === null) {
                const projection=this.propertyKeyDomain(base,context,rule,domain?"numeric":"all");
                if(projection.opaque)this.publish(result,projection.nativeOnly?this.nativeUnknown:this.unknown);
                else if(!projection.pending)this.publish(result,this.primitive(undefined));
                for(const name of [...projection.keys,...(domain?.keys??[])])if(!selected.has(name)){
                    selected.add(name);this.copy(this.property(base,name,context,false,receiver),result);
                }
                for(const location of projection.locations)this.copyRead(location,result,context);
                for(const getter of projection.getters){
                    const captured=this.captureRead(getter,context);this.watch(rule,captured);
                    if(captured.values.has(this.primitive(undefined)))this.publish(result,this.primitive(undefined));
                    this.invoke(context,this.accessorCallee(captured),receiver,[],result);
                }
            }
            // Generated eval can still be awaiting the transitive AOT source
            // closure. Preserve that dependency instead of sealing this read
            // with top and tainting unrelated, already finite earlier reads.
            else if (names === undefined && this.primitiveReadiness(key).pendingSource)
                this.publish(result, this.pendingSource);
            else if (names?.length === 0) this.publish(result, this.abrupt);
            else for (const name of names ?? []) if (!selected.has(name)) {
                selected.add(name);
                this.copy(this.property(base, name, context,false,receiver), result);
            }
        });
        return result;
    }
    private computedKeyDomain(key: Cell): {numeric: boolean; keys: readonly SourcePropertyKey[]} | null {
        if (!key.values.nonempty) return null;
        let numeric = false;
        const keys = new Set<SourcePropertyKey>();
        for (const atom of key.values) {
            if (atom.tag === "abrupt") continue;
            if (atom.tag === "primitive") {
                keys.add(typeof atom.value === "symbol" ? atom.value : String(atom.value));
                continue;
            }
            if (atom.tag === "text-operation" && atom.operation === "to-string" && !(this.primitiveKinds(atom.parts[0]!) & ~KIND_NUMERIC) ||
                atom.tag === "non-string" && !!atom.kinds && !(atom.kinds & ~KIND_NUMERIC) ||
                atom.tag === "text-operation" && (atom.operation === "coerce" ||
                    atom.operation === "numeric" && atom.numeric!.result !== "boolean" && atom.numeric!.conversion !== "default")) numeric = true;
            else return null;
        }
        return {numeric, keys: [...keys]};
    }
    /** Normal-value categories are independent of concrete value extent.
     * Operand effects and Reference failures remain on their own graph edges. */
    private primitiveKinds(root: Cell): number {
        this.flushPrimitiveChanges();
        const cached=this.primitiveKindCache.get(root);if(cached!==undefined)return cached;
        const pending=[{cell:root,finish:false}],active=new Set<Cell>(),kinds=new Map<Cell,number>();
        while(pending.length){
            const task=pending.pop()!;
            if(kinds.has(task.cell))continue;
            const known=this.primitiveKindCache.get(task.cell);if(known!==undefined){kinds.set(task.cell,known);continue;}
            if(!task.finish){
                if(active.has(task.cell)){kinds.set(task.cell,KIND_ALL);continue;}
                active.add(task.cell);pending.push({...task,finish:true});
                for(const atom of task.cell.values)if(atom.tag==="text-operation")for(const part of atom.parts)pending.push({cell:part,finish:false});
                continue;
            }
            active.delete(task.cell);let mask=0;
            const numeric=(mask:number)=> (mask&KIND_BIGINT?KIND_BIGINT:0)|(mask&~(KIND_BIGINT|KIND_SYMBOL)?KIND_NUMBER:0);
            for(const atom of task.cell.values){
                if(atom.tag==="abrupt")continue;
                if(atom.tag==="primitive")mask|=atom.value===null?KIND_NULL:({undefined:KIND_UNDEFINED,boolean:KIND_BOOLEAN,number:KIND_NUMBER,bigint:KIND_BIGINT,string:KIND_STRING,symbol:KIND_SYMBOL} as Record<string,number>)[typeof atom.value]!;
                else if(atom.tag==="non-string")mask|=atom.kinds??(KIND_PRIMITIVE&~KIND_STRING);
                else if(atom.tag==="unknown-string")mask|=KIND_STRING;
                else if(atom.tag==="text-operation"){
                    const parts=atom.parts.map(part=>kinds.get(part)??KIND_ALL);
                    if(atom.operation==="prefix"||atom.operation==="numeric"&&atom.numeric!.result==="boolean")mask|=KIND_BOOLEAN;
                    else if(atom.operation==="coerce")mask|=atom.conversion==="numeric"?numeric(parts[0]!):atom.conversion==="BigInt"?KIND_BIGINT:KIND_NUMBER;
                    else if(atom.operation==="numeric"){
                        if(atom.numeric!.result==="number")mask|=KIND_NUMBER;
                        else if(atom.numeric!.conversion==="default"){
                            if(parts.some(part=>part&KIND_STRING))mask|=KIND_STRING;
                            const operands=parts.map(numeric);
                            if(operands.every(part=>part&KIND_NUMBER))mask|=KIND_NUMBER;
                            if(operands.every(part=>part&KIND_BIGINT))mask|=KIND_BIGINT;
                        }else{
                            const operands=parts.map(numeric);
                            if(operands.every(part=>part&KIND_NUMBER))mask|=KIND_NUMBER;
                            if(operands.every(part=>part&KIND_BIGINT))mask|=KIND_BIGINT;
                        }
                    }else mask|=KIND_STRING;
                }else if(atom.tag==="unknown"||atom.tag==="pending-source")mask|=KIND_ALL;
                else if(atom.tag==="function"||atom.tag==="bound"||atom.tag==="promise-resolver"||atom.tag==="operation"||atom.tag==="intrinsic"&&(atom.domain==="constructor"||atom.domain==="prototype"&&atom.kind==="ordinary")||atom.tag==="builtin"&&atom.normalResult!=="not-callable")mask|=KIND_FUNCTION;
                else mask|=KIND_OBJECT;
            }
            kinds.set(task.cell,mask);
        }
        for(const [cell,mask]of kinds)this.primitiveKindCache.set(cell,mask);
        return kinds.get(root)??KIND_ALL;
    }
    private primitiveNumericConversionSafe(input: Cell, conversion: string): boolean {
        const kinds=this.primitiveKinds(input);
        if(conversion==="code-point"||conversion==="array-length"||!kinds||kinds&(KIND_SYMBOL|KIND_OBJECT|KIND_FUNCTION))return false;
        if(conversion==="BigInt")return !(kinds&~(KIND_BIGINT|KIND_BOOLEAN));
        return conversion!=="length"&&conversion!=="number"||!(kinds&KIND_BIGINT);
    }
    private numericOperationCannotThrow(operation: SourceNumericOperation, inputs: readonly Cell[]): boolean {
        if(operation.conversion==="none")return true;
        if(operation.form==="update")return false;
        const kinds=inputs.map(input=>this.primitiveKinds(input));
        if(operation.form==="relational")return kinds.every(kinds=>!!kinds&&!(kinds&~(KIND_PRIMITIVE&~KIND_SYMBOL)));
        if(kinds.some(kinds=>!kinds||kinds&~(KIND_UNDEFINED|KIND_NULL|KIND_BOOLEAN|KIND_NUMBER|KIND_STRING)))return false;
        return true;
    }
    private privateRegistry(name:ClassPrivateName):{slots:Set<SourcePrivateSlot>;changes:Cell} {
        let record=this.privateSlotRegistry.get(name);
        if(!record){record={slots:new Set(),changes:this.newCell()};this.privateSlotRegistry.set(name,record);}return record;
    }
    private privateSlot(owner:ObjectOwner|null,name:ClassPrivateName,kind:SourcePrivateSlot["kind"]):SourcePrivateSlot {
        const slots=owner?(owner.privateSlots??=new Map()):this.privateTemplates;
        let slot=slots.get(name);if(slot)return slot;
        slot={kind,value:this.newCell(),get:this.newCell(),set:this.newCell()};slots.set(name,slot);
        this.propertyLocations.add(slot.value);
        if(kind==="accessor"){this.accessorSlots.add(slot.get);this.accessorSlots.add(slot.set);}
        const registry=this.privateRegistry(name);registry.slots.add(slot);this.publish(registry.changes,{tag:"descriptor",identity:slot});
        if(owner)this.publish(owner.shape,{tag:"descriptor",identity:slot});return slot;
    }
    private evaluationCallerChange(environment:EvaluationEnvironment):Cell {
        let changes=this.evaluationCallerChanges.get(environment);if(!changes){changes=this.newCell();this.evaluationCallerChanges.set(environment,changes);}return changes;
    }
    /** Direct eval borrows the caller's lexical private environment. Nested
     * evals use this same caller graph rather than a nesting-depth bound. */
    private privateNames(identifier:ts.PrivateIdentifier,rule:Rule,context?:ts.Node):readonly ClassPrivateName[] {
        const local=resolveClassPrivateName(identifier);if(local)return[local];
        const environment=this.evaluationEnvironments.get(this.sourceFile(identifier));if(!environment?.direct)return[];
        const names=new Set<ClassPrivateName>(),pending=[environment],visited=new Set<EvaluationEnvironment>();
        while(pending.length){
            const current=pending.pop()!;if(visited.has(current))continue;visited.add(current);this.watch(rule,this.evaluationCallerChange(current));
            for(const caller of current.callers.keys()){
                const name=classPrivateNamesInScope(caller).find(name=>name.description===identifier.text);
                if(name){names.add(name);continue;}
                const outer=this.evaluationEnvironments.get(this.sourceFile(caller));if(outer?.direct)pending.push(outer);
                else if(context){const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context,"SyntaxError"));}
            }
        }
        return[...names];
    }
    /** Private entries are separate from public property keys and are never
     * enumerated, spread or forwarded through a Proxy target. */
    private privateAccess(base:Cell,identifier:ts.PrivateIdentifier,context:ts.Node,mode:"get"|"set"|"has",value?:Cell):Cell {
        let accesses=this.privateAccesses.get(context);if(!accesses){accesses=new Map();this.privateAccesses.set(context,accesses);}
        const signature=base.id+":"+mode+":"+value?.id,previous=accesses.get(signature);if(previous)return previous;
        const result=this.newCell();accesses.set(signature,result);
        if(mode!=="set")this.returnTransforms.set(result,{kind:"projection",inputs:[base],evaluate:inputs=>this.privateAccess(inputs[0]!,identifier,context,mode)});
        const fail=()=>{this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context,"TypeError"));};
        let rule!:Rule;
        const read=(slot:SourcePrivateSlot):void=>{
            if(mode==="has"){this.publish(result,this.primitive(true));return;}
            if(slot.kind==="accessor"){
                const callable=mode==="get"?slot.get:slot.set;this.watch(rule,callable);
                if(callable.values.has(this.primitive(undefined)))fail();
                this.invoke(context,this.accessorCallee(callable),base,mode==="get"?[]:[{cell:value!,spread:false}],result);
            }else if(mode==="get")this.copyRead(slot.value,result,context);
            else if(slot.kind==="field"){this.copyWrite(value!,slot.value,context);this.copy(value!,result);}
            else fail();
        };
        rule=this.rule([base],()=>{
            const names=this.privateNames(identifier,rule,context);
            if(!names.length&&!this.unresolvedPrivateContexts.has(context)){
                this.unresolvedPrivateContexts.add(context);
                this.onActive(context,()=>{
                    if(this.privateNames(identifier,rule,context).length)return;
                    // A direct eval source whose caller chain declares no such
                    // name is a SyntaxError before any statement runs
                    // (AllPrivateIdentifiersValid); privateNames publishes it,
                    // so the access carries no value and the eval stays finite.
                    if(this.evaluationEnvironments.get(this.sourceFile(identifier))?.direct)this.publish(result,this.abrupt);
                    else this.unresolvedPrivate=true;
                });
            }
            for(const name of names){
                this.function(name.definition);
                const registry=this.privateRegistry(name);this.watch(rule,registry.changes);
                for(const atom of base.values){
                    if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(result,atom);continue;}
                    const owner=this.ordinaryOwner(atom);
                    if(owner){
                        this.watch(rule,owner.shape);const slot=owner.privateSlots?.get(name);
                        // Repeated class evaluations can share an abstract
                        // owner while their actual private brands differ.
                        if(mode==="has"){this.publish(result,this.primitive(false));this.publish(result,this.primitive(true));}else fail();
                        if(slot)read(slot);
                        // Constructor-return alternatives can carry private
                        // brands whose receiver identity is not yet precise.
                        // Absence in a may-owner is not an absence proof.
                        else for(const candidate of registry.slots)read(candidate);
                    }else if(atom.tag==="unknown"||atom.tag==="opaque-object"){
                        if(mode==="has"){this.publish(result,this.primitive(true));this.publish(result,this.primitive(false));}
                        else {fail();this.publish(result,this.unknown);}
                        for(const slot of registry.slots)read(slot);
                    }else fail();
                }
            }
        });
        return result;
    }
    private evaluationThis(environment:EvaluationEnvironment):Cell {
        const previous=this.evaluationThisValues.get(environment);if(previous)return previous;
        const result=this.newCell();this.evaluationThisValues.set(environment,result);
        const references=new Map<ts.Node,ts.ThisExpression>();
        let rule!:Rule;rule=this.rule([this.evaluationCallerChange(environment)],()=>{
            for(const caller of environment.callers.keys()){
                let reference=references.get(caller);
                if(!reference){reference=ts.setTextRange(ts.factory.createThis(),caller);(reference as ts.Node&{parent:ts.Node}).parent=caller;references.set(caller,reference);}
                this.copy(this.cell(reference),result);
            }
        });
        return result;
    }
    private assignmentTarget(target:ts.Expression):{binding:ts.BindingName|null;references:Map<ts.Identifier,ts.Expression>}{
        let record=this.assignmentTargets.get(target);if(!record){const references=new Map<ts.Identifier,ts.Expression>();record={binding:normalizeAssignmentTarget(target,references),references};this.assignmentTargets.set(target,record);}return record;
    }
    private recordBindingWrites(name:ts.BindingName,context:ts.Node,references?:ReadonlyMap<ts.Identifier,ts.Expression>):void {
        const pending=[name];while(pending.length){const current=pending.pop()!;
            if(ts.isIdentifier(current)){const raw=references?.get(current)??current,target=unwrap(raw);if(!ts.isIdentifier(target))continue;
                let events=this.lexicalWriteEvents.get(context);if(!events){events=new Map();this.lexicalWriteEvents.set(context,events);}
                let event=events.get(target);if(!event){event={id:this.nextLexicalWrite++,origin:context,reference:target};events.set(target,event);}
                const symbol=this.bindingSymbol(target);if(!symbol)continue;
                let sites=this.bindingWriteSites.get(symbol);if(!sites){sites=new Map();this.bindingWriteSites.set(symbol,sites);}
                let leaves=sites.get(context);if(!leaves){leaves=new Map();sites.set(context,leaves);}leaves.set(target,event);
            }else for(const element of current.elements)if(ts.isBindingElement(element))pending.push(element.name);
        }
    }
    /** Index actual Reference uses before solving expressions. The existing
     * normalized binding tree owns arbitrary pattern leaves and defaults. */
    private indexSourceReferences(source:ts.SourceFile):void {
        const retain=(target:ts.Expression,operation:ts.Node,read:boolean,completion=operation)=>{
            target=unwrap(target);
            if((ts.isPropertyAccessExpression(target)||ts.isElementAccessExpression(target))&&!this.sourceReferences.has(target))
                this.sourceReferences.set(target,{target,operation,completion,read});
        };
        const target=(raw:ts.Expression,operation:ts.Node,read:boolean)=>{
            const {binding,references}=this.assignmentTarget(raw);
            if(ts.isBinaryExpression(operation))this.evaluationOrder.registerAssignment(operation,!!binding&&!ts.isIdentifier(binding));
            if(!binding)return;
            const pending:Array<{name:ts.BindingName;completion?:ts.Node}>=[{name:binding}];
            while(pending.length){const {name,completion}=pending.pop()!;
                if(ts.isIdentifier(name)){const reference=references.get(name);if(reference)retain(reference,operation,read,completion??operation);continue;}
                for(const element of name.elements)if(ts.isBindingElement(element)){
                    const parent=element.initializer?.parent;
                    const default_=parent&&ts.isBinaryExpression(parent)&&parent.operatorToken.kind===ts.SyntaxKind.EqualsToken&&parent.right===element.initializer?parent:undefined;
                    if(default_){this.assignmentDefaults.add(default_);this.evaluationOrder.registerAssignment(default_,!ts.isIdentifier(element.name));}
                    pending.push({name:element.name,completion:ts.isIdentifier(element.name)?default_:undefined});
                }
            }
        };
        const pending:ts.Node[]=[source];
        while(pending.length){const node=pending.pop()!;
            if(ts.isBinaryExpression(node)&&node.operatorToken.kind>=ts.SyntaxKind.FirstAssignment&&node.operatorToken.kind<=ts.SyntaxKind.LastAssignment&&!this.assignmentDefaults.has(node))
                target(node.left,node,node.operatorToken.kind!==ts.SyntaxKind.EqualsToken);
            else if(ts.isPrefixUnaryExpression(node)&&(node.operator===ts.SyntaxKind.PlusPlusToken||node.operator===ts.SyntaxKind.MinusMinusToken)||ts.isPostfixUnaryExpression(node))target(node.operand,node,true);
            else if(ts.isDeleteExpression(node))retain(node.expression,node,false);
            else if((ts.isForInStatement(node)||ts.isForOfStatement(node))&&!ts.isVariableDeclarationList(node.initializer))target(node.initializer,node,false);
            ts.forEachChild(node,child=>{pending.push(child);});
        }
    }
    private sourceReference(target:SourceReferenceExpression):SourceReference {
        let reference=this.sourceReferences.get(target);
        if(!reference){reference={target,operation:target,completion:target,read:true};this.sourceReferences.set(target,reference);}
        if(!reference.base){
            reference.base=this.cell(target.expression);
            reference.readContext=this.evaluationOrder.referenceCompletion(target,target);
            reference.writeContext=this.evaluationOrder.referenceCompletion(target,reference.completion);
            const handler=this.exceptionHandlers.get(reference.operation)??this.exceptionHandlers.get(target);
            if(handler){this.exceptionHandlers.set(reference.writeContext,handler);this.exceptionHandlers.set(reference.readContext,handler);}
            if(ts.isElementAccessExpression(target))reference.key=this.primitiveConversion(this.cell(target.argumentExpression),reference.read?reference.readContext:reference.writeContext);
        }
        return reference;
    }
    private recordAssignmentWrites(raw:ts.Expression,context:ts.Node):void {
        const target=unwrap(raw);if(ts.isIdentifier(target)){this.recordBindingWrites(target,context);return;}
        if(ts.isPropertyAccessExpression(target)||ts.isElementAccessExpression(target))return;
        const {binding,references}=this.assignmentTarget(target);if(binding)this.recordBindingWrites(binding,context,references);
    }
    /** The `this` binding a `this` (or super reference) at `node` reads:
     * the nearest non-arrow function's receiver, a class element's class
     * (static) or instance receiver, or the Script/module/eval `this`. */
    private thisBinding(node:ts.Node):Cell {
        const prior=this.thisBindings.get(node);if(prior)return prior;
        const result=this.newCell();this.thisBindings.set(node,result);
        let parent: ts.Node | undefined = node.parent;
        let member: ts.Node = node;
        while (parent && !ts.isClassLike(parent) && (!functionNode(parent) || ts.isArrowFunction(parent))) {member=parent;parent = parent.parent;}
        if (parent && functionNode(parent)) this.copy(this.function(parent).receiver, result);
        else if (parent && ts.isClassLike(parent)) {
            const isStatic = ts.isClassStaticBlockDeclaration(member) || (ts.canHaveModifiers(member) ? ts.getModifiers(member) ?? [] : []).some(modifier=>modifier.kind===ts.SyntaxKind.StaticKeyword);
            if (isStatic) this.copy(this.cell(parent),result);
            else this.copy(this.function(parent).receiver,result);
        }
        else {const environment=this.evaluationEnvironments.get(this.sourceFile(node));
            if(environment?.direct)this.copy(this.evaluationThis(environment),result);
            else this.publish(result,ecmaParseGoal(node.getSourceFile())==="module"?this.primitive(undefined):this.global);
        }
        return result;
    }
    /** The [[HomeObject]] of the method, accessor, constructor or class
     * element around `node` (arrows inherit it): a class's prototype, the
     * class itself for a static element, or an object literal. */
    private homeObject(node:ts.Node):Cell|null {
        let parent: ts.Node | undefined = node.parent;
        let member: ts.Node = node;
        while (parent && !ts.isClassLike(parent) && (!functionNode(parent) || ts.isArrowFunction(parent))) {member=parent;parent = parent.parent;}
        if(!parent)return null;
        const element=functionNode(parent)?parent:member,container=functionNode(parent)?parent.parent:parent;
        if(ts.isObjectLiteralExpression(container))return this.cell(container);
        if(!ts.isClassLike(container))return null;
        const isStatic=ts.isClassStaticBlockDeclaration(element)||(ts.canHaveModifiers(element)?ts.getModifiers(element)??[]:[]).some(modifier=>modifier.kind===ts.SyntaxKind.StaticKeyword);
        return isStatic?this.cell(container):this.property(this.cell(container),"prototype",node);
    }
    private writeTarget(raw: ts.Expression, value: Cell, context: ts.Node, mode: "set"|"delete" = "set"): void {
        const target = unwrap(raw);
        if (ts.isIdentifier(target)) { this.writeBinding(target,value,context); return; }
        if (ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target)) {
            const reference=this.sourceReference(target),base=reference.base!,point=reference.writeContext!;
            if (ts.isPropertyAccessExpression(target) && ts.isPrivateIdentifier(target.name)) {this.privateAccess(base,target.name,point,"set",value);return;}
            const receiver=target.expression.kind===ts.SyntaxKind.SuperKeyword?this.thisBinding(target.expression):base;
            if (ts.isElementAccessExpression(target)) this.writeComputedProperty(base,reference.key!,value,mode,point,receiver);
            else this.writeProperty(base,target.name.text,value,true,mode,point,receiver);
            return;
        }
        const {binding,references}=this.assignmentTarget(target);
        if (binding) this.bind(binding, value, references, context);
        else this.opaqueEffect(context);
    }
    private writeComputedProperty(base: Cell, key: Cell, value: Cell, mode: "set"|"define"|"delete" = "set", context?:ts.Node, receiver=base): void {
        let rule!: Rule;
        rule=this.rule([key],()=>{
            const names = this.propertyKeys(key, rule, context);
            // The converted key bounds which accessors, "length" and
            // "__proto__" an unknown-key write may reach.
            if (names === null) this.writeProperty(base,null,value,true,mode,context,receiver,this.primitiveConversion(key,context));
            else for (const name of names ?? []) this.writeProperty(base,name,value,true,mode,context,receiver);
        });
    }
    private proxyReadEffects(owner:ObjectOwner,key:SourcePropertyKey|null,trap:"get"|"has"|"ownKeys"|"getOwnPropertyDescriptor",context?:ts.Node,receiverInput?:Cell):Cell {
        const proxy=owner.proxy;if(!proxy)return this.empty;context??=proxy.context;
        const signature=owner.shape.id+":"+(key===null?"":this.keyIdentity(key))+":"+trap+":"+this.cell(context).id+":"+receiverInput?.id;
        const prior=this.proxyReads.get(signature);if(prior)return prior;
        const result=this.newCell();this.proxyReads.set(signature,result);
        const method=this.property(proxy.handler,trap,context),callee=this.newCell(),property=this.newCell(),receiver=receiverInput??this.newCell();
        this.publish(property,key===null?this.unknown:this.primitive(key));if(!receiverInput)this.publish(receiver,{tag:"object",owner});
        this.rule([method],()=>{for(const atom of method.values){
            if(atom!==this.primitive(undefined)&&atom!==this.primitive(null))this.publish(callee,atom);
            else if(trap==="ownKeys"||trap==="getOwnPropertyDescriptor")this.publish(result,this.unknown);
            else if(trap==="has") {
                if(key!==null)this.copy(this.hasProperty(proxy.target,key,context!),result);
                else{this.publish(result,this.unknown);this.activateOpaqueEffect(context!);}
            }
            else if(trap==="get") {
                if(key!==null)this.copy(this.property(proxy.target,key,context,false,receiver),result);
                else this.copy(this.computedProperty(proxy.target,property,context,receiver),result);
            }
        }});
        const returned=trap==="has"?this.newCell():result;
        this.invoke(context,callee,proxy.handler,[{cell:proxy.target,spread:false},...(trap!=="ownKeys"?[{cell:property,spread:false}]:[]),...(trap==="get"?[{cell:receiver,spread:false}]:[])],returned);
        if(trap==="has"){
            this.copy(returned,result);const truth=this.booleanPrimitive(returned);let opened=false;
            this.rule([truth],()=>{if(!opened&&truth.values.has(this.primitive(false))){
                opened=true;
                // False trap results additionally inspect target descriptor
                // and extensibility invariants. Their exotic effects are
                // unrepresented, so retain the opaque target worklist.
                const caught=this.exceptionHandlers.get(context!);if(caught)this.publish(caught,this.unknown);
                this.onActive(context!,()=>{this.opaqueEffect(context!);this.escapeCallableArgument(proxy.target,context!);});
            }});
        }
        return result;
    }
    private hasProperty(base:Cell,key:SourcePropertyKey,context:ts.Node):Cell {
        let bases=this.hasProperties.get(context);if(!bases){bases=new Map();this.hasProperties.set(context,bases);}
        let keys=bases.get(base);if(!keys){keys=new Map();bases.set(base,keys);}const previous=keys.get(key);if(previous)return previous;
        const result=this.newCell();keys.set(key,result);let rule!:Rule;
        rule=this.rule([base],()=>{
            const pending=[...base.values],visited=new Set<ObjectOwner>();
            while(pending.length){
                const atom=pending.pop()!;
                if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(result,atom);continue;}
                if(atom===this.primitive(null)){this.publish(result,this.primitive(false));continue;}
                const owner=this.ordinaryOwner(atom);
                if(owner?.proxy){this.copy(this.booleanPrimitive(this.proxyReadEffects(owner,key,"has",context)),result);continue;}
                if(!owner){this.publish(result,this.primitive(false));this.publish(result,this.primitive(true));this.activateOpaqueEffect(context);continue;}
                if(visited.has(owner))continue;visited.add(owner);this.watch(rule,owner.shape);
                if(this.opaqueShape(owner,context)){this.publish(result,this.primitive(false));this.publish(result,this.primitive(true));this.activateOpaqueEffect(context);continue;}
                const presence=this.propertyPresence(owner,key,context);this.watch(rule,presence);
                if(presence.values.has(this.primitive(true)))this.publish(result,this.primitive(true));
                if(!presence.values.has(this.primitive(false)))continue;
                if(owner.prototype){this.watch(rule,owner.prototype);pending.push(...owner.prototype.values);}
                else this.publish(result,this.primitive(false));
            }
        });
        return result;
    }
    private propertyDescriptor(descriptor:Cell,context:ts.Node):SourceDescriptorRecord {
        let records=this.descriptorRecords.get(context);if(!records){records=new Map();this.descriptorRecords.set(context,records);}
        const prior=records.get(descriptor);if(prior)return prior;
        const fields=new Map<string,{present:Cell;value:Cell}>(),normal=this.newCell(),record={fields,normal},inputs=new Map<Atom,Cell>();records.set(descriptor,record);
        const input=(atom:Atom)=>{let value=inputs.get(atom);if(!value){value=this.newCell();inputs.set(atom,value);this.publish(value,atom);}return value;};
        const initial=this.newCell();
        this.rule([descriptor],()=>{for(const atom of descriptor.values){
            if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(normal,atom);continue;}
            if(this.ordinaryOwner(atom)||atom.tag==="opaque-object"||atom.tag==="unknown")this.publish(initial,atom);
            else {this.publish(normal,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));}
        }});
        let active=initial;
        for(const field of runtimeDescriptorFields) {
            const receiver=active,present=this.hasProperty(receiver,field.name,context),selected=this.newCell(),value=this.newCell(),next=this.newCell();
            fields.set(field.name,{present,value});
            this.rule([present],()=>{
                if(present.values.has(this.primitive(false))){this.publish(value,this.primitive(undefined));this.copy(receiver,next);}
                if(present.values.has(this.primitive(true)))this.copy(receiver,selected);
            });
            const read=this.property(selected,field.name,context);let convert!:Rule;
            convert=this.rule([read],()=>{for(const atom of read.values){
                if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(normal,atom);continue;}
                if(field.kind==="callable"&&atom!==this.primitive(undefined)) {
                    const kinds=this.primitiveKinds(input(atom));
                    if(!(kinds&KIND_FUNCTION)){this.publish(normal,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));continue;}
                    if(kinds&~KIND_FUNCTION){const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));}
                }
                if(field.kind==="boolean") {
                    const state=this.primitiveState(input(atom),convert,true);
                    if(state.proof.primitiveComplete)for(const choice of state.proof.values)this.publish(value,this.primitive(Boolean(choice)));
                    else if(this.ordinaryOwner(atom))this.publish(value,this.primitive(true));
                    else {this.publish(value,this.primitive(false));this.publish(value,this.primitive(true));}
                }else this.publish(value,atom);
                this.copy(selected,next);
            }});
            active=next;
        }
        const complete=active,flags=["get","set","value","writable"].map(name=>fields.get(name)!.present);let validate!:Rule;
        validate=this.rule([complete,...flags],()=>{
            const states=flags.map(input=>this.primitiveState(input,validate,true));
            if(states.some(state=>state.pending&&!state.unresolved))return;
            for(const tuple of sourceChoiceTuples(states.map(state=>state.proof.values))) {
                if((tuple[0]||tuple[1])&&(tuple[2]||tuple[3])){this.publish(normal,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));}
                else this.copy(complete,normal);
            }
        });
        return record;
    }
    private defineProperty(base:Cell,key:Cell,descriptor:Cell,context:ts.Node): void {
        let writes=this.descriptorWrites.get(context);if(!writes){writes=new Set();this.descriptorWrites.set(context,writes);}
        const identity="define:"+base.id+":"+key.id+":"+descriptor.id;if(writes.has(identity))return;writes.add(identity);
        // Every normal DefineProperty completion creates an own location.
        // Register that edge before descriptor absence reads settle, so the
        // worklist cannot seal a later read as absent during intake.
        let locations!:Rule;
        locations=this.rule([base,key],()=>{
            const names=this.propertyKeys(key,locations,context);
            for(const name of names??[])for(const atom of base.values){
                const owner=this.ordinaryOwner(atom);if(!owner)continue;
                if(owner.immutableOwn){const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context,"TypeError"));continue;}
                const record=this.ownPresence(owner,name);
                this.recordPropertyWrite(owner,name,context,base,base,"define");
                this.publish(record.facts,this.primitive(true));
            }
        });
        const converted=this.propertyDescriptor(descriptor,context),getter=converted.fields.get("get")!.value,setter=converted.fields.get("set")!.value,value=converted.fields.get("value")!.value;
        const enumerable=converted.fields.get("enumerable")!,writable=converted.fields.get("writable")!,writableValue=this.booleanPrimitive(writable.value);
        const getterPresent=converted.fields.get("get")!.present,setterPresent=converted.fields.get("set")!.present;
        let rule!:Rule;
        rule=this.rule([base,key,getter,setter,getterPresent,setterPresent,converted.normal,writable.present,writableValue],()=>{
            if(![...converted.normal.values].some(atom=>atom.tag!=="abrupt"&&atom.tag!=="pending-source"))return;
            const keys = this.propertyKeys(key, rule, context);
            if (keys === undefined) return;
            const names:readonly(SourcePropertyKey|null)[]=keys ?? [null];
            const accessor=getterPresent.values.has(this.primitive(true))||setterPresent.values.has(this.primitive(true));
            const data=getterPresent.values.has(this.primitive(false))&&setterPresent.values.has(this.primitive(false));
            for(const name of names){
                if(name!==null)for(const atom of base.values){const owner=this.ordinaryOwner(atom);if(owner){this.copy(enumerable.value,this.ownPresence(owner,name).enumerable);if(data&&(writable.present.values.has(this.primitive(false))||writableValue.values.has(this.primitive(false))))this.markReadonly(owner,name);}}
                if(accessor){for(const atom of base.values){const owner=this.ordinaryOwner(atom);
                    if(owner){this.defineAccessor(owner,name,"get",getter,context);this.defineAccessor(owner,name,"set",setter,context);if(name!==null){this.recordPropertyWrite(owner,name,context,base,base,"define",getter);this.recordPropertyWrite(owner,name,context,base,base,"define",setter);}}
                    else if(atom.tag==="unknown"||atom.tag==="opaque-object") {this.publish(this.globalMutation,this.unknown);this.opaqueEffect(context);}
                    else if(atom.tag!=="abrupt"&&atom.tag!=="pending-source"){const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context!));}
                }}
                if(data&&getter.values.nonempty&&setter.values.nonempty)this.writeProperty(base,name,value,true,"define",context);
            }
        });
    }
    private defineProperties(base:Cell,descriptors:Cell,context:ts.Node): void {
        let writes=this.descriptorWrites.get(context);if(!writes){writes=new Set();this.descriptorWrites.set(context,writes);}
        const identity="define-all:"+base.id+":"+descriptors.id;if(writes.has(identity))return;writes.add(identity);
        const selected=new Set<string>();let rule!:Rule;
        rule=this.rule([descriptors],()=>{for(const atom of descriptors.values){
            const owner=this.ordinaryOwner(atom);
            if(!owner){if(atom.tag!=="pending-source")this.writeProperty(base,null,this.empty,true,"define",context);continue;}
            this.watch(rule,owner.shape);
            if(this.opaqueShape(owner,context))this.writeProperty(base,null,this.empty,true,"define",context);
            const names=this.ownerKeys(owner,rule);if(names===undefined)continue;if(names===null){this.writeProperty(base,null,this.empty,true,"define",context);continue;}
            for(const name of names){
                if(name===null){this.writeProperty(base,null,this.empty,true,"define",context);continue;}
                const key=owner.shape.id+":"+this.keyIdentity(name);if(selected.has(key))continue;selected.add(key);
                const propertyKey=this.newCell();this.publish(propertyKey,this.primitive(name));
                this.defineProperty(base,propertyKey,this.property(descriptors,name,context),context);
            }
        }});
    }
    /** A Proxy's [[HasProperty]], [[Delete]], [[OwnPropertyKeys]],
     * [[GetOwnProperty]], [[DefineOwnProperty]], [[GetPrototypeOf]],
     * [[SetPrototypeOf]], [[IsExtensible]] and [[PreventExtensions]], and the
     * [[Get]]/[[Set]] a native performs itself, call the handler's trap at
     * this operation: the trap is invoked here with the target and operands
     * the analysis does not track (a key, a descriptor, a value), so its body,
     * effects and exceptions are those of an ordinary call. A handler without
     * the trap forwards the internal method to the target; a handler with it
     * has its result checked against the target's own [[GetOwnProperty]],
     * [[IsExtensible]] and [[GetPrototypeOf]]; the target receives whichever
     * the handler may select. `chain` also
     * follows each reached object's prototype, as [[HasProperty]], a for-in
     * walk and the natives that read through the chain do. Until a Proxy
     * exists nothing is installed. */
    private proxyInternalMethod(objects:Cell,traps:readonly string[],context:ts.Node,chain=false):void {
        if(!this.proxyCreated){this.pendingProxyMethods.push({objects,traps,context,chain});return;}
        this.installProxyInternalMethod(objects,traps,context,chain);
    }
    /** Invoke `handler[trap]` (when it is neither undefined nor null) with
     * the target and unknown operands; the result is the operation's own.
     * Returns the trap read, which selects forwarding or the invariant checks. */
    private proxyTrapCall(owner:ObjectOwner,trap:string,context:ts.Node):Cell {
        const proxy=owner.proxy!;
        let calls=this.proxyTrapCalls.get(context);if(!calls){calls=new Map();this.proxyTrapCalls.set(context,calls);}
        const key=owner.shape.id+":"+trap,prior=calls.get(key);if(prior)return prior;
        const method=this.property(proxy.handler,trap,context),callee=this.newCell(),operand=this.newCell();calls.set(key,method);
        this.rule([method],()=>{for(const atom of method.values)if(atom!==this.primitive(undefined)&&atom!==this.primitive(null))this.publish(callee,atom);});
        this.publish(operand,this.nativeUnknown);
        const operands:ListPart[]=[{cell:proxy.target,spread:false}];
        for(let index=0;index<(PROXY_TRAP_OPERANDS.get(trap)??0);index++)operands.push({cell:operand,spread:false});
        this.invoke(context,callee,proxy.handler,operands,this.newCell());
        return method;
    }
    /** Run a Proxy's traps and hand its target what the handler selects: an
     * absent trap (undefined or null) forwards that internal method, a
     * present one has its result checked (PROXY_INVARIANT_TRAPS), and a trap
     * the analysis cannot see may do either. */
    private proxyTargetMethods(owner:ObjectOwner,traps:readonly string[],context:ts.Node,chain:boolean):void {
        const proxy=owner.proxy!,methods=traps.map(trap=>[trap,this.proxyTrapCall(owner,trap,context)] as const),selected=new Set<string>();
        this.rule(methods.map(([,method])=>method),()=>{
            const before=selected.size;
            for(const [trap,method] of methods)for(const atom of method.values){
                const absent=atom===this.primitive(undefined)||atom===this.primitive(null),present=this.ordinaryOwner(atom)!==null||atom.tag==="bound"||atom.tag==="operation"||atom.tag==="builtin"||atom.tag==="intrinsic";
                if(!present)selected.add(trap);
                if(!absent)for(const check of PROXY_INVARIANT_TRAPS)selected.add(check);
            }
            if(selected.size!==before)this.installProxyInternalMethod(proxy.target,PROXY_TRAPS.filter(trap=>selected.has(trap)),context,chain);
        });
    }
    private installProxyInternalMethod(objects:Cell,traps:readonly string[],context:ts.Node,chain:boolean):void {
        let calls=this.proxyInternalCalls.get(context);if(!calls){calls=new Set();this.proxyInternalCalls.set(context,calls);}
        const key=objects.id+":"+traps.join(",")+":"+chain;if(calls.has(key))return;calls.add(key);
        const owners=new Set<ObjectOwner>(),inputs=new Set<Cell>([objects]);
        let rule!:Rule;
        rule=this.rule([objects],()=>{
            const pending=[...inputs];
            while(pending.length){
                const input=pending.pop()!;
                for(const atom of input.values){
                    const owner=this.ordinaryOwner(atom);if(!owner||owners.has(owner))continue;owners.add(owner);
                    const next:Cell[]=[];
                    if(owner.proxy)this.proxyTargetMethods(owner,traps,context,chain);
                    else if(chain&&owner.prototype)next.push(owner.prototype);
                    for(const cell of next)if(!inputs.has(cell)){inputs.add(cell);this.watch(rule,cell);pending.push(cell);}
                }
            }
        });
    }
    /** ProxyCreate validates object domains without reading properties or
     * invoking either operand. Later Proxy operations own their trap effects. */
    private proxyCreate(target:Cell,handler:Cell,context:ts.Node):Cell {
        let calls=this.proxyCreations.get(context);if(!calls){calls=new Map();this.proxyCreations.set(context,calls);}
        const key=target.id+":"+handler.id,previous=calls.get(key);if(previous)return previous;
        const result=this.newCell(),owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),proxy:{target,handler,context}};
        calls.set(key,result);this.ownerCreations.set(owner,context);this.sourceObjectOwners.add(owner);this.ownerMutation(owner);this.markPropertyAlgorithm(owner,"opaque");
        if(!this.proxyCreated){this.proxyCreated=true;for(const pending of this.pendingProxyMethods.splice(0))this.installProxyInternalMethod(pending.objects,pending.traps,pending.context,pending.chain);}
        this.returnTransforms.set(result,{kind:"allocation",inputs:[target,handler],evaluate:inputs=>this.proxyCreate(inputs[0]!,inputs[1]!,context)});
        const fail=()=>{this.publish(result,this.abrupt);const caught=this.exceptionHandlers.get(context);if(caught)this.publish(caught,this.nativeException(context,"TypeError"));};
        const operands=[target,handler].map(input=>{
            const normal=this.newCell();this.rule([input],()=>{for(const value of input.values){
                if(value.tag==="abrupt"||value.tag==="pending-source")this.publish(result,value);
                else this.publish(normal,value);
            }});return normal;
        });
        this.rule(operands,()=>{
            const targets=this.primitiveKinds(operands[0]!),handlers=this.primitiveKinds(operands[1]!),objects=KIND_OBJECT|KIND_FUNCTION;
            if(!targets||!handlers)return;
            if(targets&KIND_PRIMITIVE)fail();
            if(!(targets&objects))return;
            if(handlers&KIND_PRIMITIVE)fail();
            if(handlers&objects)this.publish(result,{tag:"object",owner});
        });
        return result;
    }
    private createObject(prototype:Cell,properties:Cell,context:ts.Node):Cell {
        let creations=this.objectCreations.get(context);if(!creations){creations=new Map();this.objectCreations.set(context,creations);}
        const key=prototype.id+":"+properties.id,prior=creations.get(key);if(prior)return prior;
        const result=this.newCell(),descriptors=this.newCell(),owner=this.owner(context);creations.set(key,result);owner.prototype??=this.newCell();
        owner.ordinary=true;this.markPropertyAlgorithm(owner,"ordinary");
        this.rule([prototype],()=>{for(const value of prototype.values){
            if(this.ordinaryOwner(value)||value===this.primitive(null)||value.tag==="opaque-object"||value.tag==="unknown") {
                this.publish(owner.prototype!,value);this.publish(result,{tag:"object",owner});
            }else if(value.tag==="pending-source"||value.tag==="abrupt")this.publish(result,value);
            else {this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));}
        }});
        this.rule([properties],()=>{for(const value of properties.values)if(value!==this.primitive(undefined))this.publish(descriptors,value);});
        this.defineProperties(result,descriptors,context);
        return result;
    }
    /** Descriptor results are allocated ordinary objects whose stored values
     * remain reachable when the result itself escapes to opaque code. */
    private descriptorOwner(context:ts.Node):ObjectOwner {
        const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype(),ordinary:true};
        this.ownerCreations.set(owner,context);this.markPropertyAlgorithm(owner,"ordinary");this.ownerMutation(owner);return owner;
    }
    /** Copy enumerable own values through the same owner/key graph used by
     * property reads. Unknown key extent retains its actual value locations. */
    private copyDataProperties(target:ObjectOwner,input:Cell,context:ts.Node):void {
        const objects=this.objectValue(input,context),selected=new Set<string>();
        let unknownInputs:Cell|undefined,opaque=false;
        const incomplete=(atom:Atom):void=>{
            if(!unknownInputs){
                unknownInputs=this.newCell();const key=this.newCell();this.publish(key,this.unknownString);
                this.defineField(target,null,this.computedProperty(unknownInputs,key,context),true);
            }
            this.publish(unknownInputs,atom);
        };
        const effects=():void=>{
            if(opaque)return;opaque=true;this.activateOpaqueEffect(context);
            this.copy(this.executionOrigins(context),target.shape);
            this.onActive(context,()=>this.escapeCallableArgument(objects,context));
        };
        let rule!:Rule;
        rule=this.rule([objects],()=>{for(const atom of objects.values){
            if(atom.tag==="abrupt"||atom.tag==="pending-source")continue;
            const owner=this.ordinaryOwner(atom);
            if(!owner){incomplete(atom);effects();continue;}
            this.watch(rule,owner.shape);
            if(!this.definitionsReady(owner,rule))continue;
            const names=this.ownerKeys(owner,rule);
            if(names===undefined)continue;
            if(names===null||this.opaqueShape(owner,context)||owner.proxy){incomplete(atom);effects();}
            for(const name of names??[]){
                if(name===null){
                    const signature=owner.shape.id+":unknown";if(selected.has(signature))continue;selected.add(signature);
                    // The unknown extent still denotes own keys. A general
                    // property lookup would also read inherited native methods.
                    const values=this.newCell(),receiver=this.newCell(),getters=new Set<Cell>();this.publish(receiver,atom);
                    this.rule([owner.shape],()=>{
                        const stored=this.unknownPropertyLocations.get(owner);if(stored)this.copyRead(stored.value,values,context);
                        const accessor=owner.accessors.get(null);
                        if(accessor&&!getters.has(accessor.get)){getters.add(accessor.get);this.invoke(context,this.accessorCallee(accessor.get),receiver,[],values);}
                    });
                    this.defineField(target,null,values,true);continue;
                }
                const presence=this.propertyPresence(owner,name,context),enumerable=this.ownPresence(owner,name).enumerable;
                this.watch(rule,presence);this.watch(rule,enumerable);
                if(!presence.values.has(this.primitive(true)))continue;
                if(enumerable.values.nonempty&&!enumerable.values.has(this.primitive(true)))continue;
                const signature=owner.shape.id+":"+this.keyIdentity(name);if(selected.has(signature))continue;selected.add(signature);
                this.defineField(target,name,this.property(objects,name,context),true);
            }
        }});
    }
    /** One own-key collection feeds every key-kind selection. Its Array
     * stores possible elements at numeric locations independently of length;
     * optional/unknown key extents never enumerate subsets or lengths. */
    /** "names" is [[OwnPropertyKeys]] of the kind; "keys", "values" and
     * "entries" are EnumerableOwnProperties (enumerable string keys, values
     * through [[Get]], entries as fresh two-element arrays). */
    private ownKeyArray(input:Cell,context:ts.Node,kind:"all"|"string"|"symbol",coerce:boolean,projection:"names"|"keys"|"values"|"entries"="names"):Cell {
        let calls=this.ownKeyArrays.get(context);if(!calls){calls=new Map();this.ownKeyArrays.set(context,calls);}
        const signature=input.id+":"+kind+":"+coerce+":"+projection,previous=calls.get(signature);if(previous)return previous;
        const result=this.newCell(),objects=coerce?this.toObject(input,context):input;calls.set(signature,result);
        this.returnTransforms.set(result,{kind:"allocation",inputs:[input],evaluate:inputs=>this.ownKeyArray(inputs[0]!,context,kind,coerce,projection)});
        const pairs=new Map<string,ObjectOwner>();
        const element=(key:SourcePropertyKey):void=>{
            if(projection==="names"||projection==="keys"){this.publish(values,this.primitive(key));return;}
            if(projection==="values"){this.copy(this.property(objects,key,context),values);return;}
            const id=this.keyIdentity(key);let pair=pairs.get(id);
            if(!pair){
                pair=this.arrayOwner(context);const two=this.newCell(),name=this.newCell();this.publish(two,this.primitive(2));this.publish(name,this.primitive(key));
                this.defineField(pair,"length",two,false);this.defineField(pair,"0",name,true);this.defineField(pair,"1",this.property(objects,key,context),true);pairs.set(id,pair);
            }
            this.publish(values,{tag:"object",owner:pair});
        };
        const owner=this.descriptorOwner(context),values=this.newCell(),indices=this.newCell(),length=this.newCell();
        this.arrayOwner(context,owner);
        this.defineField(owner,"length",length,false);this.publish(indices,{tag:"non-string",kinds:KIND_NUMBER});
        this.defineField(owner,null,values,true,indices);
        const unknownNumber:Atom={tag:"non-string",kinds:KIND_NUMBER},unknownSymbol:Atom={tag:"non-string",kinds:KIND_SYMBOL};
        let escaped=false;
        const incomplete=(effects:boolean):void=>{
            if(projection==="values"||projection==="entries")this.publish(values,this.unknown);
            else{if(kind!=="symbol")this.publish(values,this.unknownString);if(kind!=="string")this.publish(values,unknownSymbol);}
            this.publish(length,unknownNumber);
            if(effects){this.activateOpaqueEffect(context);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.unknown);
                if(!escaped){escaped=true;this.onActive(context,()=>this.escapeCallableArgument(objects,context));}}
        };
        const fail=()=>{this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context,"TypeError"));};
        let rule!:Rule;rule=this.rule([objects],()=>{for(const atom of objects.values){
            if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(result,atom);continue;}
            const source=this.ordinaryOwner(atom);
            if(!source){if(atom.tag==="unknown"||atom.tag==="opaque-object"){this.publish(result,{tag:"object",owner});incomplete(true);}else fail();continue;}
            this.publish(result,{tag:"object",owner});this.watch(rule,source.shape);
            if(!this.definitionsReady(source,rule))continue;
            const algorithm=source.propertyAlgorithm;if(algorithm)this.watch(rule,algorithm);
            const represented=algorithm?.values.has(this.primitive("ordinary"))||this.literalLists.has(source)||this.primitiveStringFields.has(source)||!!source.boxed;
            const names=this.ownerKeys(source,rule);if(names===undefined)continue;
            const opaqueAlgorithm=!!source.proxy||!!algorithm?.values.has(this.primitive("opaque"));
            let uncertain=names===null||!represented||this.opaqueShape(source,context)||opaqueAlgorithm,pending=false,count=0;
            for(const key of names??[]){
                if(key===null){uncertain=true;continue;}
                if(kind!=="all"&&typeof key!==kind)continue;
                const present=this.propertyPresence(source,key,context);this.watch(rule,present);
                if(!present.values.nonempty){pending=true;continue;}
                if(!present.values.has(this.primitive(true)))continue;
                if(projection!=="names"){
                    // An enumerability not yet decided counts the key and
                    // leaves the length open, like the spread copy.
                    const enumerable=this.ownPresence(source,key).enumerable;this.watch(rule,enumerable);
                    if(enumerable.values.nonempty&&!enumerable.values.has(this.primitive(true)))continue;
                    if(!enumerable.values.nonempty||enumerable.values.has(this.primitive(false)))uncertain=true;
                }
                element(key);count++;
                if(present.values.has(this.primitive(false)))uncertain=true;
            }
            if(uncertain)incomplete(opaqueAlgorithm);else if(!pending)this.publish(length,this.primitive(count));
        }});
        return result;
    }
    private reflectiveGet(target:Cell,key:Cell,receiver:Cell,context:ts.Node):Cell {
        let calls=this.reflectiveGets.get(context);if(!calls){calls=new Map();this.reflectiveGets.set(context,calls);}
        const signature=target.id+":"+key.id+":"+receiver.id,previous=calls.get(signature);if(previous)return previous;
        const result=this.newCell(),objects=this.newCell();calls.set(signature,result);
        this.returnTransforms.set(result,{kind:"projection",inputs:[target,key,receiver],evaluate:inputs=>this.reflectiveGet(inputs[0]!,inputs[1]!,inputs[2]!,context)});
        let opened=false;this.rule([target],()=>{for(const atom of target.values){
            if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(result,atom);continue;}
            if(this.ordinaryOwner(atom)||atom.tag==="unknown"||atom.tag==="opaque-object")this.publish(objects,atom);
            else{this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context,"TypeError"));}
        }
        // Target validation precedes ToPropertyKey, including key hook effects.
        if(!opened&&objects.values.nonempty){opened=true;this.copy(this.computedProperty(objects,key,context,receiver),result);}});
        return result;
    }
    /** SameValue compares values without coercion, property reads or callable
     * escape. Abstract identities retain both Boolean results. */
    private sameValueQuery(left:Cell,right:Cell,context:ts.Node):Cell {
        let calls=this.sameValueQueries.get(context);if(!calls){calls=new Map();this.sameValueQueries.set(context,calls);}
        const key=left.id+":"+right.id,prior=calls.get(key);if(prior)return prior;
        const result=this.newCell();calls.set(key,result);
        this.returnTransforms.set(result,{kind:"projection",inputs:[left,right],evaluate:inputs=>this.sameValueQuery(inputs[0]!,inputs[1]!,context)});
        this.rule([left,right],()=>{
            for(const input of [left,right])for(const atom of input.values)if(atom.tag==="abrupt"||atom.tag==="pending-source")this.publish(result,atom);
            for(const a of left.values)for(const b of right.values){
                if(a.tag==="abrupt"||a.tag==="pending-source"||b.tag==="abrupt"||b.tag==="pending-source")continue;
                if(a.tag==="primitive"&&b.tag==="primitive"&&!(typeof a.value==="symbol"&&a.value===b.value&&this.freshSymbols.has(a.value)))this.publish(result,this.primitive(Object.is(a.value,b.value)));
                else{this.publish(result,this.primitive(false));this.publish(result,this.primitive(true));}
                // These are the complete result domain, rather than a bound
                // on the size of either operand's retained value graph.
                if(result.values.has(this.primitive(false))&&result.values.has(this.primitive(true)))return;
            }
        });return result;
    }
    /** HasOwnProperty reads the retained own-location graph. Prototype and
     * static entry points keep their distinct conversion order in this plan. */
    private ownPropertyQuery(input:Cell,key:Cell,context:ts.Node,mode:"static"|"prototype"):Cell {
        let calls=this.ownPropertyQueries.get(context);if(!calls){calls=new Map();this.ownPropertyQueries.set(context,calls);}
        const signature=input.id+":"+key.id+":"+mode,prior=calls.get(signature);if(prior)return prior;
        const result=this.newCell(),keyInput=this.newCell(),objectInput=this.newCell();calls.set(signature,result);
        this.returnTransforms.set(result,{kind:"projection",inputs:[input,key],evaluate:inputs=>this.ownPropertyQuery(inputs[0]!,inputs[1]!,context,mode)});
        const converted=this.primitiveConversion(keyInput,context),objects=this.toObject(objectInput,context);
        // Only an unrepresented receiver (a possible Proxy) runs code during
        // [[GetOwnProperty]]; represented receivers sharing the cell do not
        // escape with it.
        const opaqueReceivers=this.newCell();
        if(mode==="static")this.copy(input,objectInput);else this.copy(key,keyInput);
        const normal=(cell:Cell):boolean=>[...cell.values].some(atom=>atom.tag!=="abrupt"&&atom.tag!=="pending-source");
        this.rule([objects],()=>{for(const atom of objects.values)if(atom.tag==="abrupt"||atom.tag==="pending-source")this.publish(result,atom);if(mode==="static"&&normal(objects))this.copy(key,keyInput);});
        let rule!:Rule;rule=this.rule([objects,converted],()=>{
            this.watchText(rule,converted);
            if(converted.values.nonempty&&!this.primitiveHasNormal(converted)){this.publish(result,this.abrupt);return;}
            for(const atom of converted.values)if(atom.tag==="abrupt"||atom.tag==="pending-source")this.publish(result,atom);
            if(!normal(converted))return;
            if(mode==="prototype")this.copy(input,objectInput);
            const names=new Set<SourcePropertyKey>();let unknownKey=false;
            for(const atom of converted.values){
                if(atom.tag==="primitive")names.add(typeof atom.value==="symbol"?atom.value:String(atom.value));
                else if(atom.tag!=="abrupt"&&atom.tag!=="pending-source")unknownKey=true;
            }
            const uncertain=()=>{this.publish(result,this.primitive(false));this.publish(result,this.primitive(true));};
            for(const atom of objects.values){
                if(atom.tag==="abrupt"||atom.tag==="pending-source")continue;
                const owner=this.ordinaryOwner(atom);
                if(owner)this.watch(rule,owner.shape);
                const algorithm=owner?.propertyAlgorithm;if(algorithm)this.watch(rule,algorithm);
                const known=owner&&(atom.tag==="global"||owner.ordinary||owner.boxed||algorithm?.values.has(this.primitive("ordinary"))&&!algorithm.values.has(this.primitive("opaque"))||["function","bound","intrinsic","operation","promise","promise-resolver"].includes(atom.tag));
                if(!known||owner.proxy){
                    uncertain();const caught=this.exceptionHandlers.get(context);if(caught)this.publish(caught,this.unknown);
                    if(owner?.proxy)this.proxyReadEffects(owner,null,"getOwnPropertyDescriptor",context);
                    // Only a Proxy runs code during [[GetOwnProperty]]; other
                    // represented objects with an unmodeled property algorithm
                    // (built-in prototypes, exotic objects) answer uncertainly
                    // and may throw, without an opaque effect or escape.
                    if(owner&&!owner.proxy)continue;
                    this.publish(opaqueReceivers,atom);
                    this.onActive(context,()=>{this.opaqueEffect(context);this.escapeCallableArgument(opaqueReceivers,context);});continue;
                }
                if(unknownKey){uncertain();continue;}
                for(const name of names){
                    this.stringField(owner,name);
                    if(owner.listLength&&name==="length"){this.publish(result,this.primitive(true));continue;}
                    if(this.opaqueShape(owner,context)||this.hasUnknownPropertyDefinitions(owner)){uncertain();continue;}
                    const presence=this.propertyPresence(owner,name,context);this.watch(rule,presence);
                    let inRange=true,outOfRange=false;
                    const index=typeof name==="string"?Number(name):NaN;
                    if(owner.listLength&&Number.isInteger(index)&&index>=0&&index<0xffffffff&&String(index)===name){
                        const length=this.captureRead(owner.listLength,context);this.watch(rule,length);inRange=false;
                        for(const value of length.values){
                            if(value.tag==="abrupt"||value.tag==="pending-source")continue;
                            if(value.tag==="primitive"){
                                let extent=NaN;try{extent=Number(value.value);}catch{}
                                if(Number.isInteger(extent)&&extent>=0&&extent<=0xffffffff){inRange||=index<extent;outOfRange||=index>=extent;continue;}
                            }
                            inRange=outOfRange=true;
                        }
                    }
                    if(presence.values.has(this.primitive(false))||outOfRange)this.publish(result,this.primitive(false));
                    if(presence.values.has(this.primitive(true))&&inRange)this.publish(result,this.primitive(true));
                }
            }
        });return result;
    }
    private ownDescriptors(base:Cell,key:Cell|null,context:ts.Node,result:Cell): void {
        let reads=this.descriptorReads.get(context);if(!reads){reads=new Map();this.descriptorReads.set(context,reads);}
        const identity=base.id+":"+(key?.id??"all"),prior=reads.get(identity);
        if(prior){this.copy(prior,result);return;}
        reads.set(identity,result);
        const records=new Map<ObjectOwner,Map<SourcePropertyKey,{value:Cell;owner:ObjectOwner}>>();
        const collection=this.descriptorOwner(context);
        if(!key)this.publish(result,{tag:"object",owner:collection});
        const handler=this.exceptionHandlers.get(context);
        let escaping=false;
        // [[GetOwnProperty]] runs code only on a Proxy or an unrepresented
        // object; an unknown key or attribute on a represented owner leaves
        // the result unknown without escaping the owner's callables.
        const opaqueBases=this.newCell();
        const incomplete=(atom?:Atom)=>{
            this.publish(result,this.unknown);if(handler)this.publish(handler,this.unknown);
            if(!atom)return;this.publish(opaqueBases,atom);
            if(!escaping){escaping=true;this.onActive(context,()=>this.escapeCallableArgument(opaqueBases,context));}
        };
        const escapeOpaqueBases=()=>{for(const atom of base.values){const owner=this.ordinaryOwner(atom);if(atom.tag==="unknown"||atom.tag==="opaque-object"||owner?.proxy)incomplete(atom);}};
        let rule!:Rule;
        rule=this.rule(key?[base,key]:[base],()=>{
            const keys=key?this.propertyKeys(key,rule,context):undefined;
            if(key && keys===undefined)return;
            if(key && keys===null){escapeOpaqueBases();incomplete();return;}
            for(const atom of base.values){
                if(atom.tag==="pending-source"||atom.tag==="abrupt"){this.publish(result,atom);continue;}
                if(atom.tag==="primitive"&&(atom.value===null||atom.value===undefined)){this.publish(result,this.abrupt);if(handler)this.publish(handler,this.nativeException(context!));continue;}
                if(atom.tag==="primitive"||atom.tag==="non-string"||atom.tag==="unknown-string"||atom.tag==="text-operation"){
                    // ToObject boxes the primitive (sec-object.getownpropertydescriptor);
                    // the wrapper owns nothing but a String's `length` and index keys.
                    if(!key){incomplete();continue;}
                    const text=atom.tag==="primitive"&&typeof atom.value==="string"?atom.value:null;
                    const stringLike=text!==null||atom.tag==="unknown-string"||atom.tag==="text-operation"||atom.tag==="non-string"&&!!((atom.kinds??(KIND_PRIMITIVE&~KIND_STRING))&KIND_STRING);
                    const virtual=(name:SourcePropertyKey)=>typeof name==="string"&&(name==="length"||/^(0|[1-9][0-9]*)$/.test(name));
                    if(keys!.some(name=>name===null)){incomplete();continue;}
                    for(const name of keys!){
                        if(name===null||!stringLike||!virtual(name)){this.publish(result,this.primitive(undefined));continue;}
                        // A String wrapper's `length` and in-range index keys are
                        // frozen data properties (sec-string-exotic-objects).
                        const value=this.newCell();
                        if(name==="length"){if(text!==null)this.publish(value,this.primitive(text.length));else this.publish(value,{tag:"non-string",kinds:KIND_NUMBER});}
                        else if(text!==null){const index=Number(name);if(index<text.length)this.publish(value,this.primitive(text[index]!));else{this.publish(result,this.primitive(undefined));continue;}}
                        else{this.publish(value,this.unknownString);this.publish(result,this.primitive(undefined));}
                        const descriptor=this.descriptorOwner(context);this.defineField(descriptor,"value",value);
                        for(const [attribute,flag] of [["writable",false],["enumerable",name!=="length"],["configurable",false]] as const){const cell=this.newCell();this.publish(cell,this.primitive(flag));this.defineField(descriptor,attribute,cell);}
                        const object=this.newCell();this.publish(object,{tag:"object",owner:descriptor});this.copy(object,result);
                    }
                    continue;
                }
                const owner=this.ordinaryOwner(atom);
                if(!owner){incomplete(atom);if(atom.tag==="unknown"||atom.tag==="opaque-object")this.activateOpaqueEffect(context);continue;}
                this.watch(rule,owner.shape);
                if(!this.definitionsReady(owner,rule))continue;
                if(this.opaqueShape(owner,context)||this.hasUnknownPropertyDefinitions(owner)){if(owner.proxy)incomplete(atom);incomplete();continue;}
                const names=key?keys!:this.ownerKeys(owner,rule);if(names===undefined)continue;if(names===null){incomplete();continue;}
                // Intrinsic/function metadata and exotic own-key collections
                // stay incomplete until represented by the shared owner graph.
                if(!key && atom.tag!=="object")incomplete();
                for(const name of names){
                    if(name===null){incomplete();continue;}
                    const presence=this.propertyPresence(owner,name,context);this.watch(rule,presence);
                    if(!presence.values.nonempty)continue;
                    const data=this.captureRead(this.dataProperty(owner,name),context);this.watch(rule,data);
                    const accessor=owner.accessors.get(name);
                    const present=presence.values.has(this.primitive(true));
                    if(!present && !data.values.nonempty && !accessor){
                        if(key && atom.tag==="object")this.publish(result,this.primitive(undefined));
                        continue;
                    }
                    if(key && presence.values.has(this.primitive(false)))this.publish(result,this.primitive(undefined));
                    let entries=records.get(owner);if(!entries){entries=new Map();records.set(owner,entries);}
                    let record=entries.get(name);
                    if(!record){
                        const descriptor=this.descriptorOwner(context);
                        const value=this.newCell();this.publish(value,{tag:"object",owner:descriptor});record={value,owner:descriptor};entries.set(name,record);
                        for(const attribute of ["enumerable","configurable"])this.defineBooleanField(descriptor,attribute);
                    }
                    if(accessor){
                        for(const kind of ["get","set"] as const){const value=this.captureRead(accessor[kind],context);this.watch(rule,value);this.defineField(record.owner,kind,value);}
                    }
                    if(data.values.nonempty || !accessor){
                        this.defineField(record.owner,"value",data);
                        this.defineBooleanField(record.owner,"writable");
                    }
                    if(key)this.copy(record.value,result);else {
                        this.copy(record.value,this.field(collection,name));
                        const location=this.ownPresence(collection,name);location.initial=true;this.publish(location.enumerable,this.primitive(true));
                        if(present)this.publish(location.facts,this.primitive(true));
                        if(presence.values.has(this.primitive(false)))this.publish(location.facts,this.primitive(false));
                    }
                }
            }
        });
    }
    private immutableGlobalBinding(key: string): boolean {
        const binding = runtimeGlobalBindings.get(key);
        return binding?.kind === "value" && !binding.writable && !binding.configurable;
    }
    private readonly childProcessOwners=new Map<boolean,Cell>();
    private readonly childProcessExports=new Map<string,Cell>();
    private childProcessExport(name:string):Cell {
        const prior=this.childProcessExports.get(name);if(prior)return prior;
        const value=this.newCell();this.childProcessExports.set(name,value);
        const descriptor=runtimeChildProcessOperations.get(name);
        if(!descriptor){this.publish(value,this.unknown);return value;}
        const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.callablePrototype("ordinary")};
        const length=this.newCell(),text=this.newCell();this.publish(length,this.primitive(descriptor.arity));this.publish(text,this.primitive(name));
        this.defineField(owner,"length",length,false);this.defineField(owner,"name",text,false);this.copy(this.opaqueMutation,owner.shape);
        this.publish(value,{tag:"builtin",name:"child_process:"+name,normalResult:descriptor.result==="CALLBACK"?"non-string":descriptor.result==="BYTES"?"unknown":"object",fields:owner});
        return value;
    }
    private childProcessModule(namespace:boolean):Cell {
        const prior=this.childProcessOwners.get(namespace);if(prior)return prior;
        const value=this.newCell(),owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),ordinary:!namespace,prototype:this.objectPrototype()};
        if(namespace){const prototype=this.newCell();this.publish(prototype,this.primitive(null));owner.prototype=prototype;}
        this.childProcessOwners.set(namespace,value);this.publish(value,{tag:"object",owner});
        for(const name of runtimeChildProcessOperations.keys())this.defineField(owner,name,this.childProcessExport(name));
        if(namespace)this.defineField(owner,"default",this.childProcessModule(false));
        this.copy(this.opaqueMutation,owner.shape);return value;
    }
    /** Imports and require project one native module descriptor collection.
     * Callable/export owners stay independent of mutable global bindings. */
    private readonly nativeModuleSources=new Map<string,{export:(name:string)=>Cell;module:(namespace:boolean)=>Cell}>([
        ["fs",{export:name=>this.fsExport(false,name),module:namespace=>this.fsModule(false,namespace)}],
        ["fs/promises",{export:name=>this.fsExport(true,name),module:namespace=>this.fsModule(true,namespace)}],
        ["util",{export:name=>this.utilExport(name),module:namespace=>this.utilModule(namespace)}],
        ["buffer",{export:name=>this.bufferModuleExport(name),module:namespace=>this.bufferModule(namespace)}],
        ["child_process",{export:name=>this.childProcessExport(name),module:namespace=>this.childProcessModule(namespace)}],
        ["timers",{export:name=>this.callbackTimerExport(name),module:namespace=>this.callbackTimerModule(namespace)}],
    ]);
    private readonly callbackTimerExports=new Map<string,Cell>();
    private readonly callbackTimerModules=new Map<boolean,Cell>();
    private nativeModuleSource(specifier:unknown) {
        return typeof specifier==="string"?this.nativeModuleSources.get(specifier.replace(/^node:/,"")):undefined;
    }
    private callbackTimerExport(name:string):Cell {
        const prior=this.callbackTimerExports.get(name);if(prior)return prior;
        const value=this.newCell();this.callbackTimerExports.set(name,value);
        if(runtimeCallbackTimerDescriptors.get(name)?.moduleExport)this.publish(value,this.operation(`callback-timer:${name}`));
        else this.publish(value,this.unknown);
        return value;
    }
    private callbackTimerModule(namespace:boolean):Cell {
        const prior=this.callbackTimerModules.get(namespace);if(prior)return prior;
        const value=this.newCell(),prototype=namespace?this.newCell():this.objectPrototype();
        if(namespace)this.publish(prototype,this.primitive(null));
        const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype,ordinary:true};
        this.callbackTimerModules.set(namespace,value);this.publish(value,{tag:"object",owner});
        for(const[name,descriptor]of runtimeCallbackTimerDescriptors)if(descriptor.moduleExport)this.defineField(owner,name,this.callbackTimerExport(name));
        if(namespace)this.defineField(owner,"default",this.callbackTimerModule(false));else this.copy(this.opaqueMutation,owner.shape);
        return value;
    }
    private readonly bufferModuleOwners=new Map<boolean,{value:Cell;owner:ObjectOwner}>();
    private readonly bufferModuleExports=new Map<string,Cell>();
    private bufferModuleExport(name:string):Cell {
        const prior=this.bufferModuleExports.get(name);if(prior)return prior;
        const value=this.newCell();this.bufferModuleExports.set(name,value);
        if(name==="Buffer"||name==="atob"||name==="btoa")this.copy(this.globalBinding(name),value);
        else if(name==="transcode"){
            const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.callablePrototype("ordinary")};
            const length=this.newCell(),text=this.newCell();this.publish(length,this.primitive(3));this.publish(text,this.primitive(name));
            this.defineField(owner,"length",length,false);this.defineField(owner,"name",text,false);this.copy(this.opaqueMutation,owner.shape);
            this.publish(value,{tag:"builtin",name:"buffer.transcode",normalResult:"object",fields:owner});
        }else this.publish(value,this.unknown);
        return value;
    }
    private bufferModule(namespace:boolean):Cell {
        const prior=this.bufferModuleOwners.get(namespace);if(prior)return prior.value;
        const value=this.newCell(),owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),ordinary:!namespace,prototype:this.objectPrototype()};
        if(namespace){const prototype=this.newCell();this.publish(prototype,this.primitive(null));owner.prototype=prototype;}
        this.bufferModuleOwners.set(namespace,{value,owner});this.publish(value,{tag:"object",owner});
        for(const name of runtimeBufferExports)this.defineField(owner,name,this.bufferModuleExport(name));
        if(namespace)this.defineField(owner,"default",this.bufferModule(false));
        this.copy(this.opaqueMutation,owner.shape);
        return value;
    }
    private fsExport(promises:boolean,name:string):Cell {
        const key=promises+":"+name,prior=this.fsExportValues.get(key);if(prior)return prior;
        const value=this.newCell();this.fsExportValues.set(key,value);
        if(!promises&&name==="promises")this.copy(this.fsModule(true,false),value);
        else if(promises&&name==="constants")this.copy(this.fsExport(false,name),value);
        else if(name==="constants") {
            const prototype=this.newCell();this.publish(prototype,this.primitive(null));
            const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype,ordinary:true};this.publish(value,{tag:"object",owner});
            for(const name of runtimeFsConstants){const constant=this.newCell();this.publish(constant,this.nonString);this.defineField(owner,name,constant,false);}
        }
        else {
            const fields:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.callablePrototype("ordinary")};
            this.copy(this.opaqueMutation,fields.shape);
            this.publish(value,{tag:"builtin",name:"fs:"+key,normalResult:"unknown",fields});
        }
        return value;
    }
    private fsModule(promises:boolean,namespace:boolean):Cell {
        const key=promises+":"+namespace,prior=this.fsModules.get(key);if(prior)return prior.value;
        const prototype=namespace?this.newCell():this.objectPrototype();if(namespace)this.publish(prototype,this.primitive(null));
        const value=this.newCell(),owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype,ordinary:true};
        this.fsModules.set(key,{value,owner});this.publish(value,{tag:"object",owner});
        if(!namespace)this.copy(this.opaqueMutation,owner.shape);
        for(const name of runtimeFsExports.get(promises?"promises":"sync")!)this.defineField(owner,name,this.fsExport(promises,name));
        this.defineField(owner,"constants",this.fsExport(false,"constants"));
        if(!promises){this.defineField(owner,"promises",this.fsExport(false,"promises"));this.defineField(owner,"Dirent",this.fsExport(false,"Dirent"));}
        if(namespace)this.defineField(owner,"default",this.fsModule(promises,false));
        return value;
    }
    private utilExport(name:string):Cell {
        const prior=this.utilExportValues.get(name);if(prior)return prior;
        const value=this.newCell();this.utilExportValues.set(name,value);
        if(name==="format")this.publish(value,this.operation("util-format"));
        else if(runtimeUtilExports.has(name)&&name!=="types")this.copy(this.globalBinding(name),value);
        else this.publish(value,this.unknown);
        return value;
    }
    private utilModule(namespace:boolean):Cell {
        const prior=this.utilModules.get(namespace);if(prior)return prior.value;
        const prototype=namespace?this.newCell():this.objectPrototype();
        if(namespace)this.publish(prototype,this.primitive(null));
        const value=this.newCell(),owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype,ordinary:true};
        this.utilModules.set(namespace,{value,owner});this.publish(value,{tag:"object",owner});
        // Opaque code can mutate the default object, but namespace export
        // binding locations cannot be replaced through that object.
        if(!namespace)this.copy(this.opaqueMutation,owner.shape);
        for(const name of runtimeUtilExports)this.defineField(owner,name,this.utilExport(name));
        if(namespace)this.defineField(owner,"default",this.utilModule(false));
        return value;
    }
    private newRealm():SourceRealmRecord {
        const realm={bindings:new Map(),operations:new Map(),intrinsics:new Map()} as unknown as SourceRealmRecord;
        Object.assign(realm,{global:{tag:"global",realm},record:{tag:"realm-record",realm}});
        return realm;
    }
    private realmObjectPrototype(realm:SourceRealmRecord):Cell {
        if(realm===this.currentRealm)return this.objectPrototype();
        if(!realm.objectPrototype){
            realm.objectPrototype=this.newCell();const prototype=this.newCell();this.publish(prototype,this.primitive(null));
            const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype,ordinary:true};
            this.publish(owner.shape,this.unknown);this.copy(this.opaqueMutation,owner.shape);this.publish(realm.objectPrototype,{tag:"object",owner});
        }
        return realm.objectPrototype;
    }
    private realmBinding(realm:SourceRealmRecord,key:string):Cell {
        if(realm===this.currentRealm)return this.globalBinding(key);
        let cell=realm.bindings.get(key);if(cell){if(realm.owner)this.attachField(realm.owner,key,cell);return cell;}
        cell=this.newCell();this.propertyLocations.add(cell);realm.bindings.set(key,cell);if(!this.immutableGlobalBinding(key))this.copy(this.globalMutation,cell);
        if(key==="globalThis")this.publish(cell,realm.global);
        else if(key==="$262")this.publish(cell,realm.record);
        else if(key==="eval")this.publish(cell,this.realmOperation(realm,"eval"));
        else if(key==="Function")this.publish(cell,this.intrinsic("constructor","ordinary",realm));
        else if(key==="undefined")this.publish(cell,this.primitive(undefined));
        else if(key==="NaN")this.publish(cell,this.primitive(NaN));
        else if(key==="Infinity")this.publish(cell,this.primitive(Infinity));
        // Another realm's remaining runtime bindings start as that realm's
        // intrinsics: native values, like an unmodelled builtin member here.
        else if(runtimeGlobalBindings.has(key))this.publish(cell,this.nativeUnknown);
        this.initialGlobalValues.set(cell,new Set(cell.values.ownValues()));
        if(realm.owner)this.attachField(realm.owner,key,cell);
        return cell;
    }
    private realmOperation(realm:SourceRealmRecord,operation:Operation):Atom {
        let atom=realm.operations.get(operation);
        if(!atom){atom={tag:"operation",operation,realm};realm.operations.set(operation,atom);}
        return atom;
    }
    private globalBinding(key: string): Cell {
        let cell = this.currentRealm.bindings.get(key);
        if (!cell) {
            cell = this.newCell();this.propertyLocations.add(cell);this.currentRealm.bindings.set(key,cell);
            if (!this.immutableGlobalBinding(key)) this.copy(this.globalMutation,cell);
            if(runtimeCallbackTimerDescriptors.has(key))this.publish(cell,this.operation(`callback-timer:${key}`));
            if (key === "fs") this.copy(this.fsModule(false,false),cell);
            if (key === "Function") this.publish(cell,this.intrinsic("constructor","ordinary"));
            if (key === "eval") this.publish(cell,this.realmOperation(this.currentRealm,"eval"));
            if (key === "require") this.publish(cell,this.operation("native-require"));
            if (key === "print") this.publish(cell,this.operation("host-print"));
            if (key === "globalThis") this.publish(cell,this.currentRealm.global);
            if (key === "$262") this.publish(cell,this.host);
            if (key === "undefined") this.publish(cell,this.primitive(undefined));
            if (key === "NaN") this.publish(cell,this.primitive(NaN));
            if (key === "Infinity") this.publish(cell,this.primitive(Infinity));
            const descriptor = runtimeGlobalBindings.get(key);
            if (descriptor?.normalResult && !cell.values.nonempty) {
                const fields: ObjectOwner = {fields:new Map(),accessors:new Map(),shape:this.newCell()};this.copy(this.opaqueMutation,fields.shape);
                for (const [name, operation] of INITIAL_SOURCE_OPERATIONS.get(key) ?? []) {
                    const value = this.newCell();this.publish(value,this.operation(operation));this.defineField(fields,name,value);
                }
                if(descriptor.kind==="function"){
                    // A global function (sec-function-properties-of-the-global-object)
                    // is an ordinary built-in function object whose own keys are
                    // exactly `length` and `name`; it inherits from %Function.prototype%.
                    const name=this.newCell(),length=this.newCell();
                    this.publish(name,this.primitive(key));this.publish(length,this.primitive(descriptor.length??0));
                    this.defineField(fields,"length",length,false);this.defineField(fields,"name",name,false);
                    fields.prototype=this.callablePrototype("ordinary");fields.closedOwn=true;fields.ordinary=true;
                }
                if(key==="String"||key==="Object"||key==="Reflect")for(const[operation,method]of SOURCE_NATIVE_METHODS)if(method.owner===key&&!INITIAL_SOURCE_OPERATIONS.get(key)?.has(method.name)){
                    const value=this.newCell();this.publish(value,this.operation(operation));this.defineField(fields,method.name,value,false);
                }
                if(key==="Math") {
                    fields.ordinary=true;fields.prototype=this.objectPrototype();
                    for(const name of runtimeMathMethods.keys()){const value=this.newCell();this.publish(value,this.operation(`math-member:${name}`));this.defineField(fields,name,value,false);}
                    const value=this.newCell();this.publish(value,this.primitive("Math"));this.defineField(fields,this.wellKnownSymbols.get("toStringTag")!,value,false);
                }
                if(key==="Atomics") {
                    fields.ordinary=true;fields.prototype=this.objectPrototype();
                    for(const name of runtimeAtomicsMethods.keys()){const value=this.newCell();this.publish(value,this.operation(`atomics-member:${name}`));this.defineField(fields,name,value,false);}
                    const value=this.newCell();this.publish(value,this.primitive("Atomics"));this.defineField(fields,this.wellKnownSymbols.get("toStringTag")!,value,false);
                }
                if(key==="JSON") {
                    fields.ordinary=true;
                    fields.prototype=this.objectPrototype();
                    const tag=this.wellKnownSymbols.get("toStringTag")!,value=this.newCell();
                    this.publish(value,this.primitive("JSON"));this.defineField(fields,tag,value);
                }
                if (descriptor.normalResult !== "not-callable") fields.prototype = this.callablePrototype("ordinary");
                if(runtimeErrorKinds.has(key)){this.defineField(fields,"prototype",this.errorPrototype(key));if(key!=="Error")fields.prototype=this.intrinsicErrorConstructor();}
                if(key==="Object")this.defineField(fields,"prototype",this.objectPrototype());
                if(key==="Array"){
                    this.defineField(fields,"prototype",this.arrayPrototype());
                    const getter=this.newCell();this.publish(getter,this.operation("species-getter"));
                    this.defineAccessor(fields,this.wellKnownSymbols.get("species")!,"get",getter);
                    this.ownPresence(fields,this.wellKnownSymbols.get("species")!).initial=true;
                }
                if(key==="Map"||key==="Set")this.defineField(fields,"prototype",this.collectionPrototype(key));
                if(key==="Promise"){
                    this.defineField(fields,"prototype",this.promisePrototype());
                    for(const [name,member]of runtimePromiseMethods)if(member.static){const value=this.newCell();this.publish(value,this.operation(`promise-member:${name}`));this.defineField(fields,name,value,false);}
                    const getter=this.newCell();this.publish(getter,this.operation("species-getter"));
                    this.defineAccessor(fields,this.wellKnownSymbols.get("species")!,"get",getter);
                    this.ownPresence(fields,this.wellKnownSymbols.get("species")!).initial=true;
                }
                if (key === "Buffer") {
                    for (const [name, descriptor] of bufferStaticDescriptors) {
                        const owner: ObjectOwner = {fields:new Map(),accessors:new Map(),shape:this.newCell()}, value = this.newCell(), length = this.newCell(), text = this.newCell();
                        this.copy(this.opaqueMutation, owner.shape);
                        owner.prototype = this.callablePrototype("ordinary");
                        this.publish(length, this.primitive(descriptor.length)); this.publish(text, this.primitive(name));
                        this.defineField(owner, "length", length, false); this.defineField(owner, "name", text, false);
                        this.publish(value, {tag:"builtin", name:`Buffer.${name}`, normalResult:descriptor.result === "boolean" ? "boolean" : descriptor.result === "buffer" ? "object" : "non-string", fields:owner});
                        this.defineField(fields, name, value, false);
                    }
                }
                if(key==="Iterator")this.defineField(fields,"prototype",this.iteratorPrototype());
                if(key==="RegExp")this.defineField(fields,"prototype",this.regexpPrototype(),false);
                if(runtimePrimitiveDescriptors.has(key))this.defineField(fields,"prototype",this.primitivePrototype(key),false);
                const element=runtimeTypedArrayDescriptors.get(key);
                if(element){
                    const width=this.newCell(),name=this.newCell(),length=this.newCell();this.publish(width,this.primitive(element.width));this.publish(name,this.primitive(key));this.publish(length,this.primitive(3));
                    this.defineField(fields,"BYTES_PER_ELEMENT",width,false);this.defineField(fields,"prototype",this.typedArrayPrototype(key,width),false);
                    this.defineField(fields,"name",name,false);this.defineField(fields,"length",length,false);
                }
                if(key==="Symbol") {
                    for (const [name, symbol] of this.wellKnownSymbols) {
                        const value = this.newCell(); this.publish(value, this.primitive(symbol)); this.defineField(fields, name, value);
                    }
                    for (const [name, operation] of [["for", "symbol-for"], ["keyFor", "symbol-key-for"]] as const) {
                        const value = this.newCell(); this.publish(value, this.operation(operation)); this.defineField(fields, name, value);
                    }
                }
                this.publish(cell, {tag:"builtin", name:key, normalResult:descriptor.normalResult,fields});
            }
            this.initialGlobalValues.set(cell,new Set(cell.values.ownValues()));
        }
        if(this.currentRealm.owner)this.attachField(this.currentRealm.owner,key,cell);
        return cell;
    }
    private readonly annexBVarBindings = new Map<ts.Node, Map<string, Cell>>();
    /** B.3.2.1: a reference the checker leaves unresolved may be the var
     * binding of a block-level function declaration of the enclosing
     * non-strict var scope: undefined until the declaration is evaluated,
     * the function object afterwards. */
    private annexBVarBinding(node: ts.Identifier): Cell | null {
        if (isStrictCodeContext(node)) return null;
        const root = annexBFunctionVarScope(node);
        if (ts.isSourceFile(root) && ecmaParseGoal(root) !== "script") return null;
        const declarations = annexBBlockFunctions(root).filter(declaration => declaration.name.text === node.text);
        if (!declarations.length) return null;
        let names = this.annexBVarBindings.get(root); if (!names) { names = new Map(); this.annexBVarBindings.set(root, names); }
        let cell = names.get(node.text);
        if (!cell) {
            cell = this.newCell(); names.set(node.text, cell);
            this.publish(cell, this.primitive(undefined));
            for (const declaration of declarations) this.copy(this.cell(declaration), cell);
        }
        return cell;
    }
    /** Under the Test262 host a name outside the runtime's global bindings,
     * the host's own names and the analysed scripts' declarations has no
     * binding; a property the program may have created on the global
     * object keeps the name resolvable. */
    private unresolvableHostName(name:string,realm=this.currentRealm):boolean {
        if(!this.test262Host||runtimeGlobalBindings.has(name)||TEST262_HOST_NAMES.has(name))return false;
        // Each Realm has its own global object: another Realm's properties
        // and declarations do not resolve the name.
        const owner=this.ordinaryOwner(realm.global);
        if(!owner)return true;
        // Every referenced global name has a field on the global object
        // owner (its binding cell); only a field with facts, an accessor or a
        // written unknown-key location is evidence of a property.
        const location=this.unknownPropertyLocations.get(owner),field=owner.fields.get(name);
        return !(field&&this.field(owner,name).values.nonempty)&&!owner.accessors.has(name)&&!owner.accessors.has(null)&&!(location&&location.value.values.nonempty);
    }
    /** An identifier the program evaluates and no enclosing forced
     * expression evaluates for it: neither a label nor a name inside a type
     * (an annotation, a type query, an implements clause), which is never
     * looked up at run time, nor a member access's base, which the access
     * reads itself (running a global getter there); a class's extends
     * expression is a value. */
    private valueReference(node: ts.Identifier): boolean {
        const parent = node.parent;
        if ((ts.isLabeledStatement(parent) || ts.isBreakOrContinueStatement(parent)) && parent.label === node) return false;
        if ((ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) && parent.expression === node) return false;
        for (let current: ts.Node = node; current.parent; current = current.parent) {
            const above = current.parent;
            if (ts.isExpressionWithTypeArguments(above) && ts.isHeritageClause(above.parent) && above.parent.token === ts.SyntaxKind.ExtendsKeyword && ts.isClassLike(above.parent.parent)) return true;
            if (ts.isTypeNode(above)) return false;
        }
        return true;
    }
    private isAmbientIdentifier(node: ts.Identifier): boolean {
        if(this.implicitArgumentsOwner(node))return false;
        if(this.evaluationGlobalTargets.has(node))return true;
        if(this.annexBVarBinding(node))return false;
        return !(this.bindingSymbol(node)?.declarations ?? []).some(declaration =>
            !isAmbientSourceDeclaration(declaration) && sourceDeclarationIntroducesBinding(declaration));
    }
    private regexpPrototypeCell:Cell|undefined;
    private readonly regexpData=new WeakMap<ObjectOwner,{readonly source:Cell;readonly flags:Cell}>();
    private readonly regexpResults=new Map<ts.Node,Map<string,Cell>>();
    private readonly regexpFlagReads=new Map<Cell,Map<string,Cell>>();
    private regexpPrototype():Cell {
        if(this.regexpPrototypeCell)return this.regexpPrototypeCell;
        const value=this.newCell();this.regexpPrototypeCell=value;
        const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype(),ordinary:true};
        this.sourceObjectOwners.add(owner);this.markPropertyAlgorithm(owner,"ordinary");this.copy(this.opaqueMutation,owner.shape);this.publish(value,{tag:"object",owner});
        this.defineField(owner,"constructor",this.globalBinding("RegExp"),false);
        for(const name of REGEXP_ACCESSORS){const getter=this.newCell();this.publish(getter,this.operation(`regexp-flag:${name}`));this.defineAccessor(owner,name,"get",getter);}
        for(const [name,descriptor] of REGEXP_METHODS){const method=this.newCell();this.publish(method,this.operation(`regexp-member:${name}`));this.defineField(owner,descriptor.symbol?this.wellKnownSymbols.get(name)!:name,method,false);}
        return value;
    }
    private regexpOwnerData(atom:Atom):{readonly source:Cell;readonly flags:Cell}|null {
        const owner=this.ordinaryOwner(atom);return owner?this.regexpData.get(owner)??null:null;
    }
    private numberValue():Atom {
        let value=this.numericValues.get(KIND_NUMBER);if(!value){value={tag:"non-string",kinds:KIND_NUMBER};this.numericValues.set(KIND_NUMBER,value);}return value;
    }
    /** The RegExp object a literal or construction site creates; repeated
     * evaluations share the site's owner like an object literal's. */
    private regexpInstance(context:ts.Node,source:Cell,flags:Cell):Cell {
        const owner=this.owner(context);
        const data=this.regexpData.get(owner);
        if(data){this.copy(source,data.source);this.copy(flags,data.flags);}
        else{
            if(!owner.prototype){owner.prototype=this.newCell();this.copy(this.regexpPrototype(),owner.prototype);}
            owner.ordinary=true;this.markPropertyAlgorithm(owner,"ordinary");
            if(!this.ownerCreations.has(owner))this.ownerCreations.set(owner,context);
            const lastIndex=this.newCell();this.publish(lastIndex,this.numberValue());this.defineField(owner,"lastIndex",lastIndex,false);
            const sourceCell=this.newCell(),flagsCell=this.newCell();this.copy(source,sourceCell);this.copy(flags,flagsCell);
            this.regexpData.set(owner,{source:sourceCell,flags:flagsCell});
        }
        const value=this.newCell();this.publish(value,{tag:"object",owner});return value;
    }
    /** Primitive texts of a cell mapped through `transform`; an incomplete
     * proof contributes an unknown string, an abrupt input its completion. */
    private derivedText(input:Cell,transform:(value:string)=>string|null):Cell {
        const output=this.newCell();let rule!:Rule;
        rule=this.rule([input],()=>{
            for(const atom of input.values)if(atom.tag==="abrupt"||atom.tag==="pending-source")this.publish(output,atom);
            const state=this.primitiveState(input,rule,true);
            if(state.pending&&!state.unresolved)return;
            for(const value of state.proof.values){const text=transform(String(value));if(text!==null)this.publish(output,this.primitive(text));}
            if(!state.proof.primitiveComplete)this.publish(output,this.unknownString);
        });
        return output;
    }
    /** RegExp(pattern, flags) and new RegExp: a RegExp pattern contributes its
     * source (and its flags when flags is undefined); other patterns and the
     * flags are ToString'd (user code on objects) and escaped/canonicalized.
     * The construction may throw a SyntaxError for an invalid pattern. */
    private regexpConstruct(pattern:Cell,flags:Cell,context:ts.Node,construct:boolean):Cell {
        let calls=this.regexpResults.get(context);if(!calls){calls=new Map();this.regexpResults.set(context,calls);}
        const signature="construct:"+pattern.id+":"+flags.id+":"+construct,prior=calls.get(signature);if(prior)return prior;
        const source=this.newCell(),flagText=this.newCell(),patternText=this.newCell(),flagsInput=this.newCell(),result=this.newCell();calls.set(signature,result);
        const instance=this.regexpInstance(context,source,flagText);this.copy(instance,result);
        const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context,"SyntaxError"));
        this.rule([pattern,flags],()=>{
            for(const atom of pattern.values){
                if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(result,atom);continue;}
                const data=this.regexpOwnerData(atom);
                if(data){
                    this.copy(data.source,source);
                    for(const flag of flags.values)if(flag===this.primitive(undefined))this.copy(data.flags,flagText);
                    if(!construct)this.publish(result,atom);
                    continue;
                }
                if(atom===this.primitive(undefined))this.publish(source,this.primitive("(?:)"));else this.publish(patternText,atom);
            }
            for(const atom of flags.values){if(atom===this.primitive(undefined))this.publish(flagText,this.primitive(""));else this.publish(flagsInput,atom);}
        });
        const [patternString,flagsString]=this.convertList([patternText,flagsInput],context,"text");
        this.copy(this.derivedText(flagsString!,canonicalRegExpFlags),flagText);
        this.copy(this.derivedText(patternString!,value=>escapeRegExpPattern(value,false)),source);
        return result;
    }
    /** A flag accessor read on a receiver: a RegExp instance answers from its
     * cells, %RegExp.prototype% answers "(?:)", "" and undefined, a primitive
     * or another object is a TypeError (`flags` on another object reads its
     * properties instead). */
    private regexpFlagRead(name:string,receiver:Cell,context:ts.Node):Cell {
        let reads=this.regexpFlagReads.get(receiver);if(!reads){reads=new Map();this.regexpFlagReads.set(receiver,reads);}
        const key=name+":"+(context.pos),prior=reads.get(key);if(prior)return prior;
        const result=this.newCell();reads.set(key,result);
        const handler=this.exceptionHandlers.get(context);const prototype=this.regexpPrototype();
        const fail=():void=>{this.publish(result,this.abrupt);if(handler)this.publish(handler,this.nativeException(context,"TypeError"));};
        this.rule([receiver],()=>{for(const atom of receiver.values){
            if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(result,atom);continue;}
            const data=this.regexpOwnerData(atom);
            if(data){
                if(name==="source")this.copy(data.source,result);
                else if(name==="flags")this.copy(data.flags,result);
                else this.copy(this.derivedFlag(data.flags,REGEXP_FLAG_LETTERS.get(name)!),result);
                continue;
            }
            const owner=this.ordinaryOwner(atom);
            if(owner&&[...prototype.values].some(value=>this.ordinaryOwner(value)===owner)){
                this.publish(result,name==="source"?this.primitive("(?:)"):name==="flags"?this.primitive(""):this.primitive(undefined));continue;
            }
            if(!owner&&atom.tag!=="unknown"&&atom.tag!=="opaque-object"){fail();continue;}
            // A native receiver's accessors are builtins or escaped callables.
            const bounded=atom===this.nativeUnknown;
            if(name==="flags"){this.publish(result,this.unknownString);if(!bounded)this.activateOpaqueEffect(context);if(handler)this.publish(handler,this.unknown);}
            else if(owner)fail();
            else{this.publish(result,bounded?this.nativeUnknown:this.unknown);if(!bounded)this.activateOpaqueEffect(context);if(handler)this.publish(handler,this.unknown);}
        }});
        return result;
    }
    private derivedFlag(flags:Cell,letter:string):Cell {
        let reads=this.regexpFlagReads.get(flags);if(!reads){reads=new Map();this.regexpFlagReads.set(flags,reads);}
        const prior=reads.get("letter:"+letter);if(prior)return prior;
        const output=this.newCell();reads.set("letter:"+letter,output);let rule!:Rule;
        rule=this.rule([flags],()=>{
            const state=this.primitiveState(flags,rule,true);
            if(state.pending&&!state.unresolved)return;
            for(const value of state.proof.values)this.publish(output,this.primitive(String(value).includes(letter)));
            if(!state.proof.primitiveComplete){this.publish(output,this.primitive(true));this.publish(output,this.primitive(false));}
        });
        return output;
    }
    /** A match result: an Array of unknown strings (or undefined for an
     * unmatched group) with index, input, groups and indices. */
    private regexpMatchResult(context:ts.Node,input:Cell):Cell {
        let calls=this.regexpResults.get(context);if(!calls){calls=new Map();this.regexpResults.set(context,calls);}
        const signature="match:"+input.id,prior=calls.get(signature);if(prior)return prior;
        const value=this.newCell();calls.set(signature,value);
        const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell()};this.arrayOwner(context,owner);
        const values=this.newCell(),indices=this.newCell(),length=this.newCell(),index=this.newCell(),groups=this.newCell(),groupValues=this.newCell(),nullPrototype=this.newCell(),indexList=this.newCell();
        this.publish(values,this.unknownString);this.publish(values,this.primitive(undefined));this.publish(indices,this.numberValue());this.publish(length,this.numberValue());this.publish(index,this.numberValue());
        this.defineField(owner,"length",length,false);this.defineField(owner,null,values,true,indices);this.defineField(owner,"index",index,true);this.defineField(owner,"input",input,true);
        const groupOwner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:nullPrototype,ordinary:true};
        this.publish(nullPrototype,this.primitive(null));this.sourceObjectOwners.add(groupOwner);this.markPropertyAlgorithm(groupOwner,"ordinary");this.ownerCreations.set(groupOwner,context);this.ownerMutation(groupOwner);
        this.publish(groupValues,this.unknownString);this.publish(groupValues,this.primitive(undefined));this.defineField(groupOwner,null,groupValues,true);
        this.publish(groups,this.primitive(undefined));this.publish(groups,{tag:"object",owner:groupOwner});this.defineField(owner,"groups",groups,true);
        this.publish(indexList,this.primitive(undefined));this.publish(indexList,this.opaqueObject);this.defineField(owner,"indices",indexList,true);
        this.publish(value,{tag:"object",owner});return value;
    }
    /** An Array of unknown strings (split results, global matches). */
    private regexpStringArray(context:ts.Node,signatureKey:string):Cell {
        let calls=this.regexpResults.get(context);if(!calls){calls=new Map();this.regexpResults.set(context,calls);}
        const prior=calls.get(signatureKey);if(prior)return prior;
        const values=this.newCell();this.publish(values,this.unknownString);
        const value=this.arrayOfValues(context,"regexp:"+signatureKey,values);calls.set(signatureKey,value);return value;
    }
    /** A fresh Array whose indexed elements are the values of one cell and
     * whose length is an unknown number: the result of a native that builds
     * an array from values the model already holds. */
    /** GetTemplateObject (sec-gettemplateobject): one frozen Array per site
     * whose elements are the cooked strings (undefined where an escape is
     * invalid) and whose non-enumerable, non-writable `raw` is a frozen Array
     * of the raw strings, CR and CRLF read as LF. Neither is ever mutated, so
     * no opaque effect reaches their fields. */
    private templateObject(node:ts.TaggedTemplateExpression):Cell {
        const prior=this.templateObjects.get(node);if(prior)return prior;
        const template=node.template;
        const parts:readonly ts.TemplateLiteralLikeNode[]=ts.isNoSubstitutionTemplateLiteral(template)?[template]:[template.head,...template.templateSpans.map(span=>span.literal)];
        const invalidEscape=(ts.TokenFlags as unknown as Readonly<Record<string,number|undefined>>).ContainsInvalidEscape;
        const valueCell=(...atoms:Atom[]):Cell=>{const cell=this.newCell();for(const atom of atoms)this.publish(cell,atom);return cell;};
        const frozenArray=(values:readonly Cell[]):{owner:ObjectOwner;cell:Cell}=>{
            const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell()};
            this.ownerCreations.set(owner,node);this.arrayOwner(node,owner);
            values.forEach((value,index)=>this.defineField(owner,String(index),value,true));
            this.publish(owner.listLength!,this.primitive(values.length));
            return {owner,cell:valueCell({tag:"object",owner})};
        };
        const cooked=parts.map(part=>{
            const flags=(part as ts.TemplateLiteralLikeNode&{readonly templateFlags?:number}).templateFlags;
            // Without the parser's escape flags the cooked value may be either.
            if(invalidEscape===undefined||flags===undefined)return valueCell(this.text(part.text),this.primitive(undefined));
            return valueCell(flags&invalidEscape?this.primitive(undefined):this.text(part.text));
        });
        const raw=parts.map(part=>part.rawText===undefined?valueCell(this.unknownString):valueCell(this.text(part.rawText.replace(/\r\n?/g,"\n"))));
        const strings=frozenArray(cooked),rawStrings=frozenArray(raw);
        this.defineField(strings.owner,"raw",rawStrings.cell,false);
        for(const owner of [strings.owner,rawStrings.owner]){for(const key of owner.fields.keys())this.markReadonly(owner,key);owner.immutableOwn=true;}
        this.templateObjects.set(node,strings.cell);
        return strings.cell;
    }
    private arrayOfValues(context:ts.Node,key:string,elements:Cell):Cell {
        let calls=this.freshArrays.get(context);if(!calls){calls=new Map();this.freshArrays.set(context,calls);}
        const prior=calls.get(key);if(prior)return prior;
        const value=this.newCell();calls.set(key,value);
        const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell()};this.arrayOwner(context,owner);
        const indices=this.newCell(),length=this.newCell();this.publish(indices,this.numberValue());this.publish(length,this.numberValue());
        this.defineField(owner,"length",length,false);this.defineField(owner,null,elements,true,indices);
        this.publish(value,{tag:"object",owner});return value;
    }
    /** A RegExp.prototype method (or a String method dispatching to one):
     * typed results without modelling the match itself; a replacer function
     * escapes as a callee; compile forgets the receiver's source and flags. */
    private regexpMember(name:string,receiver:Cell,args:readonly Cell[]|null,context:ts.Node,construct:boolean,sequenceValues?:Cell):Cell {
        let calls=this.regexpResults.get(context);if(!calls){calls=new Map();this.regexpResults.set(context,calls);}
        const signature="member:"+name+":"+receiver.id+":"+(args?args.map(cell=>cell.id).join(","):"null")+":"+construct,prior=calls.get(signature);if(prior)return prior;
        const result=this.newCell();calls.set(signature,result);
        const handler=this.exceptionHandlers.get(context);
        if(construct){this.publish(result,this.abrupt);if(handler)this.publish(handler,this.nativeException(context,"TypeError"));return result;}
        const omitted=this.newCell();this.publish(omitted,this.primitive(undefined));
        const first=args?.[0]??omitted,second=args?.[1]??omitted;
        const [text]=name==="toString"||name==="compile"?[first]:this.convertList([first],context,"text");
        if(name==="replace")this.escapeCallableArgument(second,context);
        if(name==="compile"){for(const input of this.convertList([first,second],context,"text"))this.watchText(this.rule([input],()=>{}),input);}
        // An unlisted argument sequence (spread, forwarded arguments) still
        // reaches only the method's own conversions: its values escape.
        if(!args){if(handler)this.publish(handler,this.unknown);this.onActive(context,()=>{if(sequenceValues)this.escapeCallableArgument(sequenceValues,context);else this.activateOpaqueEffect(context);});}
        if(handler)this.publish(handler,this.nativeException(context,"TypeError"));
        // RegExp.prototype.toString reads the receiver's source and flags
        // (user getters on another object run through the property graph)
        // and joins them once; the per-atom rule below only validates.
        if(name==="toString"){
            const slash=this.newCell();this.publish(slash,this.primitive("/"));
            const [sourceText,flagsText]=this.convertList([this.property(receiver,"source",context),this.property(receiver,"flags",context)],context,"text");
            this.publish(result,{tag:"text-operation",operation:"template",parts:[slash,sourceText!,slash,flagsText!]});
        }
        // RegExpBuiltinExec converts lastIndex (ToLength runs its valueOf);
        // RegExpExec (test, @@match, @@matchAll, @@replace, @@search) calls the
        // receiver's own or inherited exec when it is not the intrinsic one and
        // reads the result it returns; @@match, @@matchAll, @@replace and
        // @@split read flags; @@split constructs through the receiver's
        // constructor and @@species. An exec the analysis cannot see (an
        // unknown receiver's, or one an unknown effect may have replaced) is
        // not run here: reading it after this call's own unknown effect would
        // feed that effect back and widen every source. docs/todo.md records it.
        if(name!=="toString"&&name!=="compile"){
            this.coerceCell(this.property(receiver,"lastIndex",context),context,"length");
            if(name!=="exec"&&name!=="split"){
                const exec=this.property(receiver,"exec",context),callee=this.newCell(),returned=this.newCell();
                this.rule([exec],()=>{for(const atom of exec.values)
                    if(!(atom.tag==="operation"&&atom.operation==="regexp-member:exec")&&atom.tag!=="primitive"&&atom.tag!=="non-string"&&atom.tag!=="unknown-string"&&atom.tag!=="text-operation"&&atom.tag!=="unknown")this.publish(callee,atom);});
                this.invoke(context,callee,receiver,[{cell:text??omitted,spread:false}],returned);
                this.onActive(context,()=>this.escapeCallableArgument(returned,context,false,"argument"));
            }
            if(name==="match"||name==="matchAll"||name==="replace"||name==="split")this.property(receiver,"flags",context);
            if(name==="split")this.onActive(context,()=>this.escapeCallableArgument(receiver,context));
        }
        this.rule([receiver],()=>{for(const atom of receiver.values){
            if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(result,atom);continue;}
            const data=this.regexpOwnerData(atom),owner=this.ordinaryOwner(atom);
            if(name==="toString"){
                if(!owner&&atom.tag!=="unknown"&&atom.tag!=="opaque-object")this.publish(result,this.abrupt);
                continue;
            }
            if(!data){
                // A receiver without [[RegExpMatcher]] (RegExp.prototype itself, a
                // subclass instance the model cannot see): the method reads the
                // receiver's own and inherited members, so only code reachable
                // from the receiver and arguments runs; the result is native.
                if(owner||atom.tag==="unknown"||atom.tag==="opaque-object"){
                    this.publish(result,this.nativeUnknown);if(handler)this.publish(handler,this.unknown);
                    this.onActive(context,()=>{this.escapeCallableArgument(receiver,context);for(const argument of args??[])this.escapeCallableArgument(argument,context);});
                }
                else this.publish(result,this.abrupt);
                continue;
            }
            switch(name){
                case "test":this.publish(result,this.primitive(true));this.publish(result,this.primitive(false));break;
                case "exec":case "match":this.publish(result,this.primitive(null));this.copy(this.regexpMatchResult(context,text!),result);if(name==="match")this.copy(this.regexpStringArray(context,"matches"),result);break;
                case "compile":this.publish(data.source,this.unknownString);this.publish(data.flags,this.unknownString);this.copy(receiver,result);break;
                case "search":this.publish(result,this.numberValue());break;
                case "split":this.copy(this.regexpStringArray(context,"split"),result);break;
                case "replace":this.publish(result,this.unknownString);break;
                case "matchAll":this.publish(result,this.opaqueObject);break;
                default:this.publish(result,this.unknown);this.activateOpaqueEffect(context);
            }
        }});
        return result;
    }
    private collectionPrototype(kind:CollectionKind):Cell {
        const prior=this.collectionPrototypes.get(kind);if(prior)return prior;
        const value=this.newCell(),owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype(),ordinary:true};
        this.collectionPrototypes.set(kind,value);this.publish(value,{tag:"object",owner});this.copy(this.opaqueMutation,owner.shape);
        this.defineField(owner,"constructor",this.globalBinding(kind));
        const tag=this.newCell();this.publish(tag,this.primitive(kind));this.defineField(owner,this.wellKnownSymbols.get("toStringTag")!,tag,false);
        let values:Cell|undefined;
        for(const descriptor of runtimeCollectionMethods.values()){
            if(descriptor.mapOnly&&kind!=="Map"||kind==="Set"&&descriptor.operation==="KEYS")continue;
            const method=this.newCell();this.publish(method,this.operation(`collection-member:${kind}:${descriptor.operation}`));
            const name=descriptor.operation==="WRITE"?(kind==="Map"?"set":"add"):descriptor.name;
            if(descriptor.operation==="SIZE")this.defineAccessor(owner,name,"get",method);else this.defineField(owner,name,method);
            if(descriptor.operation==="VALUES")values=method;
            if(descriptor.operation===(kind==="Map"?"ENTRIES":"VALUES"))this.defineField(owner,this.wellKnownSymbols.get("iterator")!,method);
        }
        if(kind==="Set"){
            if(values)this.defineField(owner,"keys",values);
            for(const [name,operation]of runtimeSetCompositionMethods){const value=this.newCell();this.publish(value,this.operation(`set-composition:${operation}`));this.defineField(owner,name,value);}
        }
        return value;
    }
    private collectionKey(input:Cell):Cell {
        const prior=this.collectionKeys.get(input);if(prior)return prior;
        const result=this.newCell();this.collectionKeys.set(input,result);let rule!:Rule;
        rule=this.rule([input],()=>{
            const state=this.primitiveState(input,rule,true);
            for(const value of state.proof.values)this.publish(result,this.primitive(typeof value==="number"&&value===0?0:value));
            for(const atom of input.values)if(atom.tag!=="primitive"&&atom.tag!=="text-operation")this.publish(result,atom);
            if(!state.proof.primitiveComplete)for(const atom of input.values)if(atom.tag==="text-operation")this.publish(result,atom);
        });return result;
    }
    private collectionWrite(record:SourceCollectionRecord,key:Cell,value:Cell):void {
        const signature=key.id+":"+value.id;if(record.entries.has(signature))return;
        const entry={key,value};record.entries.set(signature,entry);this.publish(record.changes,{tag:"descriptor",identity:entry});
    }
    private collectionPair(key:Cell,value:Cell,context:ts.Node):Cell {
        const result=this.newCell(),owner=this.arrayOwner(context);
        const node=ts.setTextRange(ts.factory.createArrayLiteralExpression(),context);(node as ts.Node&{parent:ts.Node}).parent=context;
        this.literalLists.set(owner,{node,parts:[{cell:key,spread:false},{cell:value,spread:false}],holes:new Set()});
        this.defineField(owner,"0",key);this.defineField(owner,"1",value);this.publish(owner.listLength!,this.primitive(2));this.publish(result,{tag:"object",owner});return result;
    }
    private constructCollection(kind:CollectionKind,input:Cell,context:ts.Node,newTarget:Cell):Cell {
        let calls=this.collectionConstruction.get(context);if(!calls){calls=new Map();this.collectionConstruction.set(context,calls);}
        const signature=kind+":"+input.id+":"+newTarget.id,prior=calls.get(signature);if(prior)return prior;
        const result=this.newCell(),owner=this.owner(context);calls.set(signature,result);owner.collections??=new Map();
        let record=owner.collections.get(kind);if(!record){record={kind,entries:new Map(),changes:this.newCell(),shape:this.newCell()};owner.collections.set(kind,record);this.copy(this.opaqueMutation,record.shape);if(this.nativeAliasOwners.has(owner))this.copy(this.nativeAliasMutation,record.shape);this.publish(owner.shape,{tag:"descriptor",identity:record});}
        owner.prototype??=this.newCell();const prototype=this.property(newTarget,"prototype",context),fallback=this.collectionPrototype(kind);
        this.rule([prototype],()=>{for(const atom of prototype.values){if(this.ordinaryOwner(atom)||atom.tag==="unknown"||atom.tag==="opaque-object")this.publish(owner.prototype!,atom);else if(atom.tag!=="abrupt"&&atom.tag!=="pending-source")this.copy(fallback,owner.prototype!);}});
        this.publish(result,{tag:"object",owner});
        const iterable=this.newCell();let opened=false;
        this.rule([input],()=>{
            for(const atom of input.values)if(atom!==this.primitive(null)&&atom!==this.primitive(undefined))this.publish(iterable,atom);
            if(opened||!iterable.values.nonempty)return;opened=true;
            const elements=this.iteratorElements(iterable,context),adder=this.property(result,kind==="Map"?"set":"add",context);
            if(kind==="Set")this.invoke(context,adder,result,[{cell:elements,spread:false}],this.newCell());
            else {
                const entries=new Map<Atom,Cell>();
                this.rule([elements],()=>{for(const atom of elements.values){
                    if(atom.tag==="abrupt"||atom.tag==="pending-source")continue;
                    if(!this.ordinaryOwner(atom)){if(atom.tag==="unknown"||atom.tag==="opaque-object")this.publish(record!.shape,this.unknown);else{this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));}continue;}
                    if(entries.has(atom))continue;const entry=this.newCell();entries.set(atom,entry);this.publish(entry,atom);
                    this.invoke(context,adder,result,[{cell:this.property(entry,"0",context),spread:false},{cell:this.property(entry,"1",context),spread:false}],this.newCell());
                }});
            }
        });
        return result;
    }
    private collectionView(receiver:Cell,kind:CollectionKind,operation:string,context:ts.Node):{elements:Cell;activity:Cell} {
        let contexts=this.collectionViews.get(receiver);if(!contexts){contexts=new Map();this.collectionViews.set(receiver,contexts);}
        let views=contexts.get(context);if(!views){views=new Map();contexts.set(context,views);}const signature=kind+":"+operation,prior=views.get(signature);if(prior)return prior;
        const elements=this.newCell(),activity=this.newCell();views.set(signature,{elements,activity});let rule!:Rule;
        rule=this.rule([receiver],()=>{for(const atom of receiver.values){
            const record=this.ordinaryOwner(atom)?.collections?.get(kind);
            if(!record){if(atom.tag==="unknown"||atom.tag==="opaque-object"){this.publish(elements,this.unknown);this.publish(activity,this.primitive(true));this.publish(activity,this.primitive(false));}else this.publish(elements,this.abrupt);continue;}
            this.watch(rule,record.changes);this.watch(rule,record.shape);
            if(this.opaqueShape({fields:new Map(),accessors:new Map(),shape:record.shape},context)){this.publish(elements,this.unknown);this.publish(activity,this.primitive(true));this.publish(activity,this.primitive(false));}
            this.publish(activity,this.primitive(record.entries.size>0));
            for(const entry of record.entries.values()){
                if(operation==="ENTRIES"){entry.pair??=this.collectionPair(entry.key,entry.value,context);this.copy(entry.pair,elements);}
                else this.copy(operation==="KEYS"?entry.key:entry.value,elements);
            }
        }});return {elements,activity};
    }
    private collectionIterator(receiver:Cell,kind:CollectionKind,operation:string,context:ts.Node):Cell {
        let contexts=this.collectionIterators.get(receiver);if(!contexts){contexts=new Map();this.collectionIterators.set(receiver,contexts);}
        let methods=contexts.get(context);if(!methods){methods=new Map();contexts.set(context,methods);}const key=kind+":"+operation,prior=methods.get(key);if(prior)return prior;
        let prototype=this.collectionIteratorPrototypes.get(kind);
        if(!prototype){prototype=this.newCell();this.collectionIteratorPrototypes.set(kind,prototype);const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.iteratorPrototype()};this.copy(this.opaqueMutation,owner.shape);this.publish(prototype,{tag:"object",owner});const next=this.newCell();this.publish(next,this.operation(`collection-iterator:${kind}:next`));this.defineField(owner,"next",next);const tag=this.newCell();this.publish(tag,this.primitive(kind+" Iterator"));this.defineField(owner,this.wellKnownSymbols.get("toStringTag")!,tag,false);}
        const value=this.newCell(),owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype,collectionIterator:{kind,...this.collectionView(receiver,kind,operation,context)}};methods.set(key,value);this.copy(this.opaqueMutation,owner.shape);
        const self=this.newCell();this.publish(self,this.operation("collection-iterator:self"));this.defineField(owner,this.wellKnownSymbols.get("iterator")!,self);
        this.publish(value,{tag:"object",owner});return value;
    }
    private collectionIteratorNext(receiver:Cell,kind:CollectionKind|"Array",context:ts.Node,result:Cell):void {
        const results=new Map<ObjectOwner,{normal:Cell;done:Cell}>(),activated=new Set<ObjectOwner>();let rule!:Rule;
        rule=this.rule([receiver],()=>{for(const atom of receiver.values){const owner=this.ordinaryOwner(atom),view=owner?.collectionIterator;
            if(!owner||!view||view.kind!==kind){const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));this.publish(result,atom.tag==="unknown"||atom.tag==="opaque-object"?this.unknown:this.abrupt);continue;}
            if(view.kind==="Array"&&view.source&&!activated.has(owner)){activated.add(owner);const actual=this.arrayIterationView(view.source,context,view.operation!);this.copy(actual.elements,view.elements);this.copy(actual.activity,view.activity);}
            this.watch(rule,view.activity);this.watch(rule,view.elements);
            let records=results.get(owner);if(!records){const make=(done:boolean)=>{const record=this.newCell(),fields:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype()},state=this.newCell(),value=this.newCell();this.publish(state,this.primitive(done));if(done)this.publish(value,this.primitive(undefined));else this.copy(view.elements,value);this.defineField(fields,"done",state);this.defineField(fields,"value",value);this.publish(record,{tag:"object",owner:fields});return record;};records={normal:make(false),done:make(true)};results.set(owner,records);}
            this.copy(records.done,result);if(view.activity.values.has(this.primitive(true)))this.copy(records.normal,result);
        }});
    }
    private collectionMember(kind:CollectionKind,operation:string,receiver:Cell,args:readonly Cell[]|null,context:ts.Node,result:Cell,construct:boolean):void {
        if(construct){this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));return;}
        const omitted=this.newCell();this.publish(omitted,this.primitive(undefined));const key=this.collectionKey(args?.[0]??omitted),value=kind==="Map"?(args?.[1]??omitted):key;
        const producedByRecord=new Map<SourceCollectionRecord,Cell>();
        const callbacksByEntry=new Set<object>();
        let rule!:Rule;
        rule=this.rule([receiver,key],()=>{for(const atom of receiver.values){
            const record=this.ordinaryOwner(atom)?.collections?.get(kind);
            if(!record){if(atom.tag==="unknown"||atom.tag==="opaque-object"){this.publish(result,this.unknown);this.opaqueEffect(context);}else this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));continue;}
            this.watch(rule,record.changes);this.watch(rule,record.shape);
            if(this.opaqueShape({fields:new Map(),accessors:new Map(),shape:record.shape},context))this.publish(result,this.unknown);
            if(!args){this.publish(result,this.unknown);this.publish(record.shape,this.unknown);return;}
            if(operation==="WRITE"){this.collectionWrite(record,key,value);this.copy(receiver,result);continue;}
            if(operation==="CLEAR"||operation==="DELETE"){
                // Removed entry alternatives remain in the monotone source
                // domain until activation versions can distinguish them.
                this.publish(result,operation==="CLEAR"?this.primitive(undefined):this.primitive(true));if(operation==="DELETE")this.publish(result,this.primitive(false));continue;
            }
            if(operation==="HAS"){this.publish(result,this.primitive(true));this.publish(result,this.primitive(false));continue;}
            if(operation==="SIZE"){this.publish(result,this.nonString);continue;}
            if(operation==="FOR_EACH"){
                for(const entry of record.entries.values())if(!callbacksByEntry.has(entry)){callbacksByEntry.add(entry);this.invoke(context,key,args[1]??omitted,[{cell:entry.value,spread:false},{cell:entry.key,spread:false},{cell:receiver,spread:false}],this.newCell());}this.publish(result,this.primitive(undefined));continue;
            }
            if(operation==="GET"||operation==="GET_OR_INSERT"||operation==="GET_OR_INSERT_COMPUTED"){
                for(const entry of record.entries.values()){
                    const left=this.primitiveState(entry.key,rule,true),right=this.primitiveState(key,rule,true);
                    const same=(a:Primitive,b:Primitive)=>a===b||typeof a==="number"&&typeof b==="number"&&Number.isNaN(a)&&Number.isNaN(b);
                    const scalar=left.proof.values.some(a=>right.proof.values.some(b=>same(a,b)));
                    const identity=[...entry.key.values].some(a=>[...key.values].some(b=>a===b||!!this.ordinaryOwner(a)&&this.ordinaryOwner(a)===this.ordinaryOwner(b)));
                    if(scalar||identity||!left.proof.primitiveComplete||!right.proof.primitiveComplete)this.copy(entry.value,result);
                }
                if(operation==="GET")this.publish(result,this.primitive(undefined));
                else if(operation==="GET_OR_INSERT"){this.copy(value,result);this.collectionWrite(record,key,value);}
                else {let produced=producedByRecord.get(record);if(!produced){produced=this.newCell();producedByRecord.set(record,produced);this.invoke(context,args[1]??omitted,omitted,[{cell:key,spread:false}],produced);}this.copy(produced,result);this.collectionWrite(record,key,produced);}
                continue;
            }
            if(operation==="KEYS"||operation==="VALUES"||operation==="ENTRIES"){
                // Ordinary iterator owners keep mutable next/return lookup in
                // the same protocol graph as other iterable sources.
                this.copy(this.collectionIterator(receiver,kind,operation,context),result);continue;
            }
            this.publish(result,this.unknown);this.opaqueEffect(context);
        }});
    }
    private callableValidity(input:Cell,context:ts.Node):Cell {
        const result=this.newCell();let rule!:Rule;
        rule=this.rule([input],()=>{const pending=[input],visited=new Set<Cell>();while(pending.length){const cell=pending.pop()!;if(visited.has(cell))continue;visited.add(cell);this.watch(rule,cell);for(const atom of cell.values){
            const proxy=this.ordinaryOwner(atom)?.proxy;if(proxy){pending.push(proxy.target);continue;}
            // Bound owners carry the successful target-callability witness;
            // their own [[Call]] slot does not depend on a later target read.
            if(atom.tag==='function'||atom.tag==='bound'||atom.tag==='operation'||atom.tag==='promise-resolver'||atom.tag==='builtin'&&atom.normalResult!=='not-callable'||atom.tag==='intrinsic'&&(atom.domain==='constructor'||atom.domain==='prototype'&&atom.kind==='ordinary'))this.publish(result,this.primitive(true));
            else if(atom.tag==='unknown'||atom.tag==='opaque-object'){this.publish(result,this.primitive(true));this.publish(result,this.primitive(false));}
            else if(atom.tag!=='pending-source'&&atom.tag!=='abrupt')this.publish(result,this.primitive(false));
        }}});return result;
    }
    /** Keep the actual callable identities separate from invalid alternatives.
     * Metadata and prototype reads belong only to the successful IsCallable
     * branch, including when a binding also has a hoisted undefined value. */
    private callableTarget(input:Cell,context:ts.Node):{callable:Cell;completion:Cell} {
        let contexts=this.callableTargets.get(input);
        if(!contexts){contexts=new Map();this.callableTargets.set(input,contexts);}
        const previous=contexts.get(context);if(previous)return previous;
        const record={callable:this.newCell(),completion:this.newCell()},seen=new Set<Atom>();contexts.set(context,record);
        this.rule([input],()=>{for(const atom of input.values){
            if(seen.has(atom))continue;seen.add(atom);
            if(atom.tag==='abrupt'||atom.tag==='pending-source'){this.publish(record.completion,atom);continue;}
            const value=this.newCell();this.publish(value,atom);
            const valid=this.callableValidity(value,context);
            this.rule([valid],()=>{
                if(valid.values.has(this.primitive(true)))this.publish(record.callable,atom);
                if(valid.values.has(this.primitive(false))){
                    this.publish(record.completion,this.abrupt);
                    const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));
                }
            });
        }});
        return record;
    }
    private setLikeRecord(input:Cell,context:ts.Node):SourceSetLikeRecord {
        let contexts=this.setLikeRecords.get(input);if(!contexts){contexts=new Map();this.setLikeRecords.set(input,contexts);}const prior=contexts.get(context);if(prior)return prior;
        const record:SourceSetLikeRecord={object:this.newCell(),size:this.newCell(),has:this.newCell(),keys:this.newCell(),normal:this.newCell()};contexts.set(context,record);
        const fail=()=>{const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));};
        this.rule([input],()=>{for(const atom of input.values){if(this.ordinaryOwner(atom)||atom.tag==='unknown'||atom.tag==='opaque-object')this.publish(record.object,atom);else if(atom.tag!=='abrupt'&&atom.tag!=='pending-source')fail();}});
        const size=this.coerceCell(this.property(record.object,'size',context),context,'number');this.copy(size,record.size);
        let sizeOpened=false;let sizes!:Rule;sizes=this.rule([size],()=>{
            const state=this.primitiveState(size,sizes,true);if(state.pending&&!state.unresolved)return;
            const valid=state.proof.values.some(value=>typeof value==='number'&&!Number.isNaN(value)&&Math.trunc(value)>=0);
            if(state.proof.values.some(value=>typeof value!=='number'||Number.isNaN(value)||Math.trunc(value)<0))fail();
            if(sizeOpened||!valid&&state.proof.primitiveComplete)return;sizeOpened=true;
            const has=this.property(record.object,'has',context),hasValid=this.callableValidity(has,context);this.copy(has,record.has);
            let hasOpened=false;this.rule([hasValid],()=>{if(hasValid.values.has(this.primitive(false)))fail();if(hasOpened||!hasValid.values.has(this.primitive(true)))return;hasOpened=true;
                const keys=this.property(record.object,'keys',context),keysValid=this.callableValidity(keys,context);this.copy(keys,record.keys);
                this.rule([keysValid],()=>{if(keysValid.values.has(this.primitive(false)))fail();if(keysValid.values.has(this.primitive(true)))this.publish(record.normal,this.primitive(true));});
            });
        });return record;
    }
    private setComposition(operation:string,receiver:Cell,input:Cell,context:ts.Node,result:Cell):void {
        const branded=this.newCell();this.rule([receiver],()=>{for(const atom of receiver.values){if(this.ordinaryOwner(atom)?.collections?.has('Set'))this.publish(branded,atom);else {if(atom.tag==='unknown'||atom.tag==='opaque-object'){this.publish(branded,atom);this.publish(result,this.unknown);this.opaqueEffect(context);}const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));}}});
        const accepted=this.newCell();this.rule([branded],()=>{if(branded.values.nonempty)this.copy(input,accepted);});
        const other=this.setLikeRecord(accepted,context),predicate=['SUBSET','SUPERSET','DISJOINT'].includes(operation);
        const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.collectionPrototype('Set')};
        const output:SourceCollectionRecord={kind:'Set',entries:new Map(),changes:this.newCell(),shape:this.newCell()};owner.collections=new Map([['Set',output]]);this.copy(this.opaqueMutation,output.shape);
        const source=this.collectionView(branded,'Set','VALUES',context),seen=new Set<SourceCollectionRecord>();let opened=false;
        let rule!:Rule;rule=this.rule([branded,other.normal,source.elements,source.activity],()=>{
            if(!branded.values.nonempty||!other.normal.values.has(this.primitive(true)))return;
            if(predicate){this.publish(result,this.primitive(true));this.publish(result,this.primitive(false));}else this.publish(result,{tag:'object',owner});
            for(const atom of branded.values){const record=this.ordinaryOwner(atom)?.collections?.get('Set');if(!record)continue;this.watch(rule,record.changes);this.watch(rule,record.shape);
                if(this.opaqueShape({fields:new Map(),accessors:new Map(),shape:record.shape},context))this.publish(output.shape,this.unknown);
                if(!predicate)for(const entry of record.entries.values())this.collectionWrite(output,entry.key,entry.value);
                if(source.activity.values.has(this.primitive(true))&&['INTERSECTION','DIFFERENCE','SUBSET','DISJOINT'].includes(operation)&&!seen.has(record)){seen.add(record);this.invoke(context,other.has,other.object,[{cell:source.elements,spread:false}],this.newCell());}
            }
            if(opened||operation==='SUBSET')return;opened=true;
            const iterator=this.newCell();this.invoke(context,other.keys,other.object,[],iterator);const elements=this.directIteratorElements(iterator,context);if(['SUPERSET','DISJOINT'].includes(operation))this.iteratorCloseEffects(elements,context);
            if(!predicate){const entries=new Map<Atom,Cell>();this.rule([elements],()=>{for(const atom of elements.values){if(atom.tag==='unknown'||atom.tag==='opaque-object')this.publish(output.shape,this.unknown);else if(atom.tag!=='abrupt'&&atom.tag!=='pending-source'&&!entries.has(atom)){const value=this.newCell();entries.set(atom,value);this.publish(value,atom);const canonical=this.collectionKey(value);this.collectionWrite(output,canonical,canonical);}}});}
        });
    }
    private functionThisBinding(owner:FunctionOwner,receiver:Cell,context:ts.Node):Cell {
        if(receiver===this.empty){if(!this.undefinedCallReceiver){this.undefinedCallReceiver=this.newCell();this.publish(this.undefinedCallReceiver,this.primitive(undefined));}receiver=this.undefinedCallReceiver;}
        if(!owner.node||ts.isArrowFunction(owner.node)||isStrictCodeContext(owner.definition))return receiver;
        let inputs=this.functionThisBindings.get(owner);if(!inputs){inputs=new Map();this.functionThisBindings.set(owner,inputs);}const prior=inputs.get(receiver);if(prior)return prior;
        const result=this.newCell(),objects=this.newCell();inputs.set(receiver,result);
        const conversion=ts.setTextRange(ts.factory.createEmptyStatement(),context);(conversion as ts.Node&{parent:ts.Node}).parent=context;
        const atoms=new Map<Atom,Cell>();
        this.rule([receiver],()=>{for(const atom of receiver.values){
            if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(result,atom);continue;}
            if(atom.tag==="unknown"){this.publish(result,this.global);this.publish(objects,atom);continue;}
            let value=atoms.get(atom);if(!value){value=this.newCell();atoms.set(atom,value);this.publish(value,atom);}
            const kinds=this.primitiveKinds(value);
            if(kinds&(KIND_NULL|KIND_UNDEFINED))this.publish(result,this.global);
            if(kinds&~(KIND_NULL|KIND_UNDEFINED))this.publish(objects,atom);
        }});
        this.copy(this.objectValue(objects,conversion),result);return result;
    }
    /** The one known string value of a represented field, or undefined. */
    private singleStringField(owner:ObjectOwner|null|undefined,key:string,rule:Rule):string|undefined {
        const field=owner?.fields.get(key);if(!field)return undefined;this.watch(rule,field);
        const values=[...field.values];
        return values.length===1&&values[0]!.tag==="primitive"&&typeof values[0]!.value==="string"?values[0]!.value:undefined;
    }
    private logicalLeftSelects(atom: Atom, operator: ts.SyntaxKind): boolean {
        const and = operator === ts.SyntaxKind.AmpersandAmpersandToken, or = operator === ts.SyntaxKind.BarBarToken;
        switch (atom.tag) {
            case "abrupt": case "pending-source": case "unknown": case "text-operation": return true;
            case "primitive": { const value = atom.value; return and ? !value : or ? !!value : value === null || value === undefined; }
            case "non-string": { const kinds = atom.kinds ?? (KIND_PRIMITIVE & ~KIND_STRING); return and ? !!(kinds & KIND_PRIMITIVE) : or ? !!(kinds & ~(KIND_UNDEFINED | KIND_NULL)) : !!(kinds & (KIND_UNDEFINED | KIND_NULL)); }
            case "unknown-string": return and || or;
            default: return or;
        }
    }
    /** %Error% itself: the [[Prototype]] of every NativeError constructor is
     * the intrinsic object (sec-properties-of-the-nativeerror-constructors),
     * not the mutable global `Error` binding, which a script may overwrite. */
    private intrinsicErrorConstructor():Cell {
        const realm=this.currentRealm;let cell=this.intrinsicErrorConstructors.get(realm);
        if(!cell){
            cell=this.newCell();this.intrinsicErrorConstructors.set(realm,cell);
            const binding=this.globalBinding("Error"),atom=[...binding.values].find(value=>value.tag==="builtin"&&value.name==="Error");
            if(atom)this.publish(cell,atom);else this.copy(binding,cell);
        }
        return cell;
    }
    private readonly intrinsicErrorConstructors=new Map<SourceRealmRecord,Cell>();
    private callablePrototype(kind: DynamicFunctionKind): Cell {
        let cell = this.callablePrototypes.get(kind);
        if (!cell) {
            cell = this.newCell(); this.callablePrototypes.set(kind, cell);
            this.publish(cell, this.intrinsic("prototype", kind));
        }
        return cell;
    }
    private errorPrototype(name:string):Cell {
        let value=this.errorPrototypes.get(name);if(value)return value;
        value=this.newCell();this.errorPrototypes.set(name,value);
        const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:name==="Error"?this.objectPrototype():this.errorPrototype("Error")};
        this.copy(this.opaqueMutation,owner.shape);this.copy(this.globalMutation,owner.shape);this.publish(value,{tag:"object",owner});
        const spelling=this.newCell();this.publish(spelling,this.primitive(name));this.defineField(owner,"name",spelling);
        this.defineField(owner,"constructor",this.globalBinding(name));
        if(name==="Error"){
            const message=this.newCell(),method=this.newCell();this.publish(message,this.primitive(""));this.publish(method,this.operation("error-text"));
            this.defineField(owner,"message",message);this.defineField(owner,"toString",method);
        }
        return value;
    }
    private atomicsWaitResult(context:ts.Node):Cell {
        let result=this.atomicsWaitResults.get(context);if(result)return result;
        result=this.newCell();this.atomicsWaitResults.set(context,result);
        const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype(),ordinary:true};
        this.publish(result,{tag:"object",owner});this.ownerCreations.set(owner,context);this.ownerMutation(owner);
        const async=this.newCell(),value=this.newCell(),fulfilled=this.newCell(),rejection=this.newCell();
        this.publish(async,this.primitive(true));this.publish(async,this.primitive(false));
        for(const status of ["not-equal","timed-out"])this.publish(value,this.primitive(status));
        for(const status of ["ok","timed-out"])this.publish(fulfilled,this.primitive(status));
        this.publish(value,{tag:"promise",value:fulfilled,rejection});
        this.defineField(owner,"async",async);this.defineField(owner,"value",value);
        return result;
    }
    /** A TypedArray construction allocates through newTarget.prototype, falling
     * back to the intrinsic %TypedArray% subclass prototype (GetPrototypeFromConstructor). */
    private typedArrayInstancePrototype(owner:ObjectOwner,name:string,newTarget:Cell,context:ts.Node):void {
        let targets=this.typedArrayConstructions.get(context);if(!targets){targets=new Set();this.typedArrayConstructions.set(context,targets);}
        if(targets.has(newTarget.id))return;targets.add(newTarget.id);
        owner.prototype??=this.newCell();const prototype=this.property(newTarget,"prototype",context),fallback=this.typedArrayPrototype(name);
        this.rule([prototype],()=>{for(const atom of prototype.values){if(this.ordinaryOwner(atom)||atom.tag==="unknown"||atom.tag==="opaque-object")this.publish(owner.prototype!,atom);else if(atom.tag!=="abrupt"&&atom.tag!=="pending-source")this.copy(fallback,owner.prototype!);}});
    }
    private typedArrayPrototype(name:string,width?:Cell):Cell {
        let value=this.typedArrayPrototypes.get(name);if(value)return value;
        if(!width){width=this.newCell();this.publish(width,this.primitive(runtimeTypedArrayDescriptors.get(name)!.width));}
        value=this.newCell();this.typedArrayPrototypes.set(name,value);
        // %TypedArray%.prototype is not modelled: its members are natives.
        const parent=this.newCell();this.publish(parent,this.nativeUnknown);
        const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:parent};
        this.publish(value,{tag:"object",owner});this.copy(this.opaqueMutation,owner.shape);
        this.defineField(owner,"BYTES_PER_ELEMENT",width,false);this.defineField(owner,"constructor",this.globalBinding(name),false);
        return value;
    }
    private primitivePrototype(name:string):Cell {
        let value=this.primitivePrototypes.get(name);if(value)return value;
        value=this.newCell();this.primitivePrototypes.set(name,value);
        const descriptor=runtimePrimitiveDescriptors.get(name)!,owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype(),boxed:new Map(),ordinary:!runtimePrimitiveDescriptors.get(name)!.constructible};
        this.copy(this.opaqueMutation,owner.shape);this.publish(value,{tag:"object",owner});
        if(descriptor.constructible)owner.boxed!.set(descriptor.kind,this.primitiveDefault(descriptor.kind));
        for(const [member,operation]of [["valueOf",`primitive-value:${descriptor.kind}`],["toString",`primitive-text:${descriptor.kind}`]] as const){const method=this.newCell();this.publish(method,this.operation(operation));this.defineField(owner,member,method,false);}
        for(const name of runtimePrimitivePrototypeMembers.get(descriptor.kind)??[]){if(name==="valueOf"||name==="toString")continue;const method=this.newCell();
            if(PRIMITIVE_MEMBER_LENGTHS.has(`${descriptor.kind}:${name}`))this.publish(method,this.operation(`primitive-member:${descriptor.kind}:${name}`));else this.publish(method,this.nativeUnknown);
            this.defineField(owner,name,method,false);}
        if(descriptor.kind==="string"){const iterator=this.newCell();this.publish(iterator,this.nativeUnknown);this.defineField(owner,this.wellKnownSymbols.get("iterator")!,iterator,false);this.defineField(owner,"length",this.primitiveDefault("number"),false);}
        if(descriptor.kind==="number"||descriptor.kind==="bigint"){const method=this.newCell();this.publish(method,this.operation(`primitive-member:${descriptor.kind}:toLocaleString`));this.defineField(owner,"toLocaleString",method,false);}
        if(descriptor.kind==="symbol"){const getter=this.newCell();this.publish(getter,this.nativeUnknown);this.ownPresence(owner,"description").initial=true;this.defineAccessor(owner,"description","get",getter,this.program.getSourceFiles().find(file=>!file.isDeclarationFile)!);}
        this.defineField(owner,"constructor",this.globalBinding(name),false);
        if(descriptor.kind==="symbol"){const method=this.newCell();this.publish(method,this.operation("primitive-value:symbol"));this.defineField(owner,this.wellKnownSymbols.get("toPrimitive")!,method,false);}
        if(descriptor.kind==="symbol"||descriptor.kind==="bigint"){const tag=this.newCell();this.publish(tag,this.primitive(name));this.defineField(owner,this.wellKnownSymbols.get("toStringTag")!,tag,false);}
        return value;
    }
    /** The intrinsic prototypes of the primitive kinds in a mask. ToObject
     * (sec-toobject) wraps a Boolean, Number, BigInt, String or Symbol in an
     * object whose prototype is its kind's. */
    private kindPrototypes(kinds:number):Cell[] {
        const prototypes:Cell[]=[];
        for(const [name,descriptor] of runtimePrimitiveDescriptors){
            const mask=({boolean:KIND_BOOLEAN,number:KIND_NUMBER,bigint:KIND_BIGINT,string:KIND_STRING,symbol:KIND_SYMBOL} as Record<string,number>)[descriptor.kind]??0;
            if(kinds&mask)prototypes.push(this.primitivePrototype(name));
        }
        return prototypes;
    }
    private readonly atomCells=new Map<Atom,Cell>();
    private atomCell(atom:Atom):Cell {let cell=this.atomCells.get(atom);if(!cell){cell=this.newCell();this.atomCells.set(atom,cell);this.publish(cell,atom);}return cell;}
    private primitiveDefault(kind:string):Cell {let value=this.primitiveDefaults.get(kind);if(!value){value=this.newCell();this.primitiveDefaults.set(kind,value);this.publish(value,this.primitive(kind==="number"?0:kind==="string"?"":false));}return value;}
    private defaultedPrimitiveInput(input:Cell,kind:string):Cell {let kinds=this.defaultedPrimitiveInputs.get(input);if(!kinds){kinds=new Map();this.defaultedPrimitiveInputs.set(input,kinds);}let result=kinds.get(kind);if(!result){result=this.newCell();kinds.set(kind,result);this.copy(input,result);this.copy(this.primitiveDefault(kind),result);this.returnTransforms.set(result,{kind:"projection",inputs:[input],evaluate:inputs=>this.defaultedPrimitiveInput(inputs[0]!,kind)});}return result;}
    private booleanPrimitive(input:Cell):Cell {
        let result=this.booleanPrimitives.get(input);if(result)return result;result=this.newCell();this.booleanPrimitives.set(input,result);const output=result;let rule!:Rule;
        this.returnTransforms.set(result,{kind:"projection",inputs:[input],evaluate:inputs=>this.booleanPrimitive(inputs[0]!)});
        rule=this.rule([input],()=>{const state=this.primitiveState(input,rule,true);for(const value of state.proof.values)this.publish(output,this.primitive(Boolean(value)));for(const atom of input.values){if(atom.tag==="abrupt"||atom.tag==="pending-source")this.publish(output,atom);else if(this.ordinaryOwner(atom))this.publish(output,this.primitive(true));}if(!state.proof.primitiveComplete&&!(state.pending&&!state.unresolved)){this.publish(output,this.primitive(false));this.publish(output,this.primitive(true));}});
        return result;
    }
    private boxedPrimitive(input:Cell,kind:string,context:ts.Node,newTarget?:Cell):Cell {
        let boxes=this.primitiveBoxes.get(context);if(!boxes){boxes=new Map();this.primitiveBoxes.set(context,boxes);}
        const signature=kind+":"+input.id+":"+newTarget?.id,prior=boxes.get(signature);if(prior)return prior;
        const result=this.newCell(),owner=this.owner(context);boxes.set(signature,result);owner.boxed??=new Map();
        this.returnTransforms.set(result,{kind:"allocation",inputs:[input,...(newTarget?[newTarget]:[])],evaluate:inputs=>this.boxedPrimitive(inputs[0]!,kind,context,inputs[1])});
        let payload=owner.boxed.get(kind);if(!payload){payload=this.newCell();owner.boxed.set(kind,payload);this.publish(owner.shape,{tag:"descriptor",identity:payload});}this.copy(input,payload);
        owner.prototype??=this.newCell();
        const name=[...runtimePrimitiveDescriptors].find(([,descriptor])=>descriptor.kind===kind)![0],fallback=this.primitivePrototype(name);
        if(newTarget){const prototype=this.property(newTarget,"prototype",context);this.rule([prototype],()=>{for(const atom of prototype.values){if(this.ordinaryOwner(atom)||atom.tag==="unknown"||atom.tag==="opaque-object")this.publish(owner.prototype!,atom);else if(atom.tag!=="abrupt"&&atom.tag!=="pending-source")this.copy(fallback,owner.prototype!);}});}else this.copy(fallback,owner.prototype);
        this.rule([input],()=>{for(const atom of input.values){if(atom.tag==="abrupt"||atom.tag==="pending-source")this.publish(result,atom);else this.publish(result,{tag:"object",owner});}});
        if(kind==="string") {
            let record=this.primitiveStringFields.get(owner);
            if(!record){record={input:this.newCell(),keys:new Set()};this.primitiveStringFields.set(owner,record);this.copy(record.input,owner.shape);}
            this.copy(input,record.input);
        }
        return result;
    }
    private objectValue(input:Cell,context:ts.Node,newTarget?:Cell):Cell {
        let calls=this.primitiveBoxes.get(context);if(!calls){calls=new Map();this.primitiveBoxes.set(context,calls);}
        const signature="Object:"+input.id+":"+newTarget?.id,prior=calls.get(signature);if(prior)return prior;
        const result=this.newCell(),plain=this.newCell(),owner=this.owner(context);calls.set(signature,result);owner.prototype??=this.newCell();
        this.returnTransforms.set(result,{kind:"allocation",inputs:[input,...(newTarget?[newTarget]:[])],evaluate:inputs=>this.objectValue(inputs[0]!,context,inputs[1])});
        const prototype=newTarget?this.property(newTarget,"prototype",context):this.objectPrototype();
        this.rule([prototype,plain],()=>{if(!plain.values.nonempty)return;for(const atom of prototype.values)if(this.ordinaryOwner(atom)||atom.tag==="unknown"||atom.tag==="opaque-object")this.publish(owner.prototype!,atom);else if(atom.tag!=="abrupt"&&atom.tag!=="pending-source")this.copy(this.objectPrototype(),owner.prototype!);});
        const inputs=new Map<Atom,Cell>();const cell=(atom:Atom)=>{let value=inputs.get(atom);if(!value){value=this.newCell();inputs.set(atom,value);this.publish(value,atom);}return value;};
        let convert!:Rule;convert=this.rule([input,...(newTarget?[newTarget]:[])],()=>{
            const targets=newTarget?[...newTarget.values]:[],standard=!newTarget||targets.some(atom=>atom.tag==="builtin"&&atom.name==="Object"),custom=targets.some(atom=>atom.tag!=="builtin"||atom.name!=="Object");
            if(custom){owner.ordinary=true;owner.unboxed=true;this.publish(plain,this.primitive(true));this.publish(result,{tag:"object",owner});}
            if(!standard)return;
            for(const atom of input.values){
                if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(result,atom);continue;}
                // ToObject of a native value (or its wrapper) is a native value.
                if(this.ordinaryOwner(atom)||atom.tag==="promise"||atom.tag==="generator"||atom===this.nativeUnknown){this.publish(result,atom);continue;}
                if(atom.tag==="unknown"){this.publish(result,this.unknown);continue;}
                const state=this.primitiveState(cell(atom),convert,true);if(state.pending&&!state.unresolved)continue;
                for(const value of state.proof.values){
                    if(value===null||value===undefined){owner.ordinary=true;owner.unboxed=true;this.publish(plain,this.primitive(true));this.publish(result,{tag:"object",owner});continue;}
                    const kind=typeof value;this.copy(this.boxedPrimitive(cell(this.primitive(value)),kind,context),result);
                }
                // Boxing preserves objects and wraps primitives without
                // invoking conversion hooks. An incomplete value proof does
                // not introduce an arbitrary mutation; newTarget prototype
                // reads retain their own effects above.
                if(!state.proof.primitiveComplete){
                    // A primitive box remains an Object even when its
                    // payload has no finite proof: a value of known primitive
                    // kinds boxes to those wrappers with the unproven payload
                    // (a computed String still has only `length` and index
                    // own keys). Callable or object uncertainty keeps its
                    // existing conservative representation.
                    const kinds=this.primitiveKinds(cell(atom));
                    if(kinds&(KIND_FUNCTION|KIND_OBJECT)||!(kinds&KIND_PRIMITIVE))this.publish(result,kinds&KIND_FUNCTION?this.unknown:this.opaqueObject);
                    else for(const [mask,kind] of [[KIND_STRING,"string"],[KIND_NUMBER,"number"],[KIND_BOOLEAN,"boolean"],[KIND_BIGINT,"bigint"],[KIND_SYMBOL,"symbol"]] as const)
                        if(kinds&mask)this.copy(this.boxedPrimitive(cell(atom),kind,context),result);
                }
            }
        });
        return result;
    }
    private primitiveMethod(operation:string,receiver:Cell,radix:Cell,context:ts.Node):Cell {
        let methods=this.primitiveMethodResults.get(context);if(!methods){methods=new Map();this.primitiveMethodResults.set(context,methods);}
        const signature=operation+":"+receiver.id+":"+radix.id,prior=methods.get(signature);if(prior)return prior;
        const result=this.newCell(),payload=this.newCell();methods.set(signature,result);const [role,kind]=operation.split(":");
        this.returnTransforms.set(result,{kind:"projection",inputs:[receiver,radix],evaluate:inputs=>this.primitiveMethod(operation,inputs[0]!,inputs[1]!,context)});
        const mask=({number:KIND_NUMBER,string:KIND_STRING,boolean:KIND_BOOLEAN,bigint:KIND_BIGINT,symbol:KIND_SYMBOL} as Record<string,number>)[kind!]!;
        const inputs=new Map<Atom,Cell>();const cell=(atom:Atom)=>{let value=inputs.get(atom);if(!value){value=this.newCell();inputs.set(atom,value);this.publish(value,atom);}return value;};
        this.rule([receiver],()=>{for(const atom of receiver.values){
            if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(result,atom);continue;}
            const owner=this.ordinaryOwner(atom),boxed=owner?.boxed?.get(kind!),kinds=this.primitiveKinds(cell(atom));
            if(boxed)this.copy(boxed,payload);else if(!(kinds&~mask))this.publish(payload,atom);
            else if(atom.tag==="unknown"||atom.tag==="opaque-object"){this.publish(result,this.unknown);this.activateOpaqueEffect(context);}
            else {this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));}
        }});
        if(role==="primitive-value")this.copy(payload,result);
        else {
            const numeric=kind==="number"||kind==="bigint",parts=numeric?[payload,this.primitiveConversion(radix,context,"number")]:[payload];
            this.publish(result,{tag:"text-operation",operation:"primitive-string",parts});
            const handler=this.exceptionHandlers.get(context);if(handler){let exceptions!:Rule;exceptions=this.rule(parts,()=>{const states=parts.map(part=>this.primitiveState(part,exceptions,true));if(states.some(state=>state.pending&&!state.unresolved))return;for(const tuple of sourceChoiceTuples(states.map(state=>state.proof.values)))try{numeric?(tuple[0] as number|bigint).toString(tuple[1] as number|undefined):String(tuple[0]);}catch{this.publish(handler,this.nativeException(context));}});}
        }
        return result;
    }
    private jsonPrimitive(input:Cell,role:"value"|"space"|"key",context:ts.Node):Cell {
        let calls=this.jsonPrimitiveResults.get(context);if(!calls){calls=new Map();this.jsonPrimitiveResults.set(context,calls);}
        const signature=role+":"+input.id,prior=calls.get(signature);if(prior)return prior;
        const result=this.newCell();calls.set(signature,result);const inputs=new Map<Atom,Cell>(),selected=new Set<Atom>();
        this.returnTransforms.set(result,{kind:"projection",inputs:[input],evaluate:inputs=>this.jsonPrimitive(inputs[0]!,role,context)});
        const cell=(atom:Atom)=>{let value=inputs.get(atom);if(!value){value=this.newCell();inputs.set(atom,value);this.publish(value,atom);}return value;};
        let rule!:Rule;rule=this.rule([input],()=>{for(const atom of input.values){
            const owner=this.ordinaryOwner(atom);if(owner)this.watch(rule,owner.shape);
            if(selected.has(atom)&&!owner)continue;if(!owner)selected.add(atom);
            if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(result,atom);continue;}
            if(owner?.boxed?.size){
                for(const [kind,payload]of owner.boxed){
                    if(kind==="number"||kind==="string")this.copy(role==="key"||kind==="string"?this.stringHintCell(cell(atom),context):this.coerceCell(cell(atom),context,"number"),result);
                    else if(role==="value"&&(kind==="boolean"||kind==="bigint"))this.copy(payload,result);
                    else this.publish(result,role==="value"?atom:this.primitive(undefined));
                }
                if(owner.unboxed)this.publish(result,role==="value"?atom:this.primitive(undefined));
            }else if(role==="value")this.publish(result,atom);
            else if(owner){
                if(owner.ordinary||owner.listLength||owner.proxy||!(this.primitiveKinds(cell(atom))&~KIND_FUNCTION))this.publish(result,this.primitive(undefined));else this.publish(result,this.unknown);
            }else this.publish(result,atom);
        }});
        return result;
    }
    private objectText(input:Cell,context:ts.Node):Cell {
        let calls=this.objectTexts.get(context);if(!calls){calls=new Map();this.objectTexts.set(context,calls);}const prior=calls.get(input);if(prior)return prior;
        const result=this.newCell();calls.set(input,result);const selected=new Set<Atom>();
        this.returnTransforms.set(result,{kind:"projection",inputs:[input],evaluate:inputs=>this.objectText(inputs[0]!,context)});
        this.rule([input],()=>{for(const atom of input.values){if(selected.has(atom))continue;selected.add(atom);
            if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(result,atom);continue;}
            const owner=this.ordinaryOwner(atom),defaults:string[]=[];
            if(atom.tag==="primitive")defaults.push(atom.value===null?"Null":({undefined:"Undefined",number:"Number",string:"String",boolean:"Boolean",bigint:"BigInt",symbol:"Symbol"} as Record<string,string>)[typeof atom.value]!);
            else if(atom.tag==="function")defaults.push(atom.owner.kind==="async"?"AsyncFunction":atom.owner.kind==="generator"?"GeneratorFunction":atom.owner.kind==="async-generator"?"AsyncGeneratorFunction":"Function");
            else if(owner?.boxed?.size){for(const kind of owner.boxed.keys())defaults.push([...runtimePrimitiveDescriptors].find(([,descriptor])=>descriptor.kind===kind)![0]);if(owner.unboxed)defaults.push("Object");}
            else if(owner?.arguments)defaults.push("Arguments");else if(owner?.listLength)defaults.push("Array");else if(owner?.ordinary)defaults.push("Object");
            if(!defaults.length){this.publish(result,this.unknownString);continue;}
            if(!owner){for(const tag of defaults)this.publish(result,this.primitive("[object "+tag+"]"));continue;}
            const receiver=this.newCell();this.publish(receiver,atom);const tag=this.property(receiver,this.wellKnownSymbols.get("toStringTag")!,context);let read!:Rule;
            read=this.rule([tag],()=>{const state=this.primitiveState(tag,read,true);for(const value of state.proof.values)if(typeof value==="string")this.publish(result,this.primitive("[object "+value+"]"));else for(const tag of defaults)this.publish(result,this.primitive("[object "+tag+"]"));if(!state.proof.primitiveComplete&&!(state.pending&&!state.unresolved))this.publish(result,this.unknownString);});
        }});
        return result;
    }
    private constructorValidity(input:Cell,context:ts.Node):Cell {
        let checks=this.constructorChecks.get(context);if(!checks){checks=new Map();this.constructorChecks.set(context,checks);}const prior=checks.get(input);if(prior)return prior;
        const result=this.newCell();checks.set(input,result);let rule!:Rule;
        rule=this.rule([input],()=>{const pending=[input],visited=new Set<Cell>();while(pending.length){const value=pending.pop()!;if(visited.has(value))continue;visited.add(value);this.watch(rule,value);for(const atom of value.values){
            if(atom.tag==="bound"){pending.push(atom.target);continue;}
            const proxy=this.ordinaryOwner(atom)?.proxy;if(proxy){pending.push(proxy.target);continue;}
            if(atom.tag==="function"){const definition=atom.owner.definition;this.publish(result,this.primitive(ts.isClassLike(definition)||atom.owner.kind==="ordinary"&&(ts.isFunctionDeclaration(definition)||ts.isFunctionExpression(definition))));}
            else if(atom.tag==="builtin"){const descriptor=runtimePrimitiveDescriptors.get(atom.name);this.publish(result,this.primitive(descriptor?descriptor.constructible:runtimeGlobalBindings.get(atom.name)?.kind==="intrinsic"&&atom.normalResult!=="not-callable"));}
            else if(atom.tag==="intrinsic")this.publish(result,this.primitive(atom.domain==="constructor"));
            // A value from a source that a later solve compiles is not yet a
            // constructor verdict: forward the pending mark instead of the
            // opaque effect, which would make that source itself unknown.
            else if(atom.tag==="pending-source")this.publish(result,atom);
            else if(atom===this.nativeUnknown){this.publish(result,this.primitive(false));this.publish(result,this.primitive(true));}
            else if(atom.tag==="unknown"||atom.tag==="opaque-object"){this.publish(result,this.primitive(false));this.publish(result,this.primitive(true));this.activateOpaqueEffect(context);}
            else this.publish(result,this.primitive(false));
        }}});
        return result;
    }
    /** ToObject differs from the Object constructor at null and undefined. */
    private toObject(input:Cell,context:ts.Node):Cell {
        let calls=this.objectCoercions.get(context);if(!calls){calls=new Map();this.objectCoercions.set(context,calls);}
        const prior=calls.get(input);if(prior)return prior;
        const result=this.newCell(),coercible=this.newCell();calls.set(input,result);
        this.returnTransforms.set(result,{kind:"allocation",inputs:[input],evaluate:inputs=>this.toObject(inputs[0]!,context)});
        const cells=new Map<Atom,Cell>();
        this.rule([input],()=>{for(const atom of input.values){
            if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(result,atom);continue;}
            let value=cells.get(atom);if(!value){value=this.newCell();cells.set(atom,value);this.publish(value,atom);}
            const kinds=this.primitiveKinds(value);
            if(kinds&(KIND_NULL|KIND_UNDEFINED)){
                this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context,"TypeError"));
            }
            if(kinds&~(KIND_NULL|KIND_UNDEFINED))this.publish(coercible,atom);
        }});
        this.copy(this.objectValue(coercible,context),result);return result;
    }
    /** Ordinary prototype writes have no callback or global-binding effects.
     * The changed owner retains both prototype alternatives and an opaque shape
     * origin until prototype history is represented. Proxy/unknown targets use
     * the shared opaque boundary instead. */
    private setPrototype(target:Cell,prototype:Cell,context:ts.Node,reflect:boolean):Cell {
        let calls=this.prototypeWrites.get(context);if(!calls){calls=new Map();this.prototypeWrites.set(context,calls);}
        const signature=target.id+":"+prototype.id+":"+reflect,prior=calls.get(signature);if(prior)return prior;
        const result=this.newCell(),valid=this.newCell();calls.set(signature,result);
        const fail=()=>{this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context,"TypeError"));};
        this.rule([prototype],()=>{for(const atom of prototype.values){
            if(this.ordinaryOwner(atom)||atom===this.primitive(null)||atom.tag==="unknown"||atom.tag==="opaque-object")this.publish(valid,atom);
            if(atom.tag==="abrupt"||atom.tag==="pending-source")this.publish(result,atom);
            else if(!this.ordinaryOwner(atom)&&atom!==this.primitive(null))fail();
        }});
        const selected=new Set<Atom>();
        this.rule([target,valid],()=>{if(!valid.values.nonempty)return;for(const atom of target.values){
            if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(result,atom);continue;}
            const owner=this.ordinaryOwner(atom);
            if(owner&&!owner.proxy){
                if(!selected.has(atom)){selected.add(atom);this.copy(valid,this.prototypeLocation(owner));this.copy(this.executionOrigins(context),owner.shape);}
                if(reflect){this.publish(result,this.primitive(true));this.publish(result,this.primitive(false));}else this.publish(result,atom);
                // Cycles, immutable prototypes and nonextensible owners may
                // fail; neither that failure nor ordinary success calls hooks.
                if(!reflect)fail();
            }else if(owner?.proxy||atom.tag==="unknown"||atom.tag==="opaque-object"){
                this.publish(result,reflect?this.primitive(true):atom);if(reflect)this.publish(result,this.primitive(false));fail();
                if(!selected.has(atom)){selected.add(atom);this.activateOpaqueEffect(context);this.onActive(context,()=>{this.escapeCallableArgument(target,context);this.escapeCallableArgument(prototype,context);});}
            }else if(reflect||this.primitiveKinds(target)&(KIND_NULL|KIND_UNDEFINED))fail();
            else this.publish(result,atom);
        }});return result;
    }
    /** One worklist handles ordinary owners and Proxy default forwarding.
     * Opaque shape origins also cover unrepresented internal prototype writes. */
    private getPrototype(input:Cell,context:ts.Node,coerce:boolean):Cell {
        let calls=this.prototypeReads.get(context);if(!calls){calls=new Map();this.prototypeReads.set(context,calls);}
        const signature=input.id+":"+coerce,prior=calls.get(signature);if(prior)return prior;
        const result=this.newCell(),objects=coerce?this.toObject(input,context):input;calls.set(signature,result);
        this.returnTransforms.set(result,{kind:"projection",inputs:[input],evaluate:inputs=>this.getPrototype(inputs[0]!,context,coerce)});
        const selected=new Set<Atom>(),pending=this.newCell(),cells=new Map<Atom,Cell>();this.copy(objects,pending);
        const fail=()=>{this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context,"TypeError"));};
        let rule!:Rule;rule=this.rule([pending],()=>{for(const atom of pending.values){
            if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(result,atom);continue;}
            const owner=this.ordinaryOwner(atom);
            if(owner){
                this.watch(rule,owner.shape);
                if(!owner.immutableOwn){
                    let effects=this.ownerFieldEffects.get(owner);
                    if(!effects){effects=this.newCell();this.ownerFieldEffects.set(owner,effects);this.copy(owner.shape,effects,"origin");}
                    this.copyRead(effects,result,context);
                }
                if(selected.has(atom))continue;selected.add(atom);
                if(owner.proxy){
                    const proxy=owner.proxy,method=this.property(proxy.handler,"getPrototypeOf",context),callee=this.newCell(),returned=this.newCell();
                    this.rule([method],()=>{for(const target of method.values){
                        if(target===this.primitive(undefined)||target===this.primitive(null))this.copy(proxy.target,pending);
                        else this.publish(callee,target);
                    }});
                    this.invoke(context,callee,proxy.handler,[{cell:proxy.target,spread:false}],returned);
                    this.rule([returned],()=>{for(const value of returned.values){
                        if(value.tag==="abrupt"||value.tag==="pending-source"){this.publish(result,value);continue;}
                        let cell=cells.get(value);if(!cell){cell=this.newCell();cells.set(value,cell);this.publish(cell,value);}
                        const kinds=this.primitiveKinds(cell);
                        if(kinds&(KIND_OBJECT|KIND_FUNCTION|KIND_NULL))this.publish(result,value);
                        // Proxy invariant checks may reject an otherwise valid
                        // trap result. Integrity state is still conservative.
                        fail();
                    }});
                }else if(owner.prototype)this.copyRead(owner.prototype,result,context);
                else this.publish(result,this.unknown);
            }else if(atom.tag==="unknown"||atom.tag==="opaque-object"){
                this.publish(result,atom===this.nativeUnknown?this.nativeUnknown:this.unknown);fail();
                // A getPrototypeOf trap is user code reachable only through
                // the argument: it escapes as a callee rather than widening
                // every global binding.
                if(!selected.has(atom)){selected.add(atom);this.onActive(context,()=>this.escapeCallableArgument(objects,context));}
            }else fail();
        }});return result;
    }
    /** Only language-created exceptions enter this allocation collection.
     * Unknown messages keep their String category without inventing callbacks;
     * mutable prototype properties still use the ordinary owner graph. */
    private nativeException(context:ts.Node,kind?:string,realm=this.currentRealm):Atom {
        let realms=this.nativeExceptions.get(context);if(!realms){realms=new Map();this.nativeExceptions.set(context,realms);}
        let errors=realms.get(realm);if(!errors){errors=new Map();realms.set(realm,errors);}
        let value=errors.get(kind);if(value)return value;
        const prototype=this.newCell(),message=this.newCell(),owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype};
        value={tag:"object",owner};errors.set(kind,value);this.copy(this.opaqueMutation,owner.shape);
        for(const name of kind?[kind]:runtimeErrorKinds.keys())this.copy(realm===this.currentRealm?this.errorPrototype(name):this.property(this.realmBinding(realm,name),"prototype"),prototype);
        this.publish(message,this.unknownString);this.defineField(owner,"message",message);return value;
    }
    private errorText(receiver:Cell,context:ts.Node):Cell {
        let receivers=this.errorStrings.get(context);if(!receivers){receivers=new Map();this.errorStrings.set(context,receivers);}
        const prior=receivers.get(receiver);if(prior)return prior;
        const result=this.newCell();receivers.set(receiver,result);
        const objects=this.newCell();
        this.rule([receiver],()=>{
            for(const atom of receiver.values){
                if(this.ordinaryOwner(atom)||atom.tag==="opaque-object"||atom.tag==="unknown")this.publish(objects,atom);
                else if(atom.tag==="pending-source"||atom.tag==="abrupt")this.publish(result,atom);
                else {this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));}
            }
        });
        const defaulted=(input:Cell,fallback:string):Cell=>{
            const output=this.newCell();this.rule([input],()=>{for(const atom of input.values)this.publish(output,atom===this.primitive(undefined)?this.primitive(fallback):atom);});return output;
        };
        const name=this.stringHintCell(defaulted(this.property(objects,"name",context),"Error"),context);
        const messageReceiver=this.newCell();let normal!:Rule;
        normal=this.rule([name],()=>{
            const state=this.primitiveState(name,normal,true);
            if(state.pending&&!state.unresolved)return;
            if(!state.proof.primitiveComplete||state.proof.values.length)this.copy(objects,messageReceiver);
        });
        const message=this.stringHintCell(defaulted(this.property(messageReceiver,"message",context),""),context);
        this.publish(result,{tag:"text-operation",operation:"error-text",parts:[name,message]});return result;
    }
    private objectPrototype(): Cell {
        if (!this.ordinaryObjectPrototype) {
            this.ordinaryObjectPrototype=this.newCell();
            const owner: ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.newCell()};
            owner.ordinary=true;
            this.copy(this.opaqueMutation,owner.shape);this.publish(owner.prototype!,this.primitive(null));
            this.publish(this.ordinaryObjectPrototype,{tag:"object",owner});
            this.defineField(owner,"constructor",this.globalBinding("Object"));
            // Object.prototype.__proto__ (sec-object.prototype.__proto__): a
            // non-enumerable accessor whose getter reports and whose setter
            // changes the receiver's [[Prototype]].
            for(const kind of ["get","set"] as const){const accessor=this.newCell();this.publish(accessor,this.operation(`proto-accessor:${kind}`));this.defineAccessor(owner,"__proto__",kind,accessor);}
            const proto=this.ownPresence(owner,"__proto__");proto.initial=true;this.publish(proto.enumerable,this.primitive(false));
            for(const[name,normalResult]of runtimeObjectPrototypeMethods){
                const value=this.newCell(),fields:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.callablePrototype("ordinary")};
                const operation=SOURCE_OBJECT_PROTOTYPE_OPERATIONS.get(name);this.publish(value,operation?this.operation(operation):{tag:"builtin",name,normalResult,fields});this.defineField(owner,name,value);
            }
        }
        return this.ordinaryObjectPrototype;
    }
    private arrayOwner(context:ts.Node,existing?:ObjectOwner):ObjectOwner {
        const owner:ObjectOwner=existing??{fields:new Map(),accessors:new Map(),shape:this.newCell()};
        owner.ordinary=true;owner.closedIndices=true;owner.prototype=this.arrayPrototype();
        if(owner.listLength&&owner.fields.get("length")!==owner.listLength)this.copy(owner.listLength,this.field(owner,"length"));
        owner.listLength=this.field(owner,"length");const presence=this.ownPresence(owner,"length");
        presence.initial=true;this.publish(presence.facts,this.primitive(true));this.publish(presence.enumerable,this.primitive(false));
        this.markPropertyAlgorithm(owner,"ordinary");this.sourceObjectOwners.add(owner);
        if(!this.ownerCreations.has(owner)){this.ownerCreations.set(owner,context);this.ownerMutation(owner);}
        return owner;
    }
    private arrayPrototype():Cell {
        if(!this.ordinaryArrayPrototype){
            const value=this.newCell();this.ordinaryArrayPrototype=value;
            const fields:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype(),closedIndices:true,closedOwn:true,ordinary:true};
            this.markPropertyAlgorithm(fields,"ordinary");
            this.copy(this.opaqueMutation,fields.shape);this.publish(value,{tag:"builtin",name:"Array.prototype",normalResult:"not-callable",fields});
            const length=this.newCell();this.publish(length,this.primitive(0));this.defineField(fields,"length",length);fields.listLength=this.field(fields,"length");
            this.defineField(fields,"constructor",this.globalBinding("Array"));
            for(const[operation,descriptor]of SOURCE_NATIVE_METHODS)if(descriptor.owner==="Array"){
                const member=this.newCell();this.publish(member,this.operation(operation));this.defineField(fields,descriptor.name,member,false);
            }
            this.defineField(fields,this.wellKnownSymbols.get("iterator")!,this.field(fields,"values"),false);
            const unscopables=this.newCell();this.publish(unscopables,this.opaqueObject);this.defineField(fields,this.wellKnownSymbols.get("unscopables")!,unscopables,false);
        }
        return this.ordinaryArrayPrototype;
    }
    /** Array.prototype.toString observes the actual join Reference. IsCallable
     * selects either its Call result or the intrinsic Object text fallback. */
    private arrayText(receiver:Cell,context:ts.Node):Cell {
        let calls=this.arrayTexts.get(context);if(!calls){calls=new Map();this.arrayTexts.set(context,calls);}
        const prior=calls.get(receiver);if(prior)return prior;
        const result=this.newCell();calls.set(receiver,result);
        this.returnTransforms.set(result,{kind:"projection",inputs:[receiver],evaluate:inputs=>this.arrayText(inputs[0]!,context)});
        const objects=this.toObject(receiver,context),join=this.property(objects,"join",context),callee=this.newCell(),fallback=this.newCell(),seen=new Set<Atom>();
        this.rule([join],()=>{for(const atom of join.values){
            if(seen.has(atom))continue;seen.add(atom);
            if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(result,atom);continue;}
            const value=this.newCell();this.publish(value,atom);const valid=this.callableValidity(value,context);
            this.rule([valid],()=>{
                if(valid.values.has(this.primitive(true)))this.publish(callee,atom);
                if(valid.values.has(this.primitive(false)))this.copy(objects,fallback);
            });
        }});
        this.invoke(context,callee,objects,[],result);this.copy(this.objectText(fallback,context),result);
        return result;
    }
    /** Predicate callbacks share one numeric read and actual-call worklist.
     * The semantic loop retains repeated activation timing without choosing
     * an extent or enumerating possible callback counts. */
    /** One iteration model for every Array.prototype native that invokes a
     * callback per element: the callback is called with the array's indexed
     * values, an index and the array (an accumulator first for reduce and
     * reduceRight, whose initial value is the extra argument or the
     * elements themselves), a non-callable callback throws TypeError, and the
     * callback's completions form the result by mode: a boolean for some and
     * every, undefined for forEach, an element or undefined for find and
     * findLast, a number for findIndex and findLastIndex, a fresh array of
     * the returned values (map), of the elements (filter) or of the returned
     * values and their elements (flatMap), and the accumulator for reduce. */
    /** ArraySpeciesCreate (sec-arrayspeciescreate) for a native that collects
     * elements into a new array. A receiver that may be an Array (an array
     * owner, a builtin construction such as an Array subclass instance, a
     * Proxy) has its "constructor" read, so a getter there runs; a constructor
     * that is an Object has its @@species read (%Array%'s own getter answers
     * %Array%). undefined, null or an %Array% give the fresh Array; any other
     * object is constructed with a Number length and receives the elements as
     * data properties at integer indices; a primitive throws TypeError. A
     * receiver that is not an Array gives the fresh Array without reads, and
     * an unrepresented receiver already makes the iteration opaque. */
    private arraySpeciesCreate(objects:Cell,fresh:Cell,elements:Cell,context:ts.Node):Cell {
        let calls=this.arraySpeciesResults.get(context);if(!calls){calls=new Map();this.arraySpeciesResults.set(context,calls);}
        const key=objects.id+":"+fresh.id+":"+elements.id,prior=calls.get(key);if(prior)return prior;
        const result=this.newCell(),arrays=this.newCell(),candidates=this.newCell(),species=this.newCell();calls.set(key,result);
        const caught=this.exceptionHandlers.get(context);
        const step=this.invocationContext(context);if(caught)this.exceptionHandlers.set(step,caught);
        const throwType=():void=>{this.publish(result,this.abrupt);if(caught)this.publish(caught,this.nativeException(context,"TypeError"));};
        let defaulted=false;const fallback=():void=>{if(!defaulted){defaulted=true;this.copy(fresh,result);}};
        const algorithms=new Set<Cell>();
        let select!:Rule;
        select=this.rule([objects],()=>{for(const atom of objects.values){
            if(atom.tag==="abrupt"||atom.tag==="pending-source")continue;
            const owner=this.ordinaryOwner(atom),algorithm=owner?.propertyAlgorithm;
            if(algorithm&&!algorithms.has(algorithm)){algorithms.add(algorithm);this.watch(select,algorithm);}
            if(owner&&!owner.listLength&&!owner.proxy&&!algorithm?.values.has(this.primitive("opaque")))fallback();
            else this.publish(arrays,atom);
        }});
        const constructors=this.property(arrays,"constructor",context);
        this.rule([constructors],()=>{for(const atom of constructors.values){
            if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(result,atom);continue;}
            if(atom===this.primitive(undefined))fallback();
            else if(atom.tag==="primitive"||atom.tag==="text-operation"||atom.tag==="non-string"||atom.tag==="unknown-string")throwType();
            else this.publish(candidates,atom);
        }});
        const read=this.property(candidates,this.wellKnownSymbols.get("species")!,context);
        this.rule([read],()=>{for(const atom of read.values){
            if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(result,atom);continue;}
            if(atom===this.primitive(undefined)||atom===this.primitive(null)||atom.tag==="builtin"&&atom.name==="Array")fallback();
            else if(atom.tag==="primitive"||atom.tag==="text-operation"||atom.tag==="non-string"||atom.tag==="unknown-string")throwType();
            else this.publish(species,atom);
        }});
        const receiver=this.newCell(),length=this.newCell(),constructed=this.newCell(),indices=this.newCell();
        this.publish(receiver,{tag:"object",owner:this.owner(step)});this.publish(length,this.numberValue());this.publish(indices,this.numberValue());
        let started=false;
        this.rule([species],()=>{
            if(started||!species.values.nonempty)return;started=true;
            this.invoke(step,species,receiver,[{cell:length,spread:false}],constructed,true);
            this.writeProperty(constructed,null,elements,false,"define",step,constructed,indices);
            this.copy(constructed,result);
        });
        return result;
    }
    private arrayIteration(mode:ArrayIterationMode,receiver:Cell,callback:Cell,extra:Cell|null,context:ts.Node):Cell {
        let calls=this.arrayIterations.get(context);if(!calls){calls=new Map();this.arrayIterations.set(context,calls);}
        const key=mode+":"+receiver.id+":"+callback.id+":"+(extra?extra.id:"-"),previous=calls.get(key);if(previous)return previous;
        const result=this.newCell(),objects=this.toObject(receiver,context),checked=this.newCell(),selected=this.newCell(),indices=this.newCell(),callee=this.newCell(),returned=this.newCell(),normalReturns=this.newCell(),accumulator=this.newCell(),undefinedCell=this.newCell();calls.set(key,result);
        this.publish(undefinedCell,this.primitive(undefined));this.publish(indices,this.numberValue());
        const reduction=mode==="reduce"||mode==="reduceRight",collecting=mode==="map"||mode==="filter"||mode==="flatMap";
        const step=this.invocationContext(context,{repeated:true});
        const caught=this.exceptionHandlers.get(context);if(caught)this.exceptionHandlers.set(step,caught);
        const length=this.coerceCell(this.property(objects,"length",context),context,"length"),target=this.callableTarget(checked,step);this.copy(target.completion,result);
        // The callback sees only present elements (HasProperty before Get):
        // the values at the known index keys and the abstract indexed
        // locations; an accessor at an unknown key falls back to the
        // computed read, which also admits absence.
        const values=this.newCell(),seenKeys=new Set<SourcePropertyKey>(),seenLocations=new Set<Cell>();let computedFallback=false;
        this.rule([returned],()=>{for(const atom of returned.values)if(atom.tag!=="abrupt"&&atom.tag!=="pending-source")this.publish(normalReturns,atom);});
        if(reduction){if(extra)this.copy(extra,accumulator);this.copy(values,accumulator);this.copy(normalReturns,accumulator);}
        const parts=(reduction?[accumulator,values,indices,selected]:[values,indices,selected]).map(cell=>({cell,spread:false}));
        this.invoke(step,callee,reduction?undefinedCell:extra??undefinedCell,parts,returned);
        const elements=this.newCell();
        if(mode==="map")this.copy(normalReturns,elements);
        else if(mode==="filter")this.copy(values,elements);
        else if(mode==="flatMap"){
            // FlattenIntoArray: an Array return contributes its elements, any
            // other return is an element itself.
            const arrays=this.newCell();
            this.rule([normalReturns],()=>{for(const atom of normalReturns.values)if(this.ordinaryOwner(atom)?.listLength)this.publish(arrays,atom);else this.publish(elements,atom);});
            this.copy(this.computedProperty(arrays,indices,step),elements);
        }
        const collected=collecting?this.arraySpeciesCreate(objects,this.arrayOfValues(context,"iteration:"+key,elements),elements,context):null;
        const emptyResult=():void=>{
            if(mode==="some")this.publish(result,this.primitive(false));
            else if(mode==="every")this.publish(result,this.primitive(true));
            else if(mode==="forEach"||mode==="find"||mode==="findLast")this.publish(result,this.primitive(undefined));
            else if(mode==="findIndex"||mode==="findLastIndex")this.publish(result,this.primitive(-1));
            else if(collected)this.copy(collected,result);
            else if(extra)this.copy(extra,result);
            else if(caught)this.publish(caught,this.nativeException(context,"TypeError"));
        };
        let rule!:Rule;rule=this.rule([length,target.callable,returned],()=>{
            const state=this.primitiveState(length,rule,true);if(state.pending&&!state.unresolved)return;
            if(state.proof.primitiveComplete&&!state.proof.values.length){this.publish(result,this.abrupt);return;}
            this.copy(callback,checked);if(!target.callable.values.nonempty)return;
            if(!state.proof.primitiveComplete||state.proof.values.some(value=>Number(value)===0))emptyResult();
            if(state.proof.primitiveComplete&&state.proof.values.every(value=>Number(value)===0))return;
            const domain=this.propertyKeyDomain(objects,step,rule,"index");if(domain.pending)return;
            if(domain.opaque){this.activateOpaqueEffect(context);if(caught)this.publish(caught,this.unknown);this.onActive(context,()=>this.escapeCallableArgument(objects,context));}
            const present=domain.opaque||domain.keys.length||domain.getters.length||domain.locations.some(value=>{this.watch(rule,value);return value.values.nonempty;});
            if(!present){emptyResult();return;}
            if((domain.opaque||domain.getters.length)&&!computedFallback){computedFallback=true;this.copy(this.computedProperty(selected,indices,step),values);}
            for(const key of domain.keys)if(!seenKeys.has(key)){seenKeys.add(key);this.copy(this.property(objects,key,step),values);}
            for(const location of domain.locations)if(!seenLocations.has(location)){seenLocations.add(location);this.copy(location,values);}
            this.copy(objects,selected);this.copy(target.callable,callee);
            for(const value of returned.values)if(value.tag==="abrupt"||value.tag==="pending-source")this.publish(result,value);
            if(![...returned.values].some(value=>value.tag!=="abrupt"&&value.tag!=="pending-source"))return;
            if(mode==="some"||mode==="every"){this.publish(result,this.primitive(false));this.publish(result,this.primitive(true));}
            else if(mode==="forEach")this.publish(result,this.primitive(undefined));
            else if(mode==="find"||mode==="findLast"){this.copy(values,result);this.publish(result,this.primitive(undefined));}
            else if(mode==="findIndex"||mode==="findLastIndex")this.publish(result,this.numberValue());
            else if(collected)this.copy(collected,result);
            else this.copy(accumulator,result);
        });
        return result;
    }
    /** One actual-List summary stores possible indexed values through Set.
     * Abstract numeric extents do not enumerate successive call outcomes. */
    private arrayPush(receiver:Cell,args:readonly Cell[]|null,sequence:ArgumentSequence|null,context:ts.Node):Cell {
        let calls=this.arrayPushes.get(context);if(!calls){calls=new Map();this.arrayPushes.set(context,calls);}
        const key=receiver.id+":"+(args?.map(cell=>cell.id).join(",")??"sequence:"+sequence?.id),previous=calls.get(key);if(previous)return previous;
        const result=this.newCell(),objects=this.toObject(receiver,context),selected=this.newCell(),values=this.newCell(),indices=this.newCell(),extent=this.newCell();calls.set(key,result);
        if(args)for(const value of args)this.copy(value,values);else if(sequence)this.copy(this.allArgumentValues(sequence),values);else this.publish(values,this.unknown);
        let number=this.numericValues.get(KIND_NUMBER);if(!number){number={tag:"non-string",kinds:KIND_NUMBER};this.numericValues.set(KIND_NUMBER,number);}
        this.publish(indices,number);this.publish(extent,number);
        const length=this.coerceCell(this.property(objects,"length",context),context,"length");let rule!:Rule;
        rule=this.rule([length],()=>{
            const state=this.primitiveState(length,rule,true);if(state.pending&&!state.unresolved)return;
            if(state.proof.primitiveComplete&&!state.proof.values.length){this.publish(result,this.abrupt);return;}
            const valid=state.proof.values.some(value=>Number(value)<=Number.MAX_SAFE_INTEGER-(args?.length??0));
            const invalid=args===null||!state.proof.primitiveComplete||state.proof.values.some(value=>Number(value)>Number.MAX_SAFE_INTEGER-(args?.length??0));
            if(invalid){const caught=this.exceptionHandlers.get(context);if(caught)this.publish(caught,this.nativeException(context,"TypeError"));}
            if([...objects.values].some(atom=>!!this.ordinaryOwner(atom)?.listLength)&&
                (args===null||!state.proof.primitiveComplete||state.proof.values.some(value=>Number(value)+(args?.length??0)>0xffffffff))){
                const caught=this.exceptionHandlers.get(context);if(caught)this.publish(caught,this.nativeException(context,"RangeError"));
            }
            if(!valid&&state.proof.primitiveComplete)return;
            this.copy(objects,selected);this.copy(extent,result);
        });
        let stored=false;this.rule([selected,values],()=>{if(!stored&&selected.values.nonempty&&values.values.nonempty){stored=true;this.writeProperty(selected,null,values,true,"set",context,selected,indices);}});
        this.writeProperty(selected,"length",extent,true,"set",context);
        return result;
    }
    /** Unknown join text is not itself an opaque effect. Primitive indexed
     * domains have no user conversion hooks; exotic/getter/object domains
     * retain the conservative owner effect path. */
    private arrayJoinSummary(receiver:Cell,separator:Cell,context:ts.Node):Cell {
        let calls=this.arrayJoinSummaries.get(context);if(!calls){calls=new Map();this.arrayJoinSummaries.set(context,calls);}
        const key=receiver.id+":"+separator.id,previous=calls.get(key);if(previous)return previous;
        const result=this.newCell(),text=this.stringHintCell(this.joinTextInput(separator,true),context),values=this.newCell();calls.set(key,result);
        this.publish(values,this.primitive(undefined));let opaque=false;
        let rule!:Rule;rule=this.rule([receiver,text,values],()=>{
            const state=this.primitiveState(text,rule,true);if(state.pending&&!state.unresolved)return;
            if(state.proof.primitiveComplete&&!state.proof.values.length){this.publish(result,this.abrupt);return;}
            const domain=this.propertyKeyDomain(receiver,context,rule,"index");if(domain.pending)return;
            for(const name of domain.keys)this.copy(this.property(receiver,name,context),values);
            for(const value of domain.locations)this.copyRead(value,values,context);
            for(const value of domain.getters)this.watch(rule,value);
            const kinds=this.primitiveKinds(values);this.publish(result,this.unknownString);
            if(kinds&KIND_SYMBOL){const caught=this.exceptionHandlers.get(context);if(caught)this.publish(caught,this.nativeException(context,"TypeError"));}
            if(!opaque&&(domain.opaque||domain.getters.length||kinds&~KIND_PRIMITIVE)){
                opaque=true;const caught=this.exceptionHandlers.get(context);if(caught)this.publish(caught,this.unknown);
                this.onActive(context,()=>{this.opaqueEffect(context);this.escapeCallableArgument(receiver,context);});
            }
        });
        return result;
    }
    private joinTextInput(value:Cell,separator:boolean):Cell {
        const normalized=this.newCell();
        this.rule([value],()=>{
            for(const atom of value.values){
                if(atom.tag==="primitive"&&(atom.value===undefined||!separator&&atom.value===null))
                    this.publish(normalized,this.primitive(separator?",":""));
                else this.publish(normalized,atom);
            }
        });
        return normalized;
    }
    private arrayLikeLength(receiver:Cell,context:ts.Node):Cell {
        let contexts=this.arrayLikeLengths.get(receiver);
        if(!contexts){contexts=new Map();this.arrayLikeLengths.set(receiver,contexts);}
        let length=contexts.get(context);
        if(!length){length=this.coerceCell(this.property(receiver,"length",context),context,"length");contexts.set(context,length);}
        return length;
    }
    private indexedRead(receiver:Cell,index:number,context:ts.Node):Cell {
        let contexts=this.indexedReads.get(receiver);
        if(!contexts){contexts=new Map();this.indexedReads.set(receiver,contexts);}
        let indices=contexts.get(context);
        if(!indices){indices=new Map();contexts.set(context,indices);}
        const key=String(index);let value=indices.get(key);
        if(!value){value=this.property(receiver,key,context);indices.set(key,value);}
        return value;
    }
    private iterationMethod(receiver:Cell,context?:ts.Node):Cell {
        let contexts=this.iterationMethods.get(receiver);
        if(!contexts){contexts=new Map();this.iterationMethods.set(receiver,contexts);}
        let method=contexts.get(context);
        if(!method){method=this.property(receiver,this.wellKnownSymbols.get("iterator")!,context);contexts.set(context,method);}
        return method;
    }
    private arrayLikeLists(receiver:Cell,context:ts.Node,rule:Rule,completion:Cell,nullable=false):Array<readonly Cell[]|null> {
        let empty:Array<readonly Cell[]>=[];
        this.watch(rule,receiver);
        if(nullable&&[...receiver.values].some(atom=>atom===this.primitive(null)||atom===this.primitive(undefined)))empty=[[]];
        if([...receiver.values].some(atom=>atom.tag==="primitive"&&(!nullable||atom.value!==null&&atom.value!==undefined)||atom.tag==="text-operation")){
            this.publish(completion,this.abrupt);
            const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));
        }
        {
            let objects=this.arrayLikeObjectInputs.get(receiver);
            if(!objects){
                objects=this.newCell();this.arrayLikeObjectInputs.set(receiver,objects);
                const selected=objects,input=receiver;
                this.rule([input],()=>{for(const atom of input.values)if(atom.tag!=="primitive"&&atom.tag!=="text-operation"&&atom.tag!=="abrupt")this.publish(selected,atom);});
            }
            this.watch(rule,objects);
            receiver=objects;
            if(!receiver.values.nonempty)return empty;
        }
        const literal=[...receiver.values].map(atom=>atom.tag==="object"?this.literalLists.get(atom.owner):undefined);
        if(literal.length===1&&literal[0]&&!literal[0].holes.size){
            let boundary:ts.Node=literal[0].node;
            while(boundary.parent&&(ts.isParenthesizedExpression(boundary.parent)||ts.isAsExpression(boundary.parent)||ts.isTypeAssertionExpression(boundary.parent)||ts.isNonNullExpression(boundary.parent)||ts.isSatisfiesExpression(boundary.parent)))boundary=boundary.parent;
            if(boundary.parent===context){
                this.watchList(rule,receiver,literal[0].node);
                return [...empty,...this.arguments(literal[0].parts,literal[0].node)];
            }
        }
        const state=this.primitiveState(this.arrayLikeLength(receiver,context),rule,true);
        if(state.pending&&!state.unresolved)return [...empty];
        if(!state.proof.primitiveComplete)return [null];
        if(!state.proof.values.length)this.publish(completion,this.abrupt);
        const positions=this.indexedPropertyPositions(receiver,context,rule);
        if(positions===undefined)return [];
        if(positions===null)return [null];
        return [...empty,...state.proof.values.map(extent=>{
            const values:Cell[]=[];
            for(let index=0;index<(extent as number);index++)values.push(this.indexedRead(receiver,index,context));
            return values;
        })];
    }
    private indexedPropertyPositions(receiver:Cell,context:ts.Node,rule:Rule):readonly number[]|null|undefined {
        const keys=this.propertyDomainKeys(receiver,context,rule,"index");
        return keys===null||keys===undefined?keys:keys.map(Number).sort((left,right)=>left-right);
    }
    /** Enumerate represented locations without discarding them when another
     * part of the key/owner domain is opaque. Prototype cycles close on owner
     * identity; shape and binding discoveries wake this same worklist. */
    /** `opaque` reports keys the owner graph does not enumerate; `nativeOnly`
     * says each such key belongs to a native value or to a builtin's own
     * unmodelled members, whose values are native like a known-key read of
     * the same member. */
    private propertyKeyDomain(receiver:Cell,context:ts.Node,rule:Rule,domain:"all"|"index"|"numeric"):{keys:readonly SourcePropertyKey[];locations:readonly Cell[];getters:readonly Cell[];pending:boolean;opaque:boolean;nativeOnly:boolean;unknownKeys:boolean} {
        const activation=this.enclosingActivation(context);if(activation){this.watch(rule,activation.active);this.watch(rule,this.activationTiming(activation));}
        const keys=new Set<SourcePropertyKey>(),locations=new Set<Cell>(),getters=new Set<Cell>(),pending=[...receiver.values],visited=new Set<ObjectOwner>();
        let unresolved=false,opaque=false,generic=false,unknownKeys=false;
        const add=(key:SourcePropertyKey|null)=>{
            if(key===null){unknownKeys=true;return;}
            if(domain==="all"){keys.add(key);return;}
            if(typeof key!=="string")return;
            const index=Number(key);
            if(domain==="index"){
                if(Number.isSafeInteger(index)&&index>=0&&String(index)===key)keys.add(key);
            }else if(String(index)===key)keys.add(key);
            else {try {if(String(BigInt(key))===key)keys.add(key);} catch {}}
        };
        this.watch(rule,receiver);
        while(pending.length){
            const atom=pending.pop()!;
            if(atom.tag==="pending-source"){unresolved=true;continue;}
            if(atom.tag==="abrupt"||atom.tag==="primitive"&&(atom.value===null||atom.value===undefined))continue;
            if(atom.tag==="primitive"&&typeof atom.value==="string"){
                if(domain!=="index"){opaque=true;generic=true;}
                for(let index=0;index<atom.value.length;index++)add(String(index));
                if(domain==="all")add("length");
                continue;
            }
            // A Boolean, Number, BigInt or Symbol wrapper has no own
            // properties: its keys are its kind's prototype chain's. A derived
            // primitive's kinds grow with its parts, whose changes wake the
            // receiver's rule; one that may be a String keeps unknown indices.
            const kinds=atom.tag==="primitive"?({boolean:KIND_BOOLEAN,number:KIND_NUMBER,bigint:KIND_BIGINT,symbol:KIND_SYMBOL} as Record<string,number>)[typeof atom.value]??0:
                atom.tag==="non-string"?atom.kinds??(KIND_PRIMITIVE&~KIND_STRING):atom.tag==="text-operation"?this.primitiveKinds(this.atomCell(atom)):0;
            if(kinds&&!(kinds&KIND_STRING)){
                for(const prototype of this.kindPrototypes(kinds)){
                    this.watch(rule,prototype);for(const parent of prototype.values)pending.push(parent);
                }
                continue;
            }
            const owner=this.ordinaryOwner(atom);
            if(!owner){opaque=true;if(atom!==this.nativeUnknown)generic=true;continue;}
            if(visited.has(owner))continue;visited.add(owner);
            this.watch(rule,owner.shape);
            if(!this.definitionsReady(owner,rule))unresolved=true;
            if(this.opaqueShape(owner,context)){opaque=true;generic=true;}
            else if(atom.tag==="builtin"&&!owner.closedOwn&&(domain==="all"||!owner.closedIndices))opaque=true;
            const names=this.ownerKeys(owner,rule);
            if(names===null){opaque=true;generic=true;}
            else if(names===undefined)unresolved=true;
            for(const key of names??[...owner.fields.keys(),...owner.accessors.keys()])add(key);
            const location=this.unknownPropertyLocations.get(owner);if(location)locations.add(location.value);
            const accessor=owner.accessors.get(null);if(accessor){getters.add(accessor.get);unknownKeys=true;}
            if(owner.proxy){locations.add(this.proxyReadEffects(owner,null,"get",context));opaque=true;generic=true;}
            if(atom.tag==="global")for(const key of runtimeGlobalBindings.keys())add(key);
            if(owner.prototype){
                this.watch(rule,owner.prototype);
                if(!owner.prototype.values.nonempty)unresolved=true;
                for(const prototype of owner.prototype.values)if(prototype!==this.primitive(null))pending.push(prototype);
            }
        }
        return {keys:[...keys],locations:[...locations],getters:[...getters],pending:unresolved,opaque,nativeOnly:opaque&&!generic,unknownKeys};
    }
    private propertyDomainKeys(receiver:Cell,context:ts.Node,rule:Rule,domain:"index"|"numeric"):readonly string[]|null|undefined {
        const projection=this.propertyKeyDomain(receiver,context,rule,domain);
        return projection.opaque||projection.unknownKeys?null:projection.pending?undefined:projection.keys as readonly string[];
    }
    private property(base: Cell, key: SourcePropertyKey, context?: ts.Node, ownOnly=false,receiver=base): Cell {
        let keys=this.propertyReads.get(base);if(!keys){keys=new Map();this.propertyReads.set(base,keys);}
        let contexts=keys.get(key);if(!contexts){contexts=new Map();keys.set(key,contexts);}
        let roles=contexts.get(context);if(!roles){roles=new Map();contexts.set(context,roles);}
        const role=ownOnly+":"+receiver.id,prior=roles.get(role);if(prior)return prior;
        const result = this.newCell();roles.set(role,result);
        this.returnTransforms.set(result,{kind:"projection",inputs:[base,receiver],evaluate:inputs=>this.property(inputs[0]!,key,context,ownOnly,inputs[1]!)});
        const rule = this.rule([base], () => { for (const atom of base.values) this.read(atom, receiver, key, result, context && this.exceptionHandlers.get(context), rule, context,ownOnly); });
        return result;
    }
    private instanceofSource(value:Cell,target:Cell,context:ts.Node):Cell {
        let calls=this.instanceSources.get(context);if(!calls){calls=new Map();this.instanceSources.set(context,calls);}
        const key="dispatch:"+value.id+":"+target.id,prior=calls.get(key);if(prior)return prior;
        const result=this.newCell(),objects=this.newCell(),callee=this.newCell(),ordinary=this.newCell(),returned=this.newCell();calls.set(key,result);
        const fail=()=>{this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));};
        this.rule([target],()=>{for(const atom of target.values){if(this.ordinaryOwner(atom))this.publish(objects,atom);else if(atom.tag==="unknown"||atom.tag==="opaque-object"){this.publish(objects,atom);this.publish(result,this.primitive(true));this.publish(result,this.primitive(false));this.activateOpaqueEffect(context);}else if(atom.tag!=="pending-source"&&atom.tag!=="abrupt")fail();}});
        const method=this.property(objects,this.wellKnownSymbols.get("hasInstance")!,context),atoms=new Map<Atom,Cell>();
        this.rule([method],()=>{for(const atom of method.values){
            if(atom===this.primitive(undefined)||atom===this.primitive(null)){this.copy(objects,ordinary);continue;}
            let input=atoms.get(atom);if(!input){input=this.newCell();atoms.set(atom,input);this.publish(input,atom);}const kinds=this.primitiveKinds(input);
            if(kinds&KIND_FUNCTION)this.publish(callee,atom);if(kinds&~KIND_FUNCTION)fail();
        }});
        this.invoke(context,callee,objects,[{cell:value,spread:false}],returned);this.copy(this.booleanPrimitive(returned),result);
        this.copy(this.ordinaryInstanceSource(value,ordinary,context),result);return result;
    }
    private ordinaryInstanceSource(value:Cell,target:Cell,context:ts.Node):Cell {
        let calls=this.instanceSources.get(context);if(!calls){calls=new Map();this.instanceSources.set(context,calls);}
        const key="ordinary:"+value.id+":"+target.id,prior=calls.get(key);if(prior)return prior;
        const result=this.newCell(),callable=this.newCell(),atoms=new Map<Atom,Cell>();calls.set(key,result);
        this.rule([target],()=>{for(const atom of target.values){let input=atoms.get(atom);if(!input){input=this.newCell();atoms.set(atom,input);this.publish(input,atom);}const kinds=this.primitiveKinds(input);
            if(atom.tag==="bound"){this.copy(this.instanceofSource(value,atom.target,context),result);continue;}
            if(kinds&KIND_FUNCTION)this.publish(callable,atom);if(atom.tag==="unknown"||atom.tag==="opaque-object")this.publish(result,this.primitive(true));if(kinds&~KIND_FUNCTION)this.publish(result,this.primitive(false));
        }});
        const selected=this.newCell();this.rule([value],()=>{for(const atom of value.values){if(this.ordinaryOwner(atom)||atom.tag==="unknown"||atom.tag==="opaque-object")this.copy(callable,selected);else if(atom.tag!=="pending-source"&&atom.tag!=="abrupt")this.publish(result,this.primitive(false));}});
        const prototype=this.property(selected,"prototype",context);let rule!:Rule;
        rule=this.rule([value,prototype],()=>{
            for(const atom of prototype.values){if(!this.ordinaryOwner(atom)){if(atom.tag!=="pending-source"&&atom.tag!=="abrupt"){const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));}continue;}
                for(const input of value.values){const owner=this.ordinaryOwner(input);if(!owner){if(input.tag!=="pending-source"&&input.tag!=="abrupt")this.publish(result,this.primitive(false));continue;}
                    const pending=[owner],visited=new Set<ObjectOwner>();while(pending.length){const current=pending.pop()!;if(visited.has(current))continue;visited.add(current);this.watch(rule,current.shape);
                        if(current.proxy){this.proxyReadEffects(current,"prototype","get",context);this.activateOpaqueEffect(context);}
                        if(current.prototype){this.watch(rule,current.prototype);for(const parent of current.prototype.values){if(this.ordinaryOwner(parent)===this.ordinaryOwner(atom))this.publish(result,this.primitive(true));const next=this.ordinaryOwner(parent);if(next)pending.push(next);}}
                    }
                    this.publish(result,this.primitive(false));
                }
            }
        });return result;
    }
    private promiseDestination(value:Cell,rejection:Cell,origin:ts.Node):SourcePromiseDestination {
        let rejections=this.promiseDestinations.get(value);if(!rejections){rejections=new Map();this.promiseDestinations.set(value,rejections);}
        let destination=rejections.get(rejection);if(!destination){destination={value,rejection,origin};rejections.set(rejection,destination);}
        return destination;
    }
    private promiseResolverCells(destination:SourcePromiseDestination,allocation:ts.Node):readonly Cell[] {
        const cached=destination.resolvers?.get(allocation);if(cached)return cached;
        const resolvers=[false,true].map(reject=>{
            const cell=this.newCell(),fields:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.callablePrototype("ordinary")};
            const length=this.newCell(),name=this.newCell();this.publish(length,this.primitive(1));this.publish(name,this.primitive(""));
            this.defineField(fields,"length",length,false);this.defineField(fields,"name",name,false);
            this.copy(this.opaqueMutation,fields.shape);this.publish(cell,{tag:"promise-resolver",destination,reject,fields});return cell;
        });
        (destination.resolvers??=new Map()).set(allocation,resolvers);return resolvers;
    }
    private promiseStaticCapability(member:string,context:ts.Node,args:readonly Cell[]|null):Cell {
        let calls=this.promiseConstructions.get(context);if(!calls){calls=new Map();this.promiseConstructions.set(context,calls);}
        const key=member+":"+(args?.map(cell=>cell.id).join(",")??"unknown"),prior=calls.get(key);if(prior)return prior;
        const result=this.newCell(),value=this.newCell(),rejection=this.exceptionCell(),promise=this.newCell();calls.set(key,result);this.publish(promise,{tag:"promise",value,rejection});
        if(member==="withResolvers"){
            const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype(),ordinary:true};this.ownerCreations.set(owner,context);this.ownerMutation(owner);this.publish(result,{tag:"object",owner});
            const [resolve,reject]=this.promiseResolverCells(this.promiseDestination(value,rejection,context),context);this.defineField(owner,"promise",promise);this.defineField(owner,"resolve",resolve!);this.defineField(owner,"reject",reject!);
        }else{
            this.copy(promise,result);const returned=this.newCell(),callback=ts.setTextRange(ts.factory.createEmptyStatement(),context);(callback as ts.Node&{parent:ts.Node}).parent=context;this.exceptionHandlers.set(callback,rejection);
            if(args){
                const target=args[0]??(()=>{const cell=this.newCell();this.publish(cell,this.primitive(undefined));return cell})(),callable=this.newCell(),atoms=new Map<Atom,Cell>();
                this.rule([target],()=>{for(const atom of target.values){let input=atoms.get(atom);if(!input){input=this.newCell();atoms.set(atom,input);this.publish(input,atom);}const kinds=this.primitiveKinds(input);if(kinds&KIND_FUNCTION)this.publish(callable,atom);if(kinds&~KIND_FUNCTION){this.publish(rejection,this.nativeException(context));this.publish(returned,this.abrupt);}}});
                this.invoke(callback,callable,this.empty,args.slice(1).map(cell=>({cell,spread:false})),returned);
            }
            else{this.publish(returned,this.unknown);this.publish(rejection,this.unknown);this.activateOpaqueEffect(context);}
            this.promiseAssimilation(returned,callback,this.promiseDestination(value,rejection,context));
        }
        return result;
    }
    private promiseConstruction(context:ts.Node,executor:Cell):Cell {
        let calls=this.promiseConstructions.get(context);if(!calls){calls=new Map();this.promiseConstructions.set(context,calls);}
        const key="executor:"+executor.id,prior=calls.get(key);if(prior)return prior;
        const result=this.newCell(),value=this.newCell(),rejection=this.exceptionCell();calls.set(key,result);
        this.publish(result,{tag:"promise",value,rejection});
        const resolvers=this.promiseResolverCells(this.promiseDestination(value,rejection,context),context).map(cell=>({cell,spread:false}));
        const callback=ts.setTextRange(ts.factory.createEmptyStatement(),context);(callback as ts.Node&{parent:ts.Node}).parent=context;this.exceptionHandlers.set(callback,rejection);
        const callable=this.newCell(),atoms=new Map<Atom,Cell>();
        this.rule([executor],()=>{for(const atom of executor.values){let input=atoms.get(atom);if(!input){input=this.newCell();atoms.set(atom,input);this.publish(input,atom);}const kinds=this.primitiveKinds(input);if(kinds&KIND_FUNCTION)this.publish(callable,atom);if(kinds&~KIND_FUNCTION){this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));}}});
        this.invoke(callback,callable,this.empty,resolvers,this.newCell());
        return result;
    }
    private promisePrototype():Cell {
        if(this.promisePrototypeValue)return this.promisePrototypeValue;
        const value=this.newCell(),owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype()};
        this.promisePrototypeValue=value;this.publish(value,{tag:"object",owner});
        this.copy(this.opaqueMutation,owner.shape);
        this.defineField(owner,"constructor",this.globalBinding("Promise"),false);
        const tag=this.newCell();this.publish(tag,this.primitive("Promise"));this.defineField(owner,this.wellKnownSymbols.get("toStringTag")!,tag,false);
        for(const [name,descriptor]of runtimePromiseMethods)if(!descriptor.static){
            const method=this.newCell();this.publish(method,this.operation(`promise-member:${name}`));this.defineField(owner,name,method,false);
        }
        return value;
    }

    private promiseSpeciesReady(receiver:Cell,context:ts.Node):Cell {
        let calls=this.promiseReactions.get(context);if(!calls){calls=new Map();this.promiseReactions.set(context,calls);}
        const key="species:"+receiver.id,prior=calls.get(key);if(prior)return prior;
        const normal=this.newCell(),objects=this.newCell(),constructors=this.newCell();calls.set(key,normal);
        const reject=()=>{const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));};
        this.rule([receiver],()=>{for(const atom of receiver.values){if(this.ordinaryOwner(atom)||atom.tag==="unknown"||atom.tag==="opaque-object")this.publish(objects,atom);else if(atom.tag!=="pending-source"&&atom.tag!=="abrupt")reject();}});
        const constructor=this.property(objects,"constructor",context);
        this.rule([constructor],()=>{for(const atom of constructor.values){
            if(atom===this.primitive(undefined))this.publish(normal,this.primitive(true));
            else if(this.ordinaryOwner(atom)||atom.tag==="unknown"||atom.tag==="opaque-object")this.publish(constructors,atom);
            else if(atom.tag!=="pending-source"&&atom.tag!=="abrupt")reject();
        }});
        const species=this.property(constructors,this.wellKnownSymbols.get("species")!,context),cells=new Map<Atom,Cell>();
        // Every unknown species value validates identically (both outcomes plus
        // an opaque effect), so unknown atoms share one checked cell instead of
        // one cell and validity rule per provenance.
        let unknownSpecies:Atom|undefined;
        let rule!:Rule;rule=this.rule([species],()=>{for(const atom of species.values){
            if(atom===this.primitive(undefined)||atom===this.primitive(null)){this.publish(normal,this.primitive(true));continue;}
            if(atom.tag==="abrupt"||atom.tag==="pending-source")continue;
            const key=atom.tag==="unknown"?(unknownSpecies??=atom):atom;
            let cell=cells.get(key);if(!cell){cell=this.newCell();cells.set(key,cell);this.publish(cell,key)}
            const valid=this.constructorValidity(cell,context);this.watch(rule,valid);
            if(valid.values.has(this.primitive(false)))reject();
            if(valid.values.has(this.primitive(true))){
                this.publish(normal,this.primitive(true));
                if(atom.tag==="function"||atom.tag==="bound"){
                    // Custom capabilities are not represented yet. Their
                    // constructors and resolvers can access captured source
                    // locations, so those locations retain an opaque effect.
                    this.opaqueCallableCaptures(cell,context);
                }else if(atom.tag!=="builtin"||atom.name!=="Promise"){
                    this.opaqueEffect(context);
                }
            }
        }});return normal;
    }

    private promiseCatch(receiver:Cell,handler:Cell,context:ts.Node):Cell {
        let calls=this.promiseReactions.get(context);if(!calls){calls=new Map();this.promiseReactions.set(context,calls);}
        const key="catch:"+receiver.id+":"+handler.id,prior=calls.get(key);if(prior)return prior;
        const result=this.newCell(),omitted=this.newCell();calls.set(key,result);this.publish(omitted,this.primitive(undefined));
        this.invoke(context,this.property(receiver,"then",context),receiver,[{cell:omitted,spread:false},{cell:handler,spread:false}],result);return result;
    }

    private promiseFinally(receiver:Cell,handler:Cell,context:ts.Node):Cell {
        let calls=this.promiseReactions.get(context);if(!calls){calls=new Map();this.promiseReactions.set(context,calls);}
        const key="finally-call:"+receiver.id+":"+handler.id,prior=calls.get(key);if(prior)return prior;
        const result=this.newCell(),fulfilled=this.newCell(),rejected=this.newCell(),callable=this.newCell(),target=this.newCell();calls.set(key,result);
        this.publish(target,this.operation("promise-finally-forward"));
        const wrappers=[false,true].map(rejected=>{
            const state=this.newCell(),name=this.newCell(),length=this.newCell(),fields:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.callablePrototype("ordinary")};
            this.publish(state,this.primitive(rejected));this.publish(name,this.primitive(""));this.publish(length,this.primitive(1));this.defineField(fields,"name",name,false);this.defineField(fields,"length",length,false);
            return {tag:"bound",target,receiver:this.empty,prefix:[callable,state],fields} as const;
        });
        const cells=new Map<Atom,Cell>();
        this.rule([handler],()=>{for(const atom of handler.values){let cell=cells.get(atom);if(!cell){cell=this.newCell();cells.set(atom,cell);this.publish(cell,atom)}const kinds=this.primitiveKinds(cell);if(kinds&KIND_FUNCTION){this.publish(callable,atom);this.publish(fulfilled,wrappers[0]!);this.publish(rejected,wrappers[1]!)}if(kinds&~KIND_FUNCTION){this.publish(fulfilled,atom);this.publish(rejected,atom)}}});
        const ready=this.promiseSpeciesReady(receiver,context),selected=this.newCell();this.rule([ready],()=>{if(ready.values.has(this.primitive(true)))this.copy(receiver,selected)});
        this.invoke(context,this.property(selected,"then",context),receiver,[{cell:fulfilled,spread:false},{cell:rejected,spread:false}],result);return result;
    }

    private promiseAssimilation(returned:Cell,context:ts.Node,destination?:SourcePromiseDestination):SourcePromiseDestination {
        let calls=this.promiseReactions.get(context);if(!calls){calls=new Map();this.promiseReactions.set(context,calls);}
        const key="assimilation:"+returned.id+(destination?":"+destination.value.id+":"+destination.rejection.id:""),prior=calls.get(key);
        if(prior){const atom=[...prior.values].find((atom):atom is Extract<Atom,{tag:"promise"}>=>atom.tag==="promise")!;return this.promiseDestination(atom.value,atom.rejection,context);}
        const holder=this.newCell(),completion=destination??this.promiseDestination(this.newCell(),this.exceptionCell(),context),{value,rejection}=completion;calls.set(key,holder);this.publish(holder,{tag:"promise",value,rejection});
        const callback=ts.setTextRange(ts.factory.createEmptyStatement(),context);(callback as ts.Node&{parent:ts.Node}).parent=context;this.exceptionHandlers.set(callback,rejection);
        // Get(then) is immediate; Call(then) runs in the resolve-thenable job.
        const job=this.invocationContext(context,{deferred:true});this.exceptionHandlers.set(job,rejection);
        const seen=new Set<Atom>(),cells=new Map<Atom,Cell>(),cell=(atom:Atom)=>{let value=cells.get(atom);if(!value){value=this.newCell();cells.set(atom,value);this.publish(value,atom)}return value;};
        // Unknown then-methods all classify alike; one canonical cell serves them.
        let unknownMethod:Atom|undefined;
        this.rule([returned],()=>{for(const atom of returned.values){
            if(atom.tag==="pending-source"){this.publish(value,atom);continue;}
            if(atom.tag==="abrupt")continue;
            // Resolving a Promise with itself rejects before Get(then). A
            // repeated allocation may also denote a different instance, so
            // retain the ordinary assimilation route in that case.
            if(atom.tag==="promise"&&atom.value===value&&atom.rejection===rejection){
                this.publish(rejection,this.nativeException(context,"TypeError"));
                if(!this.dynamicContext(completion.origin)&&!this.sourceOrigins.has(this.sourceFile(completion.origin)))continue;
            }
            const owner=this.ordinaryOwner(atom);
            if(!owner){
                this.publish(value,atom);
                if(atom.tag==="unknown"||atom.tag==="opaque-object"){
                    this.publish(rejection,this.unknown);this.activateOpaqueEffect(context);
                }
                continue;
            }
            if(seen.has(atom))continue;seen.add(atom);
            const input=cell(atom),then=this.property(input,"then",callback),target=this.newCell();
            let intrinsicThen=false;
            this.rule([then],()=>{for(const method of then.values){
                if(method.tag==="abrupt"||method.tag==="pending-source")continue;
                if(atom.tag==="promise"&&method.tag==="operation"&&method.operation==="promise-member:then"){
                    if(!intrinsicThen){intrinsicThen=true;const ready=this.promiseSpeciesReady(input,callback);
                        this.rule([ready],()=>{if(ready.values.has(this.primitive(true))){this.copy(atom.value,value);this.copy(atom.rejection,rejection);}});}continue;
                }
                const kinds=this.primitiveKinds(cell(method.tag==="unknown"?(unknownMethod??=method):method));
                if(kinds&~KIND_FUNCTION)this.publish(value,atom);
                if(kinds&KIND_FUNCTION)this.publish(target,method);
            }});
            this.invoke(job,target,input,this.promiseResolverCells(completion,context).map(cell=>({cell,spread:false})),this.newCell());
        }});return completion;
    }

    private promiseAwait(input:Cell,context:ts.Node):Cell {
        let calls=this.promiseReactions.get(context);if(!calls){calls=new Map();this.promiseReactions.set(context,calls);}
        const key="await:"+input.id,prior=calls.get(key);if(prior)return prior;
        const result=this.newCell();calls.set(key,result);
        this.returnTransforms.set(result,{kind:"projection",inputs:[input],evaluate:inputs=>this.promiseAwait(inputs[0]!,context)});
        const operand=this.promiseResolve(input,context);
        this.rule([operand],()=>{for(const atom of operand.values)if(atom.tag==="promise"){
            this.copy(atom.value,result);const handler=this.exceptionHandlers.get(context);if(handler)this.copy(atom.rejection,handler);
        }});return result;
    }

    /** PromiseResolve keeps an intrinsic Promise whose constructor matches;
     * all other values enter the same resolver/thenable graph. Await and the
     * native static resolve member share this identity and effect boundary. */
    private promiseResolve(input:Cell,context:ts.Node):Cell {
        let calls=this.promiseConstructions.get(context);if(!calls){calls=new Map();this.promiseConstructions.set(context,calls);}
        const key="resolve:"+input.id,prior=calls.get(key);if(prior)return prior;
        const result=this.newCell(),adopted=this.newCell(),seen=new Set<Atom>();calls.set(key,result);
        this.returnTransforms.set(result,{kind:"allocation",inputs:[input],evaluate:inputs=>this.promiseResolve(inputs[0]!,context)});
        const resolved=this.promiseAssimilation(adopted,context),promise:Atom={tag:"promise",value:resolved.value,rejection:resolved.rejection};
        this.publish(result,promise);const identity=this.promiseAtoms.get(resolved.value)!.get(resolved.rejection)!;
        // Actual-input views keep the allocation's mutable property owner.
        // Intern the Promise before attaching that owner: the assimilation
        // holder already publishes the same completion-cell identity.
        let owner=this.promiseResolveOwners.get(context);
        if(!owner){
            owner=this.ordinaryOwner(identity)!;this.promiseResolveOwners.set(context,owner);this.ownerCreations.set(owner,context);this.ownerMutation(owner);
        }
        else this.promiseOwners.set(identity,owner);
        this.rule([input],()=>{for(const atom of input.values){
            if(atom.tag!=="promise"){this.publish(adopted,atom);continue;}
            if(seen.has(atom))continue;seen.add(atom);
            const receiver=this.newCell();this.publish(receiver,atom);
            const constructor=this.property(receiver,"constructor",context);
            this.rule([constructor],()=>{for(const value of constructor.values){
                if(value.tag==="abrupt"||value.tag==="pending-source")continue;
                if(value.tag==="builtin"&&value.name==="Promise")this.publish(result,atom);
                else{
                    this.publish(adopted,atom);
                    if(value.tag==="unknown"||value.tag==="opaque-object"){
                        this.publish(result,atom);this.activateOpaqueEffect(context);
                        const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.unknown);
                    }
                }
            }});
        }});return result;
    }

    private promiseFinallyForward(handler:Cell,previous:Cell,rejected:Cell,context:ts.Node):Cell {
        let calls=this.promiseReactions.get(context);if(!calls){calls=new Map();this.promiseReactions.set(context,calls);}
        const key="finally:"+handler.id+":"+previous.id+":"+rejected.id,prior=calls.get(key);if(prior)return prior;
        const result=this.newCell(),value=this.newCell(),rejection=this.exceptionCell(),returned=this.newCell();calls.set(key,result);
        const callback=ts.setTextRange(ts.factory.createEmptyStatement(),context);(callback as ts.Node&{parent:ts.Node}).parent=context;this.exceptionHandlers.set(callback,rejection);
        this.publish(result,{tag:"promise",value,rejection});this.invoke(callback,handler,this.empty,[],returned);
        const preserve=()=>{if(rejected.values.has(this.primitive(true)))this.copy(previous,rejection);if(rejected.values.has(this.primitive(false)))this.copy(previous,value);};
        const assimilated=this.promiseAssimilation(returned,callback);this.copy(assimilated.rejection,rejection);
        this.rule([assimilated.value,rejected],()=>{if([...assimilated.value.values].some(atom=>atom.tag!=="abrupt"&&atom.tag!=="pending-source"))preserve()});return result;
    }

    private promiseReaction(receiver:Cell,fulfilled:Cell,rejected:Cell,context:ts.Node):Cell {
        let calls=this.promiseReactions.get(context);if(!calls){calls=new Map();this.promiseReactions.set(context,calls);}
        const key=receiver.id+":"+fulfilled.id+":"+rejected.id;const prior=calls.get(key);if(prior)return prior;
        const result=this.newCell(),value=this.newCell(),rejection=this.exceptionCell();calls.set(key,result);
        const callbackContext=this.invocationContext(context,{deferred:true});
        this.exceptionHandlers.set(callbackContext,rejection);
        const seen=new Set<Atom>(),atomCells=new Map<Atom,Cell>(),cell=(atom:Atom)=>{let value=atomCells.get(atom);if(!value){value=this.newCell();atomCells.set(atom,value);this.publish(value,atom)}return value};
        this.rule([receiver],()=>{for(const promise of receiver.values){
            if(promise.tag!=="promise"){
                if(promise.tag==="pending-source")this.publish(result,promise);
                else {this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));}
                continue;
            }
            if(seen.has(promise))continue;seen.add(promise);
            const instance=this.newCell();this.publish(instance,promise);
            const ready=this.promiseSpeciesReady(instance,context);
            this.rule([ready],()=>{if(ready.values.has(this.primitive(true)))this.publish(result,{tag:"promise",value,rejection})});
            for(const route of [{input:promise.value,handler:fulfilled,rejected:false},{input:promise.rejection,handler:rejected,rejected:true}]){
                const callee=this.newCell(),returned=this.newCell();
                this.rule([route.input,route.handler,ready],()=>{
                    if(!ready.values.has(this.primitive(true)))return;
                    if(![...route.input.values].some(atom=>atom.tag!=="abrupt"&&atom.tag!=="pending-source"))return;
                    for(const handler of route.handler.values){
                        const kinds=this.primitiveKinds(cell(handler));
                        if(kinds&KIND_FUNCTION)this.publish(callee,handler);
                        if(kinds&~KIND_FUNCTION)this.copy(route.input,route.rejected?rejection:value);
                    }
                });
                this.invoke(callbackContext,callee,this.empty,[{cell:route.input,spread:false}],returned);
                this.promiseAssimilation(returned,callbackContext,this.promiseDestination(value,rejection,context));
            }
        }});
        return result;
    }

    private generatorInstance(owner:FunctionOwner,inputs:ReadonlyMap<Cell,Cell>,context:ts.Node):Cell {
        let calls=this.generatorInstances.get(context);if(!calls){calls=new Map();this.generatorInstances.set(context,calls);}
        const key=this.cell(owner.definition).id+":"+[...inputs].map(([formal,input])=>formal.id+"="+input.id).join(","),prior=calls.get(key);if(prior)return prior;
        const result=this.newCell();calls.set(key,result);
        const fields:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.newCell(),ordinary:true};
        this.ownerCreations.set(fields,context);this.sourceObjectOwners.add(fields);this.ownerMutation(fields);
        const prototype=this.property(this.cell(owner.definition),"prototype",context);
        this.rule([prototype],()=>{for(const value of prototype.values){if(this.ordinaryOwner(value))this.publish(fields.prototype!,value);else if(value.tag!=="pending-source"&&value.tag!=="abrupt")this.publish(fields.prototype!,this.intrinsic("instance",owner.kind));}});
        this.publish(result,{tag:"generator",owner,fields,yielded:this.projectReturn(owner.yields,inputs),returned:this.projectReturn(owner.returns,inputs)});return result;
    }

    private asyncIteratorPrototype(realm=this.currentRealm):Cell {
        const prior=this.asyncIteratorPrototypes.get(realm);if(prior)return prior;
        const result=this.newCell(),owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.realmObjectPrototype(realm),ordinary:true};this.asyncIteratorPrototypes.set(realm,result);this.publish(result,{tag:"object",owner});this.copy(this.opaqueMutation,owner.shape);
        const self=this.newCell();this.publish(self,this.realmOperation(realm,"collection-iterator:self"));this.defineField(owner,this.wellKnownSymbols.get("asyncIterator")!,self,false);return result;
    }

    private generatorReaction(receiver:Cell,kind:string,completion:string,input:Cell,context:ts.Node):Cell {
        let calls=this.generatorReactions.get(context);if(!calls){calls=new Map();this.generatorReactions.set(context,calls);}
        const key=receiver.id+":"+kind+":"+completion+":"+input.id,prior=calls.get(key);if(prior)return prior;
        const result=this.newCell(),value=this.newCell(),rejection=this.exceptionCell(),record=this.newCell(),seen=new Set<Atom>();calls.set(key,result);
        const callback=ts.setTextRange(ts.factory.createEmptyStatement(),context);(callback as ts.Node&{parent:ts.Node}).parent=context;this.exceptionHandlers.set(callback,rejection);
        const fields:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype(),ordinary:true};
        this.sourceObjectOwners.add(fields);this.defineField(fields,"value",kind==="async-generator"?this.promiseAwait(value,callback):value);this.defineBooleanField(fields,"done");this.publish(record,{tag:"object",owner:fields});
        const fail=()=>{const error=this.nativeException(context);if(kind==="async-generator")this.publish(rejection,error);else{this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,error);}};
        if(kind==="async-generator"){const adopted=this.promiseAssimilation(record,callback);this.copy(adopted.rejection,rejection);this.publish(result,{tag:"promise",value:adopted.value,rejection});}
        this.rule([receiver],()=>{for(const atom of receiver.values){
            if(atom.tag==="pending-source")continue;
            if(atom.tag!=="generator"||atom.owner.kind!==kind){
                if(atom.tag!=="abrupt")fail();
                if(atom.tag==="unknown"||atom.tag==="opaque-object"){
                    this.publish(value,this.unknown);this.publish(rejection,this.unknown);this.activateOpaqueEffect(context);
                    if(kind!=="async-generator")this.copy(record,result);
                }
                continue;
            }
            if(seen.has(atom))continue;seen.add(atom);
            this.copy(atom.yielded,value);this.copy(atom.returned,value);
            if(completion==="NORMAL")this.copy(input,atom.owner.yieldReceives);
            if(completion==="RETURN")this.copy(input,value);
            if(completion==="THROW"){this.copy(input,atom.owner.yieldThrows);this.copy(input,rejection);}
            this.copy(atom.owner.throws,rejection);
            if(kind!=="async-generator"){
                this.copy(record,result);const handler=this.exceptionHandlers.get(context);if(handler)this.copy(rejection,handler);
            }
        }});return result;
    }

    private ordinaryOwner(atom: Atom): ObjectOwner | null {
        const owner=this.representedOwner(atom);
        // Native callable metadata remains primitive data even when its
        // exact spelling or expected argument count is not represented.
        if(owner&&atom.tag==="builtin"&&atom.normalResult!=="not-callable"){
            let number=this.numericValues.get(KIND_NUMBER);if(!number){number={tag:"non-string",kinds:KIND_NUMBER};this.numericValues.set(KIND_NUMBER,number);}
            for(const [key,value]of [["name",this.unknownString],["length",number]] as const)if(!owner.fields.has(key)){
                const cell=this.newCell();this.publish(cell,value);this.defineField(owner,key,cell,false);
            }
        }
        if(owner&&(atom.tag==="function"||atom.tag==="bound"||atom.tag==="operation"||atom.tag==="promise-resolver"||atom.tag==="builtin"&&atom.normalResult!=="not-callable"||atom.tag==="intrinsic"&&(atom.domain==="constructor"||atom.domain==="prototype"&&atom.kind==="ordinary")))
            for(const key of ["name","length"])if(owner.own?.get(key)?.initial)this.markReadonly(owner,key);
        return owner;
    }
    private representedOwner(atom: Atom): ObjectOwner | null {
        if(atom.tag==="promise") {
            let owner=this.promiseOwners.get(atom);
            if(!owner){owner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.promisePrototype(),ordinary:true};this.promiseOwners.set(atom,owner);}
            return owner;
        }

        if(atom.tag==="global"){
            if(!atom.realm.owner){
                atom.realm.owner={fields:new Map(),accessors:new Map(),shape:this.newCell()};
                this.ownerRealms.set(atom.realm.owner,atom.realm);
                // The global object is an ordinary object: an unknown-key write
                // stores a property, it does not hand the object to native code.
                this.markPropertyAlgorithm(atom.realm.owner,"ordinary");
                atom.realm.owner.prototype=this.realmObjectPrototype(atom.realm);
                this.copy(this.globalMutation,atom.realm.owner.shape);
                for(const[key,binding]of atom.realm.bindings)this.attachField(atom.realm.owner,key,binding);
                for(const key of runtimeGlobalBindings.keys())this.ownPresence(atom.realm.owner,key).initial=true;
            }
            return atom.realm.owner;
        }
        if(atom.tag==="generator")return atom.fields;
        if(atom.tag === "object")return atom.owner;
        if(atom.tag === "function")return atom.owner.fields;
        if(atom.tag === "promise-resolver")return atom.fields;
        const nativeMethod=atom.tag==="operation"?SOURCE_NATIVE_METHODS.get(atom.operation):undefined;
        if(nativeMethod){
            let owner=this.intrinsicOwners.get(atom);
            if(!owner){
                const prototype=this.newCell();this.publish(prototype,this.intrinsic("prototype","ordinary",atom.tag==="operation"?atom.realm:this.currentRealm));
                owner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype};this.intrinsicOwners.set(atom,owner);
                const frozen=atom.tag==="operation"&&atom.operation==="throw-type-error";
                if(!frozen)this.copy(this.opaqueMutation,owner.shape);
                const text=this.newCell(),length=this.newCell();this.publish(text,this.primitive(nativeMethod.name));this.publish(length,this.primitive(nativeMethod.length));this.defineField(owner,"name",text,false);this.defineField(owner,"length",length,false);
                if(frozen)owner.immutableOwn=true;
            }
            return owner;
        }
        if(atom.tag==="operation"&&atom.operation.startsWith("callback-timer:")){
            let owner=this.intrinsicOwners.get(atom);if(!owner){owner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.callablePrototype("ordinary")};this.intrinsicOwners.set(atom,owner);this.copy(this.opaqueMutation,owner.shape);const spelling=atom.operation.slice("callback-timer:".length),descriptor=runtimeCallbackTimerDescriptors.get(spelling)!,name=this.newCell(),length=this.newCell();this.publish(name,this.primitive(spelling));this.publish(length,this.primitive(descriptor.length));this.defineField(owner,"name",name,false);this.defineField(owner,"length",length,false);}return owner;
        }
        if(atom.tag === "bound")return atom.fields;
        if(atom.tag === "builtin")return atom.fields;
        if(atom.tag==="operation"&&atom.operation.startsWith("atomics-member:")){
            let owner=this.intrinsicOwners.get(atom);if(!owner){owner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.callablePrototype("ordinary")};this.intrinsicOwners.set(atom,owner);this.copy(this.opaqueMutation,owner.shape);
                const operation=atom.operation.slice("atomics-member:".length),descriptor=runtimeAtomicsMethods.get(operation)!,name=this.newCell(),length=this.newCell();this.publish(name,this.primitive(operation));this.publish(length,this.primitive(descriptor.length));this.defineField(owner,"name",name);this.defineField(owner,"length",length);
            }return owner;
        }
        if(atom.tag==="operation"&&atom.operation.startsWith("math-member:")){
            let owner=this.intrinsicOwners.get(atom);if(!owner){owner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.callablePrototype("ordinary")};this.intrinsicOwners.set(atom,owner);this.copy(this.opaqueMutation,owner.shape);
                const operation=atom.operation.slice("math-member:".length),descriptor=runtimeMathMethods.get(operation)!,name=this.newCell(),length=this.newCell();this.publish(name,this.primitive(operation));this.publish(length,this.primitive(descriptor.length));this.defineField(owner,"name",name);this.defineField(owner,"length",length);
            }return owner;
        }
        if(atom.tag==="operation"&&atom.operation.startsWith("primitive-member:")){
            let owner=this.intrinsicOwners.get(atom);if(!owner){owner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.callablePrototype("ordinary")};this.intrinsicOwners.set(atom,owner);this.copy(this.opaqueMutation,owner.shape);
                const member=atom.operation.slice("primitive-member:".length),name=this.newCell(),length=this.newCell();this.publish(name,this.primitive(member.slice(member.indexOf(":")+1)));this.publish(length,this.primitive(PRIMITIVE_MEMBER_LENGTHS.get(member)!));this.defineField(owner,"name",name,false);this.defineField(owner,"length",length,false);
            }return owner;
        }
        if(atom.tag==="operation"&&(atom.operation.startsWith("regexp-flag:")||atom.operation.startsWith("regexp-member:"))){
            let owner=this.intrinsicOwners.get(atom);if(!owner){
                owner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.callablePrototype("ordinary")};this.intrinsicOwners.set(atom,owner);this.copy(this.opaqueMutation,owner.shape);
                const member=atom.operation.slice(atom.operation.indexOf(":")+1),flag=atom.operation.startsWith("regexp-flag:"),method=REGEXP_METHODS.get(member);
                const name=this.newCell(),length=this.newCell();this.publish(name,this.primitive(flag?`get ${member}`:method?.symbol?`[Symbol.${member}]`:member));this.publish(length,this.primitive(flag?0:method?.length??0));
                this.defineField(owner,"name",name,false);this.defineField(owner,"length",length,false);
            }return owner;
        }
        if(atom.tag==="operation"&&atom.operation.startsWith("set-composition:")){
            let owner=this.intrinsicOwners.get(atom);if(!owner){owner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.callablePrototype("ordinary")};this.intrinsicOwners.set(atom,owner);this.copy(this.opaqueMutation,owner.shape);
                const name=this.newCell(),length=this.newCell(),operation=atom.operation.slice("set-composition:".length);this.publish(name,this.primitive([...runtimeSetCompositionMethods].find(([,value])=>value===operation)![0]));this.publish(length,this.primitive(1));this.defineField(owner,"name",name);this.defineField(owner,"length",length);
            }return owner;
        }
        if(atom.tag==="operation"&&(jsonOperations.has(atom.operation as JSONSourceOperation)||atom.operation==="util-format"||atom.operation==="error-brand"||atom.operation==="array-brand")) {
            let owner=this.intrinsicOwners.get(atom);
            if(!owner) {
                owner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.callablePrototype("ordinary")};this.intrinsicOwners.set(atom,owner);
                this.copy(this.opaqueMutation,owner.shape);
                const descriptor=atom.operation==="util-format"?{name:"format",length:1}:atom.operation==="error-brand"?{name:"isError",length:1}:atom.operation==="array-brand"?{name:"isArray",length:1}:jsonOperations.get(atom.operation as JSONSourceOperation)!,name=this.newCell(),length=this.newCell();
                this.publish(name,this.primitive(descriptor.name));this.publish(length,this.primitive(descriptor.length));
                this.defineField(owner,"name",name);this.defineField(owner,"length",length);
            }
            return owner;
        }
        if(atom.tag==="operation"&&atom.operation.startsWith("generator-member:")){
            let owner=this.intrinsicOwners.get(atom);if(!owner){
                owner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.callablePrototype("ordinary")};this.intrinsicOwners.set(atom,owner);this.copy(this.opaqueMutation,owner.shape);
                const completion=atom.operation.split(":")[2],entry=[...runtimeGeneratorMethods].find(([,entry])=>entry.completion===completion)!;
                const name=this.newCell(),length=this.newCell();this.publish(name,this.primitive(entry[0]));this.publish(length,this.primitive(entry[1].length));this.defineField(owner,"name",name,false);this.defineField(owner,"length",length,false);
            }return owner;
        }
        if(atom.tag === "operation" && (atom.operation==="agent-start"||atom.operation.startsWith("agent-member:"))){
            let owner=this.intrinsicOwners.get(atom);
            if(!owner){
                owner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.callablePrototype("ordinary")};this.intrinsicOwners.set(atom,owner);
                const name=atom.operation==="agent-start"?"start":atom.operation.slice("agent-member:".length),descriptor=test262AgentOperations.get(name)!;
                const named=this.newCell(),length=this.newCell();this.publish(named,this.primitive(name));this.publish(length,this.primitive(descriptor.length));this.defineField(owner,"name",named);this.defineField(owner,"length",length);
            }
            return owner;
        }
        if(atom.tag==="operation"){
            let owner=this.intrinsicOwners.get(atom);
            if(!owner){
                const prototype=this.newCell();this.publish(prototype,this.intrinsic("prototype","ordinary",atom.realm));
                owner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype};this.intrinsicOwners.set(atom,owner);this.copy(this.opaqueMutation,owner.shape);
                const name=this.newCell(),length=this.newCell();this.publish(name,this.unknownString);
                let numeric=this.numericValues.get(KIND_NUMBER);if(!numeric){numeric={tag:"non-string",kinds:KIND_NUMBER};this.numericValues.set(KIND_NUMBER,numeric);}this.publish(length,numeric);
                this.defineField(owner,"name",name,false);this.defineField(owner,"length",length,false);
            }
            return owner;
        }
        if(atom.tag === "intrinsic"){
            let owner=this.intrinsicOwners.get(atom);
            if(!owner){
                owner={fields:new Map(),accessors:new Map(),shape:this.newCell()};this.intrinsicOwners.set(atom,owner);
                if(atom.domain==="prototype"){
                    if(atom.kind==="ordinary"){const name=this.newCell(),length=this.newCell();this.publish(name,this.primitive(""));this.publish(length,this.primitive(0));this.defineField(owner,"name",name,false);this.defineField(owner,"length",length,false);}
                    if(atom.kind!=="ordinary"){const tag=this.newCell();this.publish(tag,this.primitive(runtimeDynamicFunctionDescriptors.get(atom.kind)!.name));this.defineField(owner,this.wellKnownSymbols.get("toStringTag")!,tag,false);}
                }
                if (atom.domain === "constructor"){
                    owner.prototype=this.newCell();this.publish(owner.prototype,this.intrinsic("prototype","ordinary",atom.realm));
                    const name=this.newCell(),length=this.newCell(),prototype=this.newCell();this.publish(name,this.primitive(runtimeDynamicFunctionDescriptors.get(atom.kind)!.name));this.publish(length,this.primitive(1));this.publish(prototype,this.intrinsic("prototype",atom.kind,atom.realm));
                    this.defineField(owner,"name",name,false);this.defineField(owner,"length",length,false);this.defineField(owner,"prototype",prototype,false);this.markReadonly(owner,"prototype");
                }
                if (atom.domain === "prototype" && atom.kind !== "ordinary"){owner.prototype=this.newCell();this.publish(owner.prototype!,this.intrinsic("prototype","ordinary",atom.realm));}
                if (atom.domain === "prototype" && atom.kind === "ordinary") {
                    owner.prototype = this.realmObjectPrototype(atom.realm??this.currentRealm);
                    for(const[operation,descriptor]of SOURCE_NATIVE_METHODS)if(descriptor.owner==="Function"){
                        const value=this.newCell();this.publish(value,this.realmOperation(atom.realm??this.currentRealm,operation));this.defineField(owner,descriptor.name,value,false);
                    }
                    const constructor=this.newCell();this.publish(constructor,this.intrinsic("constructor","ordinary",atom.realm));this.defineField(owner,"constructor",constructor,false);
                    const method=this.newCell();this.publish(method,this.realmOperation(atom.realm??this.currentRealm,"ordinary-has-instance"));this.defineField(owner,this.wellKnownSymbols.get("hasInstance")!,method,false);this.markReadonly(owner,this.wellKnownSymbols.get("hasInstance")!);
                    for(const name of runtimeFunctionRestrictedProperties){
                        for(const mode of ["get","set"] as const){const accessor=this.newCell();this.publish(accessor,this.realmOperation(atom.realm??this.currentRealm,`legacy-function-accessor:${name as "caller"|"arguments"}:${mode}`));this.defineAccessor(owner,name,mode,accessor);}
                        const presence=this.ownPresence(owner,name);presence.initial=true;this.publish(presence.enumerable,this.primitive(false));
                    }
                }
                if(atom.domain==="prototype"&&atom.kind!=="ordinary"){
                    const constructor=this.newCell();this.publish(constructor,this.intrinsic("constructor",atom.kind,atom.realm));this.defineField(owner,"constructor",constructor,false);this.markReadonly(owner,"constructor");
                    if(atom.kind.includes("generator")){const prototype=this.newCell();this.publish(prototype,this.intrinsic("instance",atom.kind,atom.realm));this.defineField(owner,"prototype",prototype,false);this.markReadonly(owner,"prototype");}
                }
                if(atom.domain==="instance"&&atom.kind.includes("generator")){
                    owner.prototype=atom.kind==="async-generator"?this.asyncIteratorPrototype(atom.realm):this.iteratorPrototype();
                    const constructor=this.newCell();this.publish(constructor,this.intrinsic("prototype",atom.kind,atom.realm));this.defineField(owner,"constructor",constructor,false);this.markReadonly(owner,"constructor");
                    const tag=this.newCell();this.publish(tag,this.primitive(atom.kind==="async-generator"?"AsyncGenerator":"Generator"));this.defineField(owner,this.wellKnownSymbols.get("toStringTag")!,tag,false);
                    for(const [name,entry]of runtimeGeneratorMethods){const method=this.newCell();this.publish(method,this.realmOperation(atom.realm??this.currentRealm,`generator-member:${atom.kind}:${entry.completion}`));this.defineField(owner,name,method,false);}
                }
                this.copy(this.opaqueMutation,owner.shape);
            }
            return owner;
        }
        if(atom.tag !== "host" && atom.tag !== "realm-record" && atom.tag !== "agent")return null;
        if(atom.tag==="realm-record"){
            if(!atom.realm.host){atom.realm.host={fields:new Map(),accessors:new Map(),shape:this.newCell()};}
            return atom.realm.host;
        }
        const key=atom.tag === "agent" ? "agent" : "host";
        let owner=this.hostOwners.get(key);
        if(!owner){
            owner={fields:new Map(),accessors:new Map(),shape:this.newCell()};this.hostOwners.set(key,owner);
            if(key==="agent")for(const descriptor of test262AgentOperations.values()){
                if(!(descriptor.roles&(this.domain?2:1)))continue;
                const value=this.newCell();this.publish(value,this.operation(descriptor.name==="start"?"agent-start":`agent-member:${descriptor.name}`));this.defineField(owner,descriptor.name,value);
            }
        }
        return owner;
    }
    private read(atom: Atom, base: Cell, key: SourcePropertyKey, result: Cell, handler?: Cell, rule?: Rule, context?: ts.Node, ownOnly=false): void {
        if(atom.tag==="primitive"&&typeof atom.value==="string"){
            if(key==="length"){this.publish(result,this.primitive(atom.value.length));return;}
            if(typeof key==="string"){
                const index=Number(key);
                if(Number.isSafeInteger(index)&&index>=0&&String(index)===key&&index<atom.value.length){this.publish(result,this.primitive(atom.value[index]));return;}
            }
        }
        if (atom.tag === "primitive" && typeof atom.value === "symbol" && key === "description") {
            this.publish(result, this.primitive(atom.value.description)); return;
        }
        if (atom.tag === "abrupt") {this.publish(result, atom); return;}
        if (atom.tag === "primitive" && (atom.value === null || atom.value === undefined)) {
            this.publish(result, this.abrupt); if (handler) this.publish(handler, this.nativeException(context!)); return;
        }
        if (atom.tag === "pending-source") {this.publish(result,atom);return;}
        if (atom.tag === "unknown" || atom.tag === "opaque-object") {
            this.publish(result, atom===this.nativeUnknown?this.nativeUnknown:this.unknown);
            if (handler) this.publish(handler, this.unknown);
            return;
        }
        // GetValue on a primitive base (sec-getvalue): the wrapper object's own
        // properties are only a String's length and indices (handled above);
        // every other key continues on the kind's intrinsic prototype with the
        // primitive itself as the receiver. An unknown String's length is a
        // Number and its indices are single code units or undefined.
        if(atom.tag==="primitive"||atom.tag==="unknown-string"||atom.tag==="text-operation"||atom.tag==="non-string"){
            const kinds=atom.tag==="primitive"?({undefined:KIND_UNDEFINED,boolean:KIND_BOOLEAN,number:KIND_NUMBER,bigint:KIND_BIGINT,string:KIND_STRING,symbol:KIND_SYMBOL} as Record<string,number>)[typeof atom.value]!:
                atom.tag==="unknown-string"?KIND_STRING:atom.tag==="non-string"?(atom.kinds??(KIND_PRIMITIVE&~KIND_STRING)):this.primitiveKinds(this.atomCell(atom));
            if(kinds&(KIND_UNDEFINED|KIND_NULL)){this.publish(result,this.abrupt);if(handler)this.publish(handler,this.nativeException(context!));}
            if(ownOnly){
                if(kinds&KIND_STRING&&typeof key==="string"&&(key==="length"||Number.isSafeInteger(Number(key))&&Number(key)>=0&&String(Number(key))===key))this.publish(result,this.unknown);
                else this.publish(result,this.primitive(undefined));
                return;
            }
            if(kinds&KIND_STRING&&atom.tag!=="primitive"&&typeof key==="string"){
                if(key==="length"){let number=this.numericValues.get(KIND_NUMBER);if(!number){number={tag:"non-string",kinds:KIND_NUMBER};this.numericValues.set(KIND_NUMBER,number);}this.publish(result,number);}
                else if(Number.isSafeInteger(Number(key))&&Number(key)>=0&&String(Number(key))===key){this.publish(result,this.unknownString);this.publish(result,this.primitive(undefined));}
            }
            for(const prototype of this.kindPrototypes(kinds)){
                if(rule)this.watch(rule,prototype);
                for(const parent of prototype.values)this.read(parent,base,key,result,handler,rule,context,false);
            }
            return;
        }
        const firstOwner = this.ordinaryOwner(atom), worklist:Atom[] = firstOwner ? [atom] : [];
        if(atom.tag==="global" && typeof key === "string" && !firstOwner!.accessors.has(key)) {
            const binding=this.realmBinding(atom.realm,key);this.field(firstOwner!,key);
            if(runtimeGlobalBindings.has(key)||binding.values.nonempty)this.ownPresence(firstOwner!,key).initial=true;
        }
        const visited = new Set<Atom>();
        while (worklist.length) {
            const current = worklist.pop()!,owner=this.ordinaryOwner(current)!;
            if (visited.has(current)) continue;
            visited.add(current);
            if(owner.proxy)this.copy(this.proxyReadEffects(owner,key,"get",context,base),result);
            if(rule)this.watch(rule,owner.shape);
            if(handler&&this.opaqueShape(owner,context))this.publish(handler,this.unknown);
            if(!this.definitionsReady(owner,rule))continue;
            this.stringField(owner,key);
            this.copyRead(this.dataProperty(owner,key),result,context);
            for (const name of [key,null]) {
                const accessor=owner.accessors.get(name);
                if(!accessor)continue;
                const getter=this.captureRead(accessor.get,context);
                if(rule)this.watch(rule,getter);
                if(getter.values.has(this.primitive(undefined)))this.publish(result,this.primitive(undefined));
                this.invoke(context ?? this.accessorDefinitions.get(accessor.get)!,this.accessorCallee(getter),base,[],result);
            }
            const presence=this.propertyPresence(owner,key,context);
            if (rule) this.watch(rule,presence);
            if(!presence.values.nonempty)continue;
            // The native builtin's unrepresented own members are opaque.
            // A closed prototype chain must not turn them into known absence.
            const closedIndex=owner.closedIndices&&typeof key==="string"&&Number.isSafeInteger(Number(key))&&Number(key)>=0&&String(Number(key))===key;
            // ECMA-262 gives only Date.prototype and Symbol.prototype an own
            // @@toPrimitive; no global constructor or namespace object has
            // one, so ToPrimitive on them reaches toString/valueOf.
            // A built-in function that is not a constructor (the Realm's
            // global functions, Object.prototype's methods) owns exactly
            // `length` and `name` (sec-ecmascript-standard-built-in-objects),
            // so every other key is a known absence on it.
            const plainFunction=current.tag==="builtin"&&(runtimeGlobalBindings.get(current.name)?.kind==="function"||runtimeObjectPrototypeDescriptors.has(current.name)&&current.normalResult!=="not-callable");
            const representedAbsence=current.tag==="builtin"&&(current.name==="Object"&&key===this.wellKnownSymbols.get("species")&&!runtimeObjectConstructorOwnKeys.has(key)||current.normalResult!=="not-callable"&&key===this.wellKnownSymbols.get("hasInstance")||
                key===this.wellKnownSymbols.get("toPrimitive")&&runtimeGlobalBindings.has(current.name)||
                // No built-in function or constructor owns or inherits a
                // toJSON (SerializeJSONProperty reads it before treating a
                // callable value as undefined).
                key==="toJSON"&&current.normalResult!=="not-callable"||
                plainFunction&&!(typeof key==="string"&&(key==="name"||key==="length")));
            if (current.tag === "builtin" && !owner.closedOwn && !representedAbsence && !closedIndex && !presence?.values.has(this.primitive(true)) &&
                !(typeof key === "string" && (runtimeObjectPrototypeMethods.has(key) || key === "constructor" ||
                    current.normalResult !== "not-callable" && (runtimeFunctionPrototypeMethods.has(key) || runtimeFunctionRestrictedProperties.includes(key))))) {
                // The original member is itself native; a value a program stored
                // there is a separate fact of the field.
                this.publish(result, this.nativeUnknown); if (handler) this.publish(handler, this.unknown);
            }
            if(ownOnly){if(!presence?.values.has(this.primitive(true)) || presence.values.has(this.primitive(false)))this.publish(result,this.primitive(undefined));continue;}
            if (presence?.values.has(this.primitive(true)) && !presence.values.has(this.primitive(false))) continue;
            if (owner.prototype) {
                if (rule) this.watch(rule, owner.prototype);
                for (const prototype of owner.prototype.values) {
                    const inherited = this.ordinaryOwner(prototype);
                    if (inherited) worklist.push(prototype);
                    else if (prototype.tag === "primitive" && prototype.value === null) this.publish(result,this.primitive(undefined));
                    else this.publish(result, prototype.tag === "pending-source" || prototype === this.nativeUnknown ? prototype : this.unknown);
                }
            }
        }
        if (atom.tag === "host" || atom.tag === "realm-record") {
            if (key === "gc") this.publish(result, this.operation("host-gc"));
            if (key === "agent") this.publish(result, this.agent);
            if (key === "createRealm") this.publish(result, this.operation("realm"));
            if (key === "evalScript") this.publish(result, this.operation("eval-script"));
            if (key === "global") this.publish(result,atom.tag==="realm-record"?atom.realm.global:this.global);
        }

    }
    private bindingDefault(input:Cell,fallback:Cell):Cell {
        let defaults=this.bindingDefaults.get(input);if(!defaults){defaults=new Map();this.bindingDefaults.set(input,defaults);}
        const prior=defaults.get(fallback);if(prior)return prior;
        const result=this.newCell();defaults.set(fallback,result);
        this.returnTransforms.set(result,{kind:"projection",inputs:[input,fallback],evaluate:inputs=>this.bindingDefault(inputs[0]!,inputs[1]!)});
        let rule!:Rule;
        rule=this.rule([input],()=>{
            for(const atom of input.values){
                if(atom.tag==="primitive"&&atom.value===undefined)continue;
                if(atom.tag==="text-operation"&&(this.primitiveKinds(input)&KIND_UNDEFINED)){
                    const state=this.primitiveState(input,rule,true);
                    if(state.proof.primitiveComplete){for(const value of state.proof.values)if(value!==undefined)this.publish(result,this.primitive(value));}
                    else this.publish(result,this.unknown);
                }else this.publish(result,atom);
            }
            if(this.primitiveKinds(input)&KIND_UNDEFINED)this.copy(fallback,result);
        });
        return result;
    }
    /** A rest element collects the remaining iterator values into a new Array. */
    private restElements(element:ts.BindingElement,value:Cell,offset:number,context:ts.Node):Cell {
        let location=this.restPatternLocations.get(element);
        if(!location){const owner=this.arrayOwner(element);location={value:this.newCell(),owner};this.restPatternLocations.set(element,location);this.publish(location.value,{tag:"object",owner});}
        const {value:rest,owner}=location,seen=new Set<string>();let rule!:Rule,abstract=false;
        rule=this.rule([value],()=>{
            this.watchList(rule,value,context);
            for(const list of this.lists(value,context)){
                if(!list){
                    if(abstract)continue;abstract=true;
                    this.publish(owner.listLength!,this.numberValue());this.writeProperty(rest,null,this.iteratorElements(value,context),true,"define",context);continue;
                }
                const key=list.map(cell=>cell.id).join(",");if(seen.has(key))continue;seen.add(key);
                const remaining=list.slice(offset);remaining.forEach((cell,index)=>this.defineField(owner,String(index),cell,true));
                this.publish(owner.listLength!,this.primitive(remaining.length));
            }
        });
        return rest;
    }
    private bind(name: ts.BindingName, value: Cell, references?: ReadonlyMap<ts.Identifier, ts.Expression>, context?: ts.Node): void {
        const worklist = [{ name, value }];
        while (worklist.length) {
            const entry = worklist.pop()!;
            if (ts.isIdentifier(entry.name)) {
                const reference = references?.get(entry.name);
                if (reference) this.writeTarget(reference, entry.value, context!);
                else this.writeBinding(entry.name,entry.value,context);
                continue;
            }
            if (ts.isArrayBindingPattern(entry.name)) {
                // IteratorBindingInitialization steps the value's iterator in
                // order. An ordinary Array whose iteration is the intrinsic
                // %Array.prototype.values% runs no user code: its positions are
                // its index properties. Any other value consumes its iterator
                // like a spread argument List, so its protocol calls and their
                // effects run and its values reach the positions.
                const pattern=entry.name,point=context??pattern,value=entry.value,method=this.iterationMethod(value,point);
                const slots=pattern.elements.map((element,index)=>ts.isBindingElement(element)?{element,index,selected:this.newCell()}:null).filter(slot=>slot!==null);
                let indexed=false,iterated=false,rule!:Rule;
                rule=this.rule([value,method],()=>{
                    // Unknown values (and members an unknown write may have
                    // replaced) keep the shared unknown model of a property read.
                    const opaque=(atom:Atom)=>atom.tag==="unknown"||atom.tag==="opaque-object"||atom.tag==="abrupt"||atom.tag==="pending-source";
                    const ordinary=[...method.values].every(atom=>atom.tag==="operation"&&atom.operation==="array-values"||opaque(atom))&&
                        [...value.values].every(atom=>atom.tag==="object"&&!!atom.owner.listLength||opaque(atom));
                    if(ordinary&&!indexed){
                        indexed=true;
                        for(const {element,index,selected} of slots)if(!element.dotDotDotToken)this.copy(this.property(value,String(index),point),selected);
                    }else if(!ordinary&&!iterated){
                        iterated=true;const sequence=this.argumentSequence(pattern,[{cell:value,spread:true}]);this.allArgumentValues(sequence);
                        for(const {element,index,selected} of slots)if(!element.dotDotDotToken)this.copy(this.argumentPosition(sequence,index),selected);
                        // A pattern without a rest element stops stepping before the
                        // iterator is done: IteratorClose calls its return method.
                        if(!slots.some(slot=>slot.element.dotDotDotToken))this.iteratorCloseEffects(this.iteratorElements(value,point),point);
                    }
                });
                for (const {element,index,selected} of slots) {
                    if (element.dotDotDotToken) {
                        if (references) this.publish(selected,this.unknown);
                        else this.copy(this.restElements(element,value,index,point),selected);
                    }
                    worklist.push({ name: element.name, value: element.initializer ? this.bindingDefault(selected,this.cell(element.initializer)) : selected });
                }
                continue;
            }
            for (const [index, element] of entry.name.elements.entries()) {
                if (!ts.isBindingElement(element)) continue;
                const computed = ts.isObjectBindingPattern(entry.name) && element.propertyName && ts.isComputedPropertyName(element.propertyName) ? element.propertyName.expression : null;
                const key = computed ? null : ts.isObjectBindingPattern(entry.name) ? propertyName(element.propertyName ?? element.name) : String(index);
                if(element.dotDotDotToken&&ts.isObjectBindingPattern(entry.name))this.proxyInternalMethod(entry.value,["ownKeys","getOwnPropertyDescriptor","get"],context??entry.name);
                const selected = element.dotDotDotToken ? references ? this.newCell() : entry.value : computed ? this.computedProperty(entry.value, this.cell(computed), context ?? entry.name) : key === null ? this.newCell() : this.property(entry.value, key, entry.name);
                if (!computed && key === null || element.dotDotDotToken && references) this.publish(selected, this.unknown);
                worklist.push({ name: element.name, value: element.initializer ? this.bindingDefault(selected,this.cell(element.initializer)) : selected });
            }
        }
    }
    private function(node: CallableDefinition): FunctionOwner {
        let owner = this.functions.get(node);
        if (owner) return owner;
        const activation = ts.isClassLike(node) ? classConstructorMember(node) ?? null : node;
        const constructor = ts.isClassLike(node) && activation ? this.function(activation) : null;
        owner = { definition: node, node: activation,parameters:(activation?.parameters??[]).filter(parameter=>!ts.isIdentifier(parameter.name)||parameter.name.text!=="this"),actuals:new Map(),actualChanges:this.newCell(), kind: functionKindForDeclaration(node), fields: this.owner(node),
            yields:this.newCell(),yieldReceives:this.newCell(),yieldThrows:this.exceptionCell(), returns: constructor?.returns ?? this.newCell(), throws: constructor?.throws ?? this.exceptionCell(),
            receiver: constructor?.receiver ?? this.newCell(), active: constructor?.active ?? this.newCell(), newTarget: constructor?.newTarget ?? this.newCell(), sourceText: (functionNode(node) ? this.dynamicSourceTexts.get(node) : null) ?? callableSourceText(node) ?? "function () { [native code] }" };
        this.functions.set(node, owner);
        const length=this.newCell();this.publish(length,this.primitive(activation?expectedArgumentCount(activation):0));this.defineField(owner.fields,"length",length);
        const name = this.newCell(), input = callableNameInput(node);
        this.defineField(owner.fields, "name", name);
        this.projectMemberKeys(input.key, input.definition ?? node, key => {
            const text = typeof key === "symbol" ? key.description === undefined ? "" : "[" + key.description + "]" : key;
            this.publish(name, text === null ? this.unknown : this.primitive(input.prefix ? `${input.prefix} ${text}` : text));
        });
        owner.fields.prototype = this.callablePrototype(owner.kind);
        if((ts.isFunctionDeclaration(node)||ts.isFunctionExpression(node))&&owner.kind!=="async"){
            const parent=owner.kind==="ordinary"?this.objectPrototype():this.newCell();if(owner.kind!=="ordinary")this.publish(parent,this.intrinsic("instance",owner.kind));
            const prototypeOwner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:parent,ordinary:true},prototype=this.newCell();
            this.sourceObjectOwners.add(prototypeOwner);this.markPropertyAlgorithm(prototypeOwner,"ordinary");
            this.copy(this.opaqueMutation,prototypeOwner.shape);this.publish(prototype,{tag:"object",owner:prototypeOwner});this.defineField(owner.fields,"prototype",prototype,false);
            if(owner.kind==="ordinary")this.defineField(prototypeOwner,"constructor",this.cell(node),false);
        }
        if (ts.isClassLike(node)) {
            const prototype: ObjectOwner = {fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.newCell()};
            this.sourceObjectOwners.add(prototype);this.markPropertyAlgorithm(prototype,"ordinary");
            const prototypeValue = this.field(owner.fields, "prototype");
            this.publish(prototypeValue, {tag:"object",owner:prototype});this.ownPresence(owner.fields,"prototype").initial=true;this.publish(this.presence(owner.fields,"prototype"),this.primitive(true));
            this.defineField(prototype,"constructor",this.cell(node));
            const heritage = node.heritageClauses?.find(clause => clause.token === ts.SyntaxKind.ExtendsKeyword)?.types[0];
            if (heritage) {
                const base = this.cell(heritage.expression), parent = this.newCell();
                owner.base=base;
                owner.fields.prototype = parent;
                this.rule([base],()=>{
                    for (const value of base.values) {
                        if (value.tag === "primitive" && value.value === null) {
                            this.copy(this.callablePrototype("ordinary"),parent);this.publish(prototype.prototype!,value);
                        } else this.publish(parent,value);
                    }
                });
                this.copy(this.property(base,"prototype"),prototype.prototype!);
            } else this.copy(this.objectPrototype(),prototype.prototype!);
            const initializers: {keys:Cell;value:Cell}[]=[];
            const privateInitializers:{name:ClassPrivateName;template:SourcePrivateSlot}[]=[];
            for(const name of classPrivateNames(node)){
                const first=name.declarations[0]!,isStatic=(ts.canHaveModifiers(first)?ts.getModifiers(first)??[]:[]).some(modifier=>modifier.kind===ts.SyntaxKind.StaticKeyword);
                const kind:SourcePrivateSlot["kind"]=ts.isPropertyDeclaration(first)?"field":ts.isMethodDeclaration(first)?"method":"accessor";
                const template=this.privateSlot(null,name,kind);
                for(const declaration of name.declarations){
                    if(ts.isPropertyDeclaration(declaration)){
                        if(declaration.initializer)this.copy(this.cell(declaration.initializer),template.value);else this.publish(template.value,this.primitive(undefined));
                    }else if(ts.isMethodDeclaration(declaration))this.copy(this.cell(declaration),template.value);
                    else if(ts.isGetAccessorDeclaration(declaration))this.copy(this.cell(declaration),template.get);
                    else if(ts.isSetAccessorDeclaration(declaration))this.copy(this.cell(declaration),template.set);
                }
                if(isStatic){const slot=this.privateSlot(owner.fields,name,kind);for(const part of ["value","get","set"]as const)this.copy(template[part],slot[part]);}
                else privateInitializers.push({name,template});
            }
            for (const member of node.members) {
                if (isClassConstructor(member) || ts.isClassStaticBlockDeclaration(member)) continue;
                const isStatic = (ts.canHaveModifiers(member) ? ts.getModifiers(member) ?? [] : []).some(modifier=>modifier.kind===ts.SyntaxKind.StaticKeyword);
                const target = isStatic ? owner.fields : prototype;
                if (member.name && ts.isPrivateIdentifier(member.name)) continue;
                if (!isStatic && ts.isPropertyDeclaration(member)) {
                    const value=member.initializer?this.cell(member.initializer):this.newCell(),keys=this.newCell();
                    if (!member.initializer)this.publish(value,this.primitive(undefined));
                    this.projectMemberKeys(member.name,member,key=>this.publish(keys,key===null?this.unknown:this.primitive(key)));
                    initializers.push({keys,value});continue;
                }
                if (!member.name) continue;
                this.projectMemberKeys(member.name,member,key=>{
                    if(ts.isGetAccessorDeclaration(member)||ts.isSetAccessorDeclaration(member))this.defineAccessor(target,key,ts.isGetAccessorDeclaration(member)?"get":"set",this.cell(member),member);
                    else {
                        if(ts.isMethodDeclaration(member))this.defineField(target,key,this.cell(member));
                        if(isStatic&&ts.isPropertyDeclaration(member)){
                            const value=member.initializer?this.cell(member.initializer):this.newCell();
                            if(!member.initializer)this.publish(value,this.primitive(undefined));
                            this.defineField(target,key,value);
                        }
                    }
                },target);
            }
            let fieldsRule!:Rule;
            fieldsRule=this.rule([owner.receiver,...initializers.map(field=>field.keys)],()=>{
                for(const receiver of owner.receiver.values){
                    const instance=this.ordinaryOwner(receiver);
                    if(!instance)continue;
                    for(const {name,template}of privateInitializers){const slot=this.privateSlot(instance,name,template.kind);for(const part of ["value","get","set"]as const)this.copy(template[part],slot[part]);}
                    for(const initializer of initializers){
                        const keys=this.propertyKeys(initializer.keys,fieldsRule);
                        if(keys===null)this.defineField(instance,null,initializer.value);
                        else for(const key of keys??[])this.defineField(instance,key,initializer.value);
                    }
                }
            });
            return owner;
        }
        if (node.body && !ts.isBlock(node.body)) this.copy(this.cell(node.body), owner.returns);
        else if (node.body) {
            const completion = owner.completion = functionBodyCompletions(node.body);
            if (!completion.complete) {this.publish(owner.returns, this.unknown); this.publish(owner.throws, this.unknown);}
            for (const value of completion.returns) {
                if (value) {
                    const input=this.cell(value),guards=this.guards(value);
                    if(!guards.length)this.copy(input,owner.returns);
                    else {
                        let rule!:Rule;
                        rule=this.rule([input,...guards.map(guard=>guard.condition)],()=>{
                            if(this.guardsAllow(guards,rule))this.copy(input,owner.returns);
                        });
                    }
                }
                else this.publish(owner.returns, this.primitive(undefined));
            }
            if (completion.normal) this.publish(owner.returns, this.primitive(undefined));
            else if (!completion.returns.length) this.publish(owner.returns, this.abrupt);
        }
        return owner;
    }
    private lists(cell: Cell, context?: ts.Node, argumentsRead = true): Array<readonly Cell[] | null> {
        // Every actual List projects the owner's canonical length and index
        // locations. Literal/rest initialization and mutations publish into
        // those same cells; the rule worklist closes their dependencies.
        const alternatives: Array<readonly Cell[] | null> = [];
        const method=this.iterationMethod(cell,context);
        if(!method.values.nonempty)return alternatives;
        if([...method.values].some(value=>value.tag!=="operation"||value.operation!=="array-values"))return [null];
        for (const atom of cell.values) {
            if (atom.tag !== "object" || !(atom.owner.listLength??atom.owner.arguments?.length)) {
                alternatives.push(null);
                continue;
            }
            const owner = atom.owner;
            const prototypes=[owner],visited=new Set<ObjectOwner>();
            while(prototypes.length){
                const current=prototypes.pop()!;if(visited.has(current))continue;visited.add(current);
                if(current.accessors.has(this.wellKnownSymbols.get("iterator")!)||current.accessors.has(null))return [null];
                for(const prototype of current.prototype?.values??[]){const parent=this.ordinaryOwner(prototype);if(parent)prototypes.push(parent);}
            }
            const extent=this.captureRead((owner.listLength??owner.arguments?.length)!,context,argumentsRead);
            const proof = this.primitiveChoiceProof(extent);
            const literal=this.literalLists.get(owner);
            if(literal&&context&&argumentsRead&&!literal.holes.size){
                let boundary:ts.Node=literal.node;
                while(boundary.parent&&(ts.isParenthesizedExpression(boundary.parent)||ts.isAsExpression(boundary.parent)||ts.isTypeAssertionExpression(boundary.parent)||ts.isNonNullExpression(boundary.parent)||ts.isSatisfiesExpression(boundary.parent)))boundary=boundary.parent;
                if(boundary.parent&&ts.isSpreadElement(boundary.parent))boundary=boundary.parent;
                // An inline allocation has not exposed its identity before
                // the actual-List read. Other-iteration opaque effects cannot
                // mutate its freshly defined own element locations.
                if(boundary.parent===context){alternatives.push(...this.arguments(literal.parts,literal.node));continue;}
            }
            if (!proof.primitiveComplete && this.primitiveReadiness(extent).pending) continue;
            if (this.opaqueShape(owner,context,argumentsRead) || !proof.primitiveComplete) {
                alternatives.push(null);
                continue;
            }
            for (const value of proof.values) {
                const length = typeof value === "bigint" ? NaN : Number(value);
                if (!Number.isInteger(length) || length < 0 || length > 0xffffffff) {
                    alternatives.push(null);
                    continue;
                }
                const locations: Cell[] = [];
                for (let index = 0; index < length; index++) {
                    const key = String(index);
                    const location=context?this.indexedRead(cell,index,context):this.field(owner,key);
                    locations.push(context?location:this.captureRead(location,context,argumentsRead));
                }
                alternatives.push(locations);
            }
        }
        return alternatives.includes(null) ? [null] : alternatives;
    }
    /** Whether `target` is `from` or one of the Lists `from` spreads, transitively. */
    private listReaches(from: ObjectOwner, target: ObjectOwner): boolean {
        const pending = [from], visited = new Set<ObjectOwner>();
        while (pending.length) {
            const current = pending.pop()!;
            if (current === target) return true;
            if (visited.has(current)) continue; visited.add(current);
            for (const source of current.listSources ?? []) for (const atom of source.values) if (atom.tag === "object") pending.push(atom.owner);
        }
        return false;
    }
    private cyclicListShape(owner: ObjectOwner): boolean {
        const pending = [{ owner, finish: false }];
        const active = new Set<ObjectOwner>(), completed = new Set<ObjectOwner>();
        while (pending.length) {
            const task = pending.pop()!;
            if (task.finish) { active.delete(task.owner); completed.add(task.owner); continue; }
            if (completed.has(task.owner)) continue;
            if (active.has(task.owner)) return true;
            active.add(task.owner); pending.push({ ...task, finish: true });
            for (const source of task.owner.listSources ?? []) for (const atom of source.values)
                if (atom.tag === "object" && atom.owner.listLength) pending.push({ owner: atom.owner, finish: false });
        }
        return false;
    }
    private arguments(parts: readonly ListPart[],context?:ts.Node): Array<readonly Cell[] | null> {
        let choices: Array<readonly Cell[] | null> = [[]];
        for (const part of parts) {
            const alternatives = part.abstractList?[null]:part.spread ? this.lists(part.cell,context) : [[part.cell]];
            choices = choices.flatMap(prefix => alternatives.map(tail => prefix && tail ? [...prefix, ...tail] : null));
        }
        return choices;
    }
    /** Original JSON token records and ordinary owners share one iterative
     * frame tree. Only the last decoded definition is attached to an owner. */
    private jsonRecord(text:string,context:ts.Node):SourceJSONRecord {
        JSON.parse(text); // The host grammar validator cannot run user code.
        let offset=0;
        const whitespace=()=>{while(/[\t\n\r ]/.test(text[offset]??"x"))offset++;};
        const token=()=>{
            const start=offset;
            if(text[offset]==='"'){offset++;while(offset<text.length){const c=text[offset++]!;if(c==='"')break;if(c==='\\')offset++;}}
            else while(offset<text.length&&!/[\t\n\r ,\]}]/.test(text[offset]!))offset++;
            return text.slice(start,offset);
        };
        const pending:{record:SourceJSONRecord}[]=[];
        const read=():SourceJSONRecord=>{
            whitespace();const c=text[offset];
            if(c==='{'||c==='['){
                offset++;const array=c==='[',owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:array?this.arrayPrototype():this.objectPrototype(),ordinary:true};this.copy(this.opaqueMutation,owner.shape);
                const record:SourceJSONRecord={value:{tag:"object",owner},children:new Map(),source:null,array};pending.push({record});return record;
            }
            const source=token();return {value:this.primitive(JSON.parse(source)),children:new Map(),source,array:false};
        };
        const root=read();
        while(pending.length){
            const frame=pending[pending.length-1]!;whitespace();
            if(text[offset]==='}'||text[offset]===']'){offset++;pending.pop();continue;}
            if(text[offset]===','){offset++;continue;}
            let key:string;
            if(frame.record.array)key=String(frame.record.children.size);
            else {key=JSON.parse(token());whitespace();offset++;}
            const value=read();frame.record.children.set(key,value);
        }
        const records=[root],visited=new Set<SourceJSONRecord>();
        while(records.length){
            const record=records.pop()!;if(visited.has(record))continue;visited.add(record);
            const owner=this.ordinaryOwner(record.value);if(!owner)continue;
            for(const [key,child]of record.children){const value=this.newCell();this.publish(value,child.value);this.defineField(owner,key,value,true);records.push(child);}
            if(record.array){this.arrayOwner(context,owner);const length=this.newCell();this.publish(length,this.primitive(record.children.size));this.defineField(owner,"length",length,false);}
        }
        return root;
    }
    private jsonInternalize(snapshot:SourceJSONRecord,callee:Cell,context:ts.Node):Cell {
        const inputs=new Map<Atom,Cell>();const cell=(atom:Atom)=>{let input=inputs.get(atom);if(!input){input=this.newCell();inputs.set(atom,input);this.publish(input,atom);}return input;};
        const holderOwner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype()},holder=this.newCell();this.publish(holder,{tag:"object",owner:holderOwner});this.defineField(holderOwner,"",cell(snapshot.value),true);
        const entries=new Map<string,Cell>(),records=new Map<SourceJSONRecord,number>();let nextRecord=0;
        const fail=(output:Cell)=>{this.publish(output,this.unknown);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.unknown);this.activateOpaqueEffect(context);};
        const visit=(receiver:Cell,key:string,record:SourceJSONRecord|null,ancestors:ReadonlySet<ObjectOwner>):Cell=>{
            if(record&&!records.has(record))records.set(record,nextRecord++);
            const signature=receiver.id+":"+JSON.stringify(key)+":"+(record?records.get(record):"changed")+":"+[...ancestors].map(owner=>owner.shape.id).join(","),prior=entries.get(signature);if(prior)return prior;
            const result=this.newCell(),read=this.property(receiver,key,context),callbackValue=this.newCell(),callbackContext=this.newCell(),name=this.newCell();entries.set(signature,result);this.publish(name,this.primitive(key));
            this.invoke(context,callee,receiver,[{cell:name,spread:false},{cell:callbackValue,spread:false},{cell:callbackContext,spread:false}],result);
            const opened=new Set<Atom>();let open!:Rule;
            open=this.rule([read],()=>{for(const atom of read.values){
                if(opened.has(atom))continue;
                if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(result,atom);opened.add(atom);continue;}
                const owner=this.ordinaryOwner(atom),unmodified=record?.value===atom||!!owner&&this.ordinaryOwner(record?.value??this.abrupt)===owner;
                const contextOwner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype()},contextValue=this.newCell();this.publish(contextValue,{tag:"object",owner:contextOwner});
                if(!owner){
                    if(record?.source!==null&&record?.value.tag==="primitive"){
                        const state=this.primitiveState(cell(atom),open,true);if(state.pending&&!state.unresolved)continue;
                        if(state.proof.values.some(value=>Object.is(value,record.value.tag==="primitive"?record.value.value:undefined))){const source=this.newCell();this.publish(source,this.primitive(record.source));this.defineField(contextOwner,"source",source,true);}
                        if(!state.proof.primitiveComplete||state.proof.values.some(value=>!Object.is(value,record.value.tag==="primitive"?record.value.value:undefined))){const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype()};this.publish(contextValue,{tag:"object",owner});}
                    }
                    opened.add(atom);if(atom.tag==="unknown"||atom.tag==="opaque-object"){fail(result);continue;}
                    this.publish(callbackValue,atom);this.copy(contextValue,callbackContext);continue;
                }
                if(ancestors.has(owner)){opened.add(atom);fail(result);continue;}
                this.watch(open,owner.shape);if(!this.definitionsReady(owner,open))continue;
                if(this.opaqueShape(owner,context)||owner.proxy||owner.accessors.has(null)){opened.add(atom);fail(result);continue;}
                const selections:string[][]=[];
                if(owner.listLength){
                    const length=this.primitiveState(owner.listLength,open,true);if(length.pending&&!length.unresolved)continue;
                    const positions=this.indexedPropertyPositions(cell(atom),context,open);if(positions===undefined)continue;
                    if(!length.proof.primitiveComplete||positions===null){opened.add(atom);fail(result);continue;}
                    // Capture each represented List extent once, then visit
                    // every index through the same property continuation.
                    for(const value of length.proof.values){const extent=Number(value),keys=positions.filter(index=>index<extent);if(!Number.isSafeInteger(extent)||extent<0||keys.length!==extent){fail(result);continue;}selections.push(keys.map(String));}
                }else {
                    const ownKeys=this.ownerKeys(owner,open);if(ownKeys===undefined)continue;if(ownKeys===null){opened.add(atom);fail(result);continue;}
                    const keys=ownKeys.filter((key):key is string=>typeof key==="string").sort((a,b)=>{const ai=Number(a),bi=Number(b),ia=String(ai)===a&&Number.isInteger(ai)&&ai>=0&&ai<0xffffffff,ib=String(bi)===b&&Number.isInteger(bi)&&bi>=0&&bi<0xffffffff;return ia&&ib?ai-bi:ia?-1:ib?1:0;});
                    const names:string[]=[],choices:Primitive[][]=[];let ready=true;
                    for(const key of keys){
                        const location=this.ownPresence(owner,key),presence=this.propertyPresence(owner,key,context);this.watch(open,presence);
                        if(!presence.values.nonempty){ready=false;continue;}
                        if(!presence.values.has(this.primitive(true)))continue;
                        const enumerable=this.primitiveState(location.enumerable,open,true);if(enumerable.pending&&!enumerable.unresolved){ready=false;continue;}
                        if(!enumerable.proof.primitiveComplete){fail(result);ready=false;continue;}
                        names.push(key);choices.push([...new Set([...enumerable.proof.values.map(Boolean),...(presence.values.has(this.primitive(false))?[false]:[])])]);
                    }
                    if(!ready)continue;
                    for(const tuple of sourceChoiceTuples(choices))selections.push(names.filter((_,index)=>!!tuple[index]));
                }
                opened.add(atom);
                const path=new Set(ancestors);path.add(owner);
                for(const keys of selections){
                    let previous:Cell|null=null;
                    for(const key of keys){
                        const selected=this.newCell();
                        if(previous){const prior=previous;let advance!:Rule;advance=this.rule([prior],()=>{const state=this.primitiveState(prior,advance,true);if(state.pending&&!state.unresolved)return;if(state.proof.values.length||!state.proof.primitiveComplete&&state.unresolved)this.publish(selected,atom);});}else this.publish(selected,atom);
                        const child=visit(selected,key,unmodified?record?.children.get(key)??null:null,path),stored=this.newCell(),removed=this.newCell();
                        this.rule([child],()=>{for(const value of child.values){if(value.tag==="abrupt"||value.tag==="pending-source")continue;if(value===this.primitive(undefined))this.publish(removed,value);else this.publish(stored,value);}});
                        this.rule([stored],()=>{if(stored.values.nonempty)this.writeProperty(selected,key,stored,true,"define",context);});
                        this.rule([removed],()=>{if(removed.values.nonempty)this.writeProperty(selected,key,removed,true,"delete",context);});
                        previous=child;
                    }
                    if(previous){const prior=previous;let finish!:Rule;finish=this.rule([prior],()=>{const state=this.primitiveState(prior,finish,true);if(state.pending&&!state.unresolved)return;if(state.proof.values.length||!state.proof.primitiveComplete&&state.unresolved){this.publish(callbackValue,atom);this.copy(contextValue,callbackContext);}});}
                    else {this.publish(callbackValue,atom);this.copy(contextValue,callbackContext);}
                }
            }});
            return result;
        };
        return visit(holder,"",snapshot,new Set());
    }
    private jsonParse(source:Cell,reviver:Cell,context:ts.Node):Cell {
        let calls=this.jsonParses.get(context);if(!calls){calls=new Map();this.jsonParses.set(context,calls);}
        const signature=source.id+":"+reviver.id,prior=calls.get(signature);if(prior)return prior;
        const result=this.newCell(),text=this.stringHintCell(source,context);calls.set(signature,result);
        const inputs=new Map<Atom,Cell>(),selected=new Map<string,SourceJSONRecord>(),routed=new Set<string>();
        const cell=(atom:Atom)=>{let input=inputs.get(atom);if(!input){input=this.newCell();inputs.set(atom,input);this.publish(input,atom);}return input;};
        let parse!:Rule;
        parse=this.rule([text,reviver],()=>{
            const state=this.primitiveState(text,parse,true);
            for(const value of state.proof.values){
                const input=String(value);if(selected.has(input))continue;
                try{selected.set(input,this.jsonRecord(input,context));}catch{this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));}
            }
            for(const [input,record]of selected)for(const atom of reviver.values){
                const key=input+":"+cell(atom).id;if(routed.has(key))continue;routed.add(key);
                if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(result,atom);continue;}
                const kinds=this.primitiveKinds(cell(atom));
                if(kinds&KIND_FUNCTION||atom.tag==="unknown"||atom.tag==="opaque-object")this.copy(this.jsonInternalize(record,cell(atom),context),result);
                if(!(kinds&KIND_FUNCTION)||atom.tag==="unknown"||atom.tag==="opaque-object")this.publish(result,record.value);
            }
            for(const atom of text.values)if(atom.tag==="abrupt"||atom.tag==="pending-source")this.publish(result,atom);
            if(state.proof.primitiveComplete||state.pending&&!state.unresolved)return;
            this.publish(result,this.unknown);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.unknown);this.activateOpaqueEffect(context);
        });
        return result;
    }
    private rawJSON(source:Cell,context:ts.Node):Cell {
        let calls=this.rawJSONResults.get(context);
        if(!calls){calls=new Map();this.rawJSONResults.set(context,calls);}
        const prior=calls.get(source);if(prior)return prior;
        const result=this.newCell(),text=this.stringHintCell(source,context),valid=this.newCell();
        calls.set(source,result);
        const prototype=this.newCell();this.publish(prototype,this.primitive(null));
        const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype,rawJSON:valid};
        this.defineField(owner,"rawJSON",valid);
        const atom:Atom={tag:"object",owner};
        const invalid=()=>{this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));};
        let rule!:Rule;
        rule=this.rule([text],()=>{
            const state=this.primitiveState(text,rule,true);
            for(const value of state.proof.values){
                const input=String(value);
                try {
                    if(!/^[a-z0-9"-]/.test(input)||!/[a-z0-9"]/.test(input.slice(-1)))throw null;
                    JSON.parse(input);
                    this.publish(valid,this.primitive(input));this.publish(result,atom);
                }catch{invalid();}
            }
            for(const value of text.values)if(value.tag==="abrupt"||value.tag==="pending-source")this.publish(result,value);
            if(state.proof.primitiveComplete||state.pending&&!state.unresolved)return;
            this.publish(valid,this.unknownString);this.publish(result,atom);invalid();
        });
        return result;
    }
    /** A Serialization Record owns the root holder, option plans and one
     * continuation graph for every selected property. Normal child results
     * gate later reads; object ancestry detects cycles independently of depth. */
    private jsonSerialization(value:Cell,replacer:Cell,space:Cell,context:ts.Node):Cell {
        let calls=this.jsonSerializations.get(context);if(!calls){calls=new Map();this.jsonSerializations.set(context,calls);}
        const signature=[value.id,replacer.id,space.id].join(":"),prior=calls.get(signature);if(prior)return prior;
        const result=this.newCell();calls.set(signature,result);
        const inputs=new Map<Atom,Cell>(),indexed=new Map<Cell,Map<SourcePropertyKey,Cell>>();
        const cell=(atom:Atom)=>{let input=inputs.get(atom);if(!input){input=this.newCell();inputs.set(atom,input);this.publish(input,atom);}return input;};
        const item=(input:Cell,key:SourcePropertyKey)=>{let keys=indexed.get(input);if(!keys){keys=new Map();indexed.set(input,keys);}let value=keys.get(key);if(!value){value=this.property(input,key,context);keys.set(key,value);}return value;};
        const fail=(output:Cell)=>{this.publish(output,this.unknownString);this.publish(output,this.primitive(undefined));const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.unknown);this.activateOpaqueEffect(context);};
        const abrupt=(output:Cell)=>{this.publish(output,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));};
        const gap=this.newCell(),spacingInput=this.jsonPrimitive(space,"space",context);let spacing!:Rule;
        spacing=this.rule([spacingInput],()=>{
            const state=this.primitiveState(spacingInput,spacing,true);
            for(const value of state.proof.values)this.publish(gap,this.primitive(typeof value==="string"?value.slice(0,10):typeof value==="number"?" ".repeat(Math.max(0,Math.min(10,Math.trunc(value)||0))):""));
            for(const atom of spacingInput.values)if(atom.tag==="abrupt"||atom.tag==="pending-source")this.publish(gap,atom);
            if(!state.proof.primitiveComplete&&!(state.pending&&!state.unresolved)){fail(result);this.publish(gap,this.unknownString);}
        });
        const holderOwner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype()},holder=this.newCell();this.publish(holder,{tag:"object",owner:holderOwner});this.defineField(holderOwner,"",value,true);
        const plans=new Map<string,{callee:Cell;keys:readonly string[]|null}>();
        const entries=new Map<string,Cell>();
        const serialize=(input:Cell,receiver:Cell,name:string,plan:{callee:Cell;keys:readonly string[]|null},ancestors:ReadonlySet<ObjectOwner>,level:number):Cell=>{
            const id=input.id+":"+receiver.id+":"+name+":"+plan.callee.id+":"+[...ancestors].map(owner=>owner.shape.id).join(",");const prior=entries.get(id);if(prior)return prior;
            const output=this.newCell(),prepared=this.newCell(),replaced=this.newCell(),key=this.newCell();entries.set(id,output);this.publish(key,this.primitive(name));
            const selected=new Set<Atom>();
            this.rule([input],()=>{for(const atom of input.values){
                if(selected.has(atom))continue;selected.add(atom);
                if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(prepared,atom);continue;}
                const kinds=this.primitiveKinds(cell(atom));
                if(!(kinds&(KIND_OBJECT|KIND_FUNCTION|KIND_BIGINT))){this.publish(prepared,atom);continue;}
                const owner=this.ordinaryOwner(atom),bigintPrimitive=!!(kinds&KIND_BIGINT)&&!(kinds&~KIND_PRIMITIVE);
                if(!owner&&!bigintPrimitive){fail(output);continue;}
                if(bigintPrimitive&&kinds&~KIND_BIGINT)this.publish(prepared,atom);
                const method=item(bigintPrimitive?this.primitivePrototype("BigInt"):cell(atom),"toJSON"),callee=this.newCell();this.invoke(context,callee,cell(atom),[{cell:key,spread:false}],prepared);
                this.rule([method],()=>{for(const candidate of method.values){
                    if(candidate.tag==="abrupt"||candidate.tag==="pending-source"){this.publish(prepared,candidate);continue;}
                    if(this.primitiveKinds(cell(candidate))&KIND_FUNCTION||candidate.tag==="unknown"||candidate.tag==="opaque-object")this.publish(callee,candidate);
                    else this.publish(prepared,atom);
                }});
            }});
            if(plan.callee===this.empty)this.copy(prepared,replaced);
            else this.invoke(context,plan.callee,receiver,[{cell:key,spread:false},{cell:prepared,spread:false}],replaced);
            const containers=new Set<string>(),normalized=this.jsonPrimitive(replaced,"value",context);let outputRule!:Rule;
            outputRule=this.rule([normalized,gap],()=>{
                const state=this.primitiveState(normalized,outputRule,true);
                for(const value of state.proof.values){try{this.publish(output,this.primitive(JSON.stringify(value)));}catch{abrupt(output);}}
                for(const atom of normalized.values){
                    if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(output,atom);continue;}
                    const kinds=this.primitiveKinds(cell(atom));
                    if(kinds&KIND_FUNCTION){this.publish(output,this.primitive(undefined));if(!(kinds&~KIND_FUNCTION))continue;}
                    if(atom.tag==="primitive"||atom.tag==="text-operation")continue;
                    // A closed primitive kind domain cannot run object hooks.
                    // Its JSON text may be unbounded without mutation effects.
                    if(!(kinds&~KIND_PRIMITIVE)) {
                        if(kinds&KIND_BIGINT)abrupt(output);
                        if(kinds&(KIND_NULL|KIND_BOOLEAN|KIND_NUMBER|KIND_STRING))this.publish(output,this.unknownString);
                        if(kinds&(KIND_UNDEFINED|KIND_SYMBOL))this.publish(output,this.primitive(undefined));
                        continue;
                    }
                    const owner=this.ordinaryOwner(atom);
                    if(owner?.rawJSON){this.copy(owner.rawJSON,output);continue;}
                    if(owner?.boxed?.size&&!owner.unboxed&&![...owner.boxed.keys()].includes("symbol"))continue;
                    if(!owner){if(!(state.pending&&!state.unresolved)&&!state.proof.primitiveComplete)fail(output);continue;}
                    if(ancestors.has(owner)){abrupt(output);continue;}
                    this.watch(outputRule,owner.shape);if(!this.definitionsReady(owner,outputRule))continue;
                    if(this.opaqueShape(owner,context)||owner.proxy||owner.accessors.has(null)){fail(output);continue;}
                    let selections:{keys:readonly string[];length:number|null}[]=[];
                    if(owner.listLength){
                        const extent=this.primitiveState(owner.listLength,outputRule,true),positions=this.indexedPropertyPositions(cell(atom),context,outputRule);
                        if(extent.pending&&!extent.unresolved||positions===undefined)continue;
                        if(!extent.proof.primitiveComplete||positions===null){fail(output);continue;}
                        for(const size of extent.proof.values){const length=Number(size);if(!Number.isSafeInteger(length)||length<0){fail(output);continue;}const keys=positions.filter(index=>index<length).map(String);
                            if(plan.callee!==this.empty&&keys.length!==length){fail(output);continue;}selections.push({keys,length});}
                    }else {
                        // SerializeJSONObject: K is the replacer's PropertyList
                        // in its own order, else EnumerableOwnProperties order.
                        const ownKeys=plan.keys??this.ownerKeys(owner,outputRule);if(ownKeys===undefined)continue;if(ownKeys===null){fail(output);continue;}
                        const strings=ownKeys.filter((key):key is string=>typeof key==="string");
                        const names=plan.keys?strings:strings.sort((a,b)=>{const ai=Number(a),bi=Number(b),ia=String(ai)===a&&Number.isInteger(ai)&&ai>=0&&ai<0xffffffff,ib=String(bi)===b&&Number.isInteger(bi)&&bi>=0&&bi<0xffffffff;return ia&&ib?ai-bi:ia?-1:ib?1:0;});
                        selections=[{keys:names,length:null}];
                    }
                    for(const selection of selections){
                        const signature=owner.shape.id+":"+selection.length+":"+JSON.stringify(selection.keys);if(containers.has(signature))continue;containers.add(signature);
                        const path=new Set(ancestors);path.add(owner);const parts:Cell[]=[gap];let predecessor:Cell|null=null;
                        for(const name of selection.keys){
                            const selected=this.newCell(),child=this.newCell(),active=this.newCell();parts.push(child);
                            if(predecessor){const prior=predecessor;let advance!:Rule;advance=this.rule([prior],()=>{const state=this.primitiveState(prior,advance,true);if(state.pending&&!state.unresolved)return;if(state.proof.values.length||!state.proof.primitiveComplete&&state.unresolved)this.publish(active,this.primitive(true));});}else this.publish(active,this.primitive(true));
                            if(selection.length===null&&plan.keys===null){
                                const location=this.ownPresence(owner,name),presence=this.propertyPresence(owner,name,context);let choose!:Rule;
                                choose=this.rule([active,presence,location.enumerable],()=>{
                                    if(!active.values.nonempty)return;
                                    if(presence.values.has(this.primitive(false)))this.publish(child,this.primitive(undefined));
                                    if(!presence.values.has(this.primitive(true)))return;
                                    const enumerable=new Set<boolean>(),state=this.primitiveState(location.enumerable,choose,true);if(state.pending&&!state.unresolved)return;if(!state.proof.primitiveComplete){if(presence.values.has(this.primitive(true)))fail(child);return;}for(const value of state.proof.values)enumerable.add(Boolean(value));
                                    if(presence.values.has(this.primitive(false))||enumerable.has(false))this.publish(child,this.primitive(undefined));
                                    if(presence.values.has(this.primitive(true))&&enumerable.has(true))this.copy(cell(atom),selected);
                                });
                            }else this.rule([active],()=>{if(active.values.nonempty)this.copy(cell(atom),selected);});
                            const read=this.property(selected,name,context),serialized=serialize(read,selected,name,plan,path,level+1);this.copy(serialized,child);predecessor=child;
                        }
                        this.publish(output,{tag:"text-operation",operation:"json-container",parts,keys:selection.keys,arrayLength:selection.length,level});
                    }
                }
                if(!state.proof.primitiveComplete&&!(state.pending&&!state.unresolved)&&this.primitiveKinds(normalized)&(KIND_NULL|KIND_BOOLEAN|KIND_NUMBER|KIND_STRING)&&![...normalized.values].some(atom=>this.ordinaryOwner(atom)))this.publish(output,this.unknownString);
            });
            return output;
        };
        const plan=(callee:Cell,keys:readonly string[]|null)=>{const signature=callee.id+":"+JSON.stringify(keys);if(plans.has(signature))return;const record={callee,keys};plans.set(signature,record);this.copy(serialize(value,holder,"",record,new Set(),0),result);};
        const selected=new Set<Atom>();let options!:Rule;
        options=this.rule([replacer],()=>{for(const atom of replacer.values){
            if(atom.tag==="abrupt"||atom.tag==="pending-source"){this.publish(result,atom);continue;}
            const kinds=this.primitiveKinds(cell(atom));
            if(kinds&KIND_FUNCTION||atom.tag==="unknown"||atom.tag==="opaque-object"){if(!selected.has(atom)){selected.add(atom);plan(cell(atom),null);}if(kinds&~KIND_FUNCTION)fail(result);continue;}
            const owner=this.ordinaryOwner(atom);
            if(owner?.listLength){
                const length=this.primitiveState(owner.listLength,options,true),positions=this.indexedPropertyPositions(cell(atom),context,options);
                if(length.pending&&!length.unresolved||positions===undefined)continue;
                if(!length.proof.primitiveComplete||positions===null){fail(result);continue;}
                for(const extent of length.proof.values){
                    const names=positions.filter(index=>index<Number(extent)),values=names.map(name=>this.jsonPrimitive(item(cell(atom),String(name)),"key",context)),states=values.map(value=>this.primitiveState(value,options,true));
                    if(states.some(state=>state.pending&&!state.unresolved))continue;if(states.some(state=>!state.proof.primitiveComplete)){fail(result);continue;}
                    for(const tuple of sourceChoiceTuples(states.map(state=>state.proof.values)))plan(this.empty,[...new Set(tuple.filter(value=>typeof value==="string"||typeof value==="number").map(String))]);
                }
            }else if(kinds&KIND_OBJECT&&!owner)fail(result);else plan(this.empty,null);
        }});
        return result;
    }
    private argumentSequence(context: ts.Node, parts: readonly ListPart[]): ArgumentSequence {
        let sequences = this.argumentSequences.get(context);
        if (!sequences) {sequences = new Map(); this.argumentSequences.set(context, sequences);}
        const key = "parts:" + parts.map(part => part.cell.id + ":" + part.spread+":"+!!part.abstractList).join(",");
        let sequence = sequences.get(key);
        if (!sequence) {
            sequence = {id: this.nextArgumentSequence++, context, positions: new Map(), kind: "parts", parts};
            sequences.set(key, sequence);
        }
        return sequence;
    }
    private transformArguments(source: ArgumentSequence, transform: {offset: number} | {prefix: readonly Cell[]}): ArgumentSequence {
        const sequences = this.argumentSequences.get(source.context)!;
        const key = source.id + ("offset" in transform ? ":slice:" + transform.offset : ":prefix:" + transform.prefix.map(cell => cell.id).join(","));
        let sequence = sequences.get(key);
        if (!sequence) {
            const common = {id: this.nextArgumentSequence++, context: source.context, positions: new Map<number, Cell>(), source};
            sequence = "offset" in transform ? {...common, kind: "slice", offset: transform.offset} : {...common, kind: "prepend", prefix: transform.prefix};
            sequences.set(key, sequence);
        }
        return sequence;
    }
    /** All possible argument values also activate every spread protocol.
     * Slice projections may retain earlier values conservatively for escape
     * effects; positional projection below retains the actual offset. */
    private allArgumentValues(sequence: ArgumentSequence): Cell {
        const prior = this.argumentValues.get(sequence); if (prior) return prior;
        const result = this.newCell(); this.argumentValues.set(sequence, result);
        const pending = [sequence], visited = new Set<ArgumentSequence>();
        while (pending.length) {
            const current = pending.pop()!;
            if (visited.has(current)) continue; visited.add(current);
            if (current.kind !== "parts") {
                if (current.kind === "prepend") for (const value of current.prefix) this.copy(value, result);
                pending.push(current.source);
                continue;
            }
            let rule!: Rule;
            rule = this.rule(current.parts.map(part => part.cell), () => {
                for (const part of current.parts) {
                    if (!part.spread||part.abstractList) {this.copy(part.cell, result); continue;}
                    this.watchList(rule, part.cell, current.context);
                    for (const values of this.lists(part.cell, current.context)) {
                        if (values) for (const value of values) this.copy(value, result);
                        else this.copy(this.iteratorElements(part.cell, current.context), result);
                    }
                }
            });
        }
        return result;
    }
    private argumentPosition(sequence: ArgumentSequence, index: number): Cell {
        const prior = sequence.positions.get(index); if (prior) return prior;
        const result = this.newCell(); sequence.positions.set(index, result);
        // Persistent forwarding transformations are traversed iteratively.
        // No depth or argument-extent limit enters this projection.
        while (sequence.kind !== "parts") {
            if (sequence.kind === "slice") index += sequence.offset;
            else if (index < sequence.prefix.length) {this.copy(sequence.prefix[index]!, result); return result;}
            else index -= sequence.prefix.length;
            sequence = sequence.source;
            const cached = sequence.positions.get(index);
            if (cached) {this.copy(cached, result); return result;}
            sequence.positions.set(index, result);
        }
        const parts = sequence.parts;
        let rule!: Rule;
        rule = this.rule(parts.map(part => part.cell), () => {
            // ArgumentListEvaluation consumes every spread, including those
            // after the requested position. Their calls and effects belong
            // to the same invocation even when an earlier value was captured.
            for (const part of parts) if (part.spread&&!part.abstractList) {
                this.watchList(rule, part.cell, sequence.context);
                this.watch(rule, this.iteratorElements(part.cell, sequence.context));
            }
            const pending: Array<{part: number; offset: number | null}> = [{part: 0, offset: index}];
            const visited = new Set<string>();
            while (pending.length) {
                const state = pending.pop()!, key = state.part + ":" + state.offset;
                if (visited.has(key)) continue; visited.add(key);
                const part = parts[state.part];
                if (!part) {this.publish(result, this.primitive(undefined)); continue;}
                const alternatives = part.abstractList?[null]:part.spread ? this.lists(part.cell, sequence.context) : [[part.cell]];
                if (part.spread&&!part.abstractList) this.watchList(rule, part.cell, sequence.context);
                for (const list of alternatives) {
                    if (list === null) {
                        const elements = part.abstractList?part.cell:this.iteratorElements(part.cell, sequence.context);
                        this.watch(rule, elements); this.copy(elements, result);
                        // Unknown extent can contain this position or end
                        // before it. Continue through the remaining sequence
                        // with a symbolic offset, without enumerating lengths.
                        pending.push({part: state.part + 1, offset: null});
                    } else if (state.offset === null) {
                        for (const value of list) this.copy(value, result);
                        pending.push({part: state.part + 1, offset: null});
                    } else if (state.offset < list.length) this.copy(list[state.offset]!, result);
                    else pending.push({part: state.part + 1, offset: state.offset - list.length});
                }
            }
        });
        return result;
    }
    private iteratorPrototype():Cell {
        if(!this.ordinaryIteratorPrototype) {
            const value=this.newCell();this.ordinaryIteratorPrototype=value;
            const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.objectPrototype()};
            this.copy(this.opaqueMutation,owner.shape);this.publish(value,{tag:"object",owner});
            const self=this.newCell();this.publish(self,this.operation("collection-iterator:self"));this.defineField(owner,this.wellKnownSymbols.get("iterator")!,self);
            for(const key of runtimeIteratorMethods) {
                const field=this.newCell();this.publish(field,this.nativeUnknown);this.defineField(owner,key,field);
            }
            for(const key of ["constructor",this.wellKnownSymbols.get("toStringTag")!]) {
                const accessor={get:this.newCell(),set:this.newCell()};
                this.publish(accessor.get,this.nativeUnknown);this.publish(accessor.set,this.nativeUnknown);
                this.accessorSlots.add(accessor.get);this.accessorSlots.add(accessor.set);owner.accessors.set(key,accessor);
                this.ownPresence(owner,key).initial=true;this.publish(this.presence(owner,key),this.primitive(true));
            }
        }
        return this.ordinaryIteratorPrototype;
    }
    private arrayIterationView(receiver:Cell,context:ts.Node,operation:"keys"|"values"|"entries"):{elements:Cell;activity:Cell} {
        let contexts=this.arrayIterationViews.get(receiver);if(!contexts){contexts=new Map();this.arrayIterationViews.set(receiver,contexts);}
        let modes=contexts.get(context);if(!modes){modes=new Map();contexts.set(context,modes);}const prior=modes.get(operation);if(prior)return prior;
        const elements=this.newCell(),activity=this.newCell();modes.set(operation,{elements,activity});
        const keys=new Map<number,Cell>(),pairs=new Map<number,Cell>();
        const missingKey=this.newCell(),missingValue=this.newCell();this.publish(missingKey,{tag:"non-string",kinds:KIND_NUMBER});this.publish(missingValue,this.primitive(undefined));
        const missing=operation==="keys"?missingKey:operation==="values"?missingValue:this.collectionPair(missingKey,missingValue,context);
        let abstract:Cell|undefined;
        const appendAbstract=()=>{
            if(!abstract){const value=operation==="keys"?missingKey:this.computedProperty(receiver,missingKey,context);abstract=operation==="entries"?this.collectionPair(missingKey,value,context):value;}
            this.copy(abstract,elements);
        };
        const append=(index:number)=>{
            let key=keys.get(index);if(!key){key=this.newCell();keys.set(index,key);this.publish(key,this.primitive(index));}
            if(operation==="keys"){this.copy(key,elements);return;}
            const value=this.indexedRead(receiver,index,context);
            if(operation==="values"){this.copy(value,elements);return;}
            let pair=pairs.get(index);if(!pair){pair=this.collectionPair(key,value,context);pairs.set(index,pair);}this.copy(pair,elements);
        };
        const length=this.arrayLikeLength(receiver,context);let rule!:Rule;
        rule=this.rule([receiver,length],()=>{
            const state=this.primitiveState(length,rule,true);
            if(state.pending&&!state.unresolved)return;
            // Keys do not perform indexed Gets. Unknown indexed shape only
            // widens their Number domain; it cannot invent getter effects.
            const positions=this.indexedPropertyPositions(receiver,context,rule);
            if(positions===undefined)return;
            if(positions===null){
                for(const extent of state.proof.values){const present=typeof extent==="number"&&extent>0;this.publish(activity,this.primitive(present));if(present)appendAbstract();}
                if(!state.proof.primitiveComplete){appendAbstract();this.publish(activity,this.primitive(true));this.publish(activity,this.primitive(false));}
                return;
            }
            for(const extent of state.proof.values){
                const size=typeof extent==="number"?extent:NaN;
                if(!Number.isSafeInteger(size)||size<0){this.publish(elements,this.unknown);continue;}
                this.publish(activity,this.primitive(size>0));
                const present=positions.filter(index=>index<size);
                for(const index of present)append(index);
                // Absent positions have one shared value domain. Key indices
                // remain an unbounded Number domain rather than enumerating
                // the logical length of a sparse owner.
                if(present.length<size){
                    this.copy(missing,elements);
                }
            }
            if(!state.proof.primitiveComplete){
                this.publish(activity,this.primitive(true));this.publish(activity,this.primitive(false));
                appendAbstract();
            }
        });return {elements,activity};
    }
    private arrayIterator(receiver:Cell,context:ts.Node,operation:"keys"|"values"|"entries"):Cell {
        let calls=this.arrayIterators.get(context);if(!calls){calls=new Map();this.arrayIterators.set(context,calls);}
        let modes=calls.get(receiver);if(!modes){modes=new Map();calls.set(receiver,modes);}const prior=modes.get(operation);if(prior)return prior;
        const result=this.newCell();modes.set(operation,result);
        if(!this.ordinaryArrayIteratorPrototype) {
            const value=this.newCell();this.ordinaryArrayIteratorPrototype=value;
            const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.iteratorPrototype()};
            this.copy(this.opaqueMutation,owner.shape);this.publish(value,{tag:"object",owner});
            const next=this.newCell();this.publish(next,this.operation("collection-iterator:Array:next"));this.defineField(owner,"next",next);
            const tag=this.newCell();this.publish(tag,this.primitive("Array Iterator"));this.defineField(owner,this.wellKnownSymbols.get("toStringTag")!,tag);
        }
        const owner:ObjectOwner={fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.ordinaryArrayIteratorPrototype,collectionIterator:{kind:"Array",source:receiver,operation,elements:this.newCell(),activity:this.newCell()}};
        this.copy(this.opaqueMutation,owner.shape);const iterator:Atom={tag:"object",owner};
        this.rule([receiver],()=>{for(const atom of receiver.values){
            if(atom===this.primitive(undefined)||atom===this.primitive(null)) {
                this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));
            }else this.publish(result,iterator);
        }});
        return result;
    }
    private iteratorCloseEffects(elements:Cell,context:ts.Node):void {
        const iterator=this.iterationRecords.get(elements);if(!iterator)return;
        const methods=this.property(iterator,"return",context),callee=this.newCell(),completion=this.newCell();
        this.invoke(context,callee,iterator,[],completion);
        // Loop-body abrupt completion may close a custom iterator. Until
        // completion-sensitive effects are represented, retain every possible
        // close getter/call instead of treating element precision as purity.
        this.rule([methods],()=>{for(const atom of methods.values){
            if(atom===this.primitive(undefined)||atom===this.primitive(null))continue;
            this.publish(callee,atom);
        }});
        this.rule([completion],()=>{for(const atom of completion.values)if(atom.tag==="primitive"||atom.tag==="non-string"||atom.tag==="unknown-string"||atom.tag==="text-operation"||atom.tag==="unknown") {
            const handler=this.exceptionHandlers.get(context);if(handler)this.publish(handler,this.nativeException(context));
        }});
    }
    private iteratorElements(receiver: Cell, context: ts.Node): Cell {
        let contexts = this.iterationElements.get(receiver);
        if (!contexts) {contexts = new Map(); this.iterationElements.set(receiver, contexts);}
        const prior = contexts.get(context); if (prior) return prior;
        const result = this.newCell(); contexts.set(context, result);
        const method = this.iterationMethod(receiver, context), custom = this.newCell(), iterator = this.newCell();
        this.copy(method,custom);
        this.invoke(context, custom, receiver, [], iterator);
        const elements=this.directIteratorElements(iterator,context);this.copy(elements,result);
        this.iterationActivity.set(result,this.iterationActivity.get(elements)!);this.iterationRecords.set(result,this.iterationRecords.get(elements)!);
        return result;
    }
    private directIteratorElements(iterator:Cell,context:ts.Node):Cell {
        let contexts=this.directIterationElements.get(iterator);if(!contexts){contexts=new Map();this.directIterationElements.set(iterator,contexts);}const prior=contexts.get(context);if(prior)return prior;
        const result=this.newCell(),activity=this.newCell(),returned=this.newCell();contexts.set(context,result);this.iterationActivity.set(result,activity);this.iterationRecords.set(result,iterator);
        const next = this.property(iterator, "next", context);
        this.invoke(context, next, iterator, [], returned);
        const records = new Map<Atom, {done: Cell; value: Cell}>();
        let steps!: Rule;
        steps = this.rule([returned], () => {
            for (const atom of returned.values) {
                if (atom.tag === "abrupt") continue;
                const owner = this.ordinaryOwner(atom);
                if (!owner) {
                    if (atom.tag === "unknown" || atom.tag === "opaque-object" || atom.tag === "pending-source") {this.publish(result, atom);this.publish(activity,this.primitive(true));this.publish(activity,this.primitive(false));}
                    continue;
                }
                let record = records.get(atom);
                if (!record) {
                    const input = this.newCell(); this.publish(input, atom);
                    record = {done: this.property(input, "done", context), value: this.newCell()}; records.set(atom, record);
                    const selected = record;
                    let valueRead: Cell | undefined;
                    let values!: Rule;
                    values = this.rule([selected.done], () => {
                        const state = this.primitiveState(selected.done, values, true);
                        if (state.pending && !state.unresolved) return;
                        if(!state.proof.primitiveComplete){this.publish(activity,this.primitive(true));this.publish(activity,this.primitive(false));}
                        else for(const value of state.proof.values)this.publish(activity,this.primitive(!value));
                        if (!state.proof.primitiveComplete || state.proof.values.some(value => !value)) {
                            valueRead ??= this.property(input, "value", context);
                            this.copy(valueRead, selected.value);
                        }
                    });
                }
                this.watch(steps, record.value); this.copy(record.value, result);
            }
        });
        return result;
    }
    private cell(raw: ts.Node): Cell {
        const node = ts.isExpression(raw) ? unwrap(raw) : raw;
        let result = this.cells.get(node);
        if (!result) {
            result = this.newCell(); this.cells.set(node, result); this.initializers.push({ node, result });
        }
        return result;
    }
    /** Inside the taken branch of `x === L` (L a primitive literal), a read of
     * x yields exactly L when x cannot change between the test and the read:
     * a non-ambient local binding with no write sites (or a const), in a
     * function without direct eval, `with`, or sloppy `arguments` aliasing of
     * a parameter. `x === 0` also admits -0. */
    private strictEqualityRefinement(node:ts.Identifier):readonly Atom[]|null {
        const symbol=this.bindingSymbol(node),declaration=symbol?.valueDeclaration;
        if(!symbol||!declaration||declaration.getSourceFile()!==node.getSourceFile())return null;
        const isConst=ts.isVariableDeclaration(declaration)&&ts.isVariableDeclarationList(declaration.parent)&&(declaration.parent.flags&ts.NodeFlags.Const)!==0;
        if(!isConst&&(this.bindingWriteSites.get(symbol)?.size??0)>0)return null;
        if(!ts.isParameter(declaration)&&!ts.isVariableDeclaration(declaration))return null;
        const literal=(expression:ts.Expression):readonly Atom[]|null=>{
            const value=unwrap(expression);
            if(ts.isNumericLiteral(value)){const number=Number(value.text);return number===0?[this.primitive(0),this.primitive(-0)]:[this.primitive(number)];}
            if(ts.isPrefixUnaryExpression(value)&&value.operator===ts.SyntaxKind.MinusToken&&ts.isNumericLiteral(value.operand)){const number=-Number(value.operand.text);return number===0?[this.primitive(0),this.primitive(-0)]:[this.primitive(number)];}
            if(ts.isStringLiteral(value)||ts.isNoSubstitutionTemplateLiteral(value))return [this.primitive(value.text)];
            if(value.kind===ts.SyntaxKind.TrueKeyword)return [this.primitive(true)];
            if(value.kind===ts.SyntaxKind.FalseKeyword)return [this.primitive(false)];
            if(value.kind===ts.SyntaxKind.NullKeyword)return [this.primitive(null)];
            return null;
        };
        const sameBinding=(expression:ts.Expression):boolean=>{const value=unwrap(expression);return ts.isIdentifier(value)&&this.bindingSymbol(value)===symbol;};
        const proven=(condition:ts.Expression):readonly Atom[]|null=>{
            const value=unwrap(condition);
            if(ts.isBinaryExpression(value)&&value.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken)return proven(value.left)??proven(value.right);
            if(ts.isBinaryExpression(value)&&value.operatorToken.kind===ts.SyntaxKind.EqualsEqualsEqualsToken){
                if(sameBinding(value.left))return literal(value.right);
                if(sameBinding(value.right))return literal(value.left);
            }
            return null;
        };
        for(let child:ts.Node=node,parent=node.parent;parent;child=parent,parent=parent.parent){
            if(functionNode(parent))break;
            let refined:readonly Atom[]|null=null;
            if(ts.isIfStatement(parent)&&child===parent.thenStatement)refined=proven(parent.expression);
            else if(ts.isConditionalExpression(parent)&&child===parent.whenTrue)refined=proven(parent.condition);
            else if(ts.isBinaryExpression(parent)&&parent.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken&&child===parent.right)refined=proven(parent.left);
            if(refined)return this.refinementBlocked(declaration)?null:refined;
        }
        return null;
    }
    /** Writes the analysis cannot see: a direct eval or `with` anywhere in the
     * declaring scope (nested functions included), or sloppy `arguments`
     * aliasing a parameter. */
    private readonly refinementBlockers=new WeakMap<ts.Node,{evaluation:boolean;argumentsAlias:boolean}>();
    private refinementBlocked(declaration:ts.Declaration):boolean {
        let scope:ts.Node|undefined=declaration.parent;while(scope&&!functionNode(scope)&&!ts.isSourceFile(scope))scope=scope.parent;
        if(!scope)return true;
        let facts=this.refinementBlockers.get(scope);
        if(!facts){
            const found={evaluation:false,argumentsAlias:false};const sloppy=!isStrictCodeContext(scope);
            const visit=(current:ts.Node):void=>{
                if(ts.isWithStatement(current))found.evaluation=true;
                else if(ts.isCallExpression(current)){const callee=unwrap(current.expression);if(ts.isIdentifier(callee)&&callee.text==="eval")found.evaluation=true;}
                else if(sloppy&&ts.isIdentifier(current)&&current.text==="arguments")found.argumentsAlias=true;
                ts.forEachChild(current,visit);
            };
            visit(scope);facts=found;this.refinementBlockers.set(scope,facts);
        }
        return facts.evaluation||ts.isParameter(declaration)&&facts.argumentsAlias;
    }
    private initialize(node: ts.Node, result: Cell): void {
        const guards=this.guards(node);
        if(ts.isCallExpression(node)){
            // Only a literal eval call looks up its activation: resolving it
            // creates the enclosing function's owner, which every other call
            // site must leave to its actual invocation.
            const target=unwrap(node.expression),argument=node.arguments[0];
            if(ts.isIdentifier(target)&&target.text==="eval"&&argument&&(ts.isStringLiteral(argument)||ts.isNoSubstitutionTemplateLiteral(argument))&&this.enclosingActivation(node))
                this.literalEvaluationCandidates.set(node,{direct:!node.questionDotToken,text:argument.text});
        }
        if(guards.length&&ts.isCallExpression(node)){
            const target=unwrap(node.expression);
            if(ts.isIdentifier(target)&&target.text==="eval")this.inactiveEvaluationCandidates.set(node,new Set([!node.questionDotToken]));
        }
        if(guards.length){
            let initialized=false,rule!:Rule;
            rule=this.rule(guards.map(guard=>guard.condition),()=>{if(!initialized&&this.guardsAllow(guards,rule)){initialized=true;this.initializeActive(node,result);}});
            return;
        }
        this.initializeActive(node,result);
    }
    private initializeActive(node: ts.Node, result: Cell): void {
        if (callableDefinition(node)) { this.publish(result, { tag: "function", owner: this.function(node) }); return; }
        const operation = sourceNumericOperation(node);
        if (operation) {
            const operands = ts.isBinaryExpression(node) ? [this.cell(node.left), this.cell(node.right)] : [this.cell((node as ts.PrefixUnaryExpression | ts.PostfixUnaryExpression).operand)];
            if(operation.conversion==="equality"){this.copy(this.looseEquality(operands[0]!,operands[1]!,node,operation),result);return;}
            const converted = operation.form === "equality" ? operands : this.convertList(operands, node, operation.conversion as PrimitiveHint | "numeric" | "primitive-number");
            const computed = operation.form === "update" ? this.newCell() : result;
            this.publish(computed, {tag: "text-operation", operation: "numeric", numeric: operation, parts: converted});
            if (operation.form === "update") {
                this.copy(ts.isPostfixUnaryExpression(node) ? converted[0]! : computed, result);
                // A shared mutable location has no versioned scalar value.
                // Retain its numeric category after normal conversion instead
                // of feeding expression values back into the location graph.
                const stored = this.updateStored(node);
                let write!: Rule;
                write = this.rule([converted[0]!], () => {
                    const state = this.primitiveState(converted[0]!, write, true);
                    if (state.pending) return;
                    if(state.proof.primitiveComplete&&!state.proof.values.length)this.publish(stored,this.abrupt);
                    else {
                        const kinds=this.primitiveKinds(converted[0]!)&KIND_NUMERIC||KIND_NUMERIC;
                        let value=this.numericValues.get(kinds);if(!value){value={tag:"non-string",kinds};this.numericValues.set(kinds,value);}
                        this.publish(stored,value);
                    }
                });
            }
            const handler = this.exceptionHandlers.get(node);
            if (handler) {
                let rule!: Rule;
                rule = this.rule(converted, () => {
                    const states = converted.map(input => this.primitiveState(input,rule,true));
                    if (states.some(state => state.pending || state.proof.primitiveComplete && !state.proof.values.length)) return;
                    if (!handler || operation.conversion === "none") return;
                    if(operation.form==="update"||ts.isBinaryExpression(node)&&operation.assignment===node.operatorToken.kind)
                        this.publish(handler,this.nativeException(node));
                    if (states.some(state => state.unresolved)) this.publish(handler,this.unknown);
                    if (states.some(state => !state.proof.primitiveComplete) && !this.numericOperationCannotThrow(operation,converted)) this.publish(handler,this.nativeException(node));
                    for (const tuple of sourceChoiceTuples(states.map(state => state.proof.values))) {
                        try {operation.evaluate(tuple);} catch {this.publish(handler,this.nativeException(node));}
                    }
                });
            }
            return;
        }
        if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken) {
            this.publish(result, {tag: "text-operation", operation: "prefix", operator: node.operator, parts: [this.cell(node.operand)]}); return;
        }
        if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.InKeyword&&ts.isPrivateIdentifier(node.left)){this.copy(this.privateAccess(this.cell(node.right),node.left,node,"has"),result);return;}
        if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.InstanceOfKeyword){this.copy(this.instanceofSource(this.cell(node.left),this.cell(node.right),node),result);return;}
        if (ts.isDeleteExpression(node) || ts.isBinaryExpression(node) && BOOLEAN_BINARY_RESULTS.has(node.operatorToken.kind)) {
            this.publish(result, this.primitive(true)); this.publish(result, this.primitive(false));
            // `key in value` throws TypeError for a non-Object right operand.
            if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.InKeyword) {
                // ToPropertyKey(left) runs before HasProperty and can call
                // the key's own toString / valueOf / @@toPrimitive.
                this.convertList([this.cell(node.left)], node, "string");
                const right = this.cell(node.right), handler = this.exceptionHandlers.get(node);
                this.proxyInternalMethod(right,["has"],node,true);
                if (handler) this.rule([right], () => { if ([...right.values].some(atom => atom.tag === "primitive")) this.publish(handler, this.nativeException(node, "TypeError")); });
            }
            return;
        }
        if (ts.isVoidExpression(node)) { this.publish(result, this.primitive(undefined)); return; }
        if (ts.isTypeOfExpression(node)) {
            const operand=this.cell(node.expression);let rule!:Rule;
            rule=this.rule([operand],()=>{
                this.watchText(rule,operand);
                const kinds=this.primitiveKinds(operand);
                for(const [mask,name]of [[KIND_UNDEFINED,"undefined"],[KIND_NULL|KIND_OBJECT,"object"],[KIND_BOOLEAN,"boolean"],[KIND_NUMBER,"number"],[KIND_BIGINT,"bigint"],[KIND_STRING,"string"],[KIND_SYMBOL,"symbol"],[KIND_FUNCTION,"function"]] as const)
                    if(kinds&mask)this.publish(result,this.text(name));
            });
            return;
        }
        if (ts.isRegularExpressionLiteral(node)) {
            const close=node.text.lastIndexOf("/"),source=this.newCell(),flags=this.newCell();
            this.publish(source,this.primitive(node.text.slice(1,close)));this.publish(flags,this.primitive(canonicalRegExpFlags(node.text.slice(close+1))??""));
            this.copy(this.regexpInstance(node,source,flags),result);return;
        }
        if (ts.isStringLiteralLike(node)) this.publish(result, this.text(node.text));
        else if (ts.isNumericLiteral(node)) this.publish(result, this.primitive(Number(node.text)));
        else if (ts.isBigIntLiteral(node)) this.publish(result, this.primitive(BigInt(node.text.replace(/n$/i, ""))));
        else if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword || node.kind === ts.SyntaxKind.NullKeyword)
            this.publish(result, this.primitive(node.kind === ts.SyntaxKind.NullKeyword ? null : node.kind === ts.SyntaxKind.TrueKeyword));
        else if (ts.isIdentifier(node)) {
            if(this.bindingDefinitelyInTDZ(node)) {
                this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(node);
                if(handler)this.publish(handler,this.nativeException(node));return;
            }
            const ambient=this.isAmbientIdentifier(node);
            const refined=ambient?null:this.strictEqualityRefinement(node);
            if(refined){for(const atom of refined)this.publish(result,atom);return;}
            const binding=this.binding(node);
            if(ambient){let absence!:Rule;absence=this.rule([binding],()=>{
                if(!this.presenceClosed){this.presenceRules.add(absence);return;}
                if(this.evaluationDeclarationUnavailable(binding,node))this.publish(result,this.unknown);
            });}
            // Lexical, imported and global source bindings share the same
            // origin capture. Dynamic/repeated contexts remain conservative.
            const symbol=this.bindingSymbol(node),declaration=symbol?.valueDeclaration,activation=this.enclosingActivation(node);
            const location=activation&&declaration&&this.enclosingActivation(declaration)===activation&&!this.repeatedActivationContext(node)&&
                [...this.bindingWriteSites.get(symbol!)??[]].some(([site,leaves])=>this.enclosingActivation(site)===activation&&!this.repeatedActivationContext(site)&&[...leaves.values()].some(event=>this.readBeforeWrite(node,site,event.reference)))?binding:undefined;
            this.copy(this.captureRead(this.bindingRead(binding,node),node,false,location),result);
            if (this.bindingMayBeUninitialized(node)) this.publish(result,this.primitive(undefined));
            for (const base of this.withBindingObjects(node)) this.copy(this.property(base, node.text, node), result);
            if (ambient && !this.evaluationGlobalTargets.has(node) && !this.evaluationEnvironments.has(this.sourceFile(node)) && !this.globalLexicals.has(node.text)) {
                this.copyRead(this.globalBinding(node.text),result,node);
            }
            if(node.text!=="globalThis"&&binding===this.currentRealm.bindings.get(node.text)) {
                this.publish(this.globalReceiver,this.global);
                const owner=this.ordinaryOwner(this.global)!;let linked=false;
                this.rule([owner.shape],()=>{
                    if(!linked&&(owner.accessors.has(node.text)||owner.accessors.has(null))) {
                        linked=true;this.copy(this.property(this.globalReceiver,node.text,node),result);
                    }
                });
            }
        } else if (ts.isMetaProperty(node) && node.keywordToken === ts.SyntaxKind.NewKeyword) {
            // new.target is the NewTarget of the nearest non-arrow function
            // activation; eval code reads its caller's.
            let owner:ts.Node|undefined=node.parent;
            while(owner&&!(ts.isFunctionLike(owner)&&!ts.isArrowFunction(owner)&&"body" in owner))owner=owner.parent;
            if(owner&&callableDefinition(owner))this.copy(this.function(owner).newTarget,result);
            else{
                const environment=this.evaluationEnvironments.get(this.sourceFile(node));
                if(environment){
                    let rule!:Rule;const seen=new Set<ts.Node>();
                    rule=this.rule([],()=>{this.watch(rule,this.evaluationCallerChange(environment));
                        for(const caller of environment.callers.keys()){
                            if(seen.has(caller))continue;seen.add(caller);
                            let enclosing:ts.Node|undefined=caller.parent;
                            while(enclosing&&!(ts.isFunctionLike(enclosing)&&!ts.isArrowFunction(enclosing)&&"body" in enclosing))enclosing=enclosing.parent;
                            if(enclosing&&callableDefinition(enclosing))this.copy(this.function(enclosing).newTarget,result);
                            else this.publish(result,this.primitive(undefined));
                        }});
                }else this.publish(result,this.unknown);
            }
        } else if (ts.isMetaProperty(node) && node.keywordToken === ts.SyntaxKind.ImportKeyword) {
            const source = node.getSourceFile();
            let metadata = this.moduleMetadata.get(source);
            if (!metadata) {
                metadata = this.newCell(); this.moduleMetadata.set(source,metadata);
                const owner: ObjectOwner = {fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.newCell()};
                this.publish(owner.prototype!,this.primitive(null)); this.publish(metadata,{tag:"object",owner});
            }
            this.copy(metadata,result);
        } else if (node.kind === ts.SyntaxKind.ThisKeyword) {
            this.copy(this.thisBinding(node),result);
        } else if (node.kind === ts.SyntaxKind.SuperKeyword && (ts.isPropertyAccessExpression(node.parent) || ts.isElementAccessExpression(node.parent))) {
            // A super property reference's base is the home object's
            // [[GetPrototypeOf]]() (sec-getsuperbase); its receiver is `this`.
            const home=this.homeObject(node);
            if(home)this.copy(this.getPrototype(home,node,false),result);else this.publish(result,this.unknown);
        } else if (ts.isObjectLiteralExpression(node) || ts.isArrayLiteralExpression(node)) {
            const owner = this.owner(node);
            owner.ordinary=true;
            this.publish(result, { tag: "object", owner });
            if(ts.isObjectLiteralExpression(node)){
                owner.prototype=this.newCell();
                const prototype=!(node.getSourceFile().flags & ts.NodeFlags.JsonFile) ? node.properties.find(member=>ts.isPropertyAssignment(member)&&!ts.isComputedPropertyName(member.name)&&propertyName(member.name)==="__proto__") as ts.PropertyAssignment|undefined : undefined;
                if(prototype){const value=this.cell(prototype.initializer);this.rule([value],()=>{for(const atom of value.values){
                    if(this.ordinaryOwner(atom)||atom===this.primitive(null)||atom.tag==="pending-source")this.publish(owner.prototype!,atom);
                    else if(atom.tag==="unknown"||atom.tag==="opaque-object")this.publish(owner.prototype!,this.unknown);
                    else this.copy(this.objectPrototype(),owner.prototype!);
                }});}else this.copy(this.objectPrototype(),owner.prototype);
            }
            if (ts.isArrayLiteralExpression(node)) {
                this.arrayOwner(node,owner);
                const parts = node.elements.map(element => ({ cell: this.cell(ts.isSpreadElement(element) ? element.expression : element), spread: ts.isSpreadElement(element) }));
                const holes=new Set(parts.filter((_,index)=>ts.isOmittedExpression(node.elements[index]!)).map(part=>part.cell));
                this.literalLists.set(owner,{node,parts,holes});
                owner.listSources = parts.filter(part => part.spread).map(part => part.cell);
                const seen = new Set<string>();
                let rule: Rule, abstractSpread = false;
                rule = this.rule(parts.map(part => part.cell), () => {
                    for (const part of parts) if (part.spread) this.watchList(rule, part.cell,node);
                    if (this.cyclicListShape(owner)) {
                        this.publish(owner.listLength!, this.unknown);
                        return;
                    }
                    for (const list of this.arguments(parts,node)) {
                        if (!list) {
                            // ArrayAccumulation steps a spread operand's iterator to
                            // completion: its calls run here, its values become
                            // elements at positions the analysis does not represent.
                            if (!abstractSpread) {
                                abstractSpread = true;
                                this.publish(owner.listLength!, this.numberValue());
                                // An operand that reaches this literal through its own
                                // spread sources is a cyclic List shape: like the
                                // represented cycle above, it contributes no elements.
                                for (const part of parts) if (part.spread) {
                                    const acyclic = this.newCell();
                                    this.rule([part.cell], () => {for (const atom of part.cell.values) if (!(atom.tag === "object" && this.listReaches(atom.owner, owner))) this.publish(acyclic, atom);});
                                    this.writeProperty(result, null, this.iteratorElements(acyclic, node), true, "define", node);
                                }
                                for (const part of parts) if (!part.spread && !holes.has(part.cell)) this.writeProperty(result, null, part.cell, true, "define", node);
                            }
                            continue;
                        }
                        const key = list.map(cell => cell.id).join(",");
                        if (seen.has(key)) continue;
                        seen.add(key);
                        list.forEach((value, index) => {if(!holes.has(value))this.defineField(owner,String(index),value,true);});
                        this.publish(owner.listLength!, this.primitive(list.length));
                    }
                });
            }
            if (ts.isObjectLiteralExpression(node)) for (const member of node.properties) {
                if(ts.isSpreadAssignment(member)){this.copyDataProperties(owner,this.cell(member.expression),member);continue;}
                if(!(node.getSourceFile().flags & ts.NodeFlags.JsonFile)&&ts.isPropertyAssignment(member)&&!ts.isComputedPropertyName(member.name)&&propertyName(member.name)==="__proto__")continue;
                this.projectMemberKeys(member.name,member,key=>{
                    if(ts.isGetAccessorDeclaration(member)||ts.isSetAccessorDeclaration(member))this.defineAccessor(owner,key,ts.isGetAccessorDeclaration(member)?"get":"set",this.cell(member),member);
                    else {
                        const value=ts.isPropertyAssignment(member)?this.cell(member.initializer):ts.isShorthandPropertyAssignment(member)?this.cell(member.name):ts.isMethodDeclaration(member)?this.cell(member):undefined;
                        if(value)this.defineField(owner,key,value,true);
                    }
                },owner);
            }
        } else if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
            const reference=this.sourceReference(node);
            if(!reference.read){this.publish(result,this.unknown);return;}
            if(ts.isPropertyAccessExpression(node)&&ts.isPrivateIdentifier(node.name)) {this.copy(this.privateAccess(reference.base!,node.name,reference.readContext!,"get"),result);return;}
            const receiver=node.expression.kind===ts.SyntaxKind.SuperKeyword?this.thisBinding(node.expression):reference.base!;
            if (ts.isElementAccessExpression(node) && node.argumentExpression)
                this.copy(this.computedProperty(reference.base!,reference.key!,reference.readContext!,receiver),result);
            else {
                const key=propertyName(node);
                if(key!==null)this.copy(this.property(reference.base!,key,reference.readContext!,false,receiver),result);
            }
        } else if (ts.isConditionalExpression(node)) {
            const condition = this.cell(node.condition), whenTrue = this.cell(node.whenTrue), whenFalse = this.cell(node.whenFalse);
            // The branch cells own unresolved values. Sealing this dependent
            // result with top would survive their later finite publication.
            this.normalResults.set(result,this.abrupt);
            let rule!: Rule;
            rule = this.rule([condition], () => {
                const state = this.primitiveState(condition,rule,true);
                if (state.pending && !state.unresolved) return;
                const truth = new Set(state.proof.values.map(Boolean));
                if (!state.proof.primitiveComplete) for (const value of condition.values) {
                    if (value.tag === "abrupt" || value.tag === "pending-source" || value.tag === "primitive") continue;
                    if (value.tag === "unknown" || value.tag === "non-string" || value.tag === "text-operation") {truth.add(false); truth.add(true);}
                    else truth.add(true);
                }
                if (state.proof.primitiveComplete && !state.proof.values.length) this.publish(result,this.abrupt);
                for (const value of truth) this.copy(value ? whenTrue : whenFalse,result);
            });
        } else if (ts.isBinaryExpression(node)) {
            if ([ts.SyntaxKind.CommaToken, ts.SyntaxKind.EqualsToken].includes(node.operatorToken.kind)) this.copy(this.cell(node.right), result);
            else if (NAME_EVALUATING_ASSIGNMENTS.has(node.operatorToken.kind)) {
                this.copy(this.cell(node.left), result); this.copy(this.cell(node.right), result);
            } else if ([ts.SyntaxKind.BarBarToken, ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)) {
                // The left operand is the result only when its value selects
                // it: falsy for &&, truthy for ||, nullish for ??. Objects
                // and callables are always truthy, so they never pass &&.
                const left = this.cell(node.left), operator = node.operatorToken.kind;
                this.copy(this.cell(node.right), result);
                this.rule([left], () => { for (const atom of left.values) if (this.logicalLeftSelects(atom, operator)) this.publish(result, atom); });
            }
        } else if (ts.isTemplateExpression(node)) {
            const parts: Cell[] = [];
            const literal = (text: string): void => { const cell = this.newCell(); this.publish(cell, this.text(text)); parts.push(cell); };
            literal(node.head.text);
            for (const span of node.templateSpans) { parts.push(this.cell(span.expression)); literal(span.literal.text); }
            this.publish(result, { tag: "text-operation", operation: "template", parts: this.convertList(parts,node,"text") });
        } else if(ts.isYieldExpression(node)){
            const owner=this.enclosingActivation(node);
            if(owner)this.copy(owner.yieldReceives,result);else this.publish(result,this.unknown);
        } else if (ts.isAwaitExpression(node)) {
            this.copy(this.promiseAwait(this.cell(node.expression),node),result);
        } else if (ts.isTaggedTemplateExpression(node)) {
            // EvaluateCall of the tag with the site's template object and the
            // substitution values (sec-tagged-templates-runtime-semantics-
            // evaluation); a member tag passes its base as `this`, and a name
            // a with object supplies passes that object, as a call does.
            const target=unwrap(node.tag);
            const objects=ts.isIdentifier(target)?this.withBindingObjects(target):[];
            const receiver=ts.isPropertyAccessExpression(target)||ts.isElementAccessExpression(target)?this.cell(target.expression):objects.length?this.newCell():this.empty;
            for(const object of objects)this.copy(object,receiver);
            const substitutions=ts.isTemplateExpression(node.template)?node.template.templateSpans.map(span=>({cell:this.cell(span.expression),spread:false})):[];
            this.invoke(node,this.cell(target),receiver,[{cell:this.templateObject(node),spread:false},...substitutions],result);
        } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
            this.dynamicImportEffects(node,result);
        } else if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
            // The callee publishes the actual native/exotic result owner.
            const target = unwrap(node.expression);
            const activation=this.enclosingActivation(node);
            const superOwner=target.kind===ts.SyntaxKind.SuperKeyword && activation?.node && isClassConstructor(activation.node) && ts.isClassLike(activation.node.parent) ? this.function(activation.node.parent) : null;
            const objects = ts.isCallExpression(node) && ts.isIdentifier(target) ? this.withBindingObjects(target) : [];
            const constructedReceiver = this.newCell();
            this.publish(constructedReceiver,{tag:"object",owner:this.owner(node)});
            const receiver = superOwner ? superOwner.receiver : ts.isNewExpression(node) ? constructedReceiver : ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target)
                ? target.expression.kind===ts.SyntaxKind.SuperKeyword ? this.thisBinding(target.expression) : this.cell(target.expression) : objects.length ? this.newCell() : this.empty;
            for (const object of objects) this.copy(object, receiver);
            const parts = (node.arguments ?? []).map(argument => ({ cell: this.cell(ts.isSpreadElement(argument) ? argument.expression : argument), spread: ts.isSpreadElement(argument) }));
            this.invoke(node,superOwner?.base ?? this.cell(target),receiver,parts,result,ts.isNewExpression(node) || !!superOwner,
                ts.isCallExpression(node) && !node.questionDotToken && ts.isIdentifier(target) && target.text === "eval");
        }
    }
    /** ImportCall operand evaluation is synchronous; conversion and option
     * reads reject its Promise. Retain those immediate effects through the
     * ordinary owner/property/call graph and an ordered key continuation. */
    private dynamicImportEffects(node:ts.CallExpression,result:Cell):void {
        const specifier=node.arguments[0]?this.cell(node.arguments[0]):this.empty;
        const options=node.arguments[1]?this.cell(node.arguments[1]):this.newCell();
        if(!node.arguments[1])this.publish(options,this.primitive(undefined));
        const context=ts.setTextRange(ts.factory.createEmptyStatement(),node);
        (context as ts.Node & {parent:ts.Node}).parent=node;
        const rejection=this.exceptionCell(),value=this.newCell(),namespace=this.newCell();
        const converted=this.newCell();this.importTargetCells.set(node,converted);
        const assimilated=this.promiseAssimilation(namespace,context);
        this.copy(assimilated.value,value);this.copy(assimilated.rejection,rejection);
        const atoms=new Map<Atom,Cell>(),atomCell=(atom:Atom)=>{let cell=atoms.get(atom);if(!cell){cell=this.newCell();atoms.set(atom,cell);this.publish(cell,atom)}return cell};
        this.exceptionHandlers.set(context,rejection);
        const normal=(cell:Cell)=>[...cell.values].some(atom=>atom.tag!=="abrupt"&&atom.tag!=="pending-source");
        const reject=()=>this.publish(rejection,this.nativeException(context));
        let started=false;
        this.onActive(node,()=>{
            let operands!:Rule;
            operands=this.rule([specifier,options],()=>{
                if(specifier.values.has(this.abrupt)||options.values.has(this.abrupt)){this.publish(result,this.abrupt);this.publish(converted,this.abrupt);}
                if(started||!normal(specifier)||!normal(options))return;started=true;
                this.publish(result,{tag:"promise",value,rejection});
                let conversion!:Rule;
                conversion=this.rule([specifier],()=>{
                    const strings=this.stringHintTexts(specifier,conversion,context);
                    if(strings===null)this.publish(converted,this.unknown);
                    else if(strings?.length===0)this.publish(converted,this.abrupt);
                    else for(const text of strings??[])this.publish(converted,this.primitive(text));
                });
                let modules!:Rule;
                modules=this.rule([converted],()=>{
                    const proof=this.primitiveState(converted,modules,true);
                    if(proof.pending&&!proof.unresolved)return;
                    // The AOT module set is fixed at build time: a specifier
                    // without a finite proof names no candidate, so the
                    // import rejects instead of producing an unknown namespace.
                    if(!proof.proof.primitiveComplete){this.publish(rejection,this.nativeException(context));return;}
                    for(const text of proof.proof.values){
                        const resolved=ts.resolveModuleName(String(text),node.getSourceFile().fileName,this.program.getCompilerOptions(),ts.sys).resolvedModule;
                        const source=resolved?this.program.getSourceFile(sourceUnitFileName(this.program,resolved.resolvedFileName,"module")):undefined;
                        const symbol=source?this.checker.getSymbolAtLocation(source):undefined;
                        if(source&&sourceModuleFailure(source))this.publish(rejection,this.nativeException(context));
                        else if(source&&(symbol||source.flags&ts.NodeFlags.JsonFile))this.copy(this.moduleNamespace(source,symbol),namespace);
                        else if(resolved&&!source)this.publish(namespace,this.pendingSource);
                        // No module outside the build's graph can load: an
                        // unresolved specifier rejects, except a host module
                        // request whose namespace the runtime supplies.
                        else if(!resolved&&!String(text).startsWith("node:"))this.publish(rejection,this.nativeException(context));
                        else this.publish(namespace,this.unknown);
                    }
                });
                const selected=this.newCell();
                this.rule([converted,options],()=>{
                    if(!normal(converted))return;
                    for(const atom of options.values){
                        if(atom===this.primitive(undefined))continue;
                        if(this.ordinaryOwner(atom)||atom.tag==="unknown"||atom.tag==="opaque-object"||atom.tag==="promise"||atom.tag==="generator")this.publish(selected,atom);
                        else if(atom.tag!=="abrupt"&&atom.tag!=="pending-source")reject();
                    }
                });
                const attributes=this.property(selected,"with",context),opened=new Set<ObjectOwner>();let intake!:Rule;
                intake=this.rule([attributes],()=>{for(const atom of attributes.values){
                    if(atom===this.primitive(undefined)||atom.tag==="abrupt"||atom.tag==="pending-source")continue;
                    const owner=this.ordinaryOwner(atom);
                    if(!owner){
                        if(atom.tag==="unknown"||atom.tag==="opaque-object"||atom.tag==="promise"||atom.tag==="generator"){this.opaqueEffect(context);this.publish(rejection,this.unknown);}
                        else reject();
                        continue;
                    }
                    this.watch(intake,owner.shape);if(!this.definitionsReady(owner,intake))continue;
                    if(owner.proxy&&!opened.has(owner)){
                        opened.add(owner);
                        const keys=this.proxyReadEffects(owner,null,"ownKeys",context),selected=new Set<SourcePropertyKey>();let traps!:Rule;
                        let opaqueKeys=false;
                        traps=this.rule([keys],()=>{
                            for(const list of this.arguments([{cell:keys,spread:true}],context)){
                                if(list===null){
                                    if(!opaqueKeys){opaqueKeys=true;this.proxyReadEffects(owner,null,"getOwnPropertyDescriptor",context);this.proxyReadEffects(owner,null,"get",context);}continue;
                                }
                                for(const cell of list){const state=this.primitiveState(cell,traps,true);for(const name of state.proof.values){
                                    if(typeof name!=="string"||selected.has(name))continue;selected.add(name);
                                    const descriptor=this.proxyReadEffects(owner,name,"getOwnPropertyDescriptor",context),input=this.newCell();
                                    this.rule([descriptor],()=>{for(const atom of descriptor.values)if(atom!==this.primitive(undefined))this.publish(input,atom)});
                                    const converted=this.propertyDescriptor(input,context),enumerable=converted.fields.get("enumerable")!.value;let attribute!:Rule;
                                    attribute=this.rule([converted.normal,enumerable],()=>{if(!normal(converted.normal))return;const proof=this.primitiveState(enumerable,attribute,true);if(proof.proof.values.some(Boolean)||proof.unresolved)this.proxyReadEffects(owner,name,"get",context)});
                                }}
                            }
                        });
                    }
                    if(this.opaqueShape(owner,context)||owner.proxy){this.opaqueEffect(context);this.publish(rejection,this.unknown);}
                    if(opened.has(owner))continue;
                    const ownKeys=this.ownerKeys(owner,intake);if(ownKeys===undefined)continue;opened.add(owner);
                    const receiver=this.newCell();this.publish(receiver,atom);if(ownKeys===null){this.opaqueEffect(context);this.publish(rejection,this.unknown);continue;}
                    const names=ownKeys.filter((key):key is string=>typeof key==="string");
                    names.sort((a,b)=>{const index=(name:string)=>{const number=Number(name);return String(number)===name&&Number.isInteger(number)&&number>=0&&number<0xffffffff?number:null};const ai=index(a),bi=index(b);return ai!==null&&bi!==null?ai-bi:ai!==null?-1:bi!==null?1:0});
                    const active=this.newCell();this.publish(active,this.primitive(true));
                    const pending:{index:number;active:Cell}[]=[{index:0,active}];
                    while(pending.length){
                        const step=pending.pop()!;if(step.index===names.length)continue;
                        const key=names[step.index]!,presence=this.propertyPresence(owner,key,context),enumerable=this.ownPresence(owner,key).enumerable,next=this.newCell();
                        let selectedValue:Cell|undefined,read!:Rule;
                        read=this.rule([step.active,presence,enumerable],()=>{
                            if(!normal(step.active))return;
                            if(presence.values.has(this.primitive(false)))this.publish(next,this.primitive(true));
                            if(!presence.values.has(this.primitive(true)))return;
                            const state=this.primitiveState(enumerable,read,true);if(state.pending&&!state.unresolved)return;
                            if(!state.proof.primitiveComplete){this.opaqueEffect(context);this.publish(rejection,this.unknown);return;}
                            if(state.proof.values.some(choice=>!choice))this.publish(next,this.primitive(true));
                            if(!state.proof.values.some(Boolean)||selectedValue)return;
                            selectedValue=this.property(receiver,key,context,true);
                            this.rule([selectedValue],()=>{for(const value of selectedValue!.values){
                                if(value.tag==="abrupt"||value.tag==="pending-source")continue;
                                const kinds=this.primitiveKinds(atomCell(value));
                                // EnumerableOwnProperties obtains every value
                                // before ImportCall validates their String types.
                                this.publish(next,this.primitive(true));
                                if(kinds&~KIND_STRING)reject();
                            }});
                        });
                        pending.push({index:step.index+1,active:next});
                    }
                }});
            });
        });
    }
    private invoke(node: ts.Node, callee: Cell, receiver: Cell, parts: readonly ListPart[], result: Cell, construct = false, direct = false): void {
        const signature=callee.id+":"+receiver.id+":"+parts.map(part=>part.cell.id+":"+part.spread+":"+!!part.abstractList).join(",")+":"+construct+":"+direct;
        let calls=this.callResults.get(node);
        if(!calls){calls=new Map();this.callResults.set(node,calls);}
        const existing=calls.get(signature);
        if(existing){this.copy(existing,result);return;}
        // The invocation owns its result location. Consumers can attach
        // derived read projections without changing the cached call itself.
        const returned=this.newCell();calls.set(signature,returned);this.copy(returned,result);result=returned;
        const sequence = this.argumentSequence(node, parts);
        const constructedReceiver=this.newCell();
        this.publish(constructedReceiver,{tag:"object",owner:this.owner(node)});
        const boundValues = new Map<string, Atom>();
        const omittedArgument = this.newCell(); this.publish(omittedArgument, this.primitive(undefined));
        const convertArguments = (args: readonly Cell[] | null): readonly Cell[] | null =>
            args ? this.convertList(args, node, "text") : null;
        const seen = new Map<Atom, Set<string>>();
        const handled = (atom: Atom, signature: string): boolean => {
            let signatures = seen.get(atom); if (!signatures) { signatures = new Set(); seen.set(atom, signatures); }
            if (signatures.has(signature)) return true; signatures.add(signature); return false;
        };
        let rule: Rule;
        const guards = this.guards(node);
        rule = this.rule([callee, receiver, ...parts.map(part => part.cell), ...guards.map(guard => guard.condition)], () => {
            let constructors = this.invocations.get(rule);
            if (!constructors) { constructors = new Map(); this.invocations.set(rule, constructors); }
            constructors.clear();
            let evaluations = this.evaluationInvocations.get(rule);
            if (!evaluations) { evaluations = new Map(); this.evaluationInvocations.set(rule,evaluations); }
            evaluations.clear();
            if (!this.guardsAllow(guards,rule)) {
                for(const atom of callee.values)if(atom.tag==="operation"&&atom.operation==="eval"){
                    let candidates=this.inactiveEvaluationCandidates.get(node);if(!candidates){candidates=new Set();this.inactiveEvaluationCandidates.set(node,candidates);}candidates.add(direct);
                }
                return;
            }
            this.allArgumentValues(sequence);
            for (const part of parts) if (part.spread&&!part.abstractList) this.watchList(rule, part.cell,node);
            const worklist: Array<{ target: Cell; receiver: Cell; args: readonly Cell[] | null; sequence: ArgumentSequence | null; boundPath: Set<Atom>; direct: boolean; construct: boolean;newTarget?:Cell }> = [
                ...this.arguments(parts,node).map(args => ({ target: callee, receiver: receiver, args, boundPath: new Set<Atom>(),
                    sequence, construct, direct }))];
            const routed = new Map<Atom, Set<string>>();
            while (worklist.length) {
                const invocation = worklist.pop()!; this.watch(rule, invocation.target);
                for (const atom of invocation.target.values) {
                    const signature = invocation.construct + ":" + invocation.receiver.id + ":" + (invocation.args?.map(cell => cell.id).join(",") ?? "sequence:" + invocation.sequence?.id);
                    if (atom.tag === "abrupt") {this.publish(result!, atom); continue;}
                    if (atom.tag === "primitive" || atom.tag === "non-string" || atom.tag === "unknown-string" || atom.tag === "text-operation") {
                        this.publish(result,this.abrupt);
                        const handler = this.exceptionHandlers.get(node); if (handler) this.publish(handler,this.nativeException(node));
                        continue;
                    }
                    if (atom.tag === "pending-source") {this.publish(result!,atom);continue;}
                    if(atom.tag==="intrinsic"&&atom.domain!=="constructor"){
                        if(atom.domain==="prototype"&&atom.kind==="ordinary"&&!invocation.construct)this.publish(result,this.primitive(undefined));
                        else{this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.nativeException(node));}
                        continue;
                    }
                    if(invocation.construct&&atom.tag==="operation"&&SOURCE_NATIVE_METHODS.has(atom.operation)){
                        this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.nativeException(node,"TypeError"));continue;
                    }
                    const proxy=this.ordinaryOwner(atom)?.proxy;
                    if(proxy){
                        this.watch(rule,proxy.target);this.watch(rule,proxy.handler);
                        // Proxy call/construct invariants are not projected yet.
                        // Preserve possible target and trap closure effects in
                        // the same call worklist, then retain an opaque result.
                        if(!invocation.boundPath.has(atom)){
                            worklist.push({...invocation,target:proxy.target,boundPath:new Set([...invocation.boundPath,atom])});
                            if(!handled(atom,signature+":proxy")){
                                const trap=this.property(proxy.handler,invocation.construct?"construct":"apply",node);
                                this.opaqueCallableCaptures(trap,node);
                            }
                        }
                    }
                    // A native performs internal methods on its receiver and
                    // arguments (and through their prototypes); ProxyCreate
                    // only checks that its operands are Objects.
                    if(atom.tag==="operation"&&!PROXY_FORWARDING_OPERATIONS.has(atom.operation)||atom.tag==="builtin"&&atom.name!=="Proxy"){
                        const exact=NATIVE_PROXY_INTERNAL_METHODS.get(atom.tag==="operation"?atom.operation:"builtin:"+atom.name);
                        if(exact)for(const {operand,traps,chain} of exact){
                            const input=operand==="receiver"?invocation.receiver:invocation.args?invocation.args[operand]:invocation.sequence?this.argumentPosition(invocation.sequence,operand):undefined;
                            if(input)this.proxyInternalMethod(input,traps,node,chain);
                        }
                        else for(const input of [invocation.receiver,...(invocation.args??(invocation.sequence?[this.allArgumentValues(invocation.sequence)]:[]))])this.proxyInternalMethod(input,PROXY_TRAPS,node,true);
                    }
                    if(atom.tag==="operation"&&atom.operation==="set-property"){
                        const setReceiver=invocation.args?invocation.args[3]:invocation.sequence?this.allArgumentValues(invocation.sequence):undefined;
                        if(setReceiver)this.proxyInternalMethod(setReceiver,["getOwnPropertyDescriptor","defineProperty"],node);
                    }
                    if (atom.tag === "unknown" || atom.tag === "opaque-object" || proxy || atom.tag==="operation"&&SOURCE_NATIVE_METHODS.get(atom.operation)?.opaque&&!invocation.construct) {
                        // A return value belongs to the invocation that
                        // produced it, just as an opaque write does. Shared
                        // formals must retain that provenance when forwarding.
                        const handler = this.exceptionHandlers.get(node);
                        if (handler) this.publish(handler, this.unknown);
                        // Provenance distinguishes captured reads. After an
                        // opaque callee is selected its invocation effects
                        // share one signature, independent of origin count.
                        // A known native writes only its receiver and arguments and runs
                        // user code only through the callables it reaches (every argument
                        // position outside the direct-callee table), each modelled by its
                        // own invocation; it never rewrites a global binding or an
                        // unrelated object, so the global opaque effect is reserved for
                        // unknown code and the natives that evaluate or load code.
                        // An unmodelled member of a builtin (`Iterator.from`, a static the
                        // model has no operation for) is a native too: its receiver holds
                        // only builtin values, so it cannot be user code.
                        const builtinMember=atom===this.nativeUnknown||atom.tag==="unknown"&&!proxy&&invocation.receiver!==this.empty&&invocation.receiver.values.nonempty&&
                            [...invocation.receiver.values].every(value=>value.tag==="builtin"||value.tag==="intrinsic"||value.tag==="operation"||value===this.nativeUnknown);
                        const directCallees:ReadonlySet<number>|"all"|undefined=atom.tag==="operation"&&!GLOBAL_EFFECT_OPERATIONS.has(atom.operation)?NATIVE_DIRECT_CALLEE_POSITIONS.get(atom.operation)??"all":builtinMember?"all":undefined;
                        const arrayEffect=atom.tag==="operation"?NATIVE_ARRAY_RECEIVER_EFFECTS.get(atom.operation):undefined;
                        if(invocation.construct)this.publish(result!,this.opaqueObject);
                        else if(arrayEffect?.receiverResult)this.copy(this.toObject(invocation.receiver,node),result!);
                        else if(directCallees)this.publish(result!,this.nativeUnknown);
                        else this.copy(this.executionOrigins(node),result!);
                        if (!handled(this.unknown,signature)) this.onActive(node,()=>{
                            if(!directCallees)this.opaqueEffect(node);
                            // Unknown code may call anything the global object reaches; a
                            // native (directCallees) reaches only its receiver and arguments.
                            if(!directCallees&&(atom.tag==="unknown"||atom.tag==="opaque-object"||proxy)){
                                this.publish(this.globalReceiver,this.global);
                                this.escapeCallableArgument(this.globalReceiver,node,true);
                                for(const binding of this.globalLexicals.values())this.escapeCallableArgument(binding.value,node,true);
                            }
                            const argumentsEscaping = invocation.args ?? (invocation.sequence ? [this.allArgumentValues(invocation.sequence)] : []);
                            if(arrayEffect)this.nativeArrayReceiverWrites(invocation.receiver,arrayEffect,argumentsEscaping,node);
                            else this.writeProperty(invocation.receiver,null,this.empty,false,"set",node);
                            // An Array.prototype native never calls its receiver or the
                            // values it stores; their accessors and methods may run. A
                            // native that calls a callback (sort's comparator) hands it
                            // elements, which the callback may call: an escaped callback
                            // receives unknown native values, so the elements it may be
                            // handed stay direct callees of the escape.
                            const callsCallback=directCallees==="all"||!!directCallees&&directCallees.size>0;
                            this.escapeCallableArgument(invocation.receiver,node,false,arrayEffect&&!callsCallback?"elements":"direct");
                            for (const [index,argument] of argumentsEscaping.entries()) {
                                if(!arrayEffect)this.writeProperty(argument,null,this.empty,false,"set",node);
                                this.escapeCallableArgument(argument,node,false,!directCallees||directCallees==="all"||directCallees.has(index)?"direct":"argument");
                            }
                        });
                        continue;
                    }
                    const argv = invocation.args;
                    const argument = (index: number): Cell | undefined => argv ? argv[index] : invocation.sequence ? this.argumentPosition(invocation.sequence, index) : undefined;
                    if(invocation.construct){const valid=this.constructorValidity(invocation.newTarget??invocation.target,node);this.watch(rule,valid);if(valid.values.has(this.primitive(false))){this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.nativeException(node));}if(!valid.values.has(this.primitive(true)))continue;}
                    if (atom.tag === "operation" && invocation.construct) {
                        this.publish(result,this.abrupt);
                        const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.nativeException(node));
                        continue;
                    }
                    if(atom.tag==="operation"&&atom.operation.startsWith("set-composition:")){
                        if(!handled(atom,signature))this.setComposition(atom.operation.slice("set-composition:".length),invocation.receiver,argument(0)??omittedArgument,node,result);
                        continue;
                    }
                    if(atom.tag==="operation"&&atom.operation.startsWith("collection-iterator:")){
                        if(!handled(atom,signature)){
                            if(invocation.construct){this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.nativeException(node));}
                            else if(atom.operation==="collection-iterator:self")this.copy(invocation.receiver,result);
                            else this.collectionIteratorNext(invocation.receiver,atom.operation.split(":")[1] as CollectionKind|"Array",node,result);
                        }continue;
                    }
                    if(atom.tag==="operation"&&atom.operation.startsWith("collection-member:")){
                        if(!handled(atom,signature)){const [,kind,operation]=atom.operation.split(":");this.collectionMember(kind as CollectionKind,operation!,invocation.receiver,argv,node,result,invocation.construct);}continue;
                    }
                    if(atom.tag==="operation"&&atom.operation.startsWith("set-prototype:")){
                        if(!handled(atom,signature))this.copy(this.setPrototype(argument(0)??omittedArgument,argument(1)??omittedArgument,node,atom.operation==="set-prototype:reflect"),result);
                        continue;
                    }
                    if(atom.tag==="operation"&&atom.operation==="error-brand") {
                        // ErrorData is private and cannot invoke coercion or
                        // property hooks. Unknown owners retain both Boolean
                        // alternatives without escaping their ordinary fields.
                        this.publish(result,this.primitive(false));
                        const input=argument(0);
                        if(input){this.watch(rule,input);if(this.primitiveKinds(input)&KIND_OBJECT)this.publish(result,this.primitive(true));}
                        continue;
                    }
                    if(atom.tag==="operation"&&atom.operation==="array-brand") {
                        // IsArray reads only internal slots: it runs no user
                        // code, so the argument does not escape. A Proxy is
                        // followed to its target, and a revoked Proxy throws
                        // a TypeError; owners that may be a Proxy keep that
                        // alternative.
                        const input=argument(0);
                        if(!input){this.publish(result,this.primitive(false));continue;}
                        this.watch(rule,input);
                        const kinds=this.primitiveKinds(input);
                        if(kinds&~(KIND_OBJECT|KIND_FUNCTION))this.publish(result,this.primitive(false));
                        if(kinds&(KIND_OBJECT|KIND_FUNCTION)){
                            this.publish(result,this.primitive(false));this.publish(result,this.primitive(true));
                            let proxy=false;
                            for(const value of input.values){
                                if(value.tag==="abrupt"||value.tag==="pending-source"||value.tag==="primitive"||value.tag==="non-string"||value.tag==="unknown-string"||value.tag==="text-operation")continue;
                                if(value.tag==="global")continue;
                                const owner=this.ordinaryOwner(value);
                                if(!owner||owner.proxy){proxy=true;break;}
                            }
                            if(proxy){this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.nativeException(node,"TypeError"));}
                        }
                        continue;
                    }
                    if(atom.tag==="operation"&&atom.operation==="util-format") {
                        if(!argv){this.publish(result,this.unknown);continue;}
                        const states=argv.map(input=>this.primitiveState(input,rule,true));
                        if(states.some(state=>state.pending))continue;
                        if(!handled(atom,"format:"+argv.map(input=>input.id).join(",")))
                            this.publish(result,{tag:"text-operation",operation:"util-format",parts:argv});
                        if(states.some(state=>!state.proof.primitiveComplete)){
                            for(const input of argv){
                                if(!(this.primitiveKinds(input)&(KIND_OBJECT|KIND_FUNCTION)))continue;
                                for(const value of input.values){
                                    if(value.tag==="unknown"){this.publish(result,value);this.publish(this.opaqueMutation,value);}
                                    else if(value.tag!=="primitive"&&value.tag!=="non-string"&&value.tag!=="unknown-string"&&value.tag!=="text-operation"&&value.tag!=="abrupt"&&value.tag!=="pending-source"){
                                        this.copy(this.executionOrigins(node),result);this.opaqueEffect(node);
                                    }
                                }
                            }
                        }
                        continue;
                    }
                    if(atom.tag==="operation"&&atom.operation==="native-require") {
                        const specifier=argument(0);
                        if(specifier){this.watchText(rule,specifier);const state=this.primitiveState(specifier,rule,true);if(state.pending)continue;
                            for(const name of state.proof.values){const descriptor=this.nativeModuleSource(name);if(descriptor)this.copy(descriptor.module(false),result);}
                            if(state.proof.primitiveComplete&&state.proof.values.every(name=>!!this.nativeModuleSource(name)))continue;
                        }
                        this.publish(result,this.opaqueObject);this.opaqueEffect(node);
                        const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.unknown);
                        continue;
                    }
                    if (atom.tag === "operation" && PROPERTY_MUTATIONS.has(atom.operation)) {
                        const activation = this.enclosingActivation(node);
                        if (activation) {this.watch(rule,activation.active);if(!activation.active.values.nonempty)continue;}
                    }
                    if (atom.tag === "bound") {
                        if (invocation.boundPath.has(atom)) continue;
                        const boundPath = new Set(invocation.boundPath); boundPath.add(atom);
                        worklist.push({ ...invocation, target: atom.target, args: argv && atom.prefix ? [...atom.prefix, ...argv] : null, direct: false,
                            sequence: invocation.sequence && atom.prefix ? this.transformArguments(invocation.sequence, {prefix: atom.prefix}) : null,
                            receiver: invocation.construct ? invocation.receiver : atom.receiver, boundPath }); continue;
                    }
                    if(atom.tag==="operation"&&atom.operation.startsWith("atomics-member:")) {
                        const descriptor=runtimeAtomicsMethods.get(atom.operation.slice("atomics-member:".length))!,operation=descriptor.operation,handler=this.exceptionHandlers.get(node);
                        if(invocation.construct){this.publish(result,this.abrupt);if(handler)this.publish(handler,this.nativeException(node));continue;}
                        if(handler)this.publish(handler,this.nativeException(node));
                        const normalKinds=operation==="IS_LOCK_FREE"?KIND_BOOLEAN:operation==="NOTIFY"?KIND_NUMBER:KIND_NUMERIC;
                        let normal=this.numericValues.get(normalKinds);if(!normal){normal={tag:"non-string",kinds:normalKinds};this.numericValues.set(normalKinds,normal);}
                        this.normalResults.set(result,operation==="WAIT"?this.unknownString:operation==="WAIT_ASYNC"?this.abrupt:normal);
                        if(!argv){this.publish(result,this.unknown);this.activateOpaqueEffect(node);continue;}
                        // Brand validation does not call user code. Scalar conversion
                        // follows native argument order; an unknown brand remains an
                        // overapproximation of both Number and BigInt normal paths.
                        const offset=operation==="IS_LOCK_FREE"?0:1,inputs=Array.from({length:descriptor.length-offset},(_,index)=>argument(index+offset)??omittedArgument);
                        const modes=inputs.map((_,index)=>operation==="IS_LOCK_FREE"||index===0||operation==="NOTIFY"||index+offset===3&&(operation==="WAIT"||operation==="WAIT_ASYNC")?"number" as const:"numeric" as const);
                        const converted=this.convertList(inputs,node,modes);
                        for(const input of converted)this.watchText(rule,input);
                        if(converted.some(input=>this.primitiveState(input,rule,true).pending))continue;
                        if(converted.some(input=>{const proof=this.primitiveChoiceProof(input);return proof.primitiveComplete&&!proof.values.length})){this.publish(result,this.abrupt);continue;}
                        if(operation==="IS_LOCK_FREE"){this.publish(result,this.primitive(true));this.publish(result,this.primitive(false));}
                        else if(operation==="WAIT")for(const text of ["ok","not-equal","timed-out"])this.publish(result,this.primitive(text));
                        else if(operation==="WAIT_ASYNC")this.copy(this.atomicsWaitResult(node),result);
                        else {const kinds=operation==="NOTIFY"?KIND_NUMBER:KIND_NUMERIC;let value=this.numericValues.get(kinds);if(!value){value={tag:"non-string",kinds};this.numericValues.set(kinds,value);}this.publish(result,value);}
                        continue;
                    }
                    if(atom.tag==="operation"&&atom.operation.startsWith("primitive-member:")) {
                        const member=atom.operation.slice("primitive-member:".length),memberKind=member.slice(0,member.indexOf(":")),handler=this.exceptionHandlers.get(node),kind=PRIMITIVE_MEMBER_RESULTS.get(member);
                        if(invocation.construct){this.publish(result,this.abrupt);if(handler)this.publish(handler,this.nativeException(node));continue;}
                        // ToString(this) on an object receiver and ToString/ToNumber of an
                        // object argument may run user code; primitives cannot.
                        this.watch(rule,invocation.receiver);const receiverKinds=this.primitiveKinds(invocation.receiver);
                        if(!receiverKinds)continue;
                        let pendingArgument=false,objectArgument=false;
                        if(argv)for(const input of argv){this.watch(rule,input);const kinds=this.primitiveKinds(input);if(!kinds)pendingArgument=true;else if(kinds&~KIND_PRIMITIVE)objectArgument=true;}
                        // A RegExp argument dispatches to its @@-method (sec-string.prototype.match and siblings).
                        const regexpMember=memberKind==="string"?REGEXP_STRING_MEMBERS.get(member.slice("string:".length)):undefined;
                        if(regexpMember&&argv?.length&&argv[0]!.values.nonempty&&[...argv[0]!.values].every(atom=>atom.tag==="abrupt"||atom.tag==="pending-source"||!!this.regexpOwnerData(atom))){
                            const [text]=this.convertList([invocation.receiver],node,"text");
                            if(member.endsWith(":replaceAll")&&handler)this.publish(handler,this.nativeException(node,"TypeError"));
                            this.copy(this.regexpMember(regexpMember,argv[0]!,[text!,...argv.slice(1)],node,false),result);continue;
                        }
                        const normalKinds=memberKind==="string"?KIND_PRIMITIVE&~(KIND_UNDEFINED|KIND_NULL|KIND_SYMBOL):memberKind==="number"?KIND_NUMBER:KIND_BIGINT;
                        if(kind&&argv&&!objectArgument&&!(receiverKinds&~KIND_PRIMITIVE)){
                            if(pendingArgument)continue;
                            if(handler)this.publish(handler,this.nativeException(node));
                            if(receiverKinds&~normalKinds)this.publish(result,this.abrupt);
                            if(receiverKinds&normalKinds){
                                if(kind.string)this.publish(result,this.unknownString);
                                if(kind.number){let value=this.numericValues.get(KIND_NUMBER);if(!value){value={tag:"non-string",kinds:KIND_NUMBER};this.numericValues.set(KIND_NUMBER,value);}this.publish(result,value);}
                                if(kind.boolean){this.publish(result,this.primitive(true));this.publish(result,this.primitive(false));}
                                if(kind.undefined)this.publish(result,this.primitive(undefined));
                                if(kind.strings)this.copy(this.regexpStringArray(node,"split"),result);
                            }
                            continue;
                        }
                        this.publish(result,this.unknown);this.activateOpaqueEffect(node);if(handler)this.publish(handler,this.unknown);continue;
                    }
                    if(atom.tag==="operation"&&atom.operation.startsWith("math-member:")) {
                        const descriptor=runtimeMathMethods.get(atom.operation.slice("math-member:".length))!;
                        if(invocation.construct){this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.nativeException(node));continue;}
                        if(!argv){this.publish(result,this.nonString);this.activateOpaqueEffect(node);const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.unknown);continue;}
                        if(descriptor.kind==="SUM_PRECISE"){
                            const elements=this.iteratorElements(argument(0)??omittedArgument,node);this.watch(rule,elements);
                            const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.nativeException(node));
                            if(this.primitiveState(elements,rule,true).unresolved){this.activateOpaqueEffect(node);if(handler)this.publish(handler,this.unknown);}
                            let value=this.numericValues.get(KIND_NUMBER);if(!value){value={tag:"non-string",kinds:KIND_NUMBER};this.numericValues.set(KIND_NUMBER,value);}this.publish(result,value);continue;
                        }
                        const count=descriptor.kind==="RANDOM"?0:descriptor.kind==="UNARY"||descriptor.kind==="BINARY"?descriptor.length:argv.length;
                        const converted=this.convertList(Array.from({length:count},(_,index)=>argument(index)??omittedArgument),node,"number");
                        for(const input of converted)this.watchText(rule,input);
                        if(converted.some(input=>this.primitiveState(input,rule,true).pending))continue;
                        if(converted.some(input=>{const proof=this.primitiveChoiceProof(input);return proof.primitiveComplete&&!proof.values.length})){this.publish(result,this.abrupt);continue;}
                        let value=this.numericValues.get(KIND_NUMBER);if(!value){value={tag:"non-string",kinds:KIND_NUMBER};this.numericValues.set(KIND_NUMBER,value);}this.publish(result,value);
                        continue;
                    }
                    if(atom.tag==="operation"&&atom.operation.startsWith("callback-timer:")){
                        const descriptor=runtimeCallbackTimerDescriptors.get(atom.operation.slice("callback-timer:".length))!,handler=this.exceptionHandlers.get(node);
                        if(descriptor.action==="CLEAR"){
                            if(argv?.length){const converted=this.coerceCell(argv[0]!,node,"number");this.watchText(rule,converted);}else if(!argv)this.activateOpaqueEffect(node);
                            this.publish(result,this.primitive(undefined));continue;
                        }
                        if(!argv){this.publish(result,this.unknown);this.activateOpaqueEffect(node);if(handler)this.publish(handler,this.unknown);continue;}
                        const callback=argument(0)??omittedArgument;this.watch(rule,callback);const kinds=this.primitiveKinds(callback);
                        if(kinds&~KIND_FUNCTION){if(handler)this.publish(handler,this.nativeException(node));this.publish(result,this.abrupt);}
                        if(!(kinds&KIND_FUNCTION))continue;
                        const converted=descriptor.delay>=0&&argv[descriptor.delay]?this.coerceCell(argv[descriptor.delay]!,node,"number"):undefined;
                        if(converted){this.watchText(rule,converted);const state=this.primitiveState(converted,rule,true);if(state.pending)continue;if(state.proof.primitiveComplete&&!state.proof.values.length){this.publish(result,this.abrupt);continue;}}
                        let calls=this.timerCallbacks.get(node);if(!calls){calls=new Map();this.timerCallbacks.set(node,calls);}const identity=atom.operation+":"+signature;let retained=calls.get(identity);
                        if(!retained){const context=this.invocationContext(node,{deferred:true,repeated:descriptor.action==="REPEAT"});retained={context,result:this.newCell()};calls.set(identity,retained);this.invoke(context,callback,this.empty,(descriptor.actuals<0?[]:argv.slice(descriptor.actuals)).map(cell=>({cell,spread:false})),retained.result);}

                        if(descriptor.queue==="MICROTASK")this.publish(result,this.primitive(undefined));else{let value=this.numericValues.get(KIND_NUMBER);if(!value){value={tag:"non-string",kinds:KIND_NUMBER};this.numericValues.set(KIND_NUMBER,value);}this.publish(result,value);}continue;
                    }
                    if(atom.tag==="operation"&&atom.operation==="throw-type-error"){
                        this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.nativeException(node,"TypeError",atom.realm));continue;
                    }
                    if(atom.tag==="operation"&&atom.operation.startsWith("legacy-function-accessor:")){
                        // Function.prototype.caller/arguments read on non-strict normal
                        // functions (caller: null or any non-strict function; arguments: an
                        // arguments object or null) and throw TypeError on every other
                        // receiver; neither runs user code.
                        const mode=atom.operation.slice(atom.operation.lastIndexOf(":")+1),caller=atom.operation.includes(":caller:"),handler=this.exceptionHandlers.get(node);
                        if(invocation.construct){this.publish(result,this.abrupt);if(handler)this.publish(handler,this.nativeException(node));continue;}
                        this.watch(rule,invocation.receiver);
                        for(const target of invocation.receiver.values){
                            if(target.tag==="pending-source"||target.tag==="abrupt")continue;
                            const legacy=target.tag==="function"?legacyCallerReceiver(target.owner):target.tag==="unknown"||target.tag==="opaque-object"?null:false;
                            if(legacy!==false){if(mode!=="get")this.publish(result,this.primitive(undefined));else{this.publish(result,this.primitive(null));if(!caller)this.publish(result,this.unknown);else this.copy(target.tag==="function"?this.legacyCallersOf(target.owner):this.stackCallers(node),result);}}
                            if(legacy!==true){this.publish(result,this.abrupt);if(handler)this.publish(handler,this.nativeException(node,"TypeError",atom.realm));}
                        }
                        continue;
                    }
                    if(atom.tag==="operation"&&atom.operation==="ordinary-has-instance"){
                        this.copy(this.ordinaryInstanceSource(argument(0)??omittedArgument,invocation.receiver,node),result);continue;
                    }
                    if(atom.tag==="promise-resolver"){
                        if(invocation.construct){this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.nativeException(node));continue;}
                        const input=argument(0)??omittedArgument;
                        if(atom.reject)this.copy(input,atom.destination.rejection);else this.promiseAssimilation(input,node,atom.destination);
                        this.publish(result,this.primitive(undefined));continue;
                    }
                    if(atom.tag==="operation"&&atom.operation.startsWith("generator-member:")){
                        const [,kind,completion]=atom.operation.split(":");
                        this.copy(this.generatorReaction(invocation.receiver,kind!,completion!,argument(0)??omittedArgument,node),result);continue;
                    }
                    if(atom.tag==="operation"&&atom.operation==="species-getter"){this.copy(invocation.receiver,result);continue;}
                    // get __proto__: ToObject(this).[[GetPrototypeOf]]().
                    if(atom.tag==="operation"&&atom.operation==="proto-accessor:get"){this.copy(this.getPrototype(invocation.receiver,node,true),result);continue;}
                    // set __proto__(proto): a proto that is neither an Object nor null
                    // is ignored; otherwise the receiver's [[SetPrototypeOf]] runs
                    // and a refusal throws TypeError. The result is undefined.
                    if(atom.tag==="operation"&&atom.operation==="proto-accessor:set"){
                        if(!handled(atom,signature)){
                            const value=argument(0)??omittedArgument,prototype=this.newCell();
                            this.rule([value],()=>{for(const candidate of value.values)
                                if(this.ordinaryOwner(candidate)||candidate===this.primitive(null)||candidate.tag==="unknown"||candidate.tag==="opaque-object"||candidate.tag==="pending-source")this.publish(prototype,candidate);});
                            this.setPrototype(invocation.receiver,prototype,node,false);
                        }
                        this.publish(result,this.primitive(undefined));continue;
                    }
                    if(atom.tag==="operation"&&atom.operation==="promise-finally-forward") {
                        this.copy(this.promiseFinallyForward(argument(0)??omittedArgument,argument(2)??omittedArgument,argument(1)??omittedArgument,node),result);continue;
                    }
                    if(atom.tag==="operation"&&atom.operation.startsWith("promise-member:")) {
                        if(invocation.construct){this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.nativeException(node));continue;}
                        const member=atom.operation.slice("promise-member:".length);
                        if(runtimePromiseMethods.get(member)?.static){
                            this.watch(rule,invocation.receiver);
                            const receivers=[...invocation.receiver.values];if(!receivers.length)continue;
                            // NewPromiseCapability(C) throws TypeError before
                            // any call when C is not a constructor: a primitive,
                            // a native function or namespace member (an
                            // operation atom such as eval or Math.max) or a
                            // non-constructor global never escapes as a receiver.
                            const nonConstructor=(receiver:Atom):boolean=>receiver.tag==="primitive"||receiver.tag==="operation"||receiver.tag==="builtin"&&NON_CONSTRUCTOR_BUILTINS.has(receiver.name);
                            if(receivers.some(nonConstructor)){const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.nativeException(node,"TypeError"));}
                            if(receivers.some(receiver=>!nonConstructor(receiver)&&(receiver.tag!=="builtin"||receiver.name!=="Promise"))){
                                this.publish(result,this.unknown);this.opaqueCallableCaptures(invocation.receiver,node);this.activateOpaqueEffect(node);const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.unknown);
                            }
                            if(!receivers.some(receiver=>receiver.tag==="builtin"&&receiver.name==="Promise"))continue;
                            if(member==="resolve"||member==="reject"){
                                const input=argument(0)??omittedArgument;
                                if(member==="resolve")this.copy(this.promiseResolve(input,node),result);
                                else{let calls=this.promiseConstructions.get(node);if(!calls){calls=new Map();this.promiseConstructions.set(node,calls);}const key="reject:"+input.id;let holder=calls.get(key);if(!holder){holder=this.newCell();calls.set(key,holder);const value=this.newCell(),rejection=this.exceptionCell();this.copy(input,rejection);this.publish(holder,{tag:"promise",value,rejection});}this.copy(holder,result);}
                            }else if(member==="try"||member==="withResolvers")this.copy(this.promiseStaticCapability(member,node,argv),result);
                            else{this.publish(result,this.opaqueObject);this.activateOpaqueEffect(node);}
                            continue;
                        }
                        if(member==="catch")this.copy(this.promiseCatch(invocation.receiver,argument(0)??omittedArgument,node),result);
                        else if(member==="then")this.copy(this.promiseReaction(invocation.receiver,argument(0)??omittedArgument,argument(1)??omittedArgument,node),result);
                        else if(member==="finally")this.copy(this.promiseFinally(invocation.receiver,argument(0)??omittedArgument,node),result);
                        continue;
                    }
                    if (atom.tag === "operation" && ["call", "apply", "reflect-apply", "construct"].includes(atom.operation)) {
                        const previous = routed.get(atom) ?? new Set<string>();
                        if (previous.has(signature)) continue; previous.add(signature); routed.set(atom, previous);
                        const target = atom.operation === "reflect-apply" || atom.operation === "construct" ? argument(0) : invocation.receiver;
                        const listIndex = atom.operation === "reflect-apply" ? 2 : 1;
                        const list = argument(listIndex);
                        const actual = atom.operation === "call" ? [argv?.slice(1) ?? null] : list ? this.arrayLikeLists(list,node,rule,result,atom.operation==="apply") : atom.operation==="apply"&&argv ? [[]] : [null];
                        if (target) for (const args of actual) worklist.push({ ...invocation, target, direct: false,
                            construct: atom.operation === "construct",
                            newTarget:atom.operation==="construct"?argument(2)??target:invocation.newTarget,
                            receiver: atom.operation === "call" || atom.operation === "apply" ? argument(0) ?? this.empty : atom.operation === "reflect-apply" ? argument(1) ?? this.empty : constructedReceiver,
                            sequence: atom.operation === "call" && invocation.sequence ? this.transformArguments(invocation.sequence, {offset: 1}) : null, args });
                        continue;
                    }
                    const constructorArguments = atom.tag === "intrinsic" && atom.domain === "constructor" ? convertArguments(argv) : undefined;
                    if (atom.tag === "intrinsic" && atom.domain === "constructor") {
                        for (const argument of constructorArguments ?? []) this.watchText(rule, argument);
                        constructors.set(atom.kind + ":" + signature, { kind: atom.kind, args: constructorArguments ?? null });
                    }
                    const noArguments = (constructorArguments === undefined ? argv : constructorArguments)?.some(argument => {
                        this.watchText(rule,argument);
                        return !this.primitiveHasNormal(argument);
                    });
                    if (noArguments && !(atom.tag === "operation" && ["eval", "eval-script", "agent-start"].includes(atom.operation))) {
                        this.publish(result!, this.abrupt); continue;
                    }
                    if (constructorArguments?.some(argument => !this.primitiveChoiceProof(argument).primitiveComplete)) continue;
                    // Delegation remains an evolving graph edge: its
                    // target may acquire facts after this call is handled.
                    if (atom.tag === "function" && invocation.construct && ts.isClassLike(atom.owner.definition) && !atom.owner.node && atom.owner.base && !invocation.boundPath.has(atom)) {
                        const path = new Set(invocation.boundPath); path.add(atom);
                        worklist.push({...invocation, target:atom.owner.base, direct:false, boundPath:path});
                    }
                    if(atom.tag==="builtin"&&atom.name==="RegExp"){this.copy(this.regexpConstruct(argument(0)??omittedArgument,argument(1)??omittedArgument,node,invocation.construct),result!);continue;}
                    if(atom.tag==="builtin"&&atom.name==="Proxy") {
                        if(invocation.construct)this.copy(this.proxyCreate(argument(0)??omittedArgument,argument(1)??omittedArgument,node),result);
                        else{this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.nativeException(node,"TypeError"));}
                        continue;
                    }
                    if(invocation.construct&&!(atom.tag==="builtin"&&atom.name==="Promise")){
                        const owner=this.owner(node);
                        if(atom.tag==="builtin"){this.markPropertyAlgorithm(owner,"opaque");if(runtimeTypedArrayDescriptors.has(atom.name))this.typedArrayInstancePrototype(owner,atom.name,invocation.newTarget??invocation.target,node);}
                        this.publish(result!,{tag:"object",owner});
                    }
                    const evolvingPrimitiveResult = constructorArguments !== undefined || atom.tag === "builtin" && (atom.normalResult === "primitive-string" || atom.name === "Symbol" || NUMERIC_CONVERSIONS.has(atom.name));
                    if (!evolvingPrimitiveResult && (atom.tag !== "operation" || PROPERTY_MUTATIONS.has(atom.operation)) && handled(atom, signature)) continue;
                    if (atom.tag === "intrinsic" && atom.domain === "constructor") {
                        const proofs=constructorArguments?.map(input=>this.primitiveChoiceProof(input));
                        if(!proofs||proofs.some(proof=>!proof.textComplete)){
                            let admitted=false;
                            for(const generated of this.generated.values()){
                                if((generated.entry.kind??"ordinary")!==atom.kind)continue;
                                admitted=true;if(generated.environment)this.connectGeneratedEnvironment(generated.environment,node,atom.realm??this.currentRealm);
                                this.copy(generated.value,result!);
                            }
                            if(!admitted)this.publish(result!,this.pendingSource);
                            continue;
                        }
                        for(const tuple of sourceChoiceTuples(proofs.map(proof=>proof.values))){
                            const source={kind:atom.kind,parameters:tuple.slice(0,-1).map(String).join(","),body:String(tuple.at(-1)??""),...(this.domain?{domain:this.domain}:{})};
                            const generated=this.generated.get(functionConstructorSourceKey(source));
                            if(!generated){this.publish(result!,this.pendingSource);continue;}
                            if(generated.environment)this.connectGeneratedEnvironment(generated.environment,node,atom.realm??this.currentRealm);
                            this.copy(generated.value,result!);
                        }
                    } else if (atom.tag === "builtin") {
                        if (atom.name === "Buffer" || atom.name.startsWith("Buffer.") || atom.name.startsWith("fs:") || atom.name.startsWith("child_process:")) {
                            this.onActive(node, () => {
                                this.opaqueEffect(node);
                                for (const actual of argv ?? (invocation.sequence ? [this.allArgumentValues(invocation.sequence)] : []))
                                    this.escapeCallableArgument(actual, node);
                            });
                        }
                        if(atom.name==="Promise"){
                            if(!invocation.construct){this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.nativeException(node));continue;}
                            this.copy(this.promiseConstruction(node,argument(0)??omittedArgument),result);continue;
                        }
                        if(atom.name==="Map"||atom.name==="Set"){
                            if(!invocation.construct){this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.nativeException(node));}
                            else this.copy(this.constructCollection(atom.name,argument(0)??omittedArgument,node,invocation.newTarget??invocation.target),result);
                            continue;
                        }
                        if(atom.name==="Object"){this.copy(this.objectValue(argument(0)??omittedArgument,node,invocation.construct?invocation.newTarget??invocation.target:undefined),result);continue;}
                        const primitive=runtimePrimitiveDescriptors.get(atom.name);
                        if(primitive?.constructible){
                            const argumentValue=argument(0)??this.primitiveDefault(primitive.kind),input=argv===null?this.defaultedPrimitiveInput(argumentValue,primitive.kind):argumentValue,converted=primitive.kind==="number"?this.coerceCell(input,node,"Number"):primitive.kind==="string"?this.stringHintCell(input,node,!invocation.construct):this.booleanPrimitive(input);
                            if(invocation.construct)this.copy(this.boxedPrimitive(converted,primitive.kind,node,invocation.newTarget??invocation.target),result);else this.copy(converted,result);
                            continue;
                        }
                        if (NUMERIC_CONVERSIONS.has(atom.name)) {
                            const handler = this.exceptionHandlers.get(node);
                            if(invocation.construct){this.publish(result,this.abrupt);if(handler)this.publish(handler,this.nativeException(node));continue;}
                            if (!argv) {this.publish(result, invocation.construct ? this.opaqueObject : this.nonString); if (handler) this.publish(handler, this.unknown); this.activateOpaqueEffect(node); continue;}
                            if (atom.name === "Number" && argv.length === 0) {if (!invocation.construct) this.publish(result, this.primitive(0)); continue;}
                            const converted = this.coerceCell(argv[0] ?? omittedArgument, node, atom.name); this.watchText(rule, converted);
                            if (!invocation.construct) this.copy(converted, result);
                            continue;
                        }
                        if (atom.name === "Symbol") {
                            const handler = this.exceptionHandlers.get(node);
                            if (invocation.construct) {this.publish(result, this.abrupt); if (handler) this.publish(handler, this.nativeException(node)); continue;}
                            this.normalResults.set(result, this.nonString);
                            if (!argv) {this.publish(result, this.nonString); if (handler) this.publish(handler, this.unknown); this.activateOpaqueEffect(node); continue;}
                            let allocations = this.symbolAllocations.get(node);
                            if (!allocations) {allocations = new Map(); this.symbolAllocations.set(node, allocations);}
                            const descriptions: (string | undefined)[] = [];
                            if (!argv[0] || argv[0].values.has(this.primitive(undefined))) descriptions.push(undefined);
                            if (argv[0]) {
                                let input = this.symbolDescriptionInputs.get(argv[0]);
                                if (!input) {
                                    input = this.newCell(); this.symbolDescriptionInputs.set(argv[0], input);
                                    const description = input, argument = argv[0];
                                    this.rule([argument], () => {for (const value of argument.values) if (value !== this.primitive(undefined)) this.publish(description, value);});
                                }
                                const converted = this.stringHintCell(input, node); this.watchText(rule, converted);
                                const proof = this.primitiveChoiceProof(converted);
                                if (!proof.primitiveComplete) {for (const value of converted.values) if (value.tag === "unknown" || value.tag === "pending-source") this.publish(result, value.tag === "unknown" ? this.nonString : value);}
                                else descriptions.push(...proof.values.map(String));
                                if (proof.primitiveComplete && !proof.values.length) this.publish(result, this.abrupt);
                            }
                            for (const description of descriptions) {
                                let symbol = allocations.get(description);
                                if (!symbol) {symbol = Symbol(description); allocations.set(description, symbol); this.freshSymbols.add(symbol);}
                                this.publish(result, this.primitive(symbol));
                            }
                            continue;
                        }
                        // Every other builtin converts, iterates or reads its Object
                        // arguments (ToPrimitive in new Date(value), GetIterator in new
                        // AggregateError(errors), an options bag's getters in new
                        // Error(message, options) or new ArrayBuffer(length, options))
                        // or calls a callable one later (a FinalizationRegistry
                        // cleanup), so whatever its arguments reach may run here.
                        // String-hint builtins model their single conversion exactly;
                        // BUILTIN_ARGUMENT_ESCAPE names the builtins that only inspect.
                        const argumentKind = BUILTIN_ARGUMENT_ESCAPE.has(atom.name) ? BUILTIN_ARGUMENT_ESCAPE.get(atom.name)! : "direct";
                        if (argumentKind && atom.normalResult !== "primitive-string" && !handled(atom, signature + ":arguments")) {
                            const escaping = argv ?? (invocation.sequence ? [this.allArgumentValues(invocation.sequence)] : []);
                            if (escaping.length) this.onActive(node, () => {for (const argument of escaping) this.escapeCallableArgument(argument, node, false, argumentKind);});
                        }
                        const stringValue = atom.normalResult === "primitive-string" && argv?.[0]
                            ? this.stringHintCell(argv[0], node, !invocation.construct) : undefined;
                        if (stringValue && !invocation.construct) this.normalResults.set(result,this.abrupt);
                        if (stringValue) this.watch(rule, stringValue);
                        if (!invocation.construct) {
                            if (atom.normalResult === "primitive-string") {
                                if (argv === null) this.publish(result!, this.unknownString);
                                else if (argv.length === 0) this.publish(result!, this.primitive(""));
                                else {
                                    this.copy(stringValue!, result!);
                                }
                            } else if (atom.normalResult === "boolean") {
                                this.publish(result!, this.primitive(false));
                                this.publish(result!, this.primitive(true));
                            } else this.publish(result!, atom.normalResult === "non-string" ? this.nonString :
                                atom.normalResult === "object" ? this.opaqueObject : this.unknown);
                        }
                        const handler = this.exceptionHandlers.get(node);
                        if (handler) {
                            if (atom.normalResult !== "primitive-string" || invocation.construct) this.publish(handler, this.nativeException(node));
                            // Coercion can call arbitrary user code. A
                            // result category cannot erase its exceptions.
                            if (atom.normalResult === "unknown" || argv === null || atom.normalResult !== "primitive-string" && argv.some(argument =>
                                [...argument.values].some(value => value.tag !== "primitive" && value.tag !== "non-string")))
                                this.publish(handler, this.unknown);
                        }
                    } else if (atom.tag === "function") {
                        if (ts.isClassLike(atom.owner.definition) && !invocation.construct) {
                            const handler = this.exceptionHandlers.get(node);
                            if (handler) this.publish(handler,this.nativeException(node));
                            // This target always throws; it has no String
                            // normal completion for source admission.
                            this.publish(result!,this.abrupt);
                            continue;
                        }
                        this.onActive(node,()=>{this.connectActivation(this.sourceActivation(node),atom.owner);if(this.hasInvocationTiming(node))this.publish(this.activationTiming(atom.owner),this.primitive(true));this.copy(this.executionOrigins(node),atom.owner.active);this.recordCallArguments(atom.owner,signature,argv,invocation.sequence,node);});
                        if (invocation.construct) {
                            const instance = this.owner(node);
                            this.markPropertyAlgorithm(instance,ts.isClassLike(atom.owner.definition)&&atom.owner.base?"opaque":"ordinary");
                            instance.prototype ??= this.newCell();
                            this.copy(this.property(invocation.target,"prototype"),instance.prototype);
                        }
                        this.copy(invocation.construct?invocation.receiver:this.functionThisBinding(atom.owner,invocation.receiver,node), atom.owner.receiver);
                        if(invocation.construct)this.copy(invocation.newTarget??invocation.target,atom.owner.newTarget);else this.publish(atom.owner.newTarget,this.primitive(undefined));
                        if(invocation.construct && ts.isClassLike(atom.owner.definition) && !atom.owner.node && atom.owner.base){
                            continue;
                        }
                        const actualFormals=new Map<Cell,Cell>();
                        for (const [index, parameter] of atom.owner.parameters.entries()) {
                            if (parameter.dotDotDotToken) {
                                let location = this.restLocations.get(parameter);
                                if (!location) {
                                    const restOwner=this.arrayOwner(parameter);
                                    location = {value:this.newCell(),owner:restOwner};
                                    this.restLocations.set(parameter,location);
                                    this.publish(location.value, {tag:"object",owner:restOwner});
                                }
                                const rest = location.value, restOwner = location.owner;
                                if (argv) this.publish(restOwner.listLength!, this.primitive(Math.max(0, argv.length - index)));
                                else {this.publish(restOwner.listLength!, this.unknown); this.publish(restOwner.shape, this.unknown);}
                                for(const [offset,value] of (argv?.slice(index) ?? []).entries())this.defineField(restOwner,String(offset),value,true);
                                this.bind(parameter.name, rest);
                            } else {
                                const supplied=argument(index)??omittedArgument;
                                const actual=parameter.initializer?this.bindingDefault(supplied,this.cell(parameter.initializer)):supplied;
                                this.bind(parameter.name,actual);
                                if(ts.isIdentifier(parameter.name)){const formal=this.binding(parameter.name);let sources=this.formalInputs.get(formal);if(!sources){sources=new Set();this.formalInputs.set(formal,sources);}sources.add(actual);actualFormals.set(formal,actual);}
                            }
                        }
                        if (atom.owner.kind.includes("generator")) this.copy(this.generatorInstance(atom.owner,actualFormals,node),result);
                        else if (atom.owner.kind === "async") {
                            // Async return resolution runs in the callee activation, which
                            // can resume after the caller's initial source phase.
                            const returned=this.projectReturn(atom.owner.returns,actualFormals);
                            let resolved:SourcePromiseDestination;
                            if(this.escapeContext(node)!==node){
                                let shared=this.opaqueAsyncResolutions.get(atom.owner);
                                if(!shared){const into=this.newCell();shared={returned:into,resolved:this.promiseAssimilation(into,this.invocationContext(atom.owner.node?.body??atom.owner.definition))};this.opaqueAsyncResolutions.set(atom.owner,shared);}
                                this.copy(returned,shared.returned);resolved=shared.resolved;
                            }else resolved=this.promiseAssimilation(returned,this.invocationContext(atom.owner.node?.body??atom.owner.definition));
                            this.copy(atom.owner.throws,resolved.rejection);this.publish(result!,{tag:"promise",value:resolved.value,rejection:resolved.rejection});
                        }
                        else {
                            if (invocation.construct) {
                                this.rule([atom.owner.returns],()=>{
                                    for (const value of atom.owner.returns.values)
                                        if (value.tag !== "primitive" && value.tag !== "non-string" && value.tag !== "text-operation" && value.tag !== "abrupt") this.publish(result!,value);
                                });
                            // Shared return facts can include a later call's
                            // opaque value. Capture with the same ordering
                            // proof used for location reads; dynamic callers
                            // keep the complete conservative union.
                            } else this.copyRead(this.projectReturn(atom.owner.returns,actualFormals), result!,node);
                            const handler = this.exceptionHandlers.get(node);
                            if (handler) this.copy(atom.owner.throws, handler);
                        }
                    } else if (atom.tag === "operation") {
                        if(atom.operation==="object-text"){this.copy(this.objectText(invocation.receiver,node),result);continue;}
                        if(atom.operation.startsWith("primitive-value:")||atom.operation.startsWith("primitive-text:")){this.copy(this.primitiveMethod(atom.operation,invocation.receiver,argument(0)??omittedArgument,node),result);continue;}
                        if(atom.operation==="create-object") {
                            this.copy(this.createObject(argument(0)??omittedArgument,argument(1)??omittedArgument,node),result);
                            continue;
                        }
                        if(atom.operation==="array-values"||atom.operation==="array-keys"||atom.operation==="array-entries"){
                            if(invocation.construct){this.publish(result,this.abrupt);const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.nativeException(node));}
                            else this.copy(this.arrayIterator(invocation.receiver,node,atom.operation.slice("array-".length) as "keys"|"values"|"entries"),result);continue;
                        }
                        if(atom.operation==="json-parse"){
                            this.copy(this.jsonParse(argument(0)??omittedArgument,argument(1)??omittedArgument,node),result);continue;
                        }
                        if(atom.operation==="json-raw"){
                            this.copy(this.rawJSON(argument(0)??omittedArgument,node),result);continue;
                        }
                        if(atom.operation==="json-is-raw"){
                            const input=argument(0)??omittedArgument;this.watch(rule,input);
                            for(const value of input.values){
                                if(value.tag==="abrupt"||value.tag==="pending-source"){this.publish(result,value);continue;}
                                const owner=this.ordinaryOwner(value);
                                this.publish(result,this.primitive(!!owner?.rawJSON));
                                if(!owner&&(value.tag==="unknown"||value.tag==="opaque-object"||value.tag==="non-string"))this.publish(result,this.primitive(true));
                            }
                            continue;
                        }
                        if(atom.operation.startsWith("regexp-flag:")){this.copy(this.regexpFlagRead(atom.operation.slice("regexp-flag:".length),invocation.receiver,node),result);continue;}
                        if(atom.operation.startsWith("regexp-member:")){this.copy(this.regexpMember(atom.operation.slice("regexp-member:".length),invocation.receiver,argv,node,invocation.construct,argv?undefined:invocation.sequence?this.allArgumentValues(invocation.sequence):undefined),result);continue;}
                        if(atom.operation==="error-text"){this.copy(this.errorText(invocation.receiver,node),result);continue;}
                        if(atom.operation==="json-stringify"){
                            this.copy(this.jsonSerialization(argument(0)??omittedArgument,argument(1)??omittedArgument,argument(2)??omittedArgument,node),result);
                            continue;
                        }
                        if(atom.operation==="array-text"){this.copy(this.arrayText(invocation.receiver,node),result);continue;}
                        if(atom.operation.startsWith("array-iteration:")){this.copy(this.arrayIteration(atom.operation.slice("array-iteration:".length) as ArrayIterationMode,invocation.receiver,argument(0)??omittedArgument,argument(1)??null,node),result);continue;}
                        if(atom.operation==="array-push"){this.copy(this.arrayPush(invocation.receiver,argv,invocation.sequence,node),result);continue;}
                        if(atom.operation==="array-join"){
                            const length=this.arrayLikeLength(invocation.receiver,node);
                            const state=this.primitiveState(length,rule,true);
                            if(state.pending&&!state.unresolved)continue;
                            if(state.proof.primitiveComplete&&!state.proof.values.length){this.publish(result,this.abrupt);continue;}
                            const positions=argv?this.indexedPropertyPositions(invocation.receiver,node,rule):null;
                            if(positions===undefined)continue;
                            if(positions===null||!state.proof.primitiveComplete){
                                this.copy(this.arrayJoinSummary(invocation.receiver,argument(0)??omittedArgument,node),result);
                                continue;
                            }
                            for(const extent of state.proof.values){
                                const size=extent as number,indices=positions.filter(index=>index<size);
                                const listKey=signature+":"+size+":"+indices.join(",");
                                if(handled(atom,listKey))continue;
                                // join reads indices during the invocation,
                                // after separator conversion. Keep ordinary
                                // getters and writes in those location facts.
                                const inputs=[this.joinTextInput(argv?.[0]??omittedArgument,true),...indices.map(index=>this.joinTextInput(this.indexedRead(invocation.receiver,index,node),false))];
                                const converted=this.convertList(inputs,node,"text");
                                this.publish(result,{tag:"text-operation",operation:"array-join",parts:converted,indexedRange:{length:size,positions:indices}});
                            }
                            continue;
                        }
                        if(atom.operation.startsWith("agent-member:")){
                            const descriptor=test262AgentOperations.get(atom.operation.slice("agent-member:".length))!;
                            if(descriptor.operation==="RECEIVE"&&argv?.[0]){
                                const buffer=this.newCell(),identifier=this.newCell();this.publish(buffer,this.opaqueObject);this.publish(identifier,this.nonString);
                                this.invoke(node,argv[0],omittedArgument,[{cell:buffer,spread:false},{cell:identifier,spread:false}],this.newCell());
                            }
                            if(descriptor.operation==="REPORT"&&argv?.[0])this.watchText(rule,this.stringHintCell(argv[0],node));
                            if(descriptor.operation==="SLEEP"&&argv?.[0])this.watchText(rule,this.coerceCell(argv[0],node,"number"));
                            if(descriptor.operation==="BROADCAST"&&argv?.[1])this.watchText(rule,this.primitiveConversion(argv[1],node,"number"));
                            if(descriptor.operation==="NOW")this.publish(result,this.nonString);
                            else if(descriptor.operation==="GET_REPORT"){this.publish(result,this.primitive(null));this.publish(result,this.unknownString);}
                            else this.publish(result,this.primitive(undefined));
                            continue;
                        }
                        if (atom.operation === "symbol-for") {
                            this.normalResults.set(result, this.nonString);
                            if (!argv) {this.publish(result, this.nonString); const handler = this.exceptionHandlers.get(node); if (handler) this.publish(handler, this.unknown); this.activateOpaqueEffect(node); continue;}
                            const key = this.stringHintCell(argv[0] ?? omittedArgument, node); this.watchText(rule, key);
                            const proof = this.primitiveChoiceProof(key);
                            if (!proof.primitiveComplete) {for (const value of key.values) if (value.tag === "unknown" || value.tag === "pending-source") this.publish(result, value.tag === "unknown" ? this.nonString : value);}
                            else if (!proof.values.length) this.publish(result, this.abrupt);
                            for (const value of proof.values) {
                                const text = String(value); let symbol = this.symbolRegistry.get(text);
                                if (!symbol) {symbol = Symbol(text); this.symbolRegistry.set(text, symbol);}
                                this.publish(result, this.primitive(symbol));
                            }
                            continue;
                        }
                        if (atom.operation === "symbol-key-for") {
                            if (!argv) {this.publish(result, this.unknown); continue;}
                            const input = argv[0] ?? omittedArgument; this.watch(rule, input);
                            for (const value of input.values) {
                                if (value.tag === "primitive" && typeof value.value === "symbol")
                                    this.publish(result, this.primitive([...this.symbolRegistry].find(([, symbol]) => symbol === value.value)?.[0]));
                                else if (value.tag === "unknown" || value.tag === "pending-source") this.publish(result, value);
                                else {this.publish(result, this.abrupt); const handler = this.exceptionHandlers.get(node); if (handler) this.publish(handler, this.nativeException(node));}
                            }
                            continue;
                        }
                        if(atom.operation==="object-is"){
                            this.copy(this.sameValueQuery(argument(0)??omittedArgument,argument(1)??omittedArgument,node),result);continue;
                        }
                        if(atom.operation.startsWith("object-has-own:")){
                            const mode=atom.operation.slice("object-has-own:".length) as "static"|"prototype",base=mode==="static"?argument(0)??omittedArgument:invocation.receiver===this.empty?omittedArgument:invocation.receiver,key=argument(mode==="static"?1:0)??omittedArgument;
                            this.copy(this.ownPropertyQuery(base,key,node,mode),result);continue;
                        }
                        if(atom.operation==="own-descriptor"||atom.operation==="own-descriptors"){
                            if(argv?.[0]){
                                const key=atom.operation==="own-descriptor"?argv?.[1]??this.newCell():null;
                                if(key && !argv?.[1])this.publish(key,this.primitive(undefined));
                                this.ownDescriptors(argv[0],key,node,result!);
                            }else this.publish(result!,this.unknown);
                            continue;
                        }
                        if(atom.operation==="host-gc")this.publish(result!,this.primitive(undefined));
                        if(atom.operation==="host-print"){
                            this.publish(result!,this.primitive(undefined));
                            const handler=this.exceptionHandlers.get(node);
                            if (argv === null) {if (handler) this.publish(handler, this.unknown);}
                            else for (const argument of argv) {
                                const converted = this.primitiveConversion(argument, node);
                                this.watchText(rule,converted);
                                if (handler && this.primitiveReadiness(converted).scalarUnresolved) this.publish(handler, this.unknown);
                            }
                        }
                        if(PROPERTY_MUTATIONS.has(atom.operation)){
                            const handler=this.exceptionHandlers.get(node);
                            if(handler)this.publish(handler,this.nativeException(node));
                            const target=argv?.[0],key=argv?.[1];
                            if(!target){this.publish(this.globalMutation,this.unknown);continue;}
                            if(atom.operation==="define-properties" && argv?.[1])this.defineProperties(target,argv[1],node);
                            else if(atom.operation==="define-property" && key && argv?.[2])this.defineProperty(target,key,argv[2],node);
                            else if(key){const value=atom.operation==="set-property" && argv?.[2]?argv[2]:this.newCell();
                                if(atom.operation==="delete-property")this.publish(value,this.unknown);
                                this.writeComputedProperty(target,key,value,atom.operation==="delete-property"?"delete":"set",node,atom.operation==="set-property"?argv?.[3]??target:target);
                            }else this.writeProperty(target,null,this.empty,true,"define",node);
                            if(atom.operation==="define-property"||atom.operation==="define-properties")this.copy(target,result!);
                            else {this.publish(result!,this.primitive(false));this.publish(result!,this.primitive(true));}
                            continue;
                        }
                        if (atom.operation === "bind") {
                            const target=this.callableTarget(invocation.receiver,node);
                            this.copy(target.completion,result!);this.watch(rule,target.callable);
                            if(!target.callable.values.nonempty)continue;
                            let value = boundValues.get(signature);
                            if (!value) {
                                const fields: ObjectOwner = {fields:new Map(),accessors:new Map(),shape:this.newCell(),prototype:this.newCell()};
                                this.copy(this.opaqueMutation,fields.shape);
                                value = { tag: "bound", target: target.callable, receiver: argv?.[0] ?? this.empty, prefix: argv?.slice(1) ?? null, fields }; boundValues.set(signature, value);
                                const length=this.property(target.callable,"length",node,true),boundLength=this.newCell();
                                const name = this.property(target.callable, "name", node), boundName = this.newCell();
                                this.defineField(fields, "name", boundName);
                                const primitiveName = this.newCell();
                                const derivedName: Atom = {tag:"text-operation",operation:"bound-name",parts:[primitiveName]};
                                this.rule([name], () => {
                                    for (const spelling of name.values) {
                                        if (spelling.tag === "primitive" || spelling.tag === "text-operation" || spelling.tag === "unknown-string") {
                                            this.publish(primitiveName, spelling);
                                            this.publish(boundName, derivedName);
                                        } else if (spelling.tag === "unknown" || spelling.tag === "non-string") this.publish(boundName, this.unknown);
                                        else if (spelling.tag !== "pending-source" && spelling.tag !== "abrupt") this.publish(boundName, this.primitive("bound "));
                                    }
                                });
                                this.defineField(fields,"length",boundLength);
                                let lengthRule!:Rule;
                                lengthRule=this.rule([length],()=>{
                                    if(!length.values.nonempty)return;
                                    this.watchText(lengthRule,length);
                                    const proof=this.primitiveChoiceProof(length);
                                    if(!argv || [...length.values].some(value=>value.tag==="unknown"||value.tag==="non-string"))this.publish(boundLength,this.nonString);
                                    for(const count of length.values){
                                        if(count.tag!=="primitive" && count.tag!=="text-operation" && count.tag!=="pending-source" && count.tag!=="unknown" && count.tag!=="non-string" && count.tag!=="abrupt")this.publish(boundLength,this.primitive(0));
                                    }
                                    for(const count of proof.values){
                                        const integer=typeof count==="number"?(Number.isNaN(count)?0:Math.trunc(count)):0;
                                        this.publish(boundLength,this.primitive(Math.max(integer-(argv?Math.max(argv.length-1,0):0),0)));
                                    }
                                });
                                this.rule([target.callable], () => {
                                    for (const receiver of target.callable.values) {
                                        if(receiver.tag==="unknown"||receiver.tag==="opaque-object")this.activateOpaqueEffect(node);
                                        const owner = this.ordinaryOwner(receiver);
                                        if (owner?.prototype) this.copy(owner.prototype, fields.prototype!);
                                        else if (receiver.tag === "operation") this.copy(this.callablePrototype("ordinary"), fields.prototype!);
                                        else this.publish(fields.prototype!, this.unknown);
                                    }
                                });
                            }
                            this.publish(result!, value);
                        }
                        if(atom.operation==="string-codes:unit"||atom.operation==="string-codes:point"){
                            const coding=atom.operation==="string-codes:unit"?"unit":"point";
                            if(!argv){this.publish(result,this.unknownString);this.activateOpaqueEffect(node);const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.nativeException(node));}
                            else this.publish(result,{tag:"text-operation",operation:"string-codes",coding,parts:this.convertList(argv,node,coding==="unit"?"number":"code-point")});
                        }
                        if (atom.operation === "function-text") {
                            const target=this.callableTarget(invocation.receiver,node);
                            this.copy(target.completion,result!);this.watch(rule,target.callable);
                            for (const receiver of target.callable.values) {
                                if (receiver.tag === "function") this.publish(result!, this.text(receiver.owner.sourceText));
                                else if (receiver.tag === "bound" || receiver.tag === "promise-resolver" || this.ordinaryOwner(receiver)?.proxy ||
                                    receiver.tag === "intrinsic" && receiver.domain === "prototype" && receiver.kind === "ordinary")
                                    this.publish(result!, this.text("function () { [native code] }"));
                                else if (receiver.tag === "builtin" && receiver.normalResult !== "not-callable")
                                    this.publish(result!, this.text(`function ${receiver.name}() { [native code] }`));
                                else if(receiver.tag==="operation"||receiver.tag==="intrinsic"){
                                    // Every native callable prints as native code; the
                                    // owner's `name` field gives the exact text when it
                                    // is one known string, otherwise the text is an
                                    // unknown String (never a plain unknown, which would
                                    // read as an opaque effect).
                                    const descriptor=receiver.tag==="operation"?SOURCE_NATIVE_METHODS.get(receiver.operation)??jsonOperations.get(receiver.operation as JSONSourceOperation):undefined;
                                    const name=descriptor?.name??this.singleStringField(this.ordinaryOwner(receiver),"name",rule);
                                    this.publish(result!,name!==undefined?this.text(`function ${name}() { [native code] }`):this.unknownString);
                                }
                                else this.publish(result!, this.unknown);
                            }
                        }
                        if (atom.operation === "realm") {let realm=this.realmAllocations.get(node);if(!realm){realm=this.newRealm();this.realmAllocations.set(node,realm);}this.publish(result!,realm.record);}
                        if (atom.operation === "eval" || atom.operation === "eval-script" || atom.operation === "agent-start") {
                            const first = argument(0);
                            const source = first ? atom.operation === "eval" ? first : this.stringHintCell(first, node) : null;
                            const realms=this.executionRealms(node);this.watch(rule,realms);
                            const directChoices=atom.operation==="eval"&&invocation.direct?[...new Set([...realms.values].map(value=>value.tag==="realm-record"&&value.realm===atom.realm))]:[false];
                            if(!directChoices.length)continue;
                            for(const direct of directChoices){
                            const key = result!.id + ":" + atom.operation + ":" + direct + ":" + (source?.id ?? (argv ? "omitted" : "unknown"));
                            evaluations.set(key, { node, operation: atom.operation, direct, source, unknown: !argv && !invocation.sequence });
                            if (noArguments) {this.publish(result!, this.abrupt); continue;}
                            if (atom.operation === "agent-start") {this.publish(result,this.primitive(undefined));continue;}
                            if (source) {
                                this.watchText(rule, source);
                                const proof = this.primitiveChoiceProof(source);
                                if (proof.primitiveComplete && !proof.values.length) this.publish(result!, this.abrupt);
                                for (const text of proof.values) {
                                    if (atom.operation === "eval" && typeof text !== "string") {
                                        this.publish(result!, this.primitive(text));
                                        continue;
                                    }
                                    const contextKey=evaluationContextKey(String(text),atom.operation==='eval'?direct?'direct':'indirect':atom.operation==='eval-script'?'script':'agent');
                                    const sharedKey=evaluationContextKey(String(text),undefined);
                                    const generated=[...(this.evaluations.get(contextKey)??[]),...(this.evaluations.get(sharedKey)??[])];
                                    if(!handled(atom,signature+":environment:"+contextKey))this.onActive(node,()=>{
                                        if(atom.operation!=="agent-start")for(const record of generated)if(record.file)this.connectActivation(this.sourceActivation(node),record.file);
                                        if(atom.operation==="eval")this.connectEvaluationEnvironment(String(text),node,direct,atom.realm??this.currentRealm);
                                        for(const origins of [...(this.evaluationOrigins.get(contextKey)??[]),...(this.evaluationOrigins.get(sharedKey)??[])])
                                            this.copy(this.executionOrigins(node),origins);
                                    });
                                    if (!generated.length) this.publish(result!,this.pendingSource);
                                    if (this.invalidEvaluations.has(contextKey)||this.invalidEvaluations.has(sharedKey)) {
                                        // PerformEval step: an eval code that fails to parse
                                        // throws a SyntaxError before any evaluation.
                                        const handler = this.exceptionHandlers.get(node);
                                        if (handler) this.onActive(node, () => this.publish(handler, this.nativeException(node, "SyntaxError")));
                                    }
                                    for (const value of generated) this.copy(value.completion, result!);
                                    const handler=this.exceptionHandlers.get(node);
                                    if(handler)for(const errors of [...(this.evaluationThrows.get(contextKey)??[]),...(this.evaluationThrows.get(sharedKey)??[])])this.copy(errors,handler);
                                }
                                if (atom.operation === "eval") for (const value of source.values) {
                                    if (value.tag === "unknown-string") this.publish(result,this.unknown);
                                    else if ((value.tag !== "text-operation" || value.operation === "prefix" || value.operation === "numeric" && value.numeric!.conversion !== "default") && (value.tag !== "primitive" || typeof value.value !== "string")) this.publish(result!, value);
                                }
                            } else if (argv && atom.operation === "eval") this.publish(result!, this.primitive(undefined));
                            }
                        }
                        if(atom.operation==="reflect-get"){
                            const target=argument(0)??omittedArgument,key=argument(1)??omittedArgument;
                            const receiver=argv?argv.length>=3?argv[2]!:target:this.newCell();
                            if(!argv){this.copy(target,receiver);const supplied=argument(2);if(supplied)this.copy(supplied,receiver);}
                            this.copy(this.reflectiveGet(target,key,receiver,node),result);continue;
                        }
                        if(atom.operation==="object-enumerable:keys"||atom.operation==="object-enumerable:values"||atom.operation==="object-enumerable:entries"){
                            this.copy(this.ownKeyArray(argument(0)??omittedArgument,node,"string",true,atom.operation.slice("object-enumerable:".length) as "keys"|"values"|"entries"),result);continue;
                        }
                        if(atom.operation==="reflect-own-keys"||atom.operation==="object-own-keys:string"||atom.operation==="object-own-keys:symbol"){
                            const kind=atom.operation==="reflect-own-keys"?"all":atom.operation==="object-own-keys:string"?"string":"symbol";
                            this.copy(this.ownKeyArray(argument(0)??omittedArgument,node,kind,atom.operation!=="reflect-own-keys"),result);continue;
                        }
                        // SetIntegrityLevel / TestIntegrityLevel: the argument is returned
                        // unchanged (a primitive as itself), freeze marks a represented
                        // owner's own properties immutable, the tests answer either way; no
                        // argument escapes and no code runs.
                        if (atom.operation.startsWith("object-integrity:")) {
                            const input=argument(0)??omittedArgument;this.copy(input,result);
                            if(atom.operation==="object-integrity:freeze")this.rule([input],()=>{for(const value of input.values){const owner=this.ordinaryOwner(value);if(owner&&!owner.proxy)owner.immutableOwn=true;}});
                            continue;
                        }
                        if (atom.operation.startsWith("object-integrity-test:")) {
                            this.publish(result,this.primitive(true));this.publish(result,this.primitive(false));continue;
                        }
                        if (atom.operation === "object-get-prototype" || atom.operation === "reflect-get-prototype") {
                            const input=argument(0)??omittedArgument;
                            this.copy(this.getPrototype(input,node,atom.operation==="object-get-prototype"),result);
                        }
                    }
                }
            }
        });
    }
    private watchList(rule: Rule, cell: Cell,context?:ts.Node): void {
        const activation=context?this.enclosingActivation(context):null;if(activation){this.watch(rule,activation.active);this.watch(rule,this.activationTiming(activation));}
        this.watch(rule,this.iterationMethod(cell,context));
        const pending = [cell], visited = new Set<Cell>();
        while (pending.length) {
            const input = pending.pop()!; if (visited.has(input)) continue; visited.add(input); this.watch(rule, input);
            for (const atom of input.values) {
                const owner=this.ordinaryOwner(atom);if(!owner)continue;
                this.watch(rule, owner.shape);
                const extent=owner.listLength??owner.arguments?.length;if(extent)pending.push(this.captureRead(extent,context,true));
                if(owner.prototype)pending.push(owner.prototype);
                for (const field of owner.fields.values()) pending.push(field);
                for(const mapped of owner.arguments?.mapped.values()??[])pending.push(mapped.value);
                for(const accessor of owner.accessors.values())pending.push(accessor.get,accessor.set);
            }
        }
    }
    private watchText(rule: Rule, root: Cell): void {
        // Publication walks the reverse dependency graph and wakes these
        // subscribers when any primitive part changes.
        this.watch(rule,root);
    }
    private choices(root: Cell): string[] | null {
        const proof = this.primitiveChoiceProof(root);
        return proof.primitiveComplete ? [...new Set(proof.values.map(String))] : null;
    }
    private evaluatePrimitiveTuple(atom:Extract<Atom,{tag:"text-operation"}>,tuple:readonly Primitive[]):PrimitiveOutcome {
        const normal=(value:Primitive):PrimitiveOutcome=>({kind:"normal",value});
        if(atom.operation==="prefix")return normal(!tuple[0]);
        if(atom.operation==="numeric"){try{return normal(atom.numeric!.evaluate(tuple));}catch{return {kind:"abrupt"};}}
        if(atom.operation==="coerce"){try{return normal(NUMERIC_CONVERSIONS.get(atom.conversion!)!(tuple[0]!));}catch{return {kind:"abrupt"};}}
        if(atom.operation==="util-format"){
            const text=tuple.some(value=>typeof value==="symbol")?null:nativePrimitiveFormat(tuple as Exclude<Primitive,symbol>[]);
            return text===null?{kind:"unknown"}:normal(text);
        }
        if(atom.operation==="error-text")return normal(tuple[0]===""?tuple[1]!:tuple[1]===""?tuple[0]!:String(tuple[0])+": "+String(tuple[1]));
        if(atom.operation==="primitive-string"){try{return normal(atom.parts.length>1?(tuple[0] as number|bigint).toString(tuple[1] as number|undefined):String(tuple[0]));}catch{return {kind:"abrupt"};}}
        if(atom.operation==="string-codes"){
            if(atom.coding==="point"&&tuple.some(value=>typeof value!=="number"||!Number.isInteger(value)||value<0||value>0x10ffff))return {kind:"abrupt"};
            try{return normal(tuple.map(value=>atom.coding==="unit"?String.fromCharCode(value as number):String.fromCodePoint(value as number)).join(""));}
            catch{return {kind:"unknown"};}
        }
        if(atom.operation==="bound-name")return normal("bound "+(typeof tuple[0]==="string"?tuple[0]:""));
        if(atom.operation==="array-join"){
            const range=atom.indexedRange,separator=String(tuple[0]),pieces:string[]=[];let previous=0;
            try{
                for(const [index,position]of range.positions.entries()){
                    pieces.push(separator.repeat(position-previous),String(tuple[index+1]));previous=position;
                }
                pieces.push(separator.repeat(Math.max(0,range.length-1-previous)));return normal(pieces.join(""));
            }catch{return {kind:"unknown"};}
        }
        if(atom.operation==="json-container"){
            const gap=String(tuple[0]),indent=gap.repeat(atom.level+1),stepback=gap.repeat(atom.level),pieces:string[]=[];
            if(atom.arrayLength!==null){
                let previous=0;
                for(const [index,key]of atom.keys.entries()){
                    const position=Number(key);while(previous<position){pieces.push("null");previous++;}
                    pieces.push(tuple[index+1]===undefined?"null":String(tuple[index+1]));previous=position+1;
                }
                while(previous<atom.arrayLength){pieces.push("null");previous++;}
            }else for(const [index,key]of atom.keys.entries())if(tuple[index+1]!==undefined)pieces.push(JSON.stringify(key)+":"+(gap?" ":"")+String(tuple[index+1]));
            const open=atom.arrayLength===null?"{":"[",close=atom.arrayLength===null?"}":"]";
            return normal(!pieces.length?open+close:gap?open+"\n"+indent+pieces.join(",\n"+indent)+"\n"+stepback+close:open+pieces.join(",")+close);
        }
        if(atom.operation==="to-string")return normal(String(tuple[0]));
        if(atom.operation==="template"&&!tuple.some(value=>typeof value==="symbol"))return normal(tuple.map(String).join(""));
        return {kind:"abrupt"};
    }
    /** A completion query consumes the retained value graph lazily. Choice
     * points keep persistent continuations; no operand Cartesian product or
     * JavaScript recursion is needed to find one possible normal result.
     * Proving that none exists still visits every combination, once per path
     * through a shared operand (a chain of two-way choices over a Symbol
     * throws at all 2^n of them), so past PRIMITIVE_CHOICE_PRODUCT_LIMIT steps
     * the query yields an unknown completion, which may be normal. */
    private *primitiveCompletions(root:Cell):IterableIterator<Exclude<PrimitiveOutcome,{kind:"abrupt"}>> {
        type Value=Exclude<PrimitiveOutcome,{kind:"abrupt"}>;
        type Ancestors={cell:Cell;next:Ancestors|null};
        type Task={kind:"cell";cell:Cell;ancestors:Ancestors|null}|{kind:"atom";atom:Atom;ancestors:Ancestors}|{kind:"apply";atom:Extract<Atom,{tag:"text-operation"}>};
        type Tasks={task:Task;next:Tasks|null};type Values={value:Value;next:Values|null};
        let tasks:Tasks|null={task:{kind:"cell",cell:root,ancestors:null},next:null},values:Values|null=null;
        const choices:{atoms:IterableIterator<Atom>;tasks:Tasks|null;values:Values|null;ancestors:Ancestors}[]=[];
        const resume=():boolean=>{
            while(choices.length){const choice=choices[choices.length-1]!,next=choice.atoms.next();
                if(next.done){choices.pop();continue;}
                tasks={task:{kind:"atom",atom:next.value,ancestors:choice.ancestors},next:choice.tasks};values=choice.values;return true;
            }return false;
        };
        for(let steps=0;;){
            if(++steps>PRIMITIVE_CHOICE_PRODUCT_LIMIT){yield {kind:"unknown"};return;}
            if(!tasks){if(values)yield values.value;if(!resume())return;continue;}
            const task:Task=tasks.task;tasks=tasks.next;
            if(task.kind==="cell"){
                let cyclic=false;for(let parent=task.ancestors;parent;parent=parent.next)if(parent.cell===task.cell){cyclic=true;break;}
                if(cyclic){values={value:{kind:"unknown"},next:values};continue;}
                const atoms:IterableIterator<Atom>=task.cell.values[Symbol.iterator]();const first:IteratorResult<Atom>=atoms.next();
                if(first.done){values={value:{kind:"unknown"},next:values};continue;}
                const ancestors:Ancestors={cell:task.cell,next:task.ancestors};choices.push({atoms,tasks,values,ancestors});
                tasks={task:{kind:"atom",atom:first.value,ancestors},next:tasks};continue;
            }
            if(task.kind==="atom"){
                const atom:Atom=task.atom;
                if(atom.tag==="abrupt"){if(!resume())return;continue;}
                if(atom.tag==="primitive"){values={value:{kind:"normal",value:atom.value},next:values};continue;}
                if(atom.tag!=="text-operation"){values={value:{kind:"unknown"},next:values};continue;}
                tasks={task:{kind:"apply",atom},next:tasks};
                for(let index:number=atom.parts.length-1;index>=0;index--)tasks={task:{kind:"cell",cell:atom.parts[index]!,ancestors:task.ancestors},next:tasks};
                continue;
            }
            const tuple:Primitive[]=new Array(task.atom.parts.length);let unknown=false;
            for(let index=tuple.length-1;index>=0;index--){const value=values!.value;values=values!.next;if(value.kind==="unknown")unknown=true;else tuple[index]=value.value;}
            const outcome=unknown?{kind:"unknown"} as const:this.evaluatePrimitiveTuple(task.atom,tuple);
            if(outcome.kind==="abrupt"){if(!resume())return;continue;}
            values={value:outcome,next:values};
        }
    }
    private primitiveHasNormal(root:Cell):boolean {
        if(this.primitiveNormalCache.has(root))return true;
        // A complete value proof combines each operand's values once, so it
        // answers a shared chain without walking its paths.
        const proof=this.primitiveChoiceProof(root);
        if(proof.primitiveComplete){
            if(!proof.values.length)return false;
            this.primitiveNormalCache.set(root,true);return true;
        }
        const first=this.primitiveCompletions(root).next();
        if(first.done)return false;
        // Only a normal value is kept: an unknown completion may stand for an
        // operand still without facts, which may later turn out to throw.
        if(first.value.kind==="normal")this.primitiveNormalCache.set(root,true);
        return true;
    }
    private primitiveChoiceProof(root: Cell): PrimitiveChoiceProof {
        this.flushPrimitiveChanges();
        const incomplete: PrimitiveChoiceProof = { values: [], primitiveComplete: false, textComplete: false };
        const pending = [{ cell: root, finish: false }], active = new Set<Cell>(), proofs = new Map<Cell, PrimitiveChoiceProof>();
        const path:Cell[] = [], positions = new Map<Cell,number>(), cycles = new Set<Cell>();
        while (pending.length) {
            const task = pending.pop()!;
            if (proofs.has(task.cell)) continue;
            const cached = this.primitiveProofCache.get(task.cell);
            if (cached) {proofs.set(task.cell,cached); continue;}
            if (task.finish) {
                active.delete(task.cell);
                positions.delete(task.cell); path.pop();
                const choices = new Map<Atom, Primitive>();
                const add = (value: Primitive): void => {choices.set(this.primitive(value),value);};
                let primitiveComplete = task.cell.values.nonempty, textComplete = true;
                for (const atom of task.cell.values) {
                    if (atom.tag === "primitive") add(atom.value);
                    else if (atom.tag === "abrupt") continue;
                    else if (atom.tag === "text-operation") {
                        const complete = atom.parts.every(part => proofs.get(part)?.primitiveComplete);
                        const booleanPrefix = atom.operation === "prefix" && atom.operator === ts.SyntaxKind.ExclamationToken;
                        const noNormal = atom.parts.some(part => proofs.get(part)?.primitiveComplete && !proofs.get(part)!.values.length);
                        const booleanResult = atom.operation === "numeric" && atom.numeric!.result === "boolean" && !noNormal &&
                            atom.parts.every(part => !this.primitiveReadiness(part).pending);
                        primitiveComplete &&= complete || booleanPrefix || booleanResult || noNormal;
                        textComplete &&= complete || atom.operation === "prefix" || atom.operation === "coerce" || atom.operation === "numeric" && atom.numeric!.conversion !== "default";
                        if (noNormal) continue;
                        if(atom.operation==="numeric"&&atom.numeric!.form==="equality"&&atom.numeric!.conversion==="none"){
                            const types=atom.parts.map(part=>{const kinds=this.primitiveKinds(part);return kinds&KIND_FUNCTION?(kinds&~KIND_FUNCTION)|KIND_OBJECT:kinds;});
                            if(types.length===2&&types.every(Boolean)&&!(types[0]!&types[1]!)){add(!!atom.numeric!.negate);continue;}
                        }
                        if (!complete && booleanResult) {add(false); add(true); continue;}
                        if (!complete && booleanPrefix) { add(false); add(true); continue; }
                        // An incomplete operand cannot prove a finite result
                        // collection. Enumerating partial cyclic choices can
                        // manufacture an unbounded String language here.
                        if (!complete) continue;
                        const operands=atom.parts.map(part=>proofs.get(part)?.values??[]);
                        if(operands.reduce((product,values)=>product*values.length,1)>PRIMITIVE_CHOICE_PRODUCT_LIMIT){
                            if(booleanPrefix||atom.operation==="numeric"&&atom.numeric!.result==="boolean"){add(false);add(true);}
                            else {primitiveComplete=false;textComplete=false;}
                            continue;
                        }
                        for(const tuple of sourceChoiceTuples(operands)){
                            const outcome=this.evaluatePrimitiveTuple(atom,tuple);
                            if(outcome.kind==="normal")add(outcome.value);
                            else if(outcome.kind==="unknown"){primitiveComplete=false;textComplete=false;}
                        }
                    } else {primitiveComplete = false; if (atom.tag === "unknown-string") textComplete = false;}
                }
                if (cycles.has(task.cell)) {
                    const booleanDomain = [...task.cell.values].every(atom => atom.tag === "abrupt" ||
                        atom.tag === "primitive" && typeof atom.value === "boolean" || atom.tag === "text-operation" &&
                        (atom.operation === "prefix" || atom.operation === "numeric" && atom.numeric!.result === "boolean"));
                    proofs.set(task.cell,{values:booleanDomain ? [false,true] : [],primitiveComplete:booleanDomain,textComplete});
                } else proofs.set(task.cell, {values: [...choices.values()], primitiveComplete, textComplete});
            } else {
                // A cyclic value edge has no finite scalar proof. Continue
                // the postorder pass so its consumer can still prove a
                // non-String result independently of the unknown magnitude.
                if (active.has(task.cell)) {
                    for (let index=positions.get(task.cell)!; index<path.length; index++) cycles.add(path[index]!);
                    continue;
                }
                active.add(task.cell); positions.set(task.cell,path.length); path.push(task.cell); pending.push({ ...task, finish: true });
                for (const atom of task.cell.values) if (atom.tag === "text-operation") for (const cell of atom.parts) pending.push({ cell, finish: false });
            }
        }
        for (const [cell,proof] of proofs) this.primitiveProofCache.set(cell,proof);
        return proofs.get(root) ?? incomplete;
    }
    expressionTexts(expressions:readonly ts.Expression[]):ReadonlyMap<ts.Expression,readonly string[]|null> {
        const cells=expressions.map(expression=>this.cell(expression));this.solve();
        return new Map(expressions.map((expression,index)=>{
            const parent=expression.parent;
            const target=parent&&ts.isCallExpression(parent)&&parent.expression.kind===ts.SyntaxKind.ImportKeyword&&parent.arguments[0]===expression?this.importTargetCells.get(parent):undefined;
            return [expression,this.choices(target??cells[index]!)];
        }));
    }
    /** guardedOnly seals only expressions whose guards prove they never run
     * (an operand after an abrupt-only one, an unselected branch). */
    private sealSourceValue(node:ts.Node,cell:Cell,guardedOnly=false):boolean {
        if(cell.values.nonempty)return false;
        const activation=this.enclosingActivation(node);
        if(activation&&!activation.active.values.nonempty)return false;
        const origins=this.sourceOrigins.get(this.sourceFile(node));
        if(!activation&&origins&&!origins.values.nonempty)return false;
        if(this.guards(node).some(guard=>{
            const proof=this.primitiveChoiceProof(guard.condition);
            return proof.primitiveComplete&&!proof.values.some(value=>!!value===guard.truthy);
        })){this.publish(cell,this.abrupt);return true;}
        if(guardedOnly)return false;
        this.publish(cell,this.normalResults.get(cell)??(ts.isNewExpression(node)?this.opaqueObject:this.unknown));return true;
    }
    solve(): { constructors: ConstructorSourceFacts[]; evaluations: EvaluationInvocation[] } {
        // A deterministic budget of rule evaluations keeps compile time and
        // memory bounded. Exhausting it ends the analysis without sealing:
        // every discovered dynamic-code site is reported unproven, which the
        // compiler admits only through a manifest or --unsafe-eval.
        const budget=sourceAnalysisRuleBudget(),cellBudget=sourceAnalysisCellBudget(),memoryLimit=sourceAnalysisMemoryLimit(),memoryBase=process.memoryUsage().rss;let runs=0,exhausted=false;
        solving: for (;;) {
            while (this.moduleNamespacePending.length || this.initializers.length || this.queueCursor < this.queue.length || this.primitiveChanges.size) {
                if (++runs > budget || this.nextCell > cellBudget || (runs & 4095) === 0 && process.memoryUsage().rss - memoryBase > memoryLimit) { exhausted = true; break solving; }
                if (this.moduleNamespacePending.length) { const namespace = this.moduleNamespacePending.pop()!; this.initializeModuleNamespace(namespace.source,namespace.symbol,namespace.owner); }
                else if (this.initializers.length) { const initializer = this.initializers.pop()!; this.initialize(initializer.node, initializer.result); }
                else if (this.primitiveChanges.size) this.flushPrimitiveChanges();
                else {
                    const rule = this.queue[this.queueCursor++]!; rule.queued = false; rule.run();
                    if (this.queueCursor * 2 >= this.queue.length) {this.queue.splice(0,this.queueCursor); this.queueCursor=0;}
                }
            }
            this.queue.length = 0; this.queueCursor = 0;
            // Empty expression facts mean unresolved value flow, not an
            // impossible branch. Seal them only after the known graph closes,
            // then propagate the same interned top fact through normal edges.
            let changed = false;
            for(const[binding,record]of this.evaluationDeclarationBindings){
                if(record.origins.size||!record.fallback)continue;
                this.copy(record.fallback,binding);delete record.fallback;
            }
            if(this.queueCursor<this.queue.length)continue;
            for(const record of this.unknownPropertyLocations.values())if(!record.algorithm.values.nonempty){this.publish(record.algorithm,this.primitive("opaque"));changed=true;}
            if(changed)continue;
            if(!this.presenceClosed){
                // Unresolved external bindings are value inputs, rather than
                // owner absence dependencies. Wake their guarded mutations
                // before sealing any contextual own-location absence.
                for(const [node,cell]of this.cells)if(ts.isIdentifier(node)&&!cell.values.nonempty&&this.isAmbientIdentifier(node)){
                    const origins=this.sourceOrigins.get(this.sourceFile(node));
                    if(origins&&!origins.values.nonempty)continue;
                    let binding=this.binding(node);
                    // Inside a function the name reads the global binding unless
                    // a direct eval there declares it: that global binding is
                    // the external input.
                    const global=this.activationGlobalFallbacks.get(binding);
                    if(global&&!this.evaluationDeclarationBindings.get(binding)?.origins.size)binding=global;
                    if(binding.values.nonempty||this.writtenAmbientBindings.has(binding)||this.scriptDeclaredBindings.has(binding))continue;
                    // A reference inside evaluated or generated code resolves
                    // through its environment's callers (the caller's realm
                    // supplies the global); it is not an external input.
                    if(this.evaluationDeclarationBindings.has(binding))continue;
                    if(this.unresolvableHostName(node.text,this.evaluationGlobalTargets.get(node))){
                        // ResolveBinding finds no binding: GetValue throws
                        // ReferenceError, and typeof answers "undefined".
                        if(ts.isTypeOfExpression(node.parent))this.publish(cell,this.primitive(undefined));
                        else{this.publish(cell,this.abrupt);const handler=this.exceptionHandlers.get(node);if(handler)this.publish(handler,this.nativeException(node,"ReferenceError"));}
                        changed=true;continue;
                    }
                    this.publish(binding,this.unknown);changed=true;
                }
                if(changed)continue;
                this.presenceClosed=true;for(const rule of this.presenceRules)this.schedule(rule);continue;
            }
            for (const cell of this.exceptionCells) if (!cell.values.nonempty) {this.publish(cell, this.abrupt); changed = true;}
            for (const cell of this.accessorSlots) if (!cell.values.nonempty) {this.publish(cell, this.primitive(undefined)); changed = true;}
            if (changed) continue;
            // An expression its guards prove unreachable completes abruptly.
            // Propagate those completions before any empty fact becomes
            // unknown, so a consumer of one (`(abrupt, "x")`) is not sealed
            // as unknown in the same pass.
            for(const [node,cell]of this.cells)changed=this.sealSourceValue(node,cell,true)||changed;
            if(changed)continue;
            // Close canonical invocation locations before their expression
            // consumers, so native normal categories cannot become top at an
            // otherwise empty forwarding edge.
            for(const [node,calls]of this.callResults)for(const cell of calls.values())if(this.normalResults.has(cell))changed=this.sealSourceValue(node,cell)||changed;
            if(changed)continue;
            for(const [node,cell]of this.cells)changed=this.sealSourceValue(node,cell)||changed;
            if (!changed) break;
        }
        if (exhausted) {
            reportSourceAnalysisExhaustion(`tsc2c: warning: source-value analysis stopped after ${runs} steps and ${this.nextCell} cells (limits: ${budget} steps, ${cellBudget} cells, ${Math.round(memoryLimit / 1048576)} MB); dynamic code sources stay unproven (raise TSC2C_SOURCE_ANALYSIS_BUDGET, TSC2C_SOURCE_ANALYSIS_CELLS or TSC2C_SOURCE_ANALYSIS_MEMORY_MB to analyze further)\n`);
            const result = {
                constructors: [...this.invocations.values()].flatMap(records => [...records.values()]).map(invocation =>
                    ({kind:invocation.kind,arguments:null,complete:false,...(this.domain?{domain:this.domain}:{})})),
                evaluations: [...this.evaluationInvocations.values()].flatMap(records => [...records.values()]).map(invocation =>
                    ({node:invocation.node,operation:invocation.operation,direct:invocation.direct,choices:null,...(this.domain?{domain:this.domain}:{})})),
            };
            // The abandoned graph is garbage; reclaim it before the next solve.
            (globalThis as {Bun?:{gc(force:boolean):void}}).Bun?.gc(true);
            return result;
        }
        // A guarded call may never initialize its callee/invocation rule.
        // Retain the empty source result from the same closed guard graph so
        // downstream syntax admission does not invent an unknown call.
        const inactiveEvaluations:EvaluationInvocation[]=[];
        for(const [node,possibilities]of this.inactiveEvaluationCandidates)if(this.guards(node).some(guard=>{
            const proof=this.primitiveChoiceProof(guard.condition);return proof.primitiveComplete&&!proof.values.some(value=>!!value===guard.truthy);
        }))for(const direct of possibilities)inactiveEvaluations.push({node,operation:"eval",direct,choices:[],...(this.domain?{domain:this.domain}:{})});
        const recorded=new Set<ts.Node>([...this.evaluationInvocations.values()].flatMap(records=>[...records.values()].map(invocation=>invocation.node)));
        for(const [node,{direct,text}] of this.literalEvaluationCandidates)
            if(!recorded.has(node)&&!this.enclosingActivation(node)!.active.values.nonempty)inactiveEvaluations.push({node,operation:"eval",direct,choices:[text],...(this.domain?{domain:this.domain}:{})});
        const arguments_=new Map<Cell,{values:readonly string[];complete:boolean}>();
        const argumentDomain=(input:Cell)=>{
            const prior=arguments_.get(input);if(prior)return prior;
            const proof=this.primitiveChoiceProof(input),values=new Set<string>();
            if(proof.primitiveComplete)for(const value of proof.values)values.add(String(value));
            else for(const outcome of this.primitiveCompletions(input))if(outcome.kind==="normal")values.add(String(outcome.value));
            const domain={values:[...values],complete:proof.primitiveComplete};arguments_.set(input,domain);return domain;
        };
        return {
            constructors: [...this.invocations.values()].flatMap(records => [...records.values()]).map(invocation => {
                const domains=invocation.args?.map(argumentDomain);
                return {kind:invocation.kind,arguments:domains?.map(domain=>domain.values)??null,complete:!this.unresolvedPrivate&&!!domains&&domains.every(domain=>domain.complete),...(this.domain?{domain:this.domain}:{})};
            }),
            evaluations: [...inactiveEvaluations,...[...this.evaluationInvocations.values()].flatMap(records => [...records.values()]).map(invocation => {
                const { source, operation, unknown } = invocation;
                const proof = source ? this.primitiveChoiceProof(source) : undefined;
                const primitives = proof?.values ?? [];
                const unresolved = this.unresolvedPrivate || unknown || source && (!source.values.nonempty ||
                    [...source.values].some(value => value.tag === "unknown" || value.tag === "pending-source") ||
                    !proof!.textComplete || operation !== "eval" && !proof!.primitiveComplete);
                const listed = unresolved ? null : source
                    ? [...new Set(primitives.filter(value => operation !== "eval" || typeof value === "string").map(String))]
                    : operation !== "eval" ? ["undefined"] : [];
                const choices = listed && listed.length > evalSourceChoiceLimit() ? null : listed;
                return { node: invocation.node, operation, direct: invocation.direct, choices,...(this.domain?{domain:this.domain}:{}) };
            })],
        };
    }
}

/** Expression queries project the same source value/location/call solution. */
export function sourceExpressionTexts(program:ts.Program,expressions:readonly ts.Expression[],entries:SourceValueGraphEntries={}):ReadonlyMap<ts.Expression,readonly string[]|null> {
    return new SourceValueFlow(program,entries).expressionTexts(expressions);
}

type SourceValueSolution = ReturnType<SourceValueFlow["solve"]>;
const sourceValueSolutions = new WeakMap<ts.Program, Map<string, SourceValueSolution>>();
/** The same monotone solver runs over each execution domain's reachable
 * source graph. Worker Scripts have fresh globals and cannot mutate the
 * parent's ordinary owners; imported code is projected into each domain. */
function sourceDomainSolutions(program:ts.Program,entries:SourceValueGraphEntries):SourceValueSolution {
    const agents=(entries.evaluations??[]).filter(entry=>entry.kind==="agent"&&entry.entry);
    if(!agents.length)return new SourceValueFlow(program,entries).solve();
    const allFiles=new Map(program.getSourceFiles().map(file=>[path.resolve(file.fileName),file]));
    const generated=new Set([
        ...(entries.evaluations??[]).flatMap(entry=>entry.entry?[path.resolve(entry.entry)]:[]),
        ...(entries.functions??[]).flatMap(entry=>entry.entry?[path.resolve(entry.entry)]:[]),
    ]);
    const domains=new Map<string,Set<string>>();
    domains.set("",new Set((entries.roots??program.getRootFileNames().filter(file=>!generated.has(path.resolve(file)))).map(file=>path.resolve(file))));
    for(const entry of agents){const domain=sourceAgentDomain(entry.source);let roots=domains.get(domain);if(!roots){roots=new Set();domains.set(domain,roots);}roots.add(path.resolve(entry.entry!));}
    const checker=program.getTypeChecker();
    const host:ts.ModuleResolutionHost={
        fileExists:file=>allFiles.has(path.resolve(file))||ts.sys.fileExists(file),
        readFile:file=>allFiles.get(path.resolve(file))?.text??ts.sys.readFile(file),
    };
    const directories=new Set<string>();
    for(const filename of allFiles.keys()){let directory=path.dirname(filename);while(!directories.has(directory)){directories.add(directory);const parent=path.dirname(directory);if(parent===directory)break;directory=parent;}}
    host.directoryExists=directory=>directories.has(path.resolve(directory))||ts.sys.directoryExists(directory);
    const result:SourceValueSolution={constructors:[],evaluations:[]};
    for(const [domain,roots] of domains){
        const evaluations=(entries.evaluations??[]).filter(entry=>entry.kind==="agent"
            ? sourceAgentDomain(entry.source)===domain : (entry.domain??"")===domain);
        const functions=(entries.functions??[]).filter(entry=>(entry.domain??"")===domain);
        const sources=new Set<ts.SourceFile>(),pending=[...roots,...evaluations.flatMap(entry=>entry.entry?[entry.entry]:[]),...functions.flatMap(entry=>entry.entry?[entry.entry]:[])];
        while(pending.length){
            const file=allFiles.get(path.resolve(pending.pop()!));if(!file||file.isDeclarationFile||sources.has(file))continue;sources.add(file);
            const nodes:ts.Node[]=[file];
            while(nodes.length){
                const node=nodes.pop()!;
                const specifier=ts.isImportDeclaration(node)||ts.isExportDeclaration(node)?node.moduleSpecifier:
                    ts.isCallExpression(node)&&(node.expression.kind===ts.SyntaxKind.ImportKeyword||ts.isIdentifier(node.expression)&&node.expression.text==="require")?node.arguments[0]:undefined;
                if(specifier&&ts.isExpression(specifier)){
                    const symbol=checker.getSymbolAtLocation(specifier);
                    for(const declaration of symbol?.declarations??[])if(ts.isSourceFile(declaration))pending.push(declaration.fileName);
                    for(const name of staticStringExpressionTexts(specifier)??[]){
                        const resolved=ts.resolveModuleName(name,file.fileName,program.getCompilerOptions(),host).resolvedModule;
                        if(resolved)pending.push(sourceUnitFileName(program,resolved.resolvedFileName,"module"));
                    }
                }
                ts.forEachChild(node,child=>{nodes.push(child);});
            }
        }
        const solved=new SourceValueFlow(program,{...entries,roots:[...roots],functions,evaluations},domain||undefined,sources).solve();
        result.constructors.push(...solved.constructors);result.evaluations.push(...solved.evaluations);
    }
    return result;
}
function sourceValueSolution(program: ts.Program, entries: SourceValueGraphEntries): SourceValueSolution {
    const key = JSON.stringify([
        entries.roots,
        (entries.functions ?? []).map(entry => [entry.kind ?? "ordinary", entry.parameters, entry.body, entry.entry,entry.domain]),
        (entries.evaluations ?? []).map(entry => [entry.source, entry.entry,entry.kind,entry.domain]),
    ]);
    let solutions = sourceValueSolutions.get(program);
    if (!solutions) {solutions = new Map(); sourceValueSolutions.set(program,solutions);}
    let solution = solutions.get(key);
    if (!solution) {solution = sourceDomainSolutions(program, entries); solutions.set(key,solution);}
    return solution;
}
export function sourceConstructorInvocations(program: ts.Program, entries: SourceValueGraphEntries = {}): ConstructorInvocation[] {
    return sourceConstructorFacts(program,entries).map(facts=>({kind:facts.kind,choices:facts.complete?facts.arguments:null,...(facts.domain?{domain:facts.domain}:{})}));
}
/** Registry discovery consumes known alternatives; this projection does not
 * authorize an unknown source or claim that the domain is complete. */
export function sourceConstructorFacts(program:ts.Program,entries:SourceValueGraphEntries={}):ConstructorSourceFacts[]{
    return sourceValueSolution(program,entries).constructors.slice();
}

export function sourceEvaluationInvocations(program: ts.Program, entries: SourceValueGraphEntries = {}): EvaluationInvocation[] {
    return sourceValueSolution(program, entries).evaluations.slice();
}
