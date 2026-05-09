// TypeScriptC minimal global/type shim.
// Declarations here are ambient globals because this file has no imports/exports.

// --- iterator protocol (minimal, for for-of on arrays) ---
interface Symbol {
    readonly description: string | undefined;
    toString(): string;
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
interface IteratorReturnResult<T> { done: true; value: T; }
type IteratorResult<T> = IteratorYieldResult<T> | IteratorReturnResult<T>;
interface Iterator<T> {
    next(): IteratorResult<T>;
}
interface Iterable<T> {
    [Symbol.iterator](): Iterator<T>;
}
interface IterableIterator<T> extends Iterator<T> {
    [Symbol.iterator](): IterableIterator<T>;
}

interface TemplateStringsArray extends ReadonlyArray<string> {
    readonly raw: readonly string[];
}

interface String extends Iterable<string> {
    readonly length: number;
    charAt(index: number): string;
    at(index: number): string | undefined;
    codePointAt(index: number): number | undefined;
    indexOf(search: string): number;
    lastIndexOf(search: string): number;
    localeCompare(compareString: string): number;
    includes(search: string): boolean;
    startsWith(prefix: string): boolean;
    endsWith(suffix: string): boolean;
    slice(start?: number, end?: number): string;
    substring(start: number, end?: number): string;
    toUpperCase(): string;
    toLowerCase(): string;
    normalize(form?: "NFC" | "NFD" | "NFKC" | "NFKD"): string;
    trim(): string;
    trimStart(): string;
    trimEnd(): string;
    repeat(count: number): string;
    padStart(targetLength: number, padString?: string): string;
    padEnd(targetLength: number, padString?: string): string;
    replace(search: string | RegExp, replacement: string): string;
    replaceAll(search: string | RegExp, replacement: string): string;
    match(re: RegExp): string[] | null;
    matchAll(re: RegExp): string[][];
    split(separator: string | RegExp): string[];
    concat(...strings: string[]): string;
    [Symbol.iterator](): IterableIterator<string>;
}
interface StringConstructor {
    fromCharCode(...codes: number[]): string;
}
declare var String: StringConstructor;

interface Boolean {}
interface Number {}
interface BigInt {
    toString(radix?: number): string;
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
    indexOf(searchElement: T): number;
    lastIndexOf(searchElement: T): number;
    includes(searchElement: T): boolean;
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
    concat(...arrays: T[][]): T[];
    join(sep?: string): string;
    forEach(cb: (element: T, index: number) => void): void;
    map<U>(cb: (element: T, index: number) => U): U[];
    flatMap<U>(cb: (element: T, index: number) => U[]): U[];
    filter(cb: (element: T, index: number) => boolean): T[];
    reduce<U>(cb: (acc: U, element: T, index: number) => U, init: U): U;
    reduceRight<U>(cb: (acc: U, element: T, index: number) => U, init: U): U;
    find(cb: (element: T, index: number) => boolean): T | undefined;
    findIndex(cb: (element: T, index: number) => boolean): number;
    findLast(cb: (element: T, index: number) => boolean): T | undefined;
    findLastIndex(cb: (element: T, index: number) => boolean): number;
    some(cb: (element: T, index: number) => boolean): boolean;
    every(cb: (element: T, index: number) => boolean): boolean;
    [n: number]: T;
    [Symbol.iterator](): IterableIterator<T>;
}

interface ReadonlyArray<T> extends Iterable<T> {
    readonly length: number;
    indexOf(searchElement: T): number;
    lastIndexOf(searchElement: T): number;
    includes(searchElement: T): boolean;
    at(index: number): T | undefined;
    toReversed(): T[];
    toSorted(cmp?: (a: T, b: T) => number): T[];
    with(index: number, value: T): T[];
    toSpliced(start?: number, deleteCount?: number, ...items: T[]): T[];
    slice(start?: number, end?: number): T[];
    join(sep?: string): string;
    forEach(cb: (element: T, index: number) => void): void;
    map<U>(cb: (element: T, index: number) => U): U[];
    filter(cb: (element: T, index: number) => boolean): T[];
    reduce<U>(cb: (acc: U, element: T, index: number) => U, init: U): U;
    reduceRight<U>(cb: (acc: U, element: T, index: number) => U, init: U): U;
    find(cb: (element: T, index: number) => boolean): T | undefined;
    findIndex(cb: (element: T, index: number) => boolean): number;
    findLast(cb: (element: T, index: number) => boolean): T | undefined;
    findLastIndex(cb: (element: T, index: number) => boolean): number;
    some(cb: (element: T, index: number) => boolean): boolean;
    every(cb: (element: T, index: number) => boolean): boolean;
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
    values<T extends object>(o: T): T[keyof T][];
    entries<T extends object>(o: T): ObjectEntry<T[keyof T]>[];
    fromEntries<T>(entries: ObjectEntry<any>[]): T;
    create(o: any): any;
    defineProperty<T>(o: T, p: string, attributes: any): T;
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
}
declare var Object: ObjectConstructor;

interface ReflectConstructor {
    defineProperty(target: any, propertyKey: string, attributes: any): boolean;
    deleteProperty(target: any, propertyKey: string): boolean;
    get(target: any, propertyKey: string): any;
    getPrototypeOf(target: any): any;
    getOwnPropertyDescriptor(target: any, propertyKey: string): any;
    has(target: any, propertyKey: string): boolean;
    isExtensible(target: any): boolean;
    ownKeys(target: any): string[];
    preventExtensions(target: any): boolean;
    set(target: any, propertyKey: string, value: any): boolean;
    setPrototypeOf(target: any, proto: any): boolean;
}
declare var Reflect: ReflectConstructor;

interface ArrayConstructor {
    isArray(arg: unknown): boolean;
    from<T>(arr: T[]): T[];
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
    [Symbol.iterator](): IterableIterator<[K, V]>;
}
interface MapConstructor {
    new <K, V>(): Map<K, V>;
}
declare var Map: MapConstructor;

interface Set<T> extends Iterable<T> {
    readonly size: number;
    add(value: T): this;
    has(value: T): boolean;
    delete(value: T): boolean;
    clear(): void;
    values(): T[];
    [Symbol.iterator](): IterableIterator<T>;
}
interface SetConstructor {
    new <T>(): Set<T>;
}
declare var Set: SetConstructor;

interface WeakMap<K extends object, V> {
    get(key: K): V | undefined;
    set(key: K, value: V): this;
    has(key: K): boolean;
    delete(key: K): boolean;
}
interface WeakMapConstructor {
    new <K extends object, V>(): WeakMap<K, V>;
}
declare var WeakMap: WeakMapConstructor;

interface WeakSet<T extends object> {
    add(value: T): this;
    has(value: T): boolean;
    delete(value: T): boolean;
}
interface WeakSetConstructor {
    new <T extends object>(): WeakSet<T>;
}
declare var WeakSet: WeakSetConstructor;

interface WeakRef<T extends object> {
    deref(): T | undefined;
}
interface WeakRefConstructor {
    new <T extends object>(target: T): WeakRef<T>;
}
declare var WeakRef: WeakRefConstructor;
interface Function {}
interface CallableFunction extends Function {}
interface NewableFunction extends Function {}
interface RegExp {
    test(s: string): boolean;
    readonly source: string;
    readonly flags: string;
    readonly global: boolean;
    readonly ignoreCase: boolean;
    readonly multiline: boolean;
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

declare function parseInt(value: string, radix?: number): number;
declare function parseFloat(value: string): number;
declare function isNaN(value: number): boolean;
declare function isFinite(value: number): boolean;
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
    floor(x: number): number;
    ceil(x: number): number;
    round(x: number): number;
    abs(x: number): number;
    trunc(x: number): number;
    sign(x: number): number;
    sqrt(x: number): number;
    pow(x: number, y: number): number;
    min(...values: number[]): number;
    max(...values: number[]): number;
    log(x: number): number;
    exp(x: number): number;
    sin(x: number): number;
    cos(x: number): number;
    tan(x: number): number;
    atan(x: number): number;
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
    isInteger(value: number): boolean;
    isFinite(value: number): boolean;
    isNaN(value: number): boolean;
    parseFloat(value: string): number;
    parseInt(value: string, radix?: number): number;
}
declare var Number: NumberConstructor;

// Phase 10 sync-core Node stdlib — globally injected (no import needed).
// Phase 4 module system will instead let users write `import * as fs from "fs"`
// and we'll resolve to these same bindings.
interface FS {
    readFileSync(path: string): string;
    writeFileSync(path: string, data: string): void;
    existsSync(path: string): boolean;
    readdirSync(path: string): string[];
}
declare const fs: FS;

interface Path {
    join(...parts: string[]): string;
    resolve(...parts: string[]): string;
    basename(p: string): string;
    dirname(p: string): string;
    extname(p: string): string;
}
declare const path: Path;

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
    toString(encoding?: BufferEncoding): string;
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
}
interface URLConstructor {
    new (input: string): URL;
}
declare var URL: URLConstructor;
