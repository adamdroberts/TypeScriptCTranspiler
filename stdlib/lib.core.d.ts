// TypeScriptC minimal global/type shim.
// Declarations here are ambient globals because this file has no imports/exports.

// --- iterator protocol (minimal, for for-of on arrays) ---
interface SymbolConstructor {
    readonly iterator: unique symbol;
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

interface String extends Iterable<string> {
    readonly length: number;
    charAt(index: number): string;
    indexOf(search: string): number;
    includes(search: string): boolean;
    startsWith(prefix: string): boolean;
    endsWith(suffix: string): boolean;
    slice(start?: number, end?: number): string;
    toUpperCase(): string;
    toLowerCase(): string;
    trim(): string;
    repeat(count: number): string;
    padStart(targetLength: number, padString?: string): string;
    padEnd(targetLength: number, padString?: string): string;
    replace(search: string | RegExp, replacement: string): string;
    replaceAll(search: string | RegExp, replacement: string): string;
    match(re: RegExp): string[] | null;
    split(separator: string | RegExp): string[];
    concat(...strings: string[]): string;
    [Symbol.iterator](): IterableIterator<string>;
}

interface Boolean {}
interface Number {}
interface IArguments {}

interface Array<T> extends Iterable<T> {
    readonly length: number;
    push(...items: T[]): number;
    pop(): T | undefined;
    shift(): T | undefined;
    unshift(...items: T[]): number;
    indexOf(searchElement: T): number;
    includes(searchElement: T): boolean;
    reverse(): T[];
    sort(cmp: (a: T, b: T) => number): T[];
    slice(start?: number, end?: number): T[];
    concat(...arrays: T[][]): T[];
    join(sep?: string): string;
    forEach(cb: (element: T, index: number) => void): void;
    map<U>(cb: (element: T, index: number) => U): U[];
    filter(cb: (element: T, index: number) => boolean): T[];
    reduce<U>(cb: (acc: U, element: T, index: number) => U, init: U): U;
    find(cb: (element: T, index: number) => boolean): T | undefined;
    findIndex(cb: (element: T, index: number) => boolean): number;
    some(cb: (element: T, index: number) => boolean): boolean;
    every(cb: (element: T, index: number) => boolean): boolean;
    [n: number]: T;
    [Symbol.iterator](): IterableIterator<T>;
}

interface ReadonlyArray<T> extends Iterable<T> {
    readonly length: number;
    indexOf(searchElement: T): number;
    includes(searchElement: T): boolean;
    slice(start?: number, end?: number): T[];
    join(sep?: string): string;
    forEach(cb: (element: T, index: number) => void): void;
    map<U>(cb: (element: T, index: number) => U): U[];
    filter(cb: (element: T, index: number) => boolean): T[];
    reduce<U>(cb: (acc: U, element: T, index: number) => U, init: U): U;
    find(cb: (element: T, index: number) => boolean): T | undefined;
    findIndex(cb: (element: T, index: number) => boolean): number;
    some(cb: (element: T, index: number) => boolean): boolean;
    every(cb: (element: T, index: number) => boolean): boolean;
    [n: number]: T;
    [Symbol.iterator](): IterableIterator<T>;
}

interface Object {}
interface ObjectConstructor {
    keys(o: unknown): string[];
    values<T>(o: { [k: string]: T }): T[];
}
declare var Object: ObjectConstructor;

interface ArrayConstructor {
    isArray(arg: unknown): boolean;
    from<T>(arr: T[]): T[];
}
declare var Array: ArrayConstructor;

interface Map<K, V> {
    readonly size: number;
    get(key: K): V | undefined;
    set(key: K, value: V): this;
    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
    keys(): K[];
    values(): V[];
}
interface MapConstructor {
    new <K, V>(): Map<K, V>;
}
declare var Map: MapConstructor;

interface Set<T> {
    readonly size: number;
    add(value: T): this;
    has(value: T): boolean;
    delete(value: T): boolean;
    clear(): void;
    values(): T[];
}
interface SetConstructor {
    new <T>(): Set<T>;
}
declare var Set: SetConstructor;
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
