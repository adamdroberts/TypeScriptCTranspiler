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
    then<TResult>(onfulfilled: (value: T) => TResult): Promise<TResult>;
    then<TResult, TRejectResult>(onfulfilled: (value: T) => TResult, onrejected: (reason: any) => TRejectResult): Promise<TResult | TRejectResult>;
    catch<TResult>(onrejected: (reason: any) => TResult): Promise<T | TResult>;
    finally(onfinally: () => void): Promise<T>;
}
interface PromiseConstructor {
    resolve<T>(value: T): Promise<T>;
    resolve(): Promise<void>;
    reject<T = never>(reason?: any): Promise<T>;
    all<T>(values: Promise<T>[]): Promise<T[]>;
    allSettled<T>(values: Promise<T>[]): Promise<any[]>;
    race<T>(values: Promise<T>[]): Promise<T>;
    any<T>(values: Promise<T>[]): Promise<T>;
}
declare var Promise: PromiseConstructor;

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

interface Error {
    message: string;
}
interface ErrorConstructor {
    new (message?: string): Error;
    (message?: string): Error;
}
declare var Error: ErrorConstructor;

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
interface Process {
    argv: string[];
    env: ProcessEnv;
    exit(code?: number): never;
    cwd(): string;
}
declare const process: Process;

declare function parseInt(value: any, radix?: number): number;
declare function parseFloat(value: any): number;
declare function isNaN(value: any): boolean;
declare function isFinite(value: any): boolean;
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
    platform(): string;
    arch(): string;
    hostname(): string;
    tmpdir(): string;
    homedir(): string;
    cpus(): number[];
}
declare const os: OS;

interface DateConstructor {
    now(): number;
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
    readonly size: number;
    readonly mode: number;
    isFile(): boolean;
    isDirectory(): boolean;
    isSymbolicLink(): boolean;
}
interface FSMkdirOptions {
    recursive?: boolean;
}
interface FSRmOptions {
    recursive?: boolean;
    force?: boolean;
}
type FSEncoding = "utf8" | "utf-8";
interface FSEncodingOptions {
    encoding?: FSEncoding;
}
type FSFileEncodingOptions = FSEncoding | FSEncodingOptions;
interface FS {
    readFileSync(path: string, options?: FSFileEncodingOptions): string;
    writeFileSync(path: string, data: string, options?: FSFileEncodingOptions): void;
    appendFileSync(path: string, data: string, options?: FSFileEncodingOptions): void;
    existsSync(path: string): boolean;
    readdirSync(path: string): string[];
    statSync(path: string): FSStats;
    lstatSync(path: string): FSStats;
    realpathSync(path: string): string;
    readlinkSync(path: string): string;
    symlinkSync(target: string, path: string): void;
    linkSync(existingPath: string, newPath: string): void;
    mkdtempSync(prefix: string): string;
    truncateSync(path: string, len?: number): void;
    chmodSync(path: string, mode: number): void;
    mkdirSync(path: string, options?: FSMkdirOptions): void;
    unlinkSync(path: string): void;
    rmSync(path: string, options?: FSRmOptions): void;
    rmdirSync(path: string): void;
    copyFileSync(src: string, dest: string): void;
    renameSync(oldPath: string, newPath: string): void;
    promises: FSPromises;
}
interface FSPromises {
    readFile(path: string, options?: FSFileEncodingOptions): Promise<string>;
    writeFile(path: string, data: string, options?: FSFileEncodingOptions): Promise<void>;
    appendFile(path: string, data: string, options?: FSFileEncodingOptions): Promise<void>;
    readdir(path: string): Promise<string[]>;
    stat(path: string): Promise<FSStats>;
    lstat(path: string): Promise<FSStats>;
    realpath(path: string): Promise<string>;
    readlink(path: string): Promise<string>;
    symlink(target: string, path: string): Promise<void>;
    link(existingPath: string, newPath: string): Promise<void>;
    mkdtemp(prefix: string): Promise<string>;
    truncate(path: string, len?: number): Promise<void>;
    chmod(path: string, mode: number): Promise<void>;
    access(path: string): Promise<void>;
    mkdir(path: string, options?: FSMkdirOptions): Promise<void>;
    unlink(path: string): Promise<void>;
    rm(path: string, options?: FSRmOptions): Promise<void>;
    rmdir(path: string): Promise<void>;
    copyFile(src: string, dest: string): Promise<void>;
    rename(oldPath: string, newPath: string): Promise<void>;
}
declare const fs: FS;
declare module "fs" {
    export const promises: FSPromises;
    export function readFileSync(path: string, options?: FSFileEncodingOptions): string;
    export function writeFileSync(path: string, data: string, options?: FSFileEncodingOptions): void;
    export function appendFileSync(path: string, data: string, options?: FSFileEncodingOptions): void;
    export function existsSync(path: string): boolean;
    export function readdirSync(path: string): string[];
    export function statSync(path: string): FSStats;
    export function lstatSync(path: string): FSStats;
    export function realpathSync(path: string): string;
    export function readlinkSync(path: string): string;
    export function symlinkSync(target: string, path: string): void;
    export function linkSync(existingPath: string, newPath: string): void;
    export function mkdtempSync(prefix: string): string;
    export function truncateSync(path: string, len?: number): void;
    export function chmodSync(path: string, mode: number): void;
    export function mkdirSync(path: string, options?: FSMkdirOptions): void;
    export function unlinkSync(path: string): void;
    export function rmSync(path: string, options?: FSRmOptions): void;
    export function rmdirSync(path: string): void;
    export function copyFileSync(src: string, dest: string): void;
    export function renameSync(oldPath: string, newPath: string): void;
}
declare module "node:fs" {
    export const promises: FSPromises;
    export function readFileSync(path: string, options?: FSFileEncodingOptions): string;
    export function writeFileSync(path: string, data: string, options?: FSFileEncodingOptions): void;
    export function appendFileSync(path: string, data: string, options?: FSFileEncodingOptions): void;
    export function existsSync(path: string): boolean;
    export function readdirSync(path: string): string[];
    export function statSync(path: string): FSStats;
    export function lstatSync(path: string): FSStats;
    export function realpathSync(path: string): string;
    export function readlinkSync(path: string): string;
    export function symlinkSync(target: string, path: string): void;
    export function linkSync(existingPath: string, newPath: string): void;
    export function mkdtempSync(prefix: string): string;
    export function truncateSync(path: string, len?: number): void;
    export function chmodSync(path: string, mode: number): void;
    export function mkdirSync(path: string, options?: FSMkdirOptions): void;
    export function unlinkSync(path: string): void;
    export function rmSync(path: string, options?: FSRmOptions): void;
    export function rmdirSync(path: string): void;
    export function copyFileSync(src: string, dest: string): void;
    export function renameSync(oldPath: string, newPath: string): void;
}

interface Path {
    readonly sep: string;
    readonly delimiter: string;
    join(...parts: string[]): string;
    resolve(...parts: string[]): string;
    normalize(p: string): string;
    isAbsolute(p: string): boolean;
    relative(from: string, to: string): string;
    basename(p: string): string;
    dirname(p: string): string;
    extname(p: string): string;
}
declare const path: Path;
declare module "path" {
    export const sep: string;
    export const delimiter: string;
    export function join(...parts: string[]): string;
    export function resolve(...parts: string[]): string;
    export function normalize(p: string): string;
    export function isAbsolute(p: string): boolean;
    export function relative(from: string, to: string): string;
    export function basename(p: string): string;
    export function dirname(p: string): string;
    export function extname(p: string): string;
}
declare module "node:path" {
    export const sep: string;
    export const delimiter: string;
    export function join(...parts: string[]): string;
    export function resolve(...parts: string[]): string;
    export function normalize(p: string): string;
    export function isAbsolute(p: string): boolean;
    export function relative(from: string, to: string): string;
    export function basename(p: string): string;
    export function dirname(p: string): string;
    export function extname(p: string): string;
}

interface CryptoHash {
    update(data: string): CryptoHash;
    digest(encoding: "hex"): string;
}
interface Crypto {
    createHash(algorithm: "sha256"): CryptoHash;
}
declare const crypto: Crypto;

type BufferEncoding = "utf8" | "hex";
interface Buffer {
    readonly length: number;
    toLocaleString(): string;
    toString(encoding?: BufferEncoding): string;
    valueOf(): Buffer;
    slice(start?: number, end?: number): Buffer;
    subarray(start?: number, end?: number): Buffer;
    equals(other: Buffer): boolean;
    [n: number]: number;
}
interface BufferConstructor {
    from(data: string, encoding?: BufferEncoding): Buffer;
    from(data: number[]): Buffer;
    alloc(size: number, fill?: number): Buffer;
    concat(list: Buffer[]): Buffer;
    isBuffer(value: unknown): boolean;
}
declare var Buffer: BufferConstructor;

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
    eventNames(): string[];
    setMaxListeners(n: number): this;
    getMaxListeners(): number;
}
interface EventEmitterConstructor {
    new(): EventEmitter;
}
declare var EventEmitter: EventEmitterConstructor;
declare module "events" {
    export const EventEmitter: EventEmitterConstructor;
    export function listenerCount(emitter: EventEmitter, eventName: string): number;
    export function setMaxListeners(n: number, emitter: EventEmitter): void;
    export function getMaxListeners(emitter: EventEmitter): number;
}
declare module "node:events" {
    export const EventEmitter: EventEmitterConstructor;
    export function listenerCount(emitter: EventEmitter, eventName: string): number;
    export function setMaxListeners(n: number, emitter: EventEmitter): void;
    export function getMaxListeners(emitter: EventEmitter): number;
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
    new (input: string): URL;
}
declare var URL: URLConstructor;
