// TypeScriptC minimal global/type shim.
// Declarations here are ambient globals because this file has no imports/exports.

// --- iterator protocol (minimal, for for-of on arrays) ---
interface Symbol {
    readonly description: string | undefined;
    toLocaleString(): string;
    toString(): string;
    valueOf(): symbol;
}
interface SymbolConstructor {
    (description?: string): symbol;
    for(key: string): symbol;
    keyFor(sym: symbol): string | undefined;
    readonly iterator: symbol;
    readonly asyncIterator: symbol;
}
declare var Symbol: SymbolConstructor;

interface IteratorYieldResult<T> { done?: false; value: T; }
interface IteratorReturnResult<TReturn> { done: true; value: TReturn; }
type IteratorResult<T, TReturn = any> = IteratorYieldResult<T> | IteratorReturnResult<TReturn>;
interface Iterator<T, TReturn = any, TNext = undefined> {
    next(...args: [] | [TNext]): IteratorResult<T, TReturn>;
}
interface Iterable<T> {
    [Symbol.iterator](): Iterator<T>;
}
interface IterableIterator<T> extends Iterator<T> {
    [Symbol.iterator](): IterableIterator<T>;
}
interface Generator<T = unknown, TReturn = any, TNext = unknown> extends Iterator<T, TReturn, TNext> {
    next(...args: [] | [TNext]): IteratorResult<T, TReturn>;
    return(value: TReturn): IteratorResult<T, TReturn>;
    throw(e: any): IteratorResult<T, TReturn>;
    [Symbol.iterator](): Generator<T, TReturn, TNext>;
}

interface Promise<T> {
    then<TResult = T>(onfulfilled?: (value: T) => TResult | Promise<TResult>): Promise<TResult>;
    then<TResult = T, TRejectResult = never>(onfulfilled: ((value: T) => TResult | Promise<TResult>) | undefined, onrejected: (reason: any) => TRejectResult | Promise<TRejectResult>): Promise<TResult | TRejectResult>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | Promise<TResult>) | undefined): Promise<T | TResult>;
    finally(onfinally?: (() => void) | undefined): Promise<T>;
}
interface PromiseConstructor {
    new<T>(executor: (resolve: (value: T) => void, reject: (reason: any) => void) => void): Promise<T>;
    resolve<T>(value: Promise<T>): Promise<T>;
    resolve<T>(value: T): Promise<T>;
    resolve(): Promise<void>;
    reject<T = never>(reason?: any): Promise<T>;
    all<T>(values: Promise<T>[]): Promise<T[]>;
    allSettled<T>(values: Promise<T>[]): Promise<any[]>;
    race<T>(values: Promise<T>[]): Promise<T>;
    any<T>(values: Promise<T>[]): Promise<T>;
    try<T>(callback: () => T | Promise<T>): Promise<T>;
}
declare var Promise: PromiseConstructor;

declare function require(specifier: string): any;
declare const __filename: string;
declare const __dirname: string;
declare const module: {
    exports: any;
    filename: string;
    id: string;
    path: string;
    loaded: boolean;
    require(specifier: string): any;
};

interface TemplateStringsArray extends ReadonlyArray<string> {
    readonly raw: readonly string[];
}

interface String extends Iterable<string> {
    readonly length: number;
    charAt(index: number): string;
    charCodeAt(index: number): number;
    at(index: number): string | undefined;
    codePointAt(index: number): number | undefined;
    indexOf(search: string, position?: number): number;
    lastIndexOf(search: string, position?: number): number;
    localeCompare(compareString: string): number;
    includes(search: string, position?: number): boolean;
    startsWith(prefix: string, position?: number): boolean;
    endsWith(suffix: string, endPosition?: number): boolean;
    slice(start?: number, end?: number): string;
    substring(start: number, end?: number): string;
    substr(start: number, length?: number): string;
    toLocaleString(): string;
    toString(): string;
    toUpperCase(): string;
    toLowerCase(): string;
    valueOf(): string;
    normalize(form?: "NFC" | "NFD" | "NFKC" | "NFKD"): string;
    trim(): string;
    trimLeft(): string;
    trimRight(): string;
    trimStart(): string;
    trimEnd(): string;
    isWellFormed(): boolean;
    toWellFormed(): string;
    repeat(count: number): string;
    padStart(targetLength: number, padString?: string): string;
    padEnd(targetLength: number, padString?: string): string;
    replace(search: string | RegExp, replacement: string): string;
    replaceAll(search: string | RegExp, replacement: string): string;
    match(re: RegExp | string): string[] | null;
    matchAll(re: RegExp | string): string[][];
    search(re: RegExp | string): number;
    split(separator: string | RegExp, limit?: number): string[];
    concat(...strings: string[]): string;
    [n: number]: string;
    [Symbol.iterator](): IterableIterator<string>;
}
interface StringConstructor {
    (value?: any): string;
    fromCharCode(...codes: number[]): string;
    fromCodePoint(...codes: number[]): string;
    raw(strings: TemplateStringsArray, ...substitutions: any[]): string;
}
declare var String: StringConstructor;

interface Boolean {
    toLocaleString(): string;
    toString(): string;
    valueOf(): boolean;
}
interface BooleanConstructor {
    (value?: any): boolean;
}
declare var Boolean: BooleanConstructor;
interface Number {
    toLocaleString(): string;
    toString(radix?: number): string;
    toFixed(fractionDigits?: number): string;
    toExponential(fractionDigits?: number): string;
    toPrecision(precision?: number): string;
    valueOf(): number;
}
interface BigInt {
    toLocaleString(): string;
    toString(radix?: number): string;
    valueOf(): bigint;
}
interface BigIntConstructor {
    (value: string | number | boolean): bigint;
}
declare var BigInt: BigIntConstructor;
interface IArguments {}

interface Array<T> extends Iterable<T> {
    readonly length: number;
    push(...items: T[]): number;
    pop(): T | undefined;
    shift(): T | undefined;
    unshift(...items: T[]): number;
    indexOf(searchElement: T, fromIndex?: number): number;
    lastIndexOf(searchElement: T, fromIndex?: number): number;
    includes(searchElement: T, fromIndex?: number): boolean;
    at(index: number): T | undefined;
    reverse(): T[];
    toReversed(): T[];
    sort(cmp?: (a: T, b: T) => number): T[];
    toSorted(cmp?: (a: T, b: T) => number): T[];
    with(index: number, value: T): T[];
    toSpliced(start?: number, deleteCount?: number, ...items: T[]): T[];
    fill(value: T, start?: number, end?: number): T[];
    copyWithin(target: number, start: number, end?: number): T[];
    flat(depth: 0): T[];
    flat<U>(this: U[][], depth?: 1): U[];
    flat<U>(this: U[][][], depth: 2): U[];
    slice(start?: number, end?: number): T[];
    concat(...items: (T | T[])[]): T[];
    join(sep?: string): string;
    keys(): number[];
    values(): T[];
    entries(): [string, T][];
    toLocaleString(): string;
    toString(): string;
    valueOf(): T[];
    forEach(cb: (element: T, index: number, array: T[]) => void): void;
    map<U>(cb: (element: T, index: number, array: T[]) => U): U[];
    flatMap<U>(cb: (element: T, index: number, array: T[]) => U[]): U[];
    flatMap<U>(cb: (element: T, index: number, array: T[]) => U): U[];
    filter(cb: (element: T, index: number, array: T[]) => boolean): T[];
    reduce(cb: (acc: T, element: T, index: number, array: T[]) => T): T;
    reduce<U>(cb: (acc: U, element: T, index: number, array: T[]) => U, init: U): U;
    reduceRight(cb: (acc: T, element: T, index: number, array: T[]) => T): T;
    reduceRight<U>(cb: (acc: U, element: T, index: number, array: T[]) => U, init: U): U;
    find(cb: (element: T, index: number, array: T[]) => boolean): T | undefined;
    findIndex(cb: (element: T, index: number, array: T[]) => boolean): number;
    findLast(cb: (element: T, index: number, array: T[]) => boolean): T | undefined;
    findLastIndex(cb: (element: T, index: number, array: T[]) => boolean): number;
    some(cb: (element: T, index: number, array: T[]) => boolean): boolean;
    every(cb: (element: T, index: number, array: T[]) => boolean): boolean;
    [n: number]: T;
    [Symbol.iterator](): IterableIterator<T>;
}

interface ReadonlyArray<T> extends Iterable<T> {
    readonly length: number;
    indexOf(searchElement: T, fromIndex?: number): number;
    lastIndexOf(searchElement: T, fromIndex?: number): number;
    includes(searchElement: T, fromIndex?: number): boolean;
    at(index: number): T | undefined;
    toReversed(): T[];
    toSorted(cmp?: (a: T, b: T) => number): T[];
    with(index: number, value: T): T[];
    toSpliced(start?: number, deleteCount?: number, ...items: T[]): T[];
    slice(start?: number, end?: number): T[];
    concat(...items: (T | T[])[]): T[];
    join(sep?: string): string;
    keys(): number[];
    values(): T[];
    entries(): [string, T][];
    toLocaleString(): string;
    toString(): string;
    valueOf(): T[];
    forEach(cb: (element: T, index: number, array: ReadonlyArray<T>) => void): void;
    map<U>(cb: (element: T, index: number, array: ReadonlyArray<T>) => U): U[];
    filter(cb: (element: T, index: number, array: ReadonlyArray<T>) => boolean): T[];
    reduce(cb: (acc: T, element: T, index: number, array: ReadonlyArray<T>) => T): T;
    reduce<U>(cb: (acc: U, element: T, index: number, array: ReadonlyArray<T>) => U, init: U): U;
    reduceRight(cb: (acc: T, element: T, index: number, array: ReadonlyArray<T>) => T): T;
    reduceRight<U>(cb: (acc: U, element: T, index: number, array: ReadonlyArray<T>) => U, init: U): U;
    find(cb: (element: T, index: number, array: ReadonlyArray<T>) => boolean): T | undefined;
    findIndex(cb: (element: T, index: number, array: ReadonlyArray<T>) => boolean): number;
    findLast(cb: (element: T, index: number, array: ReadonlyArray<T>) => boolean): T | undefined;
    findLastIndex(cb: (element: T, index: number, array: ReadonlyArray<T>) => boolean): number;
    some(cb: (element: T, index: number, array: ReadonlyArray<T>) => boolean): boolean;
    every(cb: (element: T, index: number, array: ReadonlyArray<T>) => boolean): boolean;
    [n: number]: T;
    [Symbol.iterator](): IterableIterator<T>;
}

interface Object {
    hasOwnProperty(p: string): boolean;
    isPrototypeOf(v: any): boolean;
    propertyIsEnumerable(p: string): boolean;
    toLocaleString(): string;
    toString(): string;
    valueOf(): any;
}
type ObjectEntry<T> = [string, T];
interface ObjectConstructor {
    assign<T, U>(target: T, source: U): T & U;
    assign<T, U, V>(target: T, source1: U, source2: V): T & U & V;
    assign(target: any, ...sources: any[]): any;
    keys(o: unknown): string[];
    values(o: string): string[];
    values<T>(o: T[]): T[];
    values<T>(o: ReadonlyArray<T>): T[];
    values<T extends object>(o: T): T[keyof T][];
    values(o: unknown): any[];
    entries(o: string): ObjectEntry<string>[];
    entries<T>(o: T[]): ObjectEntry<T>[];
    entries<T>(o: ReadonlyArray<T>): ObjectEntry<T>[];
    entries<T extends object>(o: T): ObjectEntry<T[keyof T]>[];
    entries(o: unknown): ObjectEntry<any>[];
    fromEntries<T>(entries: ObjectEntry<any>[]): T;
    fromEntries<T>(entries: Map<string, any>): T;
    create(o: any, properties?: any): any;
    defineProperty<T>(o: T, p: string, attributes: any): T;
    defineProperties<T>(o: T, properties: any): T;
    getPrototypeOf(o: any): any;
    getOwnPropertyDescriptor(o: any, p: string): any;
    getOwnPropertyDescriptors(o: any): any;
    getOwnPropertyNames(o: any): string[];
    hasOwn(o: any, p: string): boolean;
    is(value1: any, value2: any): boolean;
    freeze<T>(o: T): T;
    isFrozen(o: any): boolean;
    isExtensible(o: any): boolean;
    isSealed(o: any): boolean;
    preventExtensions<T>(o: T): T;
    seal<T>(o: T): T;
    setPrototypeOf<T>(o: T, proto: any): T;
    groupBy<T>(items: T[], keyFn: (item: T, index: number) => string): unknown;
}
declare var Object: ObjectConstructor;

interface ReflectConstructor {
    apply(target: Function, thisArgument: any, argumentsList: any[]): any;
    construct(target: any, argumentsList: any[]): any;
    defineProperty(target: any, propertyKey: string, attributes: any): boolean;
    deleteProperty(target: any, propertyKey: string): boolean;
    get(target: any, propertyKey: string, receiver?: any): any;
    getPrototypeOf(target: any): any;
    getOwnPropertyDescriptor(target: any, propertyKey: string): any;
    has(target: any, propertyKey: string): boolean;
    isExtensible(target: any): boolean;
    ownKeys(target: any): string[];
    preventExtensions(target: any): boolean;
    set(target: any, propertyKey: string, value: any, receiver?: any): boolean;
    setPrototypeOf(target: any, proto: any): boolean;
}
declare var Reflect: ReflectConstructor;

interface ArrayConstructor {
    isArray(arg: unknown): arg is any[];
    from(s: string): string[];
    from<T>(arr: T[]): T[];
    from<T>(set: Set<T>): T[];
    from<T>(map: Map<string, T>): ObjectEntry<T>[];
    from<U>(s: string, mapfn: (v: string, k: number) => U): U[];
    from<T, U>(arr: T[], mapfn: (v: T, k: number) => U): U[];
    from<T, U>(set: Set<T>, mapfn: (v: T, k: number) => U): U[];
    from<T, U>(map: Map<string, T>, mapfn: (v: ObjectEntry<T>, k: number) => U): U[];
    of<T>(...items: T[]): T[];
}
declare var Array: ArrayConstructor;

interface Map<K, V> extends Iterable<[K, V]> {
    readonly size: number;
    get(key: K): V | undefined;
    set(key: K, value: V): this;
    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
    keys(): K[];
    values(): V[];
    entries(): ObjectEntry<V>[];
    forEach(cb: (value: V, key: K, map: Map<K, V>) => void): void;
    toLocaleString(): string;
    toString(): string;
    valueOf(): Map<K, V>;
    [Symbol.iterator](): IterableIterator<[K, V]>;
}
interface MapConstructor {
    new <V>(entries: ObjectEntry<V>[]): Map<string, V>;
    new <K, V>(entries: Map<K, V>): Map<K, V>;
    new <K, V>(): Map<K, V>;
    groupBy<T, K>(items: T[], callbackfn: (value: T, index: number) => K): Map<K, T[]>;
}
declare var Map: MapConstructor;

interface Set<T> extends Iterable<T> {
    readonly size: number;
    add(value: T): this;
    has(value: T): boolean;
    delete(value: T): boolean;
    clear(): void;
    keys(): T[];
    values(): T[];
    forEach(cb: (value: T, value2: T, set: Set<T>) => void): void;
    union(other: Set<T>): Set<T>;
    intersection(other: Set<T>): Set<T>;
    difference(other: Set<T>): Set<T>;
    symmetricDifference(other: Set<T>): Set<T>;
    isSubsetOf(other: Set<T>): boolean;
    isSupersetOf(other: Set<T>): boolean;
    isDisjointFrom(other: Set<T>): boolean;
    toLocaleString(): string;
    toString(): string;
    valueOf(): Set<T>;
    [Symbol.iterator](): IterableIterator<T>;
}
interface SetConstructor {
    new <T>(values: T[]): Set<T>;
    new <T>(values: Set<T>): Set<T>;
    new <T>(): Set<T>;
}
declare var Set: SetConstructor;

interface WeakMap<K extends object, V> {
    get(key: K): V | undefined;
    set(key: K, value: V): this;
    has(key: K): boolean;
    delete(key: K): boolean;
    toLocaleString(): string;
    toString(): string;
    valueOf(): WeakMap<K, V>;
}
interface WeakMapConstructor {
    new <K extends object, V>(): WeakMap<K, V>;
}
declare var WeakMap: WeakMapConstructor;

interface WeakSet<T extends object> {
    add(value: T): this;
    has(value: T): boolean;
    delete(value: T): boolean;
    toLocaleString(): string;
    toString(): string;
    valueOf(): WeakSet<T>;
}
interface WeakSetConstructor {
    new <T extends object>(): WeakSet<T>;
}
declare var WeakSet: WeakSetConstructor;

interface WeakRef<T extends object> {
    deref(): T | undefined;
    toLocaleString(): string;
    toString(): string;
    valueOf(): WeakRef<T>;
}
interface WeakRefConstructor {
    new <T extends object>(target: T): WeakRef<T>;
}
declare var WeakRef: WeakRefConstructor;

interface FinalizationRegistry<T> {
    register(target: object, heldValue: T, unregisterToken?: object): void;
    unregister(unregisterToken: object): boolean;
    toLocaleString(): string;
    toString(): string;
    valueOf(): FinalizationRegistry<T>;
}
interface FinalizationRegistryConstructor {
    new <T>(cleanupCallback: (heldValue: T) => void): FinalizationRegistry<T>;
}
declare var FinalizationRegistry: FinalizationRegistryConstructor;
interface Function {}
interface CallableFunction extends Function {}
interface NewableFunction extends Function {}
interface RegExp {
    exec(s: string): string[] | null;
    test(s: string): boolean;
    toLocaleString(): string;
    toString(): string;
    valueOf(): RegExp;
    readonly source: string;
    readonly flags: string;
    readonly global: boolean;
    readonly hasIndices: boolean;
    readonly ignoreCase: boolean;
    readonly multiline: boolean;
    readonly dotAll: boolean;
    readonly sticky: boolean;
    readonly unicode: boolean;
}
interface RegExpConstructor {
    new(pattern: string, flags?: string): RegExp;
    (pattern: string, flags?: string): RegExp;
    escape(text: string): string;
}
declare var RegExp: RegExpConstructor;

interface Error {
    name: string;
    message: string;
    toString(): string;
    toLocaleString(): string;
    valueOf(): Error;
}
interface ErrorConstructor {
    new (message?: string): Error;
    (message?: string): Error;
}
declare var Error: ErrorConstructor;
interface TypeError extends Error {}
interface TypeErrorConstructor {
    new (message?: string): TypeError;
    (message?: string): TypeError;
}
declare var TypeError: TypeErrorConstructor;
interface RangeError extends Error {}
interface RangeErrorConstructor {
    new (message?: string): RangeError;
    (message?: string): RangeError;
}
declare var RangeError: RangeErrorConstructor;
interface SyntaxError extends Error {}
interface SyntaxErrorConstructor {
    new (message?: string): SyntaxError;
    (message?: string): SyntaxError;
}
declare var SyntaxError: SyntaxErrorConstructor;
interface ReferenceError extends Error {}
interface ReferenceErrorConstructor {
    new (message?: string): ReferenceError;
    (message?: string): ReferenceError;
}
declare var ReferenceError: ReferenceErrorConstructor;
interface EvalError extends Error {}
interface EvalErrorConstructor {
    new (message?: string): EvalError;
    (message?: string): EvalError;
}
declare var EvalError: EvalErrorConstructor;
interface URIError extends Error {}
interface URIErrorConstructor {
    new (message?: string): URIError;
    (message?: string): URIError;
}
declare var URIError: URIErrorConstructor;
interface AggregateError extends Error {
    errors: any[];
}
interface AggregateErrorConstructor {
    new(errors: any[], message?: string): AggregateError;
    (errors: any[], message?: string): AggregateError;
}
declare var AggregateError: AggregateErrorConstructor;

interface Console {
    log(...data: unknown[]): void;
    error(...data: unknown[]): void;
    warn(...data: unknown[]): void;
    info(...data: unknown[]): void;
}
declare const console: Console;

interface ProcessEnv {
    [key: string]: string | undefined;
}
interface ProcessMemoryUsage {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
}
interface ProcessHrtime {
    (time?: number[]): number[];
    bigint(): bigint;
}
interface ProcessWritableStream {
    write(chunk: string | Buffer): boolean;
}
interface Process {
    readonly platform: string;
    readonly arch: string;
    readonly pid: number;
    readonly ppid: number;
    readonly version: string;
    readonly versions: any;
    readonly release: any;
    readonly features: any;
    readonly title: string;
    argv: string[];
    argv0: string;
    execPath: string;
    execArgv: string[];
    env: ProcessEnv;
    readonly stdout: ProcessWritableStream;
    readonly stderr: ProcessWritableStream;
    exit(code?: number): never;
    cwd(): string;
    chdir(directory: string): void;
    uptime(): number;
    hrtime: ProcessHrtime;
    nextTick(callback: () => void): void;
    nextTick<A>(callback: (arg: A) => void, arg: A): void;
    nextTick<A, B>(callback: (arg1: A, arg2: B) => void, arg1: A, arg2: B): void;
    nextTick<A, B, C>(callback: (arg1: A, arg2: B, arg3: C) => void, arg1: A, arg2: B, arg3: C): void;
    getuid(): number;
    getgid(): number;
    geteuid(): number;
    getegid(): number;
    getgroups(): number[];
    umask(mask?: number): number;
    memoryUsage(): any;
    cpuUsage(): any;
    resourceUsage(): any;
    kill(pid: number, signal?: 0 | 9 | 15 | "SIGTERM" | "SIGKILL"): boolean;
}
declare const process: Process;

declare function parseInt(value: any, radix?: number): number;
declare function parseFloat(value: any): number;
declare function isNaN(value: any): boolean;
declare function isFinite(value: any): boolean;
declare function btoa(value: string): string;
declare function atob(value: string): string;
declare function queueMicrotask(callback: () => void): void;
declare function setTimeout(callback: () => void, delay?: number): void;
declare function setTimeout<A>(callback: (arg: A) => void, delay: number, arg: A): void;
declare function setTimeout<A, B>(callback: (arg1: A, arg2: B) => void, delay: number, arg1: A, arg2: B): void;
declare function setTimeout<A, B, C>(callback: (arg1: A, arg2: B, arg3: C) => void, delay: number, arg1: A, arg2: B, arg3: C): void;
declare function setImmediate(callback: () => void): void;
declare function setImmediate<A>(callback: (arg: A) => void, arg: A): void;
declare function setImmediate<A, B>(callback: (arg1: A, arg2: B) => void, arg1: A, arg2: B): void;
declare function setImmediate<A, B, C>(callback: (arg1: A, arg2: B, arg3: C) => void, arg1: A, arg2: B, arg3: C): void;
declare const NaN: number;
declare const Infinity: number;
declare const undefined: undefined;

interface Math {
    readonly PI: number;
    readonly E: number;
    readonly LN2: number;
    readonly LN10: number;
    readonly LOG2E: number;
    readonly LOG10E: number;
    readonly SQRT2: number;
    readonly SQRT1_2: number;
    floor(x: number): number;
    ceil(x: number): number;
    round(x: number): number;
    abs(x: number): number;
    trunc(x: number): number;
    sign(x: number): number;
    imul(x: number, y: number): number;
    clz32(x: number): number;
    fround(x: number): number;
    cbrt(x: number): number;
    sqrt(x: number): number;
    pow(x: number, y: number): number;
    hypot(...values: number[]): number;
    min(...values: number[]): number;
    max(...values: number[]): number;
    log(x: number): number;
    log1p(x: number): number;
    log2(x: number): number;
    log10(x: number): number;
    exp(x: number): number;
    expm1(x: number): number;
    sin(x: number): number;
    asin(x: number): number;
    cos(x: number): number;
    acos(x: number): number;
    tan(x: number): number;
    sinh(x: number): number;
    cosh(x: number): number;
    tanh(x: number): number;
    atan(x: number): number;
    asinh(x: number): number;
    acosh(x: number): number;
    atanh(x: number): number;
    atan2(y: number, x: number): number;
    random(): number;
}
declare const Math: Math;

interface JSON {
    stringify(value: unknown): string;
    parse(text: string): unknown;
}
declare const JSON: JSON;

interface OS {
    readonly EOL: string;
    readonly devNull: string;
    platform(): string;
    type(): string;
    release(): string;
    version(): string;
    endianness(): string;
    machine(): string;
    arch(): string;
    hostname(): string;
    tmpdir(): string;
    homedir(): string;
    cpus(): number[];
    availableParallelism(): number;
    totalmem(): number;
    freemem(): number;
    uptime(): number;
    loadavg(): number[];
    userInfo(): any;
}
declare const os: OS;
declare module "os" {
    export const EOL: string;
    export const devNull: string;
    export function platform(): string;
    export function type(): string;
    export function release(): string;
    export function version(): string;
    export function endianness(): string;
    export function machine(): string;
    export function arch(): string;
    export function hostname(): string;
    export function tmpdir(): string;
    export function homedir(): string;
    export function cpus(): number[];
    export function availableParallelism(): number;
    export function totalmem(): number;
    export function freemem(): number;
    export function uptime(): number;
    export function loadavg(): number[];
    export function userInfo(): any;
}
declare module "node:os" {
    export const EOL: string;
    export const devNull: string;
    export function platform(): string;
    export function type(): string;
    export function release(): string;
    export function version(): string;
    export function endianness(): string;
    export function machine(): string;
    export function arch(): string;
    export function hostname(): string;
    export function tmpdir(): string;
    export function homedir(): string;
    export function cpus(): number[];
    export function availableParallelism(): number;
    export function totalmem(): number;
    export function freemem(): number;
    export function uptime(): number;
    export function loadavg(): number[];
    export function userInfo(): any;
}

interface Date {
    getTime(): number;
    getFullYear(): number;
    getYear(): number;
    getMonth(): number;
    getDate(): number;
    getDay(): number;
    getHours(): number;
    getMinutes(): number;
    getSeconds(): number;
    getMilliseconds(): number;
    getTimezoneOffset(): number;
    getUTCFullYear(): number;
    getUTCMonth(): number;
    getUTCDate(): number;
    getUTCDay(): number;
    getUTCHours(): number;
    getUTCMinutes(): number;
    getUTCSeconds(): number;
    getUTCMilliseconds(): number;
    setTime(time: number): number;
    setFullYear(year: number, month?: number, date?: number): number;
    setYear(year: number): number;
    setMonth(month: number, date?: number): number;
    setDate(date: number): number;
    setHours(hours: number, minutes?: number, seconds?: number, ms?: number): number;
    setMinutes(minutes: number, seconds?: number, ms?: number): number;
    setSeconds(seconds: number, ms?: number): number;
    setMilliseconds(ms: number): number;
    setUTCFullYear(year: number, month?: number, date?: number): number;
    setUTCMonth(month: number, date?: number): number;
    setUTCDate(date: number): number;
    setUTCHours(hours: number, minutes?: number, seconds?: number, ms?: number): number;
    setUTCMinutes(minutes: number, seconds?: number, ms?: number): number;
    setUTCSeconds(seconds: number, ms?: number): number;
    setUTCMilliseconds(ms: number): number;
    valueOf(): number;
    toString(): string;
    toLocaleString(): string;
    toLocaleDateString(): string;
    toLocaleTimeString(): string;
    toDateString(): string;
    toTimeString(): string;
    toISOString(): string;
    toUTCString(): string;
    toGMTString(): string;
    toJSON(): string;
}
interface DateConstructor {
    (): string;
    new(value?: number | string | Date): Date;
    new(year: number, month: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number): Date;
    now(): number;
    parse(text: string): number;
    UTC(year: number, month: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number): number;
}
declare var Date: DateConstructor;

interface NumberConstructor {
    (value?: any): number;
    readonly EPSILON: number;
    readonly MAX_SAFE_INTEGER: number;
    readonly MAX_VALUE: number;
    readonly MIN_SAFE_INTEGER: number;
    readonly MIN_VALUE: number;
    readonly NaN: number;
    readonly NEGATIVE_INFINITY: number;
    readonly POSITIVE_INFINITY: number;
    isInteger(value: any): boolean;
    isFinite(value: any): boolean;
    isNaN(value: any): boolean;
    isSafeInteger(value: any): boolean;
    parseFloat(value: any): number;
    parseInt(value: any, radix?: number): number;
}
declare var Number: NumberConstructor;

// Phase 10 sync-core Node stdlib — globally injected (no import needed).
// Phase 4 module system will instead let users write `import * as fs from "fs"`
// and we'll resolve to these same bindings.
interface FSStats {
    readonly dev: number;
    readonly ino: number;
    readonly size: number;
    readonly mode: number;
    readonly nlink: number;
    readonly uid: number;
    readonly gid: number;
    readonly rdev: number;
    readonly blksize: number;
    readonly blocks: number;
    readonly atimeMs: number;
    readonly mtimeMs: number;
    readonly ctimeMs: number;
    readonly birthtimeMs: number;
    readonly atime: Date;
    readonly mtime: Date;
    readonly ctime: Date;
    readonly birthtime: Date;
    isFile(): boolean;
    isDirectory(): boolean;
    isSymbolicLink(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
}
interface FSDirent {
    readonly name: string;
    isFile(): boolean;
    isDirectory(): boolean;
    isSymbolicLink(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
}
interface FSStatsOptions {
    bigint?: false;
    throwIfNoEntry?: true;
}
interface FSMkdirOptions {
    recursive?: boolean;
    mode?: number;
}
interface FSRmOptions {
    recursive?: boolean;
    force?: boolean;
    maxRetries?: number;
    retryDelay?: number;
}
interface FSRmdirOptions {
    recursive?: boolean;
    maxRetries?: number;
    retryDelay?: number;
}
interface FSCpOptions {
    recursive?: boolean;
    force?: boolean;
    errorOnExist?: boolean;
    dereference?: boolean;
    verbatimSymlinks?: boolean;
    mode?: number;
    preserveTimestamps?: boolean;
}
type FSEncoding = "utf8" | "utf-8";
type FSBufferEncoding = "buffer";
interface FSEncodingOptions {
    encoding?: FSEncoding;
}
interface FSBufferEncodingOptions {
    encoding: FSBufferEncoding | null;
}
type FSReadFileFlag = "r" | "rs" | "r+" | "rs+";
interface FSReadFileOptions extends FSEncodingOptions {
    flag?: FSReadFileFlag;
}
interface FSReadFileBufferObjectOptions extends FSBufferEncodingOptions {
    flag?: FSReadFileFlag;
}
type FSReadFileBufferOptions = FSBufferEncoding | null | FSReadFileBufferObjectOptions;
type FSWriteFileFlag = "w" | "wx" | "w+" | "wx+" | "a" | "ax" | "a+" | "ax+" | "as" | "as+" | "r+" | "rs+";
interface FSWriteFileOptions extends FSEncodingOptions {
    flag?: FSWriteFileFlag;
    mode?: number;
    flush?: boolean;
}
type FSAppendFileFlag = "a" | "ax" | "a+" | "ax+" | "as" | "as+";
interface FSAppendFileOptions extends FSEncodingOptions {
    flag?: FSAppendFileFlag;
    mode?: number;
    flush?: boolean;
}
interface FSReaddirOptions extends FSEncodingOptions {
    recursive?: boolean;
    withFileTypes?: false;
}
interface FSReaddirBufferOptions extends FSBufferEncodingOptions {
    recursive?: boolean;
    withFileTypes?: false;
}
interface FSReaddirDirentOptions extends FSEncodingOptions {
    withFileTypes: true;
}
type FSFileEncodingOptions = FSEncoding | FSEncodingOptions;
type FSFileBufferEncodingOptions = FSBufferEncoding | FSBufferEncodingOptions;
type FSPathLike = string | Buffer | URL;
type FSFileTime = number | Date;
type FSSymlinkType = "file" | "dir" | "junction";
interface FSConstants {
    readonly F_OK: number;
    readonly R_OK: number;
    readonly W_OK: number;
    readonly X_OK: number;
    readonly COPYFILE_EXCL: number;
    readonly COPYFILE_FICLONE: number;
    readonly COPYFILE_FICLONE_FORCE: number;
}
interface FS {
    readonly constants: FSConstants;
    readFileSync(path: FSPathLike, options: FSReadFileBufferOptions): Buffer;
    readFileSync(path: FSPathLike, options?: FSFileEncodingOptions | FSReadFileOptions): string;
    writeFileSync(path: FSPathLike, data: string | Buffer, options?: FSFileEncodingOptions | FSWriteFileOptions): void;
    appendFileSync(path: FSPathLike, data: string | Buffer, options?: FSFileEncodingOptions | FSAppendFileOptions): void;
    existsSync(path: FSPathLike): boolean;
    accessSync(path: FSPathLike, mode?: number): void;
    readdirSync(path: FSPathLike, options: FSBufferEncoding | FSReaddirBufferOptions): Buffer[];
    readdirSync(path: FSPathLike, options: FSReaddirDirentOptions): FSDirent[];
    readdirSync(path: FSPathLike, options?: FSFileEncodingOptions | FSReaddirOptions): string[];
    statSync(path: FSPathLike, options?: FSStatsOptions): FSStats;
    lstatSync(path: FSPathLike, options?: FSStatsOptions): FSStats;
    realpathSync(path: FSPathLike, options: FSFileBufferEncodingOptions): Buffer;
    realpathSync(path: FSPathLike, options?: FSFileEncodingOptions): string;
    readlinkSync(path: FSPathLike, options: FSFileBufferEncodingOptions): Buffer;
    readlinkSync(path: FSPathLike, options?: FSFileEncodingOptions): string;
    symlinkSync(target: FSPathLike, path: FSPathLike, type?: FSSymlinkType): void;
    linkSync(existingPath: FSPathLike, newPath: FSPathLike): void;
    mkdtempSync(prefix: FSPathLike, options: FSFileBufferEncodingOptions): Buffer;
    mkdtempSync(prefix: FSPathLike, options?: FSFileEncodingOptions): string;
    truncateSync(path: FSPathLike, len?: number): void;
    utimesSync(path: FSPathLike, atime: FSFileTime, mtime: FSFileTime): void;
    lutimesSync(path: FSPathLike, atime: FSFileTime, mtime: FSFileTime): void;
    chownSync(path: FSPathLike, uid: number, gid: number): void;
    lchownSync(path: FSPathLike, uid: number, gid: number): void;
    chmodSync(path: FSPathLike, mode: number): void;
    mkdirSync(path: FSPathLike, options?: number | FSMkdirOptions): void;
    unlinkSync(path: FSPathLike): void;
    rmSync(path: FSPathLike, options?: FSRmOptions): void;
    rmdirSync(path: FSPathLike, options?: FSRmdirOptions): void;
    cpSync(src: FSPathLike, dest: FSPathLike, options?: FSCpOptions): void;
    copyFileSync(src: FSPathLike, dest: FSPathLike, mode?: number): void;
    renameSync(oldPath: FSPathLike, newPath: FSPathLike): void;
    promises: FSPromises;
}
interface FSPromises {
    readFile(path: FSPathLike, options: FSReadFileBufferOptions): Promise<Buffer>;
    readFile(path: FSPathLike, options?: FSFileEncodingOptions | FSReadFileOptions): Promise<string>;
    writeFile(path: FSPathLike, data: string | Buffer, options?: FSFileEncodingOptions | FSWriteFileOptions): Promise<void>;
    appendFile(path: FSPathLike, data: string | Buffer, options?: FSFileEncodingOptions | FSAppendFileOptions): Promise<void>;
    readdir(path: FSPathLike, options: FSBufferEncoding | FSReaddirBufferOptions): Promise<Buffer[]>;
    readdir(path: FSPathLike, options: FSReaddirDirentOptions): Promise<FSDirent[]>;
    readdir(path: FSPathLike, options?: FSFileEncodingOptions | FSReaddirOptions): Promise<string[]>;
    stat(path: FSPathLike, options?: FSStatsOptions): Promise<FSStats>;
    lstat(path: FSPathLike, options?: FSStatsOptions): Promise<FSStats>;
    realpath(path: FSPathLike, options: FSFileBufferEncodingOptions): Promise<Buffer>;
    realpath(path: FSPathLike, options?: FSFileEncodingOptions): Promise<string>;
    readlink(path: FSPathLike, options: FSFileBufferEncodingOptions): Promise<Buffer>;
    readlink(path: FSPathLike, options?: FSFileEncodingOptions): Promise<string>;
    symlink(target: FSPathLike, path: FSPathLike, type?: FSSymlinkType): Promise<void>;
    link(existingPath: FSPathLike, newPath: FSPathLike): Promise<void>;
    mkdtemp(prefix: FSPathLike, options: FSFileBufferEncodingOptions): Promise<Buffer>;
    mkdtemp(prefix: FSPathLike, options?: FSFileEncodingOptions): Promise<string>;
    truncate(path: FSPathLike, len?: number): Promise<void>;
    utimes(path: FSPathLike, atime: FSFileTime, mtime: FSFileTime): Promise<void>;
    lutimes(path: FSPathLike, atime: FSFileTime, mtime: FSFileTime): Promise<void>;
    chown(path: FSPathLike, uid: number, gid: number): Promise<void>;
    lchown(path: FSPathLike, uid: number, gid: number): Promise<void>;
    chmod(path: FSPathLike, mode: number): Promise<void>;
    access(path: FSPathLike, mode?: number): Promise<void>;
    mkdir(path: FSPathLike, options?: number | FSMkdirOptions): Promise<void>;
    unlink(path: FSPathLike): Promise<void>;
    rm(path: FSPathLike, options?: FSRmOptions): Promise<void>;
    rmdir(path: FSPathLike, options?: FSRmdirOptions): Promise<void>;
    cp(src: FSPathLike, dest: FSPathLike, options?: FSCpOptions): Promise<void>;
    copyFile(src: FSPathLike, dest: FSPathLike, mode?: number): Promise<void>;
    rename(oldPath: FSPathLike, newPath: FSPathLike): Promise<void>;
}
declare const fs: FS;
declare module "fs" {
    export const constants: FSConstants;
    export const promises: FSPromises;
    export function readFileSync(path: FSPathLike, options: FSReadFileBufferOptions): Buffer;
    export function readFileSync(path: FSPathLike, options?: FSFileEncodingOptions | FSReadFileOptions): string;
    export function writeFileSync(path: FSPathLike, data: string | Buffer, options?: FSFileEncodingOptions | FSWriteFileOptions): void;
    export function appendFileSync(path: FSPathLike, data: string | Buffer, options?: FSFileEncodingOptions | FSAppendFileOptions): void;
    export function existsSync(path: FSPathLike): boolean;
    export function accessSync(path: FSPathLike, mode?: number): void;
    export function readdirSync(path: FSPathLike, options: FSBufferEncoding | FSReaddirBufferOptions): Buffer[];
    export function readdirSync(path: FSPathLike, options: FSReaddirDirentOptions): FSDirent[];
    export function readdirSync(path: FSPathLike, options?: FSFileEncodingOptions | FSReaddirOptions): string[];
    export function statSync(path: FSPathLike, options?: FSStatsOptions): FSStats;
    export function lstatSync(path: FSPathLike, options?: FSStatsOptions): FSStats;
    export function realpathSync(path: FSPathLike, options: FSFileBufferEncodingOptions): Buffer;
    export function realpathSync(path: FSPathLike, options?: FSFileEncodingOptions): string;
    export function readlinkSync(path: FSPathLike, options: FSFileBufferEncodingOptions): Buffer;
    export function readlinkSync(path: FSPathLike, options?: FSFileEncodingOptions): string;
    export function symlinkSync(target: FSPathLike, path: FSPathLike, type?: FSSymlinkType): void;
    export function linkSync(existingPath: FSPathLike, newPath: FSPathLike): void;
    export function mkdtempSync(prefix: FSPathLike, options: FSFileBufferEncodingOptions): Buffer;
    export function mkdtempSync(prefix: FSPathLike, options?: FSFileEncodingOptions): string;
    export function truncateSync(path: FSPathLike, len?: number): void;
    export function utimesSync(path: FSPathLike, atime: FSFileTime, mtime: FSFileTime): void;
    export function lutimesSync(path: FSPathLike, atime: FSFileTime, mtime: FSFileTime): void;
    export function chownSync(path: FSPathLike, uid: number, gid: number): void;
    export function lchownSync(path: FSPathLike, uid: number, gid: number): void;
    export function chmodSync(path: FSPathLike, mode: number): void;
    export function mkdirSync(path: FSPathLike, options?: number | FSMkdirOptions): void;
    export function unlinkSync(path: FSPathLike): void;
    export function rmSync(path: FSPathLike, options?: FSRmOptions): void;
    export function rmdirSync(path: FSPathLike, options?: FSRmdirOptions): void;
    export function cpSync(src: FSPathLike, dest: FSPathLike, options?: FSCpOptions): void;
    export function copyFileSync(src: FSPathLike, dest: FSPathLike, mode?: number): void;
    export function renameSync(oldPath: FSPathLike, newPath: FSPathLike): void;
}
declare module "node:fs" {
    export const constants: FSConstants;
    export const promises: FSPromises;
    export function readFileSync(path: FSPathLike, options: FSReadFileBufferOptions): Buffer;
    export function readFileSync(path: FSPathLike, options?: FSFileEncodingOptions | FSReadFileOptions): string;
    export function writeFileSync(path: FSPathLike, data: string | Buffer, options?: FSFileEncodingOptions | FSWriteFileOptions): void;
    export function appendFileSync(path: FSPathLike, data: string | Buffer, options?: FSFileEncodingOptions | FSAppendFileOptions): void;
    export function existsSync(path: FSPathLike): boolean;
    export function accessSync(path: FSPathLike, mode?: number): void;
    export function readdirSync(path: FSPathLike, options: FSBufferEncoding | FSReaddirBufferOptions): Buffer[];
    export function readdirSync(path: FSPathLike, options: FSReaddirDirentOptions): FSDirent[];
    export function readdirSync(path: FSPathLike, options?: FSFileEncodingOptions | FSReaddirOptions): string[];
    export function statSync(path: FSPathLike, options?: FSStatsOptions): FSStats;
    export function lstatSync(path: FSPathLike, options?: FSStatsOptions): FSStats;
    export function realpathSync(path: FSPathLike, options: FSFileBufferEncodingOptions): Buffer;
    export function realpathSync(path: FSPathLike, options?: FSFileEncodingOptions): string;
    export function readlinkSync(path: FSPathLike, options: FSFileBufferEncodingOptions): Buffer;
    export function readlinkSync(path: FSPathLike, options?: FSFileEncodingOptions): string;
    export function symlinkSync(target: FSPathLike, path: FSPathLike, type?: FSSymlinkType): void;
    export function linkSync(existingPath: FSPathLike, newPath: FSPathLike): void;
    export function mkdtempSync(prefix: FSPathLike, options: FSFileBufferEncodingOptions): Buffer;
    export function mkdtempSync(prefix: FSPathLike, options?: FSFileEncodingOptions): string;
    export function truncateSync(path: FSPathLike, len?: number): void;
    export function utimesSync(path: FSPathLike, atime: FSFileTime, mtime: FSFileTime): void;
    export function lutimesSync(path: FSPathLike, atime: FSFileTime, mtime: FSFileTime): void;
    export function chownSync(path: FSPathLike, uid: number, gid: number): void;
    export function lchownSync(path: FSPathLike, uid: number, gid: number): void;
    export function chmodSync(path: FSPathLike, mode: number): void;
    export function mkdirSync(path: FSPathLike, options?: number | FSMkdirOptions): void;
    export function unlinkSync(path: FSPathLike): void;
    export function rmSync(path: FSPathLike, options?: FSRmOptions): void;
    export function rmdirSync(path: FSPathLike, options?: FSRmdirOptions): void;
    export function cpSync(src: FSPathLike, dest: FSPathLike, options?: FSCpOptions): void;
    export function copyFileSync(src: FSPathLike, dest: FSPathLike, mode?: number): void;
    export function renameSync(oldPath: FSPathLike, newPath: FSPathLike): void;
}

interface Path {
    readonly sep: string;
    readonly delimiter: string;
    readonly posix: Path;
    join(...parts: string[]): string;
    resolve(...parts: string[]): string;
    normalize(p: string): string;
    isAbsolute(p: string): boolean;
    relative(from: string, to: string): string;
    toNamespacedPath(p: string): string;
    basename(p: string, suffix?: string): string;
    dirname(p: string): string;
    extname(p: string): string;
    parse(p: string): any;
    format(pathObject: any): string;
}
declare const path: Path;
declare module "path" {
    export const sep: string;
    export const delimiter: string;
    export const posix: Path;
    export function join(...parts: string[]): string;
    export function resolve(...parts: string[]): string;
    export function normalize(p: string): string;
    export function isAbsolute(p: string): boolean;
    export function relative(from: string, to: string): string;
    export function toNamespacedPath(p: string): string;
    export function basename(p: string, suffix?: string): string;
    export function dirname(p: string): string;
    export function extname(p: string): string;
    export function parse(p: string): any;
    export function format(pathObject: any): string;
}
declare module "node:path" {
    export const sep: string;
    export const delimiter: string;
    export const posix: Path;
    export function join(...parts: string[]): string;
    export function resolve(...parts: string[]): string;
    export function normalize(p: string): string;
    export function isAbsolute(p: string): boolean;
    export function relative(from: string, to: string): string;
    export function toNamespacedPath(p: string): string;
    export function basename(p: string, suffix?: string): string;
    export function dirname(p: string): string;
    export function extname(p: string): string;
    export function parse(p: string): any;
    export function format(pathObject: any): string;
}

type CryptoHashAlgorithm = "sha1" | "sha256" | "sha512";
interface CryptoHash {
    update(data: string | Buffer): CryptoHash;
    digest(encoding: "hex" | "base64"): string;
}
interface Crypto {
    createHash(algorithm: CryptoHashAlgorithm): CryptoHash;
    randomBytes(size: number): Buffer;
    randomUUID(): string;
}
declare const crypto: Crypto;
declare module "crypto" {
    export function createHash(algorithm: CryptoHashAlgorithm): CryptoHash;
    export function randomBytes(size: number): Buffer;
    export function randomUUID(): string;
}
declare module "node:crypto" {
    export function createHash(algorithm: CryptoHashAlgorithm): CryptoHash;
    export function randomBytes(size: number): Buffer;
    export function randomUUID(): string;
}

type BufferEncoding = "utf8" | "utf-8" | "hex" | "base64";
interface Buffer {
    readonly length: number;
    toLocaleString(): string;
    toJSON(): any;
    toString(encoding?: BufferEncoding): string;
    valueOf(): Buffer;
    slice(start?: number, end?: number): Buffer;
    subarray(start?: number, end?: number): Buffer;
    fill(value: number, start?: number, end?: number): Buffer;
    write(string: string, offset?: number, length?: number, encoding?: BufferEncoding): number;
    readUInt8(offset?: number): number;
    writeUInt8(value: number, offset?: number): number;
    readInt8(offset?: number): number;
    writeInt8(value: number, offset?: number): number;
    readUInt16LE(offset?: number): number;
    readUInt16BE(offset?: number): number;
    writeUInt16LE(value: number, offset?: number): number;
    writeUInt16BE(value: number, offset?: number): number;
    readInt16LE(offset?: number): number;
    readInt16BE(offset?: number): number;
    writeInt16LE(value: number, offset?: number): number;
    writeInt16BE(value: number, offset?: number): number;
    readUInt32LE(offset?: number): number;
    readUInt32BE(offset?: number): number;
    writeUInt32LE(value: number, offset?: number): number;
    writeUInt32BE(value: number, offset?: number): number;
    readInt32LE(offset?: number): number;
    readInt32BE(offset?: number): number;
    writeInt32LE(value: number, offset?: number): number;
    writeInt32BE(value: number, offset?: number): number;
    readFloatLE(offset?: number): number;
    readFloatBE(offset?: number): number;
    writeFloatLE(value: number, offset?: number): number;
    writeFloatBE(value: number, offset?: number): number;
    readDoubleLE(offset?: number): number;
    readDoubleBE(offset?: number): number;
    writeDoubleLE(value: number, offset?: number): number;
    writeDoubleBE(value: number, offset?: number): number;
    swap16(): Buffer;
    swap32(): Buffer;
    swap64(): Buffer;
    copy(target: Buffer, targetStart?: number, sourceStart?: number, sourceEnd?: number): number;
    indexOf(value: number | string | Buffer, byteOffset?: number): number;
    lastIndexOf(value: number | string | Buffer, byteOffset?: number): number;
    includes(value: number | string | Buffer, byteOffset?: number): boolean;
    equals(other: Buffer): boolean;
    compare(other: Buffer): number;
    [n: number]: number;
}
interface BufferConstructor {
    from(data: string, encoding?: BufferEncoding): Buffer;
    from(data: number[]): Buffer;
    from(data: Buffer): Buffer;
    alloc(size: number, fill?: number): Buffer;
    allocUnsafe(size: number): Buffer;
    allocUnsafeSlow(size: number): Buffer;
    concat(list: Buffer[], totalLength?: number): Buffer;
    isBuffer(value: unknown): boolean;
    byteLength(value: string | Buffer, encoding?: BufferEncoding): number;
    isEncoding(encoding: string): boolean;
    compare(a: Buffer, b: Buffer): number;
}
declare var Buffer: BufferConstructor;

interface Event {
    readonly type: string;
    readonly target: EventTarget;
    readonly currentTarget: EventTarget;
    readonly defaultPrevented: boolean;
    readonly cancelable: boolean;
    preventDefault(): void;
}
interface EventInit {
    cancelable?: boolean;
}
interface EventConstructor {
    new(type: string, eventInitDict?: EventInit): Event;
}
declare var Event: EventConstructor;

interface EventTarget {
    addEventListener(type: string, listener: (event: Event) => void, options?: boolean | AddEventListenerOptions): void;
    removeEventListener(type: string, listener: (event: Event) => void, options?: boolean | EventListenerOptions): void;
    dispatchEvent(event: Event): boolean;
}
interface EventTargetConstructor {
    new(): EventTarget;
}
declare var EventTarget: EventTargetConstructor;

interface EventListenerOptions {
    capture?: boolean;
}
interface AddEventListenerOptions extends EventListenerOptions {
    once?: boolean;
    passive?: boolean;
}

interface EventEmitter {
    on(eventName: string, listener: (...args: any[]) => void): this;
    addListener(eventName: string, listener: (...args: any[]) => void): this;
    prependListener(eventName: string, listener: (...args: any[]) => void): this;
    once(eventName: string, listener: (...args: any[]) => void): this;
    prependOnceListener(eventName: string, listener: (...args: any[]) => void): this;
    off(eventName: string, listener: (...args: any[]) => void): this;
    removeListener(eventName: string, listener: (...args: any[]) => void): this;
    removeAllListeners(eventName?: string): this;
    emit(eventName: string, ...args: any[]): boolean;
    listenerCount(eventName: string, listener?: (...args: any[]) => void): number;
    listeners(eventName: string): any[];
    rawListeners(eventName: string): any[];
    eventNames(): string[];
    setMaxListeners(n: number): this;
    getMaxListeners(): number;
}
interface EventEmitterConstructor {
    new(): EventEmitter;
    defaultMaxListeners: number;
    listenerCount(emitter: EventEmitter, eventName: string, listener?: (...args: any[]) => void): number;
}
declare var EventEmitter: EventEmitterConstructor;
declare module "events" {
    export const EventEmitter: EventEmitterConstructor;
    export let defaultMaxListeners: number;
    export function listenerCount(emitter: EventEmitter, eventName: string, listener?: (...args: any[]) => void): number;
    export function getEventListeners(emitter: EventEmitter, eventName: string): any[];
    export function once(emitter: EventEmitter, eventName: string): Promise<any[]>;
    export function setMaxListeners(n: number, emitter: EventEmitter): void;
    export function getMaxListeners(emitter: EventEmitter): number;
}
declare module "node:events" {
    export const EventEmitter: EventEmitterConstructor;
    export let defaultMaxListeners: number;
    export function listenerCount(emitter: EventEmitter, eventName: string, listener?: (...args: any[]) => void): number;
    export function getEventListeners(emitter: EventEmitter, eventName: string): any[];
    export function once(emitter: EventEmitter, eventName: string): Promise<any[]>;
    export function setMaxListeners(n: number, emitter: EventEmitter): void;
    export function getMaxListeners(emitter: EventEmitter): number;
}

type DnsLookupCallback = (err: any, address: string, family: number) => void;
type DnsLookupAllCallback = (err: any, addresses: any[]) => void;
type DnsLookupFamily = 0 | 4 | 6;
interface DnsLookupOptions {
    family?: DnsLookupFamily;
    all?: boolean;
    hints?: number;
    verbatim?: boolean;
    order?: "verbatim" | "ipv4first" | "ipv6first";
}
interface DnsPromises {
    lookup(hostname: string): Promise<any>;
    lookup(hostname: string, options: DnsLookupOptions | DnsLookupFamily): Promise<any>;
}
interface DNS {
    readonly ADDRCONFIG: number;
    readonly V4MAPPED: number;
    readonly ALL: number;
    promises: DnsPromises;
    lookup(hostname: string, callback: DnsLookupCallback): void;
    lookup(hostname: string, options: DnsLookupOptions | DnsLookupFamily, callback: DnsLookupCallback): void;
    lookup(hostname: string, options: DnsLookupOptions | DnsLookupFamily, callback: DnsLookupAllCallback): void;
}
declare const dns: DNS;
declare module "dns" {
    export const ADDRCONFIG: number;
    export const V4MAPPED: number;
    export const ALL: number;
    export const promises: DnsPromises;
    export function lookup(hostname: string, callback: DnsLookupCallback): void;
    export function lookup(hostname: string, options: DnsLookupOptions | DnsLookupFamily, callback: DnsLookupCallback): void;
    export function lookup(hostname: string, options: DnsLookupOptions | DnsLookupFamily, callback: DnsLookupAllCallback): void;
}
declare module "node:dns" {
    export const ADDRCONFIG: number;
    export const V4MAPPED: number;
    export const ALL: number;
    export const promises: DnsPromises;
    export function lookup(hostname: string, callback: DnsLookupCallback): void;
    export function lookup(hostname: string, options: DnsLookupOptions | DnsLookupFamily, callback: DnsLookupCallback): void;
    export function lookup(hostname: string, options: DnsLookupOptions | DnsLookupFamily, callback: DnsLookupAllCallback): void;
}

interface Net {
    isIP(input: string): number;
    isIPv4(input: string): boolean;
    isIPv6(input: string): boolean;
}
declare const net: Net;
declare module "net" {
    export function isIP(input: string): number;
    export function isIPv4(input: string): boolean;
    export function isIPv6(input: string): boolean;
}
declare module "node:net" {
    export function isIP(input: string): number;
    export function isIPv4(input: string): boolean;
    export function isIPv6(input: string): boolean;
}

type ChildProcessExecCallback = (error: any, stdout: string, stderr: string) => void;
type ChildProcessSpawnSyncStdioValue = "pipe" | "ignore" | "inherit" | number | null | undefined;
type ChildProcessSpawnSyncStdio = ChildProcessSpawnSyncStdioValue | [ChildProcessSpawnSyncStdioValue, ChildProcessSpawnSyncStdioValue, ChildProcessSpawnSyncStdioValue];
interface ChildProcessExecOptions {
    cwd?: string;
    env?: any;
    encoding?: "utf8" | "utf-8";
    shell?: string;
    windowsHide?: boolean;
    uid?: number;
    gid?: number;
    maxBuffer?: number;
    timeout?: number;
    killSignal?: "SIGTERM" | "SIGKILL" | 9 | 15;
}
interface ChildProcessExecFileOptions {
    cwd?: string;
    env?: any;
    encoding?: "utf8" | "utf-8";
    shell?: boolean | string;
    argv0?: string;
    windowsHide?: boolean;
    windowsVerbatimArguments?: boolean;
    uid?: number;
    gid?: number;
    maxBuffer?: number;
    timeout?: number;
    killSignal?: "SIGTERM" | "SIGKILL" | 9 | 15;
}
interface ChildProcessSpawnSyncUtf8Options {
    encoding: "utf8" | "utf-8";
    cwd?: string;
    input?: string;
    env?: any;
    shell?: boolean | string;
    stdio?: ChildProcessSpawnSyncStdio;
    argv0?: string;
    detached?: boolean;
    windowsHide?: boolean;
    windowsVerbatimArguments?: boolean;
    uid?: number;
    gid?: number;
    maxBuffer?: number;
    timeout?: number;
    killSignal?: "SIGTERM" | "SIGKILL" | 9 | 15;
}
interface ChildProcessExecFileSyncOptions {
    cwd?: string;
    input?: string;
    env?: any;
    shell?: boolean | string;
    argv0?: string;
    windowsHide?: boolean;
    windowsVerbatimArguments?: boolean;
    uid?: number;
    gid?: number;
    maxBuffer?: number;
    timeout?: number;
    killSignal?: "SIGTERM" | "SIGKILL" | 9 | 15;
}
interface ChildProcessExecFileSyncStringOptions extends ChildProcessExecFileSyncOptions {
    encoding: "utf8" | "utf-8";
}
interface ChildProcessExecFileSyncBufferOptions extends ChildProcessExecFileSyncOptions {
    encoding: "buffer";
}
interface ChildProcessExecSyncOptions {
    cwd?: string;
    input?: string;
    env?: any;
    shell?: string;
    windowsHide?: boolean;
    uid?: number;
    gid?: number;
    maxBuffer?: number;
    timeout?: number;
    killSignal?: "SIGTERM" | "SIGKILL" | 9 | 15;
}
interface ChildProcessExecSyncStringOptions extends ChildProcessExecSyncOptions {
    encoding: "utf8" | "utf-8";
}
interface ChildProcessExecSyncBufferOptions extends ChildProcessExecSyncOptions {
    encoding: "buffer";
}
declare module "child_process" {
    export function exec(command: string, callback: ChildProcessExecCallback): void;
    export function exec(command: string, options: ChildProcessExecOptions, callback: ChildProcessExecCallback): void;
    export function execFile(file: string, callback: ChildProcessExecCallback): void;
    export function execFile(file: string, options: ChildProcessExecFileOptions, callback: ChildProcessExecCallback): void;
    export function execFile(file: string, args: string[], callback: ChildProcessExecCallback): void;
    export function execFile(file: string, args: string[], options: ChildProcessExecFileOptions, callback: ChildProcessExecCallback): void;
    export function execSync(command: string, options: ChildProcessExecSyncStringOptions): string;
    export function execSync(command: string, options: ChildProcessExecSyncBufferOptions): Buffer;
    export function execSync(command: string, options?: ChildProcessExecSyncOptions): Buffer;
    export function execFileSync(file: string, options: ChildProcessExecFileSyncStringOptions): string;
    export function execFileSync(file: string, options: ChildProcessExecFileSyncBufferOptions): Buffer;
    export function execFileSync(file: string, options: ChildProcessExecFileSyncOptions): Buffer;
    export function execFileSync(file: string, args: string[], options: ChildProcessExecFileSyncStringOptions): string;
    export function execFileSync(file: string, args: string[], options: ChildProcessExecFileSyncBufferOptions): Buffer;
    export function execFileSync(file: string, args?: string[], options?: ChildProcessExecFileSyncOptions): Buffer;
    export function spawnSync(file: string, options: ChildProcessSpawnSyncUtf8Options): any;
    export function spawnSync(file: string, args: string[], options: ChildProcessSpawnSyncUtf8Options): any;
}
declare module "node:child_process" {
    export function exec(command: string, callback: ChildProcessExecCallback): void;
    export function exec(command: string, options: ChildProcessExecOptions, callback: ChildProcessExecCallback): void;
    export function execFile(file: string, callback: ChildProcessExecCallback): void;
    export function execFile(file: string, options: ChildProcessExecFileOptions, callback: ChildProcessExecCallback): void;
    export function execFile(file: string, args: string[], callback: ChildProcessExecCallback): void;
    export function execFile(file: string, args: string[], options: ChildProcessExecFileOptions, callback: ChildProcessExecCallback): void;
    export function execSync(command: string, options: ChildProcessExecSyncStringOptions): string;
    export function execSync(command: string, options: ChildProcessExecSyncBufferOptions): Buffer;
    export function execSync(command: string, options?: ChildProcessExecSyncOptions): Buffer;
    export function execFileSync(file: string, options: ChildProcessExecFileSyncStringOptions): string;
    export function execFileSync(file: string, options: ChildProcessExecFileSyncBufferOptions): Buffer;
    export function execFileSync(file: string, options: ChildProcessExecFileSyncOptions): Buffer;
    export function execFileSync(file: string, args: string[], options: ChildProcessExecFileSyncStringOptions): string;
    export function execFileSync(file: string, args: string[], options: ChildProcessExecFileSyncBufferOptions): Buffer;
    export function execFileSync(file: string, args?: string[], options?: ChildProcessExecFileSyncOptions): Buffer;
    export function spawnSync(file: string, options: ChildProcessSpawnSyncUtf8Options): any;
    export function spawnSync(file: string, args: string[], options: ChildProcessSpawnSyncUtf8Options): any;
}

interface URL {
    readonly href: string;
    readonly protocol: string;
    readonly host: string;
    readonly hostname: string;
    readonly port: string;
    readonly pathname: string;
    readonly search: string;
    readonly hash: string;
    readonly origin: string;
    toJSON(): string;
    toLocaleString(): string;
    toString(): string;
    valueOf(): URL;
}
interface URLConstructor {
    new (input: string, base?: string): URL;
    canParse(input: string, base?: string): boolean;
}
declare var URL: URLConstructor;
