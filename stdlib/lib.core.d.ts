// TypeScriptC minimal global/type shim.
// Declarations here are ambient globals because this file has no imports/exports.

// --- iterator protocol (minimal, for for-of on arrays) ---
interface Symbol {
    readonly description: string | undefined;
    toLocaleString(...ignored: any[]): string;
    toString(...ignored: any[]): string;
    valueOf(...ignored: any[]): symbol;
}
interface SymbolConstructor {
    (description?: string, ...ignored: any[]): symbol;
    for(key: string, ...ignored: any[]): symbol;
    keyFor(sym: symbol, ...ignored: any[]): string | undefined;
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
    resolve<T>(value: Promise<T>, ...ignored: any[]): Promise<T>;
    resolve<T>(value: T, ...ignored: any[]): Promise<T>;
    resolve(): Promise<void>;
    reject<T = never>(reason?: any, ...ignored: any[]): Promise<T>;
    all<T>(values: Promise<T>[]): Promise<T[]>;
    all<T>(values: Set<Promise<T>>): Promise<T[]>;
    allSettled<T>(values: Promise<T>[]): Promise<any[]>;
    allSettled<T>(values: Set<Promise<T>>): Promise<any[]>;
    race<T>(values: Promise<T>[]): Promise<T>;
    race<T>(values: Set<Promise<T>>): Promise<T>;
    any<T>(values: Promise<T>[]): Promise<T>;
    any<T>(values: Set<Promise<T>>): Promise<T>;
    try<T>(callback: () => T | Promise<T>): Promise<T>;
}
declare var Promise: PromiseConstructor;

interface CommonJsRequireFunction {
    (specifier: string): any;
    call(thisArg: any, specifier: string): any;
    apply(thisArg: any, args: string[]): any;
    bind(thisArg: any): CommonJsRequireFunction;
}
declare const require: CommonJsRequireFunction;

declare module "*.node" {
    const addon: any;
    export default addon;
}

declare const __filename: string;
declare const __dirname: string;
declare const module: {
    exports: any;
    filename: string;
    id: string;
    path: string;
    loaded: boolean;
    require: CommonJsRequireFunction;
};

interface TemplateStringsArray extends ReadonlyArray<string> {
    readonly raw: readonly string[];
}

interface String extends Iterable<string> {
    readonly length: number;
    charAt(index?: number, ...ignored: any[]): string;
    charCodeAt(index?: number, ...ignored: any[]): number;
    at(index?: number, ...ignored: any[]): string | undefined;
    codePointAt(index?: number, ...ignored: any[]): number | undefined;
    indexOf(search: string, position?: number, ...ignored: any[]): number;
    lastIndexOf(search: string, position?: number, ...ignored: any[]): number;
    localeCompare(compareString: string, ...ignored: any[]): number;
    includes(search: string, position?: number, ...ignored: any[]): boolean;
    startsWith(prefix: string, position?: number, ...ignored: any[]): boolean;
    endsWith(suffix: string, endPosition?: number, ...ignored: any[]): boolean;
    slice(start?: number, end?: number, ...ignored: any[]): string;
    substring(start?: number, end?: number, ...ignored: any[]): string;
    substr(start?: number, length?: number, ...ignored: any[]): string;
    toLocaleString(...ignored: any[]): string;
    toString(...ignored: any[]): string;
    toUpperCase(...ignored: any[]): string;
    toLowerCase(...ignored: any[]): string;
    valueOf(...ignored: any[]): string;
    normalize(form?: "NFC" | "NFD" | "NFKC" | "NFKD", ...ignored: any[]): string;
    trim(...ignored: any[]): string;
    trimLeft(...ignored: any[]): string;
    trimRight(...ignored: any[]): string;
    trimStart(...ignored: any[]): string;
    trimEnd(...ignored: any[]): string;
    isWellFormed(...ignored: any[]): boolean;
    toWellFormed(...ignored: any[]): string;
    repeat(count: number, ...ignored: any[]): string;
    padStart(targetLength: number, padString?: string, ...ignored: any[]): string;
    padEnd(targetLength: number, padString?: string, ...ignored: any[]): string;
    replace(search: string | RegExp, replacement: string, ...ignored: any[]): string;
    replaceAll(search: string | RegExp, replacement: string, ...ignored: any[]): string;
    match(re: RegExp | string, ...ignored: any[]): string[] | null;
    matchAll(re: RegExp | string, ...ignored: any[]): string[][];
    search(re: RegExp | string, ...ignored: any[]): number;
    split(separator: string | RegExp, limit?: number, ...ignored: any[]): string[];
    concat(...strings: string[]): string;
    [n: number]: string;
    [Symbol.iterator](): IterableIterator<string>;
}
interface StringConstructor {
    (value?: any, ...ignored: any[]): string;
    fromCharCode(...codes: number[]): string;
    fromCodePoint(...codes: number[]): string;
    raw(strings: TemplateStringsArray, ...substitutions: any[]): string;
}
declare var String: StringConstructor;

interface Boolean {
    toLocaleString(...ignored: any[]): string;
    toString(...ignored: any[]): string;
    valueOf(...ignored: any[]): boolean;
}
interface BooleanConstructor {
    (value?: any, ...ignored: any[]): boolean;
}
declare var Boolean: BooleanConstructor;
interface Number {
    toLocaleString(...ignored: any[]): string;
    toString(radix?: number, ...ignored: any[]): string;
    toFixed(fractionDigits?: number, ...ignored: any[]): string;
    toExponential(fractionDigits?: number, ...ignored: any[]): string;
    toPrecision(precision?: number, ...ignored: any[]): string;
    valueOf(...ignored: any[]): number;
}
interface BigInt {
    toLocaleString(...ignored: any[]): string;
    toString(radix?: number, ...ignored: any[]): string;
    valueOf(...ignored: any[]): bigint;
}
interface BigIntConstructor {
    (value: string | number | boolean, ...ignored: any[]): bigint;
}
declare var BigInt: BigIntConstructor;
interface IArguments {}

interface Array<T> extends Iterable<T> {
    readonly length: number;
    push(...items: T[]): number;
    pop(...ignored: any[]): T | undefined;
    shift(...ignored: any[]): T | undefined;
    unshift(...items: T[]): number;
    indexOf(searchElement: T, fromIndex?: number): number;
    lastIndexOf(searchElement: T, fromIndex?: number): number;
    includes(searchElement: T, fromIndex?: number): boolean;
    at(index: number): T | undefined;
    reverse(...ignored: any[]): T[];
    toReversed(...ignored: any[]): T[];
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
    keys(...ignored: any[]): number[];
    values(...ignored: any[]): T[];
    entries(...ignored: any[]): [string, T][];
    toLocaleString(...ignored: any[]): string;
    toString(...ignored: any[]): string;
    valueOf(...ignored: any[]): T[];
    forEach(cb: (element: T, index: number, array: T[]) => void, thisArg?: any): void;
    map<U>(cb: (element: T, index: number, array: T[]) => U, thisArg?: any): U[];
    flatMap<U>(cb: (element: T, index: number, array: T[]) => U[], thisArg?: any): U[];
    flatMap<U>(cb: (element: T, index: number, array: T[]) => U, thisArg?: any): U[];
    filter(cb: (element: T, index: number, array: T[]) => boolean, thisArg?: any): T[];
    reduce(cb: (acc: T, element: T, index: number, array: T[]) => T): T;
    reduce<U>(cb: (acc: U, element: T, index: number, array: T[]) => U, init: U): U;
    reduceRight(cb: (acc: T, element: T, index: number, array: T[]) => T): T;
    reduceRight<U>(cb: (acc: U, element: T, index: number, array: T[]) => U, init: U): U;
    find(cb: (element: T, index: number, array: T[]) => boolean, thisArg?: any): T | undefined;
    findIndex(cb: (element: T, index: number, array: T[]) => boolean, thisArg?: any): number;
    findLast(cb: (element: T, index: number, array: T[]) => boolean, thisArg?: any): T | undefined;
    findLastIndex(cb: (element: T, index: number, array: T[]) => boolean, thisArg?: any): number;
    some(cb: (element: T, index: number, array: T[]) => boolean, thisArg?: any): boolean;
    every(cb: (element: T, index: number, array: T[]) => boolean, thisArg?: any): boolean;
    [n: number]: T;
    [Symbol.iterator](): IterableIterator<T>;
}

interface ReadonlyArray<T> extends Iterable<T> {
    readonly length: number;
    indexOf(searchElement: T, fromIndex?: number): number;
    lastIndexOf(searchElement: T, fromIndex?: number): number;
    includes(searchElement: T, fromIndex?: number): boolean;
    at(index: number): T | undefined;
    toReversed(...ignored: any[]): T[];
    toSorted(cmp?: (a: T, b: T) => number): T[];
    with(index: number, value: T): T[];
    toSpliced(start?: number, deleteCount?: number, ...items: T[]): T[];
    slice(start?: number, end?: number): T[];
    concat(...items: (T | T[])[]): T[];
    join(sep?: string): string;
    keys(...ignored: any[]): number[];
    values(...ignored: any[]): T[];
    entries(...ignored: any[]): [string, T][];
    toLocaleString(...ignored: any[]): string;
    toString(...ignored: any[]): string;
    valueOf(...ignored: any[]): T[];
    forEach(cb: (element: T, index: number, array: ReadonlyArray<T>) => void, thisArg?: any): void;
    map<U>(cb: (element: T, index: number, array: ReadonlyArray<T>) => U, thisArg?: any): U[];
    filter(cb: (element: T, index: number, array: ReadonlyArray<T>) => boolean, thisArg?: any): T[];
    reduce(cb: (acc: T, element: T, index: number, array: ReadonlyArray<T>) => T): T;
    reduce<U>(cb: (acc: U, element: T, index: number, array: ReadonlyArray<T>) => U, init: U): U;
    reduceRight(cb: (acc: T, element: T, index: number, array: ReadonlyArray<T>) => T): T;
    reduceRight<U>(cb: (acc: U, element: T, index: number, array: ReadonlyArray<T>) => U, init: U): U;
    find(cb: (element: T, index: number, array: ReadonlyArray<T>) => boolean, thisArg?: any): T | undefined;
    findIndex(cb: (element: T, index: number, array: ReadonlyArray<T>) => boolean, thisArg?: any): number;
    findLast(cb: (element: T, index: number, array: ReadonlyArray<T>) => boolean, thisArg?: any): T | undefined;
    findLastIndex(cb: (element: T, index: number, array: ReadonlyArray<T>) => boolean, thisArg?: any): number;
    some(cb: (element: T, index: number, array: ReadonlyArray<T>) => boolean, thisArg?: any): boolean;
    every(cb: (element: T, index: number, array: ReadonlyArray<T>) => boolean, thisArg?: any): boolean;
    [n: number]: T;
    [Symbol.iterator](): IterableIterator<T>;
}

interface Object {
    hasOwnProperty(p: string, ...ignored: any[]): boolean;
    isPrototypeOf(v: any, ...ignored: any[]): boolean;
    propertyIsEnumerable(p: string, ...ignored: any[]): boolean;
    toLocaleString(...ignored: any[]): string;
    toString(...ignored: any[]): string;
    valueOf(...ignored: any[]): any;
}
type ObjectEntry<T, K = string> = [K, T];
type Record<K extends string | number | symbol, T> = { [P in K]: T };
interface ObjectConstructor {
    readonly prototype: Object;
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
    getOwnPropertySymbols(o: any): symbol[];
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
    groupBy<T>(items: Set<T>, keyFn: (item: T, index: number) => string): unknown;
    groupBy<MK, MV>(items: Map<MK, MV>, keyFn: (item: ObjectEntry<MV, MK>, index: number) => string): unknown;
    groupBy(items: string, keyFn: (item: string, index: number) => string): unknown;
}
declare var Object: ObjectConstructor;

interface ReflectConstructor {
    apply(target: any, thisArgument: any, argumentsList: any[]): any;
    construct(target: any, argumentsList: any[], newTarget?: any): any;
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
    from<K, T>(map: Map<K, T>): ObjectEntry<T, K>[];
    from<T>(arr: T[], mapfn: undefined, thisArg?: any): T[];
    from<T>(set: Set<T>, mapfn: undefined, thisArg?: any): T[];
    from<K, T>(map: Map<K, T>, mapfn: undefined, thisArg?: any): ObjectEntry<T, K>[];
    from(s: string, mapfn: undefined, thisArg?: any): string[];
    from(items: any, mapfn: undefined, thisArg?: any): any[];
    from<U>(s: string, mapfn: (v: string, k: number) => U, thisArg?: any): U[];
    from<T, U>(arr: T[], mapfn: (v: T, k: number) => U, thisArg?: any): U[];
    from<T, U>(set: Set<T>, mapfn: (v: T, k: number) => U, thisArg?: any): U[];
    from<K, T, U>(map: Map<K, T>, mapfn: (v: ObjectEntry<T, K>, k: number) => U, thisArg?: any): U[];
    fromAsync(s: string): Promise<string[]>;
    fromAsync<T>(arr: Promise<T>[]): Promise<T[]>;
    fromAsync<T>(arr: T[]): Promise<T[]>;
    fromAsync<T>(set: Set<Promise<T>>): Promise<T[]>;
    fromAsync<T>(set: Set<T>): Promise<T[]>;
    fromAsync<K, T>(map: Map<K, T>): Promise<ObjectEntry<T, K>[]>;
    fromAsync(items: any): Promise<any[]>;
    fromAsync(s: string, mapfn: undefined, thisArg?: any): Promise<string[]>;
    fromAsync<T>(arr: Promise<T>[], mapfn: undefined, thisArg?: any): Promise<T[]>;
    fromAsync<T>(arr: T[], mapfn: undefined, thisArg?: any): Promise<T[]>;
    fromAsync<T>(set: Set<Promise<T>>, mapfn: undefined, thisArg?: any): Promise<T[]>;
    fromAsync<T>(set: Set<T>, mapfn: undefined, thisArg?: any): Promise<T[]>;
    fromAsync<K, T>(map: Map<K, T>, mapfn: undefined, thisArg?: any): Promise<ObjectEntry<T, K>[]>;
    fromAsync(items: any, mapfn: undefined, thisArg?: any): Promise<any[]>;
    fromAsync<U>(s: string, mapfn: (v: string, k: number) => Promise<U>, thisArg?: any): Promise<U[]>;
    fromAsync<T, U>(arr: T[], mapfn: (v: T, k: number) => Promise<U>, thisArg?: any): Promise<U[]>;
    fromAsync<T, U>(set: Set<T>, mapfn: (v: T, k: number) => Promise<U>, thisArg?: any): Promise<U[]>;
    fromAsync<K, T, U>(map: Map<K, T>, mapfn: (v: ObjectEntry<T, K>, k: number) => Promise<U>, thisArg?: any): Promise<U[]>;
    fromAsync<U>(items: any, mapfn: (v: any, k: number) => Promise<U>, thisArg?: any): Promise<U[]>;
    fromAsync<U>(s: string, mapfn: (v: string, k: number) => U, thisArg?: any): Promise<U[]>;
    fromAsync<T, U>(arr: T[], mapfn: (v: T, k: number) => U, thisArg?: any): Promise<U[]>;
    fromAsync<T, U>(set: Set<T>, mapfn: (v: T, k: number) => U, thisArg?: any): Promise<U[]>;
    fromAsync<K, T, U>(map: Map<K, T>, mapfn: (v: ObjectEntry<T, K>, k: number) => U, thisArg?: any): Promise<U[]>;
    fromAsync<U>(items: any, mapfn: (v: any, k: number) => U, thisArg?: any): Promise<U[]>;
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
    keys(...ignored: any[]): K[];
    values(...ignored: any[]): V[];
    entries(...ignored: any[]): ObjectEntry<V, K>[];
    forEach(cb: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void;
    toLocaleString(...ignored: any[]): string;
    toString(...ignored: any[]): string;
    valueOf(...ignored: any[]): Map<K, V>;
    [Symbol.iterator](): IterableIterator<[K, V]>;
}
interface MapConstructor {
    new <K, V>(entries: ObjectEntry<V, K>[]): Map<K, V>;
    new <K, V>(entries: Map<K, V>): Map<K, V>;
    new <K, V>(): Map<K, V>;
    groupBy<T, K>(items: T[], callbackfn: (value: T, index: number) => K): Map<K, T[]>;
    groupBy<T, K>(items: Set<T>, callbackfn: (value: T, index: number) => K): Map<K, T[]>;
    groupBy<MK, MV, K>(items: Map<MK, MV>, callbackfn: (value: ObjectEntry<MV, MK>, index: number) => K): Map<K, ObjectEntry<MV, MK>[]>;
    groupBy<K>(items: string, callbackfn: (value: string, index: number) => K): Map<K, string[]>;
}
declare var Map: MapConstructor;

interface Set<T> extends Iterable<T> {
    readonly size: number;
    add(value: T): this;
    has(value: T): boolean;
    delete(value: T): boolean;
    clear(): void;
    keys(...ignored: any[]): T[];
    values(...ignored: any[]): T[];
    forEach(cb: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void;
    union(other: Set<T>): Set<T>;
    intersection(other: Set<T>): Set<T>;
    difference(other: Set<T>): Set<T>;
    symmetricDifference(other: Set<T>): Set<T>;
    isSubsetOf(other: Set<T>): boolean;
    isSupersetOf(other: Set<T>): boolean;
    isDisjointFrom(other: Set<T>): boolean;
    toLocaleString(...ignored: any[]): string;
    toString(...ignored: any[]): string;
    valueOf(...ignored: any[]): Set<T>;
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
    toLocaleString(...ignored: any[]): string;
    toString(...ignored: any[]): string;
    valueOf(...ignored: any[]): WeakMap<K, V>;
}
interface WeakMapConstructor {
    new <K extends object, V>(entries: ObjectEntry<V, K>[]): WeakMap<K, V>;
    new <K extends object, V>(entries: Map<K, V>): WeakMap<K, V>;
    new <K extends object, V>(): WeakMap<K, V>;
}
declare var WeakMap: WeakMapConstructor;

interface WeakSet<T extends object> {
    add(value: T): this;
    has(value: T): boolean;
    delete(value: T): boolean;
    toLocaleString(...ignored: any[]): string;
    toString(...ignored: any[]): string;
    valueOf(...ignored: any[]): WeakSet<T>;
}
interface WeakSetConstructor {
    new <T extends object>(values: T[]): WeakSet<T>;
    new <T extends object>(values: Set<T>): WeakSet<T>;
    new <T extends object>(): WeakSet<T>;
}
declare var WeakSet: WeakSetConstructor;

interface WeakRef<T extends object> {
    deref(...ignored: any[]): T | undefined;
    toLocaleString(...ignored: any[]): string;
    toString(...ignored: any[]): string;
    valueOf(...ignored: any[]): WeakRef<T>;
}
interface WeakRefConstructor {
    new <T extends object>(target: T): WeakRef<T>;
}
declare var WeakRef: WeakRefConstructor;

interface ProxyHandler<T extends object> {
    apply?(target: T, thisArg: any, argArray: any[]): any;
    construct?(target: T, argArray: any[], newTarget: Function): object;
    defineProperty?(target: T, property: string | symbol, attributes: PropertyDescriptor): boolean;
    deleteProperty?(target: T, p: string | symbol): boolean;
    get?(target: T, p: string | symbol, receiver: any): any;
    getOwnPropertyDescriptor?(target: T, p: string | symbol): PropertyDescriptor | undefined;
    getPrototypeOf?(target: T): object | null;
    has?(target: T, p: string | symbol): boolean;
    isExtensible?(target: T): boolean;
    ownKeys?(target: T): ArrayLike<string | symbol>;
    preventExtensions?(target: T): boolean;
    set?(target: T, p: string | symbol, newValue: any, receiver: any): boolean;
    setPrototypeOf?(target: T, v: object | null): boolean;
}

declare class Proxy<T extends object> {
    constructor(target: T, handler: ProxyHandler<T>);
    static revocable<T extends object>(target: T, handler: ProxyHandler<T>): any;
}

declare namespace Reflect {
    function apply(target: any, thisArgument: any, argumentsList: ArrayLike<any>): any;
    function construct(target: Function, argumentsList: ArrayLike<any>, newTarget?: Function): any;
    function defineProperty(target: object, propertyKey: PropertyKey, attributes: PropertyDescriptor): boolean;
    function deleteProperty(target: object, propertyKey: PropertyKey): boolean;
    function get(target: object, propertyKey: PropertyKey, receiver?: any): any;
    function getOwnPropertyDescriptor(target: object, propertyKey: PropertyKey): PropertyDescriptor | undefined;
    function getPrototypeOf(target: object): object | null;
    function has(target: object, propertyKey: PropertyKey): boolean;
    function isExtensible(target: object): boolean;
    function ownKeys(target: object): ArrayLike<PropertyKey>;
    function preventExtensions(target: object): boolean;
    function set(target: object, propertyKey: PropertyKey, value: any, receiver?: any): boolean;
    function setPrototypeOf(target: object, proto: object | null): boolean;
}

interface FinalizationRegistry<T> {
    register(target: object, heldValue: T, unregisterToken?: object, ...ignored: any[]): void;
    unregister(unregisterToken: object, ...ignored: any[]): boolean;
    toLocaleString(...ignored: any[]): string;
    toString(...ignored: any[]): string;
    valueOf(...ignored: any[]): FinalizationRegistry<T>;
}
interface FinalizationRegistryConstructor {
    new <T>(cleanupCallback: (heldValue: T) => void): FinalizationRegistry<T>;
}
declare var FinalizationRegistry: FinalizationRegistryConstructor;
interface Function {
    (...args: any[]): any;
    call(thisArg: any, ...args: any[]): any;
}
interface FunctionConstructor {
    new (...args: string[]): Function;
    (...args: string[]): Function;
}
declare var Function: FunctionConstructor;
interface CallableFunction extends Function {}
interface NewableFunction extends Function {}
interface ClassDecoratorContext<Class = unknown> {
    readonly kind: "class";
    readonly name: string | undefined;
    readonly metadata: any;
    addInitializer(initializer: () => void): void;
}
interface ClassMethodDecoratorContext<This = unknown, Value = unknown> {
    readonly kind: "method";
    readonly name: string | symbol;
    readonly static: boolean;
    readonly private: boolean;
    readonly metadata: any;
    addInitializer(initializer: () => void): void;
}
interface ClassFieldDecoratorContext<This = unknown, Value = unknown> {
    readonly kind: "field";
    readonly name: string | symbol;
    readonly static: boolean;
    readonly private: boolean;
    readonly metadata: any;
    addInitializer(initializer: () => void): void;
}
interface ClassGetterDecoratorContext<This = unknown, Value = unknown> {
    readonly kind: "getter";
    readonly name: string | symbol;
    readonly static: boolean;
    readonly private: boolean;
    readonly metadata: any;
    addInitializer(initializer: () => void): void;
}
interface ClassSetterDecoratorContext<This = unknown, Value = unknown> {
    readonly kind: "setter";
    readonly name: string | symbol;
    readonly static: boolean;
    readonly private: boolean;
    readonly metadata: any;
    addInitializer(initializer: () => void): void;
}
declare function eval(source: string, ...ignored: unknown[]): unknown;
interface RegExp {
    exec(s: string, ...ignored: any[]): string[] | null;
    test(s: string, ...ignored: any[]): boolean;
    toLocaleString(...ignored: any[]): string;
    toString(...ignored: any[]): string;
    valueOf(...ignored: any[]): RegExp;
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
    cause: any;
    toString(...ignored: any[]): string;
    toLocaleString(...ignored: any[]): string;
    valueOf(...ignored: any[]): Error;
}
interface ErrorOptions {
    cause?: any;
}
interface ErrorConstructor {
    new (message?: string, options?: ErrorOptions, ...ignored: any[]): Error;
    (message?: string, options?: ErrorOptions, ...ignored: any[]): Error;
}
declare var Error: ErrorConstructor;
interface TypeError extends Error {}
interface TypeErrorConstructor {
    new (message?: string, options?: ErrorOptions, ...ignored: any[]): TypeError;
    (message?: string, options?: ErrorOptions, ...ignored: any[]): TypeError;
}
declare var TypeError: TypeErrorConstructor;
interface RangeError extends Error {}
interface RangeErrorConstructor {
    new (message?: string, options?: ErrorOptions, ...ignored: any[]): RangeError;
    (message?: string, options?: ErrorOptions, ...ignored: any[]): RangeError;
}
declare var RangeError: RangeErrorConstructor;
interface SyntaxError extends Error {}
interface SyntaxErrorConstructor {
    new (message?: string, options?: ErrorOptions, ...ignored: any[]): SyntaxError;
    (message?: string, options?: ErrorOptions, ...ignored: any[]): SyntaxError;
}
declare var SyntaxError: SyntaxErrorConstructor;
interface ReferenceError extends Error {}
interface ReferenceErrorConstructor {
    new (message?: string, options?: ErrorOptions, ...ignored: any[]): ReferenceError;
    (message?: string, options?: ErrorOptions, ...ignored: any[]): ReferenceError;
}
declare var ReferenceError: ReferenceErrorConstructor;
interface EvalError extends Error {}
interface EvalErrorConstructor {
    new (message?: string, options?: ErrorOptions, ...ignored: any[]): EvalError;
    (message?: string, options?: ErrorOptions, ...ignored: any[]): EvalError;
}
declare var EvalError: EvalErrorConstructor;
interface URIError extends Error {}
interface URIErrorConstructor {
    new (message?: string, options?: ErrorOptions, ...ignored: any[]): URIError;
    (message?: string, options?: ErrorOptions, ...ignored: any[]): URIError;
}
declare var URIError: URIErrorConstructor;
interface AggregateError extends Error {
    errors: any[];
}
interface AggregateErrorConstructor {
    new(errors: any[], message?: string, options?: ErrorOptions, ...ignored: any[]): AggregateError;
    (errors: any[], message?: string, options?: ErrorOptions, ...ignored: any[]): AggregateError;
}
declare var AggregateError: AggregateErrorConstructor;

interface Console {
    log(...data: unknown[]): void;
    error(...data: unknown[]): void;
    warn(...data: unknown[]): void;
    info(...data: unknown[]): void;
}
declare const console: Console;
declare module "console" {
    export const log: Console["log"];
    export const error: Console["error"];
    export const warn: Console["warn"];
    export const info: Console["info"];
    const defaultConsole: Console;
    export default defaultConsole;
}
declare module "node:console" {
    export const log: Console["log"];
    export const error: Console["error"];
    export const warn: Console["warn"];
    export const info: Console["info"];
    const defaultConsole: Console;
    export default defaultConsole;
}

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
    (time?: number[], ...ignored: any[]): number[];
    bigint(...ignored: any[]): bigint;
}
interface ProcessWritableStream {
    readonly closed: boolean;
    readonly destroyed: boolean;
    readonly errored: any;
    readonly fd: number;
    readonly isTTY: boolean;
    readonly readable: boolean;
    readonly writable: boolean;
    readonly writableCorked: number;
    readonly writableEnded: boolean;
    readonly writableFinished: boolean;
    readonly writableLength: number;
    readonly writableNeedDrain: boolean;
    addListener(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): void;
    cork(...ignored: any[]): void;
    end(callback?: () => void): void;
    end(chunk: string | Buffer, callback?: () => void): void;
    end(chunk: string | Buffer, encoding?: string, callback?: () => void): void;
    off(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): void;
    on(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): void;
    once(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): void;
    removeAllListeners(eventName?: string, ...ignored: any[]): void;
    removeListener(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): void;
    setDefaultEncoding(encoding: string, ...ignored: any[]): void;
    uncork(...ignored: any[]): void;
    write(chunk: string | Buffer, callback?: () => void): boolean;
    write(chunk: string | Buffer, encoding?: string, callback?: () => void): boolean;
}
interface ProcessReadableStream {
    readonly closed: boolean;
    readonly destroyed: boolean;
    readonly errored: any;
    readonly fd: number;
    readonly isTTY: boolean;
    readonly readable: boolean;
    readonly readableEnded: boolean;
    readonly readableFlowing: any;
    readonly readableLength: number;
    addListener(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): void;
    off(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): void;
    on(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): void;
    once(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): void;
    isPaused(...ignored: any[]): boolean;
    pause(...ignored: any[]): void;
    pipe(destination: ProcessWritableStream, ...ignored: any[]): void;
    read(size?: number, ...ignored: any[]): Buffer | null;
    removeAllListeners(eventName?: string, ...ignored: any[]): void;
    removeListener(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): void;
    resume(...ignored: any[]): void;
    setEncoding(encoding: string, ...ignored: any[]): void;
    unpipe(destination?: ProcessWritableStream, ...ignored: any[]): void;
}
interface StreamModule {
    isReadable(stream: any, ...ignored: any[]): boolean;
    isWritable(stream: any, ...ignored: any[]): boolean;
    isErrored(stream: any, ...ignored: any[]): boolean;
    isDestroyed(stream: any, ...ignored: any[]): boolean;
    isDisturbed(stream: any, ...ignored: any[]): boolean;
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
    readonly stdin: ProcessReadableStream;
    readonly stdout: ProcessWritableStream;
    readonly stderr: ProcessWritableStream;
    exit(code?: number): never;
    cwd(...ignored: any[]): string;
    chdir(directory: string): void;
    uptime(...ignored: any[]): number;
    hrtime: ProcessHrtime;
    nextTick(callback: (this: any) => void): void;
    nextTick<A>(callback: (this: any, arg: A) => void, arg: A): void;
    nextTick<A, B>(callback: (this: any, arg1: A, arg2: B) => void, arg1: A, arg2: B): void;
    nextTick<A, B, C>(callback: (this: any, arg1: A, arg2: B, arg3: C) => void, arg1: A, arg2: B, arg3: C): void;
    nextTick<A, B, C, D>(callback: (this: any, arg1: A, arg2: B, arg3: C, arg4: D) => void, arg1: A, arg2: B, arg3: C, arg4: D): void;
    nextTick<A, B, C, D, E>(callback: (this: any, arg1: A, arg2: B, arg3: C, arg4: D, arg5: E) => void, arg1: A, arg2: B, arg3: C, arg4: D, arg5: E): void;
    nextTick<A, B, C, D, E, F>(callback: (this: any, arg1: A, arg2: B, arg3: C, arg4: D, arg5: E, arg6: F) => void, arg1: A, arg2: B, arg3: C, arg4: D, arg5: E, arg6: F): void;
    nextTick(callback: (this: any, ...args: any[]) => void, ...args: any[]): void;
    getuid(...ignored: any[]): number;
    getgid(...ignored: any[]): number;
    geteuid(...ignored: any[]): number;
    getegid(...ignored: any[]): number;
    getgroups(...ignored: any[]): number[];
    umask(mask?: number, ...ignored: any[]): number;
    memoryUsage(...ignored: any[]): any;
    cpuUsage(previousValue?: any, ...ignored: any[]): any;
    resourceUsage(...ignored: any[]): any;
    kill(pid: number, signal?: 0 | 9 | 15 | "SIGTERM" | "SIGKILL"): boolean;
}
declare const process: Process;
declare module "stream" {
    export function isReadable(stream: any, ...ignored: any[]): boolean;
    export function isWritable(stream: any, ...ignored: any[]): boolean;
    export function isErrored(stream: any, ...ignored: any[]): boolean;
    export function isDestroyed(stream: any, ...ignored: any[]): boolean;
    export function isDisturbed(stream: any, ...ignored: any[]): boolean;
    const defaultStream: StreamModule;
    export default defaultStream;
}
declare module "node:stream" {
    export function isReadable(stream: any, ...ignored: any[]): boolean;
    export function isWritable(stream: any, ...ignored: any[]): boolean;
    export function isErrored(stream: any, ...ignored: any[]): boolean;
    export function isDestroyed(stream: any, ...ignored: any[]): boolean;
    export function isDisturbed(stream: any, ...ignored: any[]): boolean;
    const defaultStream: StreamModule;
    export default defaultStream;
}
declare module "process" {
    export const arch: Process["arch"];
    export const argv: Process["argv"];
    export const argv0: Process["argv0"];
    export const chdir: Process["chdir"];
    export const cpuUsage: Process["cpuUsage"];
    export const cwd: Process["cwd"];
    export const env: Process["env"];
    export const execArgv: Process["execArgv"];
    export const execPath: Process["execPath"];
    export const exit: Process["exit"];
    export const features: Process["features"];
    export const getegid: Process["getegid"];
    export const geteuid: Process["geteuid"];
    export const getgid: Process["getgid"];
    export const getgroups: Process["getgroups"];
    export const getuid: Process["getuid"];
    export const hrtime: Process["hrtime"];
    export const kill: Process["kill"];
    export const memoryUsage: Process["memoryUsage"];
    export const nextTick: Process["nextTick"];
    export const pid: Process["pid"];
    export const platform: Process["platform"];
    export const ppid: Process["ppid"];
    export const release: Process["release"];
    export const resourceUsage: Process["resourceUsage"];
    export const stderr: Process["stderr"];
    export const stdin: Process["stdin"];
    export const stdout: Process["stdout"];
    export const title: Process["title"];
    export const umask: Process["umask"];
    export const uptime: Process["uptime"];
    export const version: Process["version"];
    export const versions: Process["versions"];
    const defaultProcess: Process;
    export default defaultProcess;
}
declare module "node:process" {
    export const arch: Process["arch"];
    export const argv: Process["argv"];
    export const argv0: Process["argv0"];
    export const chdir: Process["chdir"];
    export const cpuUsage: Process["cpuUsage"];
    export const cwd: Process["cwd"];
    export const env: Process["env"];
    export const execArgv: Process["execArgv"];
    export const execPath: Process["execPath"];
    export const exit: Process["exit"];
    export const features: Process["features"];
    export const getegid: Process["getegid"];
    export const geteuid: Process["geteuid"];
    export const getgid: Process["getgid"];
    export const getgroups: Process["getgroups"];
    export const getuid: Process["getuid"];
    export const hrtime: Process["hrtime"];
    export const kill: Process["kill"];
    export const memoryUsage: Process["memoryUsage"];
    export const nextTick: Process["nextTick"];
    export const pid: Process["pid"];
    export const platform: Process["platform"];
    export const ppid: Process["ppid"];
    export const release: Process["release"];
    export const resourceUsage: Process["resourceUsage"];
    export const stderr: Process["stderr"];
    export const stdin: Process["stdin"];
    export const stdout: Process["stdout"];
    export const title: Process["title"];
    export const umask: Process["umask"];
    export const uptime: Process["uptime"];
    export const version: Process["version"];
    export const versions: Process["versions"];
    const defaultProcess: Process;
    export default defaultProcess;
}

declare function parseInt(value: any, radix?: number, ...ignored: any[]): number;
declare function parseFloat(value: any, ...ignored: any[]): number;
declare function encodeURI(uri: string, ...ignored: any[]): string;
declare function encodeURIComponent(uriComponent: string | number | boolean, ...ignored: any[]): string;
declare function decodeURI(encodedURI: string, ...ignored: any[]): string;
declare function decodeURIComponent(encodedURIComponent: string, ...ignored: any[]): string;
declare function isNaN(value: any, ...ignored: any[]): boolean;
declare function isFinite(value: any, ...ignored: any[]): boolean;
declare function btoa(value: string, ...ignored: any[]): string;
declare function atob(value: string, ...ignored: any[]): string;
declare function queueMicrotask(callback: (this: any) => void): void;
declare function setTimeout(callback: (this: any) => void, delay?: number): number;
declare function setTimeout<A>(callback: (this: any, arg: A) => void, delay: number, arg: A): number;
declare function setTimeout<A, B>(callback: (this: any, arg1: A, arg2: B) => void, delay: number, arg1: A, arg2: B): number;
declare function setTimeout<A, B, C>(callback: (this: any, arg1: A, arg2: B, arg3: C) => void, delay: number, arg1: A, arg2: B, arg3: C): number;
declare function setTimeout<A, B, C, D>(callback: (this: any, arg1: A, arg2: B, arg3: C, arg4: D) => void, delay: number, arg1: A, arg2: B, arg3: C, arg4: D): number;
declare function setTimeout<A, B, C, D, E>(callback: (this: any, arg1: A, arg2: B, arg3: C, arg4: D, arg5: E) => void, delay: number, arg1: A, arg2: B, arg3: C, arg4: D, arg5: E): number;
declare function setTimeout<A, B, C, D, E, F>(callback: (this: any, arg1: A, arg2: B, arg3: C, arg4: D, arg5: E, arg6: F) => void, delay: number, arg1: A, arg2: B, arg3: C, arg4: D, arg5: E, arg6: F): number;
declare function setTimeout(callback: (this: any, ...args: any[]) => void, delay?: number, ...args: any[]): number;
declare function clearTimeout(handle?: number, ...ignored: any[]): void;
declare function clearInterval(handle?: number, ...ignored: any[]): void;
declare function setImmediate(callback: (this: any) => void): number;
declare function setImmediate<A>(callback: (this: any, arg: A) => void, arg: A): number;
declare function setImmediate<A, B>(callback: (this: any, arg1: A, arg2: B) => void, arg1: A, arg2: B): number;
declare function setImmediate<A, B, C>(callback: (this: any, arg1: A, arg2: B, arg3: C) => void, arg1: A, arg2: B, arg3: C): number;
declare function setImmediate<A, B, C, D>(callback: (this: any, arg1: A, arg2: B, arg3: C, arg4: D) => void, arg1: A, arg2: B, arg3: C, arg4: D): number;
declare function setImmediate<A, B, C, D, E>(callback: (this: any, arg1: A, arg2: B, arg3: C, arg4: D, arg5: E) => void, arg1: A, arg2: B, arg3: C, arg4: D, arg5: E): number;
declare function setImmediate<A, B, C, D, E, F>(callback: (this: any, arg1: A, arg2: B, arg3: C, arg4: D, arg5: E, arg6: F) => void, arg1: A, arg2: B, arg3: C, arg4: D, arg5: E, arg6: F): number;
declare function setImmediate(callback: (this: any, ...args: any[]) => void, ...args: any[]): number;
declare function clearImmediate(handle?: number, ...ignored: any[]): void;
type SetTimeoutFunction = typeof setTimeout;
type ClearTimeoutFunction = typeof clearTimeout;
type ClearIntervalFunction = typeof clearInterval;
type SetImmediateFunction = typeof setImmediate;
type ClearImmediateFunction = typeof clearImmediate;
interface TimersModule {
    setTimeout: SetTimeoutFunction;
    clearTimeout: ClearTimeoutFunction;
    clearInterval: ClearIntervalFunction;
    setImmediate: SetImmediateFunction;
    clearImmediate: ClearImmediateFunction;
}
interface TimersPromisesModule {
    setTimeout<T = void>(delay?: number, value?: T, options?: TimersPromisesOptions): Promise<T>;
    setImmediate<T = void>(value?: T, options?: TimersPromisesOptions): Promise<T>;
    scheduler: TimersPromisesScheduler;
}
interface TimersPromisesOptions {
    ref?: boolean | undefined;
    signal?: undefined;
}
interface TimersPromisesScheduler {
    wait(delay?: number, options?: TimersPromisesOptions): Promise<void>;
    yield(): Promise<void>;
}
declare module "timers" {
    export const setTimeout: SetTimeoutFunction;
    export const clearTimeout: ClearTimeoutFunction;
    export const clearInterval: ClearIntervalFunction;
    export const setImmediate: SetImmediateFunction;
    export const clearImmediate: ClearImmediateFunction;
    const defaultTimers: TimersModule;
    export default defaultTimers;
}
declare module "node:timers" {
    export const setTimeout: SetTimeoutFunction;
    export const clearTimeout: ClearTimeoutFunction;
    export const clearInterval: ClearIntervalFunction;
    export const setImmediate: SetImmediateFunction;
    export const clearImmediate: ClearImmediateFunction;
    const defaultTimers: TimersModule;
    export default defaultTimers;
}
declare module "timers/promises" {
    export function setTimeout<T = void>(delay?: number, value?: T, options?: TimersPromisesOptions): Promise<T>;
    export function setImmediate<T = void>(value?: T, options?: TimersPromisesOptions): Promise<T>;
    export const scheduler: TimersPromisesScheduler;
    const defaultTimersPromises: TimersPromisesModule;
    export default defaultTimersPromises;
}
declare module "node:timers/promises" {
    export function setTimeout<T = void>(delay?: number, value?: T, options?: TimersPromisesOptions): Promise<T>;
    export function setImmediate<T = void>(value?: T, options?: TimersPromisesOptions): Promise<T>;
    export const scheduler: TimersPromisesScheduler;
    const defaultTimersPromises: TimersPromisesModule;
    export default defaultTimersPromises;
}
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
    floor(x: number, ...ignored: any[]): number;
    ceil(x: number, ...ignored: any[]): number;
    round(x: number, ...ignored: any[]): number;
    abs(x: number, ...ignored: any[]): number;
    trunc(x: number, ...ignored: any[]): number;
    sign(x: number, ...ignored: any[]): number;
    imul(x: number, y: number, ...ignored: any[]): number;
    clz32(x: number, ...ignored: any[]): number;
    fround(x: number, ...ignored: any[]): number;
    cbrt(x: number, ...ignored: any[]): number;
    sqrt(x: number, ...ignored: any[]): number;
    pow(x: number, y: number, ...ignored: any[]): number;
    hypot(...values: number[]): number;
    min(...values: number[]): number;
    max(...values: number[]): number;
    log(x: number, ...ignored: any[]): number;
    log1p(x: number, ...ignored: any[]): number;
    log2(x: number, ...ignored: any[]): number;
    log10(x: number, ...ignored: any[]): number;
    exp(x: number, ...ignored: any[]): number;
    expm1(x: number, ...ignored: any[]): number;
    sin(x: number, ...ignored: any[]): number;
    asin(x: number, ...ignored: any[]): number;
    cos(x: number, ...ignored: any[]): number;
    acos(x: number, ...ignored: any[]): number;
    tan(x: number, ...ignored: any[]): number;
    sinh(x: number, ...ignored: any[]): number;
    cosh(x: number, ...ignored: any[]): number;
    tanh(x: number, ...ignored: any[]): number;
    atan(x: number, ...ignored: any[]): number;
    asinh(x: number, ...ignored: any[]): number;
    acosh(x: number, ...ignored: any[]): number;
    atanh(x: number, ...ignored: any[]): number;
    atan2(y: number, x: number, ...ignored: any[]): number;
    random(...ignored: any[]): number;
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
    platform(...ignored: any[]): string;
    type(...ignored: any[]): string;
    release(...ignored: any[]): string;
    version(...ignored: any[]): string;
    endianness(...ignored: any[]): string;
    machine(...ignored: any[]): string;
    arch(...ignored: any[]): string;
    hostname(...ignored: any[]): string;
    tmpdir(...ignored: any[]): string;
    homedir(...ignored: any[]): string;
    cpus(...ignored: any[]): number[];
    availableParallelism(...ignored: any[]): number;
    totalmem(...ignored: any[]): number;
    freemem(...ignored: any[]): number;
    uptime(...ignored: any[]): number;
    loadavg(...ignored: any[]): number[];
    userInfo(options?: OSUserInfoOptions): any;
}
interface OSUserInfoOptions {
    encoding?: FSEncoding;
}
declare const os: OS;
declare module "os" {
    export const EOL: string;
    export const devNull: string;
    export function platform(...ignored: any[]): string;
    export function type(...ignored: any[]): string;
    export function release(...ignored: any[]): string;
    export function version(...ignored: any[]): string;
    export function endianness(...ignored: any[]): string;
    export function machine(...ignored: any[]): string;
    export function arch(...ignored: any[]): string;
    export function hostname(...ignored: any[]): string;
    export function tmpdir(...ignored: any[]): string;
    export function homedir(...ignored: any[]): string;
    export function cpus(...ignored: any[]): number[];
    export function availableParallelism(...ignored: any[]): number;
    export function totalmem(...ignored: any[]): number;
    export function freemem(...ignored: any[]): number;
    export function uptime(...ignored: any[]): number;
    export function loadavg(...ignored: any[]): number[];
    export function userInfo(options?: OSUserInfoOptions): any;
    const defaultOs: OS;
    export default defaultOs;
}
declare module "node:os" {
    export const EOL: string;
    export const devNull: string;
    export function platform(...ignored: any[]): string;
    export function type(...ignored: any[]): string;
    export function release(...ignored: any[]): string;
    export function version(...ignored: any[]): string;
    export function endianness(...ignored: any[]): string;
    export function machine(...ignored: any[]): string;
    export function arch(...ignored: any[]): string;
    export function hostname(...ignored: any[]): string;
    export function tmpdir(...ignored: any[]): string;
    export function homedir(...ignored: any[]): string;
    export function cpus(...ignored: any[]): number[];
    export function availableParallelism(...ignored: any[]): number;
    export function totalmem(...ignored: any[]): number;
    export function freemem(...ignored: any[]): number;
    export function uptime(...ignored: any[]): number;
    export function loadavg(...ignored: any[]): number[];
    export function userInfo(options?: OSUserInfoOptions): any;
    const defaultOs: OS;
    export default defaultOs;
}

interface Date {
    getTime(...ignored: any[]): number;
    getFullYear(...ignored: any[]): number;
    getYear(...ignored: any[]): number;
    getMonth(...ignored: any[]): number;
    getDate(...ignored: any[]): number;
    getDay(...ignored: any[]): number;
    getHours(...ignored: any[]): number;
    getMinutes(...ignored: any[]): number;
    getSeconds(...ignored: any[]): number;
    getMilliseconds(...ignored: any[]): number;
    getTimezoneOffset(...ignored: any[]): number;
    getUTCFullYear(...ignored: any[]): number;
    getUTCMonth(...ignored: any[]): number;
    getUTCDate(...ignored: any[]): number;
    getUTCDay(...ignored: any[]): number;
    getUTCHours(...ignored: any[]): number;
    getUTCMinutes(...ignored: any[]): number;
    getUTCSeconds(...ignored: any[]): number;
    getUTCMilliseconds(...ignored: any[]): number;
    setTime(time: number, ...ignored: any[]): number;
    setFullYear(year: number, month?: number, date?: number, ...ignored: any[]): number;
    setYear(year: number, ...ignored: any[]): number;
    setMonth(month: number, date?: number, ...ignored: any[]): number;
    setDate(date: number, ...ignored: any[]): number;
    setHours(hours: number, minutes?: number, seconds?: number, ms?: number, ...ignored: any[]): number;
    setMinutes(minutes: number, seconds?: number, ms?: number, ...ignored: any[]): number;
    setSeconds(seconds: number, ms?: number, ...ignored: any[]): number;
    setMilliseconds(ms: number, ...ignored: any[]): number;
    setUTCFullYear(year: number, month?: number, date?: number, ...ignored: any[]): number;
    setUTCMonth(month: number, date?: number, ...ignored: any[]): number;
    setUTCDate(date: number, ...ignored: any[]): number;
    setUTCHours(hours: number, minutes?: number, seconds?: number, ms?: number, ...ignored: any[]): number;
    setUTCMinutes(minutes: number, seconds?: number, ms?: number, ...ignored: any[]): number;
    setUTCSeconds(seconds: number, ms?: number, ...ignored: any[]): number;
    setUTCMilliseconds(ms: number, ...ignored: any[]): number;
    valueOf(...ignored: any[]): number;
    toString(...ignored: any[]): string;
    toLocaleString(...ignored: any[]): string;
    toLocaleDateString(...ignored: any[]): string;
    toLocaleTimeString(...ignored: any[]): string;
    toDateString(...ignored: any[]): string;
    toTimeString(...ignored: any[]): string;
    toISOString(...ignored: any[]): string;
    toUTCString(...ignored: any[]): string;
    toGMTString(...ignored: any[]): string;
    toJSON(key?: any, ...ignored: any[]): any;
}
interface DateConstructor {
    (...args: any[]): string;
    new(value?: number | string | Date): Date;
    new(year: number, month: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number, ...ignored: any[]): Date;
    now(...ignored: any[]): number;
    parse(text?: any, ...ignored: any[]): number;
    UTC(year?: number, month?: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number, ...ignored: any[]): number;
}
declare var Date: DateConstructor;

interface NumberConstructor {
    (value?: any, ...ignored: any[]): number;
    readonly EPSILON: number;
    readonly MAX_SAFE_INTEGER: number;
    readonly MAX_VALUE: number;
    readonly MIN_SAFE_INTEGER: number;
    readonly MIN_VALUE: number;
    readonly NaN: number;
    readonly NEGATIVE_INFINITY: number;
    readonly POSITIVE_INFINITY: number;
    isInteger(value: any, ...ignored: any[]): boolean;
    isFinite(value: any, ...ignored: any[]): boolean;
    isNaN(value: any, ...ignored: any[]): boolean;
    isSafeInteger(value: any, ...ignored: any[]): boolean;
    parseFloat(value: any, ...ignored: any[]): number;
    parseInt(value: any, radix?: number, ...ignored: any[]): number;
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
    isFile(...ignored: any[]): boolean;
    isDirectory(...ignored: any[]): boolean;
    isSymbolicLink(...ignored: any[]): boolean;
    isBlockDevice(...ignored: any[]): boolean;
    isCharacterDevice(...ignored: any[]): boolean;
    isFIFO(...ignored: any[]): boolean;
    isSocket(...ignored: any[]): boolean;
}
interface FSDirent {
    readonly name: string;
    isFile(...ignored: any[]): boolean;
    isDirectory(...ignored: any[]): boolean;
    isSymbolicLink(...ignored: any[]): boolean;
    isBlockDevice(...ignored: any[]): boolean;
    isCharacterDevice(...ignored: any[]): boolean;
    isFIFO(...ignored: any[]): boolean;
    isSocket(...ignored: any[]): boolean;
}
interface FSStatsOptions {
    bigint?: false;
    throwIfNoEntry?: boolean;
}
interface FSStatsNoEntryOptions {
    bigint?: false;
    throwIfNoEntry: false;
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
type FSReadFileStringEncoding = FSEncoding | "hex" | "base64";
type FSFileContentEncoding = FSEncoding | "hex" | "base64";
type FSPathResultEncoding = FSEncoding | "hex" | "base64";
type FSReaddirStringEncoding = FSEncoding | "hex" | "base64";
type FSBufferEncoding = "buffer";
interface FSEncodingOptions {
    encoding?: FSEncoding;
}
interface FSBufferEncodingOptions {
    encoding: FSBufferEncoding;
}
interface FSPathResultEncodingOptions {
    encoding?: FSPathResultEncoding | null;
}
type FSPathResultEncodingOption = FSPathResultEncoding | null | FSPathResultEncodingOptions;
type FSReadFileFlag = "r" | "rs" | "r+" | "rs+";
interface FSReadFileOptions {
    encoding?: FSReadFileStringEncoding;
    flag?: FSReadFileFlag;
}
interface FSReadFileBufferObjectOptions {
    encoding: FSBufferEncoding | null;
    flag?: FSReadFileFlag;
}
type FSReadFileBufferOptions = FSBufferEncoding | null | FSReadFileBufferObjectOptions;
type FSReadFileStringOptions = FSReadFileStringEncoding | FSReadFileOptions;
type FSWriteFileFlag = "w" | "wx" | "w+" | "wx+" | "a" | "ax" | "a+" | "ax+" | "as" | "as+" | "r+" | "rs+";
interface FSWriteFileOptions {
    encoding?: FSFileContentEncoding;
    flag?: FSWriteFileFlag;
    mode?: number;
    flush?: boolean;
}
type FSWriteFileEncodingOptions = FSFileContentEncoding | FSWriteFileOptions;
type FSAppendFileFlag = "a" | "ax" | "a+" | "ax+" | "as" | "as+";
interface FSAppendFileOptions {
    encoding?: FSFileContentEncoding;
    flag?: FSAppendFileFlag;
    mode?: number;
    flush?: boolean;
}
type FSAppendFileEncodingOptions = FSFileContentEncoding | FSAppendFileOptions;
interface FSReaddirOptions {
    encoding?: FSReaddirStringEncoding | null;
    recursive?: boolean;
    withFileTypes?: false;
}
type FSReaddirStringOptions = FSReaddirStringEncoding | null | FSReaddirOptions;
interface FSReaddirBufferOptions {
    encoding: FSBufferEncoding;
    recursive?: boolean;
    withFileTypes?: false;
}
interface FSReaddirDirentOptions extends FSEncodingOptions {
    recursive?: boolean;
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
    readonly O_RDONLY: number;
    readonly O_WRONLY: number;
    readonly O_RDWR: number;
    readonly O_CREAT: number;
    readonly O_EXCL: number;
    readonly O_TRUNC: number;
    readonly O_APPEND: number;
    readonly O_DIRECTORY: number;
    readonly O_NOFOLLOW: number;
    readonly COPYFILE_EXCL: number;
    readonly COPYFILE_FICLONE: number;
    readonly COPYFILE_FICLONE_FORCE: number;
}
interface FS {
    readonly constants: FSConstants;
    readFileSync(path: FSPathLike, options: FSReadFileBufferOptions, ...ignored: any[]): Buffer;
    readFileSync(path: FSPathLike, options?: FSReadFileStringOptions, ...ignored: any[]): string;
    writeFileSync(path: FSPathLike, data: string | Buffer, options?: FSWriteFileEncodingOptions, ...ignored: any[]): void;
    appendFileSync(path: FSPathLike, data: string | Buffer, options?: FSAppendFileEncodingOptions, ...ignored: any[]): void;
    existsSync(path: FSPathLike, ...ignored: any[]): boolean;
    accessSync(path: FSPathLike, mode?: number, ...ignored: any[]): void;
    readdirSync(path: FSPathLike, options: FSBufferEncoding | FSReaddirBufferOptions, ...ignored: any[]): Buffer[];
    readdirSync(path: FSPathLike, options: FSReaddirDirentOptions, ...ignored: any[]): FSDirent[];
    readdirSync(path: FSPathLike, options?: FSReaddirStringOptions, ...ignored: any[]): string[];
    statSync(path: FSPathLike, options: FSStatsNoEntryOptions, ...ignored: any[]): FSStats | undefined;
    statSync(path: FSPathLike, options?: FSStatsOptions, ...ignored: any[]): FSStats;
    lstatSync(path: FSPathLike, options: FSStatsNoEntryOptions, ...ignored: any[]): FSStats | undefined;
    lstatSync(path: FSPathLike, options?: FSStatsOptions, ...ignored: any[]): FSStats;
    realpathSync(path: FSPathLike, options: FSFileBufferEncodingOptions, ...ignored: any[]): Buffer;
    realpathSync(path: FSPathLike, options?: FSPathResultEncodingOption, ...ignored: any[]): string;
    readlinkSync(path: FSPathLike, options: FSFileBufferEncodingOptions, ...ignored: any[]): Buffer;
    readlinkSync(path: FSPathLike, options?: FSPathResultEncodingOption, ...ignored: any[]): string;
    symlinkSync(target: FSPathLike, path: FSPathLike, type?: FSSymlinkType, ...ignored: any[]): void;
    linkSync(existingPath: FSPathLike, newPath: FSPathLike, ...ignored: any[]): void;
    mkdtempSync(prefix: FSPathLike, options: FSFileBufferEncodingOptions, ...ignored: any[]): Buffer;
    mkdtempSync(prefix: FSPathLike, options?: FSPathResultEncodingOption, ...ignored: any[]): string;
    truncateSync(path: FSPathLike, len?: number, ...ignored: any[]): void;
    utimesSync(path: FSPathLike, atime: FSFileTime, mtime: FSFileTime, ...ignored: any[]): void;
    lutimesSync(path: FSPathLike, atime: FSFileTime, mtime: FSFileTime, ...ignored: any[]): void;
    chownSync(path: FSPathLike, uid: number, gid: number, ...ignored: any[]): void;
    lchownSync(path: FSPathLike, uid: number, gid: number, ...ignored: any[]): void;
    chmodSync(path: FSPathLike, mode: number, ...ignored: any[]): void;
    mkdirSync(path: FSPathLike, options?: number | FSMkdirOptions, ...ignored: any[]): void;
    unlinkSync(path: FSPathLike, ...ignored: any[]): void;
    rmSync(path: FSPathLike, options?: FSRmOptions, ...ignored: any[]): void;
    rmdirSync(path: FSPathLike, options?: FSRmdirOptions, ...ignored: any[]): void;
    cpSync(src: FSPathLike, dest: FSPathLike, options?: FSCpOptions, ...ignored: any[]): void;
    copyFileSync(src: FSPathLike, dest: FSPathLike, mode?: number, ...ignored: any[]): void;
    renameSync(oldPath: FSPathLike, newPath: FSPathLike, ...ignored: any[]): void;
    promises: FSPromises;
}
interface FSPromises {
    readFile(path: FSPathLike, options: FSReadFileBufferOptions, ...ignored: any[]): Promise<Buffer>;
    readFile(path: FSPathLike, options?: FSReadFileStringOptions, ...ignored: any[]): Promise<string>;
    writeFile(path: FSPathLike, data: string | Buffer, options?: FSWriteFileEncodingOptions, ...ignored: any[]): Promise<void>;
    appendFile(path: FSPathLike, data: string | Buffer, options?: FSAppendFileEncodingOptions, ...ignored: any[]): Promise<void>;
    readdir(path: FSPathLike, options: FSBufferEncoding | FSReaddirBufferOptions, ...ignored: any[]): Promise<Buffer[]>;
    readdir(path: FSPathLike, options: FSReaddirDirentOptions, ...ignored: any[]): Promise<FSDirent[]>;
    readdir(path: FSPathLike, options?: FSReaddirStringOptions, ...ignored: any[]): Promise<string[]>;
    stat(path: FSPathLike, options: FSStatsNoEntryOptions, ...ignored: any[]): Promise<FSStats | undefined>;
    stat(path: FSPathLike, options?: FSStatsOptions, ...ignored: any[]): Promise<FSStats>;
    lstat(path: FSPathLike, options: FSStatsNoEntryOptions, ...ignored: any[]): Promise<FSStats | undefined>;
    lstat(path: FSPathLike, options?: FSStatsOptions, ...ignored: any[]): Promise<FSStats>;
    realpath(path: FSPathLike, options: FSFileBufferEncodingOptions, ...ignored: any[]): Promise<Buffer>;
    realpath(path: FSPathLike, options?: FSPathResultEncodingOption, ...ignored: any[]): Promise<string>;
    readlink(path: FSPathLike, options: FSFileBufferEncodingOptions, ...ignored: any[]): Promise<Buffer>;
    readlink(path: FSPathLike, options?: FSPathResultEncodingOption, ...ignored: any[]): Promise<string>;
    symlink(target: FSPathLike, path: FSPathLike, type?: FSSymlinkType, ...ignored: any[]): Promise<void>;
    link(existingPath: FSPathLike, newPath: FSPathLike, ...ignored: any[]): Promise<void>;
    mkdtemp(prefix: FSPathLike, options: FSFileBufferEncodingOptions, ...ignored: any[]): Promise<Buffer>;
    mkdtemp(prefix: FSPathLike, options?: FSPathResultEncodingOption, ...ignored: any[]): Promise<string>;
    truncate(path: FSPathLike, len?: number, ...ignored: any[]): Promise<void>;
    utimes(path: FSPathLike, atime: FSFileTime, mtime: FSFileTime, ...ignored: any[]): Promise<void>;
    lutimes(path: FSPathLike, atime: FSFileTime, mtime: FSFileTime, ...ignored: any[]): Promise<void>;
    chown(path: FSPathLike, uid: number, gid: number, ...ignored: any[]): Promise<void>;
    lchown(path: FSPathLike, uid: number, gid: number, ...ignored: any[]): Promise<void>;
    chmod(path: FSPathLike, mode: number, ...ignored: any[]): Promise<void>;
    access(path: FSPathLike, mode?: number, ...ignored: any[]): Promise<void>;
    mkdir(path: FSPathLike, options?: number | FSMkdirOptions, ...ignored: any[]): Promise<void>;
    unlink(path: FSPathLike, ...ignored: any[]): Promise<void>;
    rm(path: FSPathLike, options?: FSRmOptions, ...ignored: any[]): Promise<void>;
    rmdir(path: FSPathLike, options?: FSRmdirOptions, ...ignored: any[]): Promise<void>;
    cp(src: FSPathLike, dest: FSPathLike, options?: FSCpOptions, ...ignored: any[]): Promise<void>;
    copyFile(src: FSPathLike, dest: FSPathLike, mode?: number, ...ignored: any[]): Promise<void>;
    rename(oldPath: FSPathLike, newPath: FSPathLike, ...ignored: any[]): Promise<void>;
}
declare const fs: FS;
declare module "fs" {
    export const constants: FSConstants;
    export const promises: FSPromises;
    export function readFileSync(path: FSPathLike, options: FSReadFileBufferOptions, ...ignored: any[]): Buffer;
    export function readFileSync(path: FSPathLike, options?: FSReadFileStringOptions, ...ignored: any[]): string;
    export function writeFileSync(path: FSPathLike, data: string | Buffer, options?: FSWriteFileEncodingOptions, ...ignored: any[]): void;
    export function appendFileSync(path: FSPathLike, data: string | Buffer, options?: FSAppendFileEncodingOptions, ...ignored: any[]): void;
    export function existsSync(path: FSPathLike, ...ignored: any[]): boolean;
    export function accessSync(path: FSPathLike, mode?: number, ...ignored: any[]): void;
    export function readdirSync(path: FSPathLike, options: FSBufferEncoding | FSReaddirBufferOptions, ...ignored: any[]): Buffer[];
    export function readdirSync(path: FSPathLike, options: FSReaddirDirentOptions, ...ignored: any[]): FSDirent[];
    export function readdirSync(path: FSPathLike, options?: FSReaddirStringOptions, ...ignored: any[]): string[];
    export function statSync(path: FSPathLike, options: FSStatsNoEntryOptions, ...ignored: any[]): FSStats | undefined;
    export function statSync(path: FSPathLike, options?: FSStatsOptions, ...ignored: any[]): FSStats;
    export function lstatSync(path: FSPathLike, options: FSStatsNoEntryOptions, ...ignored: any[]): FSStats | undefined;
    export function lstatSync(path: FSPathLike, options?: FSStatsOptions, ...ignored: any[]): FSStats;
    export function realpathSync(path: FSPathLike, options: FSFileBufferEncodingOptions, ...ignored: any[]): Buffer;
    export function realpathSync(path: FSPathLike, options?: FSPathResultEncodingOption, ...ignored: any[]): string;
    export function readlinkSync(path: FSPathLike, options: FSFileBufferEncodingOptions, ...ignored: any[]): Buffer;
    export function readlinkSync(path: FSPathLike, options?: FSPathResultEncodingOption, ...ignored: any[]): string;
    export function symlinkSync(target: FSPathLike, path: FSPathLike, type?: FSSymlinkType, ...ignored: any[]): void;
    export function linkSync(existingPath: FSPathLike, newPath: FSPathLike, ...ignored: any[]): void;
    export function mkdtempSync(prefix: FSPathLike, options: FSFileBufferEncodingOptions, ...ignored: any[]): Buffer;
    export function mkdtempSync(prefix: FSPathLike, options?: FSPathResultEncodingOption, ...ignored: any[]): string;
    export function truncateSync(path: FSPathLike, len?: number, ...ignored: any[]): void;
    export function utimesSync(path: FSPathLike, atime: FSFileTime, mtime: FSFileTime, ...ignored: any[]): void;
    export function lutimesSync(path: FSPathLike, atime: FSFileTime, mtime: FSFileTime, ...ignored: any[]): void;
    export function chownSync(path: FSPathLike, uid: number, gid: number, ...ignored: any[]): void;
    export function lchownSync(path: FSPathLike, uid: number, gid: number, ...ignored: any[]): void;
    export function chmodSync(path: FSPathLike, mode: number, ...ignored: any[]): void;
    export function mkdirSync(path: FSPathLike, options?: number | FSMkdirOptions, ...ignored: any[]): void;
    export function unlinkSync(path: FSPathLike, ...ignored: any[]): void;
    export function rmSync(path: FSPathLike, options?: FSRmOptions, ...ignored: any[]): void;
    export function rmdirSync(path: FSPathLike, options?: FSRmdirOptions, ...ignored: any[]): void;
    export function cpSync(src: FSPathLike, dest: FSPathLike, options?: FSCpOptions, ...ignored: any[]): void;
    export function copyFileSync(src: FSPathLike, dest: FSPathLike, mode?: number, ...ignored: any[]): void;
    export function renameSync(oldPath: FSPathLike, newPath: FSPathLike, ...ignored: any[]): void;
    const defaultFs: FS;
    export default defaultFs;
}
declare module "node:fs" {
    export const constants: FSConstants;
    export const promises: FSPromises;
    export function readFileSync(path: FSPathLike, options: FSReadFileBufferOptions, ...ignored: any[]): Buffer;
    export function readFileSync(path: FSPathLike, options?: FSReadFileStringOptions, ...ignored: any[]): string;
    export function writeFileSync(path: FSPathLike, data: string | Buffer, options?: FSWriteFileEncodingOptions, ...ignored: any[]): void;
    export function appendFileSync(path: FSPathLike, data: string | Buffer, options?: FSAppendFileEncodingOptions, ...ignored: any[]): void;
    export function existsSync(path: FSPathLike, ...ignored: any[]): boolean;
    export function accessSync(path: FSPathLike, mode?: number, ...ignored: any[]): void;
    export function readdirSync(path: FSPathLike, options: FSBufferEncoding | FSReaddirBufferOptions, ...ignored: any[]): Buffer[];
    export function readdirSync(path: FSPathLike, options: FSReaddirDirentOptions, ...ignored: any[]): FSDirent[];
    export function readdirSync(path: FSPathLike, options?: FSReaddirStringOptions, ...ignored: any[]): string[];
    export function statSync(path: FSPathLike, options: FSStatsNoEntryOptions, ...ignored: any[]): FSStats | undefined;
    export function statSync(path: FSPathLike, options?: FSStatsOptions, ...ignored: any[]): FSStats;
    export function lstatSync(path: FSPathLike, options: FSStatsNoEntryOptions, ...ignored: any[]): FSStats | undefined;
    export function lstatSync(path: FSPathLike, options?: FSStatsOptions, ...ignored: any[]): FSStats;
    export function realpathSync(path: FSPathLike, options: FSFileBufferEncodingOptions, ...ignored: any[]): Buffer;
    export function realpathSync(path: FSPathLike, options?: FSPathResultEncodingOption, ...ignored: any[]): string;
    export function readlinkSync(path: FSPathLike, options: FSFileBufferEncodingOptions, ...ignored: any[]): Buffer;
    export function readlinkSync(path: FSPathLike, options?: FSPathResultEncodingOption, ...ignored: any[]): string;
    export function symlinkSync(target: FSPathLike, path: FSPathLike, type?: FSSymlinkType, ...ignored: any[]): void;
    export function linkSync(existingPath: FSPathLike, newPath: FSPathLike, ...ignored: any[]): void;
    export function mkdtempSync(prefix: FSPathLike, options: FSFileBufferEncodingOptions, ...ignored: any[]): Buffer;
    export function mkdtempSync(prefix: FSPathLike, options?: FSPathResultEncodingOption, ...ignored: any[]): string;
    export function truncateSync(path: FSPathLike, len?: number, ...ignored: any[]): void;
    export function utimesSync(path: FSPathLike, atime: FSFileTime, mtime: FSFileTime, ...ignored: any[]): void;
    export function lutimesSync(path: FSPathLike, atime: FSFileTime, mtime: FSFileTime, ...ignored: any[]): void;
    export function chownSync(path: FSPathLike, uid: number, gid: number, ...ignored: any[]): void;
    export function lchownSync(path: FSPathLike, uid: number, gid: number, ...ignored: any[]): void;
    export function chmodSync(path: FSPathLike, mode: number, ...ignored: any[]): void;
    export function mkdirSync(path: FSPathLike, options?: number | FSMkdirOptions, ...ignored: any[]): void;
    export function unlinkSync(path: FSPathLike, ...ignored: any[]): void;
    export function rmSync(path: FSPathLike, options?: FSRmOptions, ...ignored: any[]): void;
    export function rmdirSync(path: FSPathLike, options?: FSRmdirOptions, ...ignored: any[]): void;
    export function cpSync(src: FSPathLike, dest: FSPathLike, options?: FSCpOptions, ...ignored: any[]): void;
    export function copyFileSync(src: FSPathLike, dest: FSPathLike, mode?: number, ...ignored: any[]): void;
    export function renameSync(oldPath: FSPathLike, newPath: FSPathLike, ...ignored: any[]): void;
    const defaultFs: FS;
    export default defaultFs;
}
declare module "fs/promises" {
    export const readFile: FSPromises["readFile"];
    export const writeFile: FSPromises["writeFile"];
    export const appendFile: FSPromises["appendFile"];
    export const readdir: FSPromises["readdir"];
    export const stat: FSPromises["stat"];
    export const lstat: FSPromises["lstat"];
    export const realpath: FSPromises["realpath"];
    export const readlink: FSPromises["readlink"];
    export const symlink: FSPromises["symlink"];
    export const link: FSPromises["link"];
    export const mkdtemp: FSPromises["mkdtemp"];
    export const truncate: FSPromises["truncate"];
    export const utimes: FSPromises["utimes"];
    export const lutimes: FSPromises["lutimes"];
    export const chown: FSPromises["chown"];
    export const lchown: FSPromises["lchown"];
    export const chmod: FSPromises["chmod"];
    export const access: FSPromises["access"];
    export const mkdir: FSPromises["mkdir"];
    export const unlink: FSPromises["unlink"];
    export const rm: FSPromises["rm"];
    export const rmdir: FSPromises["rmdir"];
    export const cp: FSPromises["cp"];
    export const copyFile: FSPromises["copyFile"];
    export const rename: FSPromises["rename"];
    const defaultPromises: FSPromises;
    export default defaultPromises;
}
declare module "node:fs/promises" {
    export const readFile: FSPromises["readFile"];
    export const writeFile: FSPromises["writeFile"];
    export const appendFile: FSPromises["appendFile"];
    export const readdir: FSPromises["readdir"];
    export const stat: FSPromises["stat"];
    export const lstat: FSPromises["lstat"];
    export const realpath: FSPromises["realpath"];
    export const readlink: FSPromises["readlink"];
    export const symlink: FSPromises["symlink"];
    export const link: FSPromises["link"];
    export const mkdtemp: FSPromises["mkdtemp"];
    export const truncate: FSPromises["truncate"];
    export const utimes: FSPromises["utimes"];
    export const lutimes: FSPromises["lutimes"];
    export const chown: FSPromises["chown"];
    export const lchown: FSPromises["lchown"];
    export const chmod: FSPromises["chmod"];
    export const access: FSPromises["access"];
    export const mkdir: FSPromises["mkdir"];
    export const unlink: FSPromises["unlink"];
    export const rm: FSPromises["rm"];
    export const rmdir: FSPromises["rmdir"];
    export const cp: FSPromises["cp"];
    export const copyFile: FSPromises["copyFile"];
    export const rename: FSPromises["rename"];
    const defaultPromises: FSPromises;
    export default defaultPromises;
}

interface Path {
    readonly sep: string;
    readonly delimiter: string;
    readonly posix: Path;
    join(...parts: string[]): string;
    resolve(...parts: string[]): string;
    normalize(p: string, ...ignored: any[]): string;
    isAbsolute(p: string, ...ignored: any[]): boolean;
    relative(from: string, to: string, ...ignored: any[]): string;
    toNamespacedPath(p: string, ...ignored: any[]): string;
    basename(p: string, suffix?: string, ...ignored: any[]): string;
    dirname(p: string, ...ignored: any[]): string;
    extname(p: string, ...ignored: any[]): string;
    parse(p: string, ...ignored: any[]): any;
    format(pathObject: any, ...ignored: any[]): string;
}
declare const path: Path;
declare module "path" {
    export const sep: string;
    export const delimiter: string;
    export const posix: Path;
    export function join(...parts: string[]): string;
    export function resolve(...parts: string[]): string;
    export function normalize(p: string, ...ignored: any[]): string;
    export function isAbsolute(p: string, ...ignored: any[]): boolean;
    export function relative(from: string, to: string, ...ignored: any[]): string;
    export function toNamespacedPath(p: string, ...ignored: any[]): string;
    export function basename(p: string, suffix?: string, ...ignored: any[]): string;
    export function dirname(p: string, ...ignored: any[]): string;
    export function extname(p: string, ...ignored: any[]): string;
    export function parse(p: string, ...ignored: any[]): any;
    export function format(pathObject: any, ...ignored: any[]): string;
    const defaultPath: Path;
    export default defaultPath;
}
declare module "node:path" {
    export const sep: string;
    export const delimiter: string;
    export const posix: Path;
    export function join(...parts: string[]): string;
    export function resolve(...parts: string[]): string;
    export function normalize(p: string, ...ignored: any[]): string;
    export function isAbsolute(p: string, ...ignored: any[]): boolean;
    export function relative(from: string, to: string, ...ignored: any[]): string;
    export function toNamespacedPath(p: string, ...ignored: any[]): string;
    export function basename(p: string, suffix?: string, ...ignored: any[]): string;
    export function dirname(p: string, ...ignored: any[]): string;
    export function extname(p: string, ...ignored: any[]): string;
    export function parse(p: string, ...ignored: any[]): any;
    export function format(pathObject: any, ...ignored: any[]): string;
    const defaultPath: Path;
    export default defaultPath;
}
declare module "path/posix" {
    export const sep: string;
    export const delimiter: string;
    export function join(...parts: string[]): string;
    export function resolve(...parts: string[]): string;
    export function normalize(p: string, ...ignored: any[]): string;
    export function isAbsolute(p: string, ...ignored: any[]): boolean;
    export function relative(from: string, to: string, ...ignored: any[]): string;
    export function toNamespacedPath(p: string, ...ignored: any[]): string;
    export function basename(p: string, suffix?: string, ...ignored: any[]): string;
    export function dirname(p: string, ...ignored: any[]): string;
    export function extname(p: string, ...ignored: any[]): string;
    export function parse(p: string, ...ignored: any[]): any;
    export function format(pathObject: any, ...ignored: any[]): string;
    const defaultPath: Path;
    export default defaultPath;
}
declare module "node:path/posix" {
    export const sep: string;
    export const delimiter: string;
    export function join(...parts: string[]): string;
    export function resolve(...parts: string[]): string;
    export function normalize(p: string, ...ignored: any[]): string;
    export function isAbsolute(p: string, ...ignored: any[]): boolean;
    export function relative(from: string, to: string, ...ignored: any[]): string;
    export function toNamespacedPath(p: string, ...ignored: any[]): string;
    export function basename(p: string, suffix?: string, ...ignored: any[]): string;
    export function dirname(p: string, ...ignored: any[]): string;
    export function extname(p: string, ...ignored: any[]): string;
    export function parse(p: string, ...ignored: any[]): any;
    export function format(pathObject: any, ...ignored: any[]): string;
    const defaultPath: Path;
    export default defaultPath;
}

type CryptoHashAlgorithm = "sha1" | "sha256" | "sha512";
interface CryptoRandomUUIDOptions {
    disableEntropyCache?: boolean;
}
interface CryptoHash {
    update(data: string | Buffer): CryptoHash;
    digest(encoding: "hex" | "base64"): string;
}
interface Crypto {
    createHash(algorithm: CryptoHashAlgorithm): CryptoHash;
    randomBytes(size: number): Buffer;
    randomUUID(options?: CryptoRandomUUIDOptions, ...ignored: any[]): string;
}
declare const crypto: Crypto;
declare module "crypto" {
    export function createHash(algorithm: CryptoHashAlgorithm): CryptoHash;
    export function randomBytes(size: number): Buffer;
    export function randomUUID(options?: CryptoRandomUUIDOptions, ...ignored: any[]): string;
    const defaultCrypto: Crypto;
    export default defaultCrypto;
}
declare module "node:crypto" {
    export function createHash(algorithm: CryptoHashAlgorithm): CryptoHash;
    export function randomBytes(size: number): Buffer;
    export function randomUUID(options?: CryptoRandomUUIDOptions, ...ignored: any[]): string;
    const defaultCrypto: Crypto;
    export default defaultCrypto;
}

type BufferEncoding = "utf8" | "utf-8" | "hex" | "base64";
interface Buffer {
    readonly length: number;
    toLocaleString(...ignored: any[]): string;
    toJSON(...ignored: any[]): any;
    toString(encoding?: BufferEncoding, ...ignored: any[]): string;
    valueOf(...ignored: any[]): Buffer;
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
    swap16(...ignored: any[]): Buffer;
    swap32(...ignored: any[]): Buffer;
    swap64(...ignored: any[]): Buffer;
    copy(target: Buffer, targetStart?: number, sourceStart?: number, sourceEnd?: number): number;
    indexOf(value: number | string | Buffer, byteOffset?: number): number;
    lastIndexOf(value: number | string | Buffer, byteOffset?: number): number;
    includes(value: number | string | Buffer, byteOffset?: number): boolean;
    equals(other: Buffer, ...ignored: any[]): boolean;
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
    isBuffer(value: unknown, ...ignored: any[]): boolean;
    byteLength(value: string | Buffer, encoding?: BufferEncoding, ...ignored: any[]): number;
    isEncoding(encoding: string, ...ignored: any[]): boolean;
    compare(a: Buffer, b: Buffer, ...ignored: any[]): number;
}
declare var Buffer: BufferConstructor;
interface BufferModule {
    Buffer: BufferConstructor;
    atob(value: string, ...ignored: any[]): string;
    btoa(value: string, ...ignored: any[]): string;
}
declare module "buffer" {
    export const Buffer: BufferConstructor;
    export function atob(value: string, ...ignored: any[]): string;
    export function btoa(value: string, ...ignored: any[]): string;
    const defaultBuffer: BufferModule;
    export default defaultBuffer;
}
declare module "node:buffer" {
    export const Buffer: BufferConstructor;
    export function atob(value: string, ...ignored: any[]): string;
    export function btoa(value: string, ...ignored: any[]): string;
    const defaultBuffer: BufferModule;
    export default defaultBuffer;
}

interface Event {
    readonly type: string;
    readonly target: EventTarget;
    readonly currentTarget: EventTarget;
    readonly defaultPrevented: boolean;
    readonly cancelable: boolean;
    preventDefault(...ignored: any[]): void;
}
interface EventInit {
    cancelable?: boolean;
}
interface EventConstructor {
    new(type: string, eventInitDict?: EventInit): Event;
}
declare var Event: EventConstructor;

interface EventTarget {
    addEventListener(type: string, listener: (this: EventTarget, event: Event) => void, options?: boolean | AddEventListenerOptions): void;
    removeEventListener(type: string, listener: (this: EventTarget, event: Event) => void, options?: boolean | EventListenerOptions): void;
    dispatchEvent(event: Event): boolean;
}
interface EventTargetConstructor {
    new(...ignored: any[]): EventTarget;
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
    on(eventName: string, listener: (this: EventEmitter, ...args: any[]) => void): this;
    addListener(eventName: string, listener: (this: EventEmitter, ...args: any[]) => void): this;
    prependListener(eventName: string, listener: (this: EventEmitter, ...args: any[]) => void): this;
    once(eventName: string, listener: (this: EventEmitter, ...args: any[]) => void): this;
    prependOnceListener(eventName: string, listener: (this: EventEmitter, ...args: any[]) => void): this;
    off(eventName: string, listener: (this: EventEmitter, ...args: any[]) => void): this;
    removeListener(eventName: string, listener: (this: EventEmitter, ...args: any[]) => void): this;
    removeAllListeners(eventName?: string): this;
    emit(eventName: string, ...args: any[]): boolean;
    listenerCount(eventName: string, listener?: (this: EventEmitter, ...args: any[]) => void): number;
    listeners(eventName: string): any[];
    rawListeners(eventName: string): any[];
    eventNames(...ignored: any[]): string[];
    setMaxListeners(n: number): this;
    getMaxListeners(...ignored: any[]): number;
}
interface EventEmitterConstructor {
    new(...ignored: any[]): EventEmitter;
    defaultMaxListeners: number;
    listenerCount(emitter: EventEmitter, eventName: string, listener?: (this: EventEmitter, ...args: any[]) => void, ...ignored: any[]): number;
}
declare var EventEmitter: EventEmitterConstructor;
interface EventEmitterOnceOptions {
    signal?: any;
}
interface EventsModule {
    EventEmitter: EventEmitterConstructor;
    defaultMaxListeners: number;
    listenerCount(emitter: EventEmitter, eventName: string, listener?: (this: EventEmitter, ...args: any[]) => void, ...ignored: any[]): number;
    getEventListeners(emitter: EventEmitter, eventName: string, ...ignored: any[]): any[];
    once(emitter: EventEmitter, eventName: string, options?: EventEmitterOnceOptions): Promise<any[]>;
    setMaxListeners(n: number, emitter: EventEmitter): void;
    getMaxListeners(emitter: EventEmitter, ...ignored: any[]): number;
}
declare module "events" {
    export const EventEmitter: EventEmitterConstructor;
    export let defaultMaxListeners: number;
    export function listenerCount(emitter: EventEmitter, eventName: string, listener?: (this: EventEmitter, ...args: any[]) => void, ...ignored: any[]): number;
    export function getEventListeners(emitter: EventEmitter, eventName: string, ...ignored: any[]): any[];
    export function once(emitter: EventEmitter, eventName: string, options?: EventEmitterOnceOptions): Promise<any[]>;
    export function setMaxListeners(n: number, emitter: EventEmitter): void;
    export function getMaxListeners(emitter: EventEmitter, ...ignored: any[]): number;
    const defaultEvents: EventsModule;
    export default defaultEvents;
}
declare module "node:events" {
    export const EventEmitter: EventEmitterConstructor;
    export let defaultMaxListeners: number;
    export function listenerCount(emitter: EventEmitter, eventName: string, listener?: (this: EventEmitter, ...args: any[]) => void, ...ignored: any[]): number;
    export function getEventListeners(emitter: EventEmitter, eventName: string, ...ignored: any[]): any[];
    export function once(emitter: EventEmitter, eventName: string, options?: EventEmitterOnceOptions): Promise<any[]>;
    export function setMaxListeners(n: number, emitter: EventEmitter): void;
    export function getMaxListeners(emitter: EventEmitter, ...ignored: any[]): number;
    const defaultEvents: EventsModule;
    export default defaultEvents;
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
    const defaultDns: DNS;
    export default defaultDns;
}
declare module "node:dns" {
    export const ADDRCONFIG: number;
    export const V4MAPPED: number;
    export const ALL: number;
    export const promises: DnsPromises;
    export function lookup(hostname: string, callback: DnsLookupCallback): void;
    export function lookup(hostname: string, options: DnsLookupOptions | DnsLookupFamily, callback: DnsLookupCallback): void;
    export function lookup(hostname: string, options: DnsLookupOptions | DnsLookupFamily, callback: DnsLookupAllCallback): void;
    const defaultDns: DNS;
    export default defaultDns;
}
declare module "dns/promises" {
    export const lookup: DnsPromises["lookup"];
    const defaultDnsPromises: DnsPromises;
    export default defaultDnsPromises;
}
declare module "node:dns/promises" {
    export const lookup: DnsPromises["lookup"];
    const defaultDnsPromises: DnsPromises;
    export default defaultDnsPromises;
}

interface Net {
    isIP(input: string, ...ignored: any[]): number;
    isIPv4(input: string, ...ignored: any[]): boolean;
    isIPv6(input: string, ...ignored: any[]): boolean;
}
declare const net: Net;
declare module "net" {
    export function isIP(input: string, ...ignored: any[]): number;
    export function isIPv4(input: string, ...ignored: any[]): boolean;
    export function isIPv6(input: string, ...ignored: any[]): boolean;
    const defaultNet: Net;
    export default defaultNet;
}
declare module "node:net" {
    export function isIP(input: string, ...ignored: any[]): number;
    export function isIPv4(input: string, ...ignored: any[]): boolean;
    export function isIPv6(input: string, ...ignored: any[]): boolean;
    const defaultNet: Net;
    export default defaultNet;
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
    encoding?: "utf8" | "utf-8" | "buffer";
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
    encoding?: "utf8" | "utf-8" | "buffer";
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
interface ChildProcessModule {
    exec(command: string, callback: ChildProcessExecCallback): void;
    exec(command: string, options: ChildProcessExecOptions, callback: ChildProcessExecCallback): void;
    execFile(file: string, callback: ChildProcessExecCallback): void;
    execFile(file: string, options: ChildProcessExecFileOptions, callback: ChildProcessExecCallback): void;
    execFile(file: string, args: string[], callback: ChildProcessExecCallback): void;
    execFile(file: string, args: string[], options: ChildProcessExecFileOptions, callback: ChildProcessExecCallback): void;
    execSync(command: string, options: ChildProcessExecSyncStringOptions): string;
    execSync(command: string, options: ChildProcessExecSyncBufferOptions): Buffer;
    execSync(command: string, options?: ChildProcessExecSyncOptions): Buffer;
    execFileSync(file: string, options: ChildProcessExecFileSyncStringOptions): string;
    execFileSync(file: string, options: ChildProcessExecFileSyncBufferOptions): Buffer;
    execFileSync(file: string, options: ChildProcessExecFileSyncOptions): Buffer;
    execFileSync(file: string, args: string[], options: ChildProcessExecFileSyncStringOptions): string;
    execFileSync(file: string, args: string[], options: ChildProcessExecFileSyncBufferOptions): Buffer;
    execFileSync(file: string, args?: string[], options?: ChildProcessExecFileSyncOptions): Buffer;
    spawnSync(file: string, options: ChildProcessSpawnSyncUtf8Options): any;
    spawnSync(file: string, args: string[], options: ChildProcessSpawnSyncUtf8Options): any;
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
    const defaultChildProcess: ChildProcessModule;
    export default defaultChildProcess;
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
    const defaultChildProcess: ChildProcessModule;
    export default defaultChildProcess;
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
    toJSON(...ignored: any[]): string;
    toLocaleString(...ignored: any[]): string;
    toString(...ignored: any[]): string;
    valueOf(...ignored: any[]): URL;
}
interface URLConstructor {
    new (input: string, base?: string): URL;
    canParse(input: string, base?: string): boolean;
}
declare var URL: URLConstructor;
type URLPathLike = string | URL;
interface UrlModule {
    URL: URLConstructor;
    fileURLToPath(url: URLPathLike): string;
    pathToFileURL(path: string): URL;
}
declare module "url" {
    export const URL: URLConstructor;
    export function fileURLToPath(url: URLPathLike): string;
    export function pathToFileURL(path: string): URL;
    const defaultUrl: UrlModule;
    export default defaultUrl;
}
declare module "node:url" {
    export const URL: URLConstructor;
    export function fileURLToPath(url: URLPathLike): string;
    export function pathToFileURL(path: string): URL;
    const defaultUrl: UrlModule;
    export default defaultUrl;
}
