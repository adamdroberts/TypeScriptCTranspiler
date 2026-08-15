// TypeScriptC minimal global/type shim.
// Declarations here are ambient globals because this file has no imports/exports.

type Extract<T, U> = T extends U ? T : never;

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
    readonly asyncDispose: symbol;
    readonly dispose: symbol;
    readonly unscopables: symbol;
    readonly isConcatSpreadable: symbol;
    readonly toStringTag: symbol;
    readonly species: symbol;
}
declare var Symbol: SymbolConstructor;

interface Disposable {
    [Symbol.dispose](): void;
}
interface AsyncDisposable {
    [Symbol.asyncDispose](): PromiseLike<void>;
}

interface IteratorYieldResult<T> { done?: false; value: T; }
interface IteratorReturnResult<TReturn> { done: true; value: TReturn; }
type IteratorResult<T, TReturn = any> = IteratorYieldResult<T> | IteratorReturnResult<TReturn>;
interface Iterator<T, TReturn = any, TNext = undefined> {
    next(value?: TNext, ...ignored: any[]): IteratorResult<T, TReturn>;
}
interface Iterable<T> {
    [Symbol.iterator](): Iterator<T>;
}
interface IterableIterator<T> extends Iterator<T> {
    [Symbol.iterator](): IterableIterator<T>;
}
interface Generator<T = unknown, TReturn = any, TNext = unknown> extends Iterator<T, TReturn, TNext> {
    next(value?: TNext, ...ignored: any[]): IteratorResult<T, TReturn>;
    return(value?: TReturn, ...ignored: any[]): IteratorResult<T, TReturn>;
    throw(e: any, ...ignored: any[]): IteratorResult<T, TReturn>;
    [Symbol.iterator](): Generator<T, TReturn, TNext>;
}

interface PromiseLike<T> {
    then<TResult1 = T, TResult2 = never>(
        onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
        ...ignored: any[]
    ): PromiseLike<TResult1 | TResult2>;
}
interface Promise<T> {
    then<TResult = T, TRejectResult = never>(onfulfilled: ((value: T) => TResult | Promise<TResult>) | undefined, onrejected: (reason: any) => TRejectResult | Promise<TRejectResult>, ...ignored: any[]): Promise<TResult | TRejectResult>;
    then<TResult = T>(onfulfilled?: (value: T) => TResult | Promise<TResult>, ...ignored: any[]): Promise<TResult>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | Promise<TResult>) | undefined, ...ignored: any[]): Promise<T | TResult>;
    finally(onfinally?: (() => void) | undefined, ...ignored: any[]): Promise<T>;
}
interface PromiseWithResolvers<T> {
    promise: Promise<T>;
    resolve(value: T | PromiseLike<T>): void;
    reject(reason?: any): void;
}
interface PromiseConstructor {
    new<T>(executor: (resolve: (value: T) => void, reject: (reason: any) => void) => void, ...ignored: any[]): Promise<T>;
    resolve<T>(value: Promise<T>, ...ignored: any[]): Promise<T>;
    resolve<T>(value: T, ...ignored: any[]): Promise<T>;
    resolve(): Promise<void>;
    reject<T = never>(reason?: any, ...ignored: any[]): Promise<T>;
    withResolvers<T>(): PromiseWithResolvers<T>;
    all<T>(values: Promise<T>[], ...ignored: any[]): Promise<T[]>;
    all<T>(values: Set<Promise<T>>, ...ignored: any[]): Promise<T[]>;
    all(values: Map<any, any>, ...ignored: any[]): Promise<any[]>;
    all<T>(values: Iterable<T | PromiseLike<T>>, ...ignored: any[]): Promise<T[]>;
    allSettled<T>(values: Promise<T>[], ...ignored: any[]): Promise<any[]>;
    allSettled<T>(values: Set<Promise<T>>, ...ignored: any[]): Promise<any[]>;
    allSettled(values: Map<any, any>, ...ignored: any[]): Promise<any[]>;
    allSettled<T>(values: Iterable<T | PromiseLike<T>>, ...ignored: any[]): Promise<any[]>;
    race<T>(values: Promise<T>[], ...ignored: any[]): Promise<T>;
    race<T>(values: Set<Promise<T>>, ...ignored: any[]): Promise<T>;
    race(values: Map<any, any>, ...ignored: any[]): Promise<any>;
    race<T>(values: Iterable<T | PromiseLike<T>>, ...ignored: any[]): Promise<T>;
    any<T>(values: Promise<T>[], ...ignored: any[]): Promise<T>;
    any<T>(values: Set<Promise<T>>, ...ignored: any[]): Promise<T>;
    any(values: Map<any, any>, ...ignored: any[]): Promise<any>;
    any<T>(values: Iterable<T | PromiseLike<T>>, ...ignored: any[]): Promise<T>;
    try<T>(callback: () => T | Promise<T>, ...ignored: any[]): Promise<T>;
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
    indexOf(searchElement: T, fromIndex?: number, ...ignored: any[]): number;
    lastIndexOf(searchElement: T, fromIndex?: number, ...ignored: any[]): number;
    includes(searchElement: T, fromIndex?: number, ...ignored: any[]): boolean;
    at(index?: number, ...ignored: any[]): T | undefined;
    reverse(...ignored: any[]): T[];
    toReversed(...ignored: any[]): T[];
    sort(cmp?: (a: T, b: T) => number, ...ignored: any[]): T[];
    toSorted(cmp?: (a: T, b: T) => number, ...ignored: any[]): T[];
    with(index: number, value: T, ...ignored: any[]): T[];
    splice(start?: number, deleteCount?: number, ...items: T[]): T[];
    toSpliced(start?: number, deleteCount?: number, ...items: T[]): T[];
    fill(value: T, start?: number, end?: number, ...ignored: any[]): T[];
    copyWithin(target: number, start: number, end?: number, ...ignored: any[]): T[];
    flat(depth: 0, ...ignored: any[]): T[];
    flat<U>(this: U[][], depth?: 1, ...ignored: any[]): U[];
    flat<U>(this: U[][][], depth: 2, ...ignored: any[]): U[];
    slice(start?: number, end?: number, ...ignored: any[]): T[];
    concat(...items: (T | T[])[]): T[];
    join(sep?: string, ...ignored: any[]): string;
    keys(...ignored: any[]): number[];
    values(...ignored: any[]): T[];
    entries(...ignored: any[]): [string, T][];
    toLocaleString(...ignored: any[]): string;
    toString(...ignored: any[]): string;
    valueOf(...ignored: any[]): T[];
    forEach(cb: (element: T, index: number, array: T[]) => void, thisArg?: any, ...ignored: any[]): void;
    map<U>(cb: (element: T, index: number, array: T[]) => U, thisArg?: any, ...ignored: any[]): U[];
    flatMap<U>(cb: (element: T, index: number, array: T[]) => U[], thisArg?: any, ...ignored: any[]): U[];
    flatMap<U>(cb: (element: T, index: number, array: T[]) => U, thisArg?: any, ...ignored: any[]): U[];
    filter(cb: (element: T, index: number, array: T[]) => boolean, thisArg?: any, ...ignored: any[]): T[];
    reduce(cb: (acc: T, element: T, index: number, array: T[]) => T): T;
    reduce<U>(cb: (acc: U, element: T, index: number, array: T[]) => U, init: U, ...ignored: any[]): U;
    reduceRight(cb: (acc: T, element: T, index: number, array: T[]) => T): T;
    reduceRight<U>(cb: (acc: U, element: T, index: number, array: T[]) => U, init: U, ...ignored: any[]): U;
    find(cb: (element: T, index: number, array: T[]) => boolean, thisArg?: any, ...ignored: any[]): T | undefined;
    findIndex(cb: (element: T, index: number, array: T[]) => boolean, thisArg?: any, ...ignored: any[]): number;
    findLast(cb: (element: T, index: number, array: T[]) => boolean, thisArg?: any, ...ignored: any[]): T | undefined;
    findLastIndex(cb: (element: T, index: number, array: T[]) => boolean, thisArg?: any, ...ignored: any[]): number;
    some(cb: (element: T, index: number, array: T[]) => boolean, thisArg?: any, ...ignored: any[]): boolean;
    every(cb: (element: T, index: number, array: T[]) => boolean, thisArg?: any, ...ignored: any[]): boolean;
    [n: number]: T;
    [Symbol.iterator](): IterableIterator<T>;
}

interface ReadonlyArray<T> extends Iterable<T> {
    readonly length: number;
    indexOf(searchElement: T, fromIndex?: number, ...ignored: any[]): number;
    lastIndexOf(searchElement: T, fromIndex?: number, ...ignored: any[]): number;
    includes(searchElement: T, fromIndex?: number, ...ignored: any[]): boolean;
    at(index?: number, ...ignored: any[]): T | undefined;
    toReversed(...ignored: any[]): T[];
    toSorted(cmp?: (a: T, b: T) => number, ...ignored: any[]): T[];
    with(index: number, value: T, ...ignored: any[]): T[];
    toSpliced(start?: number, deleteCount?: number, ...items: T[]): T[];
    slice(start?: number, end?: number, ...ignored: any[]): T[];
    concat(...items: (T | T[])[]): T[];
    join(sep?: string, ...ignored: any[]): string;
    keys(...ignored: any[]): number[];
    values(...ignored: any[]): T[];
    entries(...ignored: any[]): [string, T][];
    toLocaleString(...ignored: any[]): string;
    toString(...ignored: any[]): string;
    valueOf(...ignored: any[]): T[];
    forEach(cb: (element: T, index: number, array: ReadonlyArray<T>) => void, thisArg?: any, ...ignored: any[]): void;
    map<U>(cb: (element: T, index: number, array: ReadonlyArray<T>) => U, thisArg?: any, ...ignored: any[]): U[];
    filter(cb: (element: T, index: number, array: ReadonlyArray<T>) => boolean, thisArg?: any, ...ignored: any[]): T[];
    reduce(cb: (acc: T, element: T, index: number, array: ReadonlyArray<T>) => T): T;
    reduce<U>(cb: (acc: U, element: T, index: number, array: ReadonlyArray<T>) => U, init: U, ...ignored: any[]): U;
    reduceRight(cb: (acc: T, element: T, index: number, array: ReadonlyArray<T>) => T): T;
    reduceRight<U>(cb: (acc: U, element: T, index: number, array: ReadonlyArray<T>) => U, init: U, ...ignored: any[]): U;
    find(cb: (element: T, index: number, array: ReadonlyArray<T>) => boolean, thisArg?: any, ...ignored: any[]): T | undefined;
    findIndex(cb: (element: T, index: number, array: ReadonlyArray<T>) => boolean, thisArg?: any, ...ignored: any[]): number;
    findLast(cb: (element: T, index: number, array: ReadonlyArray<T>) => boolean, thisArg?: any, ...ignored: any[]): T | undefined;
    findLastIndex(cb: (element: T, index: number, array: ReadonlyArray<T>) => boolean, thisArg?: any, ...ignored: any[]): number;
    some(cb: (element: T, index: number, array: ReadonlyArray<T>) => boolean, thisArg?: any, ...ignored: any[]): boolean;
    every(cb: (element: T, index: number, array: ReadonlyArray<T>) => boolean, thisArg?: any, ...ignored: any[]): boolean;
    [n: number]: T;
    [Symbol.iterator](): IterableIterator<T>;
}

interface Object {
    __defineGetter__(p: string, getter: () => any, ...ignored: any[]): void;
    __defineSetter__(p: string, setter: (value: any) => void, ...ignored: any[]): void;
    __lookupGetter__(p: string, ...ignored: any[]): (() => any) | undefined;
    __lookupSetter__(p: string, ...ignored: any[]): ((value: any) => void) | undefined;
    hasOwnProperty(p: PropertyKey, ...ignored: any[]): boolean;
    isPrototypeOf(v: any, ...ignored: any[]): boolean;
    propertyIsEnumerable(p: PropertyKey, ...ignored: any[]): boolean;
    toLocaleString(...ignored: any[]): string;
    toString(...ignored: any[]): string;
    valueOf(...ignored: any[]): any;
}
type ObjectEntry<T, K = string> = [K, T];
type Record<K extends string | number | symbol, T> = { [P in K]: T };
interface ObjectConstructor {
    (value?: any, ...ignored: any[]): any;
    readonly prototype: Object;
    assign<T, U>(target: T, source: U): T & U;
    assign<T, U, V>(target: T, source1: U, source2: V): T & U & V;
    assign(target: any, ...sources: any[]): any;
    keys(o: unknown, ...ignored: any[]): string[];
    values(o: string, ...ignored: any[]): string[];
    values<T>(o: T[], ...ignored: any[]): T[];
    values<T>(o: ReadonlyArray<T>, ...ignored: any[]): T[];
    values<T extends object>(o: T, ...ignored: any[]): T[keyof T][];
    values(o: unknown, ...ignored: any[]): any[];
    entries(o: string, ...ignored: any[]): ObjectEntry<string>[];
    entries<T>(o: T[], ...ignored: any[]): ObjectEntry<T>[];
    entries<T>(o: ReadonlyArray<T>, ...ignored: any[]): ObjectEntry<T>[];
    entries<T extends object>(o: T, ...ignored: any[]): ObjectEntry<T[keyof T]>[];
    entries(o: unknown, ...ignored: any[]): ObjectEntry<any>[];
    fromEntries<T>(entries: ObjectEntry<any>[], ...ignored: any[]): T;
    fromEntries<T>(entries: Map<string, any>, ...ignored: any[]): T;
    fromEntries<T>(entries: URLSearchParams, ...ignored: any[]): T;
    create(o: any, properties?: any, ...ignored: any[]): any;
    defineProperty<T>(o: T, p: PropertyKey, attributes: any, ...ignored: any[]): T;
    defineProperties<T>(o: T, properties: any, ...ignored: any[]): T;
    getPrototypeOf(o: any, ...ignored: any[]): any;
    getOwnPropertyDescriptor(o: any, p: PropertyKey, ...ignored: any[]): any;
    getOwnPropertyDescriptors(o: any, ...ignored: any[]): any;
    getOwnPropertyNames(o: any, ...ignored: any[]): string[];
    getOwnPropertySymbols(o: any, ...ignored: any[]): symbol[];
    hasOwn(o: any, p: PropertyKey, ...ignored: any[]): boolean;
    is(value1: any, value2: any, ...ignored: any[]): boolean;
    freeze<T>(o: T, ...ignored: any[]): T;
    isFrozen(o: any, ...ignored: any[]): boolean;
    isExtensible(o: any, ...ignored: any[]): boolean;
    isSealed(o: any, ...ignored: any[]): boolean;
    preventExtensions<T>(o: T, ...ignored: any[]): T;
    seal<T>(o: T, ...ignored: any[]): T;
    setPrototypeOf<T>(o: T, proto: any, ...ignored: any[]): T;
    groupBy<T>(items: T[], keyFn: (item: T, index: number) => string, ...ignored: any[]): unknown;
    groupBy<T>(items: Set<T>, keyFn: (item: T, index: number) => string, ...ignored: any[]): unknown;
    groupBy<MK, MV>(items: Map<MK, MV>, keyFn: (item: ObjectEntry<MV, MK>, index: number) => string, ...ignored: any[]): unknown;
    groupBy(items: string, keyFn: (item: string, index: number) => string, ...ignored: any[]): unknown;
    groupBy(items: any, keyFn: (item: any, index: number) => string, ...ignored: any[]): unknown;
}
declare var Object: ObjectConstructor;

interface ReflectConstructor {
    apply(target: any, thisArgument: any, argumentsList: any[], ...ignored: any[]): any;
    construct(target: any, argumentsList: any[], newTarget?: any, ...ignored: any[]): any;
    defineProperty(target: any, propertyKey: PropertyKey, attributes: any, ...ignored: any[]): boolean;
    deleteProperty(target: any, propertyKey: PropertyKey, ...ignored: any[]): boolean;
    get(target: any, propertyKey: PropertyKey, receiver?: any, ...ignored: any[]): any;
    getPrototypeOf(target: any, ...ignored: any[]): any;
    getOwnPropertyDescriptor(target: any, propertyKey: PropertyKey, ...ignored: any[]): any;
    has(target: any, propertyKey: PropertyKey, ...ignored: any[]): boolean;
    isExtensible(target: any, ...ignored: any[]): boolean;
    ownKeys(target: any, ...ignored: any[]): string[];
    preventExtensions(target: any, ...ignored: any[]): boolean;
    set(target: any, propertyKey: PropertyKey, value: any, receiver?: any, ...ignored: any[]): boolean;
    setPrototypeOf(target: any, proto: any, ...ignored: any[]): boolean;
}
declare var Reflect: ReflectConstructor;

interface ArrayConstructor {
    new <T>(...items: T[]): T[];
    (...items: any[]): any[];
    readonly prototype: any[];
    readonly [Symbol.species]: ArrayConstructor;
    isArray(arg: unknown, ...ignored: any[]): arg is any[];
    from(s: string): string[];
    from<T>(arr: T[]): T[];
    from<T>(set: Set<T>): T[];
    from<K, T>(map: Map<K, T>): ObjectEntry<T, K>[];
    from(params: URLSearchParams): ObjectEntry<string, string>[];
    from<T>(arr: T[], mapfn: undefined, thisArg?: any, ...ignored: any[]): T[];
    from<T>(set: Set<T>, mapfn: undefined, thisArg?: any, ...ignored: any[]): T[];
    from<K, T>(map: Map<K, T>, mapfn: undefined, thisArg?: any, ...ignored: any[]): ObjectEntry<T, K>[];
    from(params: URLSearchParams, mapfn: undefined, thisArg?: any, ...ignored: any[]): ObjectEntry<string, string>[];
    from(s: string, mapfn: undefined, thisArg?: any, ...ignored: any[]): string[];
    from(items: any, mapfn: undefined, thisArg?: any, ...ignored: any[]): any[];
    from<U>(s: string, mapfn: (v: string, k: number) => U, thisArg?: any, ...ignored: any[]): U[];
    from<T, U>(arr: T[], mapfn: (v: T, k: number) => U, thisArg?: any, ...ignored: any[]): U[];
    from<T, U>(set: Set<T>, mapfn: (v: T, k: number) => U, thisArg?: any, ...ignored: any[]): U[];
    from<K, T, U>(map: Map<K, T>, mapfn: (v: ObjectEntry<T, K>, k: number) => U, thisArg?: any, ...ignored: any[]): U[];
    from<U>(params: URLSearchParams, mapfn: (v: ObjectEntry<string, string>, k: number) => U, thisArg?: any, ...ignored: any[]): U[];
    fromAsync(s: string): Promise<string[]>;
    fromAsync<T>(arr: Promise<T>[]): Promise<T[]>;
    fromAsync<T>(arr: T[]): Promise<T[]>;
    fromAsync<T>(set: Set<Promise<T>>): Promise<T[]>;
    fromAsync<T>(set: Set<T>): Promise<T[]>;
    fromAsync<K, T>(map: Map<K, T>): Promise<ObjectEntry<T, K>[]>;
    fromAsync(items: any): Promise<any[]>;
    fromAsync(s: string, mapfn: undefined, thisArg?: any, ...ignored: any[]): Promise<string[]>;
    fromAsync<T>(arr: Promise<T>[], mapfn: undefined, thisArg?: any, ...ignored: any[]): Promise<T[]>;
    fromAsync<T>(arr: T[], mapfn: undefined, thisArg?: any, ...ignored: any[]): Promise<T[]>;
    fromAsync<T>(set: Set<Promise<T>>, mapfn: undefined, thisArg?: any, ...ignored: any[]): Promise<T[]>;
    fromAsync<T>(set: Set<T>, mapfn: undefined, thisArg?: any, ...ignored: any[]): Promise<T[]>;
    fromAsync<K, T>(map: Map<K, T>, mapfn: undefined, thisArg?: any, ...ignored: any[]): Promise<ObjectEntry<T, K>[]>;
    fromAsync(items: any, mapfn: undefined, thisArg?: any, ...ignored: any[]): Promise<any[]>;
    fromAsync<U>(s: string, mapfn: (v: string, k: number) => Promise<U>, thisArg?: any, ...ignored: any[]): Promise<U[]>;
    fromAsync<T, U>(arr: T[], mapfn: (v: T, k: number) => Promise<U>, thisArg?: any, ...ignored: any[]): Promise<U[]>;
    fromAsync<T, U>(set: Set<T>, mapfn: (v: T, k: number) => Promise<U>, thisArg?: any, ...ignored: any[]): Promise<U[]>;
    fromAsync<K, T, U>(map: Map<K, T>, mapfn: (v: ObjectEntry<T, K>, k: number) => Promise<U>, thisArg?: any, ...ignored: any[]): Promise<U[]>;
    fromAsync<U>(items: any, mapfn: (v: any, k: number) => Promise<U>, thisArg?: any, ...ignored: any[]): Promise<U[]>;
    fromAsync<U>(s: string, mapfn: (v: string, k: number) => U, thisArg?: any, ...ignored: any[]): Promise<U[]>;
    fromAsync<T, U>(arr: T[], mapfn: (v: T, k: number) => U, thisArg?: any, ...ignored: any[]): Promise<U[]>;
    fromAsync<T, U>(set: Set<T>, mapfn: (v: T, k: number) => U, thisArg?: any, ...ignored: any[]): Promise<U[]>;
    fromAsync<K, T, U>(map: Map<K, T>, mapfn: (v: ObjectEntry<T, K>, k: number) => U, thisArg?: any, ...ignored: any[]): Promise<U[]>;
    fromAsync<U>(items: any, mapfn: (v: any, k: number) => U, thisArg?: any, ...ignored: any[]): Promise<U[]>;
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
    forEach(cb: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any, ...ignored: any[]): void;
    toLocaleString(...ignored: any[]): string;
    toString(...ignored: any[]): string;
    valueOf(...ignored: any[]): Map<K, V>;
    [Symbol.iterator](): IterableIterator<[K, V]>;
}
interface MapConstructor {
    new <K, V>(entries: ObjectEntry<V, K>[], ...ignored: any[]): Map<K, V>;
    new <K, V>(entries: Map<K, V>, ...ignored: any[]): Map<K, V>;
    new <K, V>(): Map<K, V>;
    groupBy<T, K>(items: T[], callbackfn: (value: T, index: number) => K, ...ignored: any[]): Map<K, T[]>;
    groupBy<T, K>(items: Set<T>, callbackfn: (value: T, index: number) => K, ...ignored: any[]): Map<K, T[]>;
    groupBy<MK, MV, K>(items: Map<MK, MV>, callbackfn: (value: ObjectEntry<MV, MK>, index: number) => K, ...ignored: any[]): Map<K, ObjectEntry<MV, MK>[]>;
    groupBy<K>(items: string, callbackfn: (value: string, index: number) => K, ...ignored: any[]): Map<K, string[]>;
    groupBy<K>(items: any, callbackfn: (value: any, index: number) => K, ...ignored: any[]): Map<K, any[]>;
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
    entries(...ignored: any[]): ObjectEntry<T, T>[];
    forEach(cb: (value: T, value2: T, set: Set<T>) => void, thisArg?: any, ...ignored: any[]): void;
    union(other: Set<T>, ...ignored: any[]): Set<T>;
    intersection(other: Set<T>, ...ignored: any[]): Set<T>;
    difference(other: Set<T>, ...ignored: any[]): Set<T>;
    symmetricDifference(other: Set<T>, ...ignored: any[]): Set<T>;
    isSubsetOf(other: Set<T>, ...ignored: any[]): boolean;
    isSupersetOf(other: Set<T>, ...ignored: any[]): boolean;
    isDisjointFrom(other: Set<T>, ...ignored: any[]): boolean;
    toLocaleString(...ignored: any[]): string;
    toString(...ignored: any[]): string;
    valueOf(...ignored: any[]): Set<T>;
    [Symbol.iterator](): IterableIterator<T>;
}
interface SetConstructor {
    new <T>(values: T[], ...ignored: any[]): Set<T>;
    new <T>(values: Set<T>, ...ignored: any[]): Set<T>;
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
    new <K extends object, V>(entries: ObjectEntry<V, K>[], ...ignored: any[]): WeakMap<K, V>;
    new <K extends object, V>(entries: Map<K, V>, ...ignored: any[]): WeakMap<K, V>;
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
    new <T extends object>(values: T[], ...ignored: any[]): WeakSet<T>;
    new <T extends object>(values: Set<T>, ...ignored: any[]): WeakSet<T>;
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
    new <T extends object>(target: T, ...ignored: any[]): WeakRef<T>;
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
    constructor(target: T, handler: ProxyHandler<T>, ...ignored: any[]);
    static revocable<T extends object>(target: T, handler: ProxyHandler<T>, ...ignored: any[]): any;
}

declare namespace Reflect {
    function apply(target: any, thisArgument: any, argumentsList: ArrayLike<any>, ...ignored: any[]): any;
    function construct(target: Function, argumentsList: ArrayLike<any>, newTarget?: Function, ...ignored: any[]): any;
    function defineProperty(target: object, propertyKey: PropertyKey, attributes: PropertyDescriptor, ...ignored: any[]): boolean;
    function deleteProperty(target: object, propertyKey: PropertyKey, ...ignored: any[]): boolean;
    function get(target: object, propertyKey: PropertyKey, receiver?: any, ...ignored: any[]): any;
    function getOwnPropertyDescriptor(target: object, propertyKey: PropertyKey, ...ignored: any[]): PropertyDescriptor | undefined;
    function getPrototypeOf(target: object, ...ignored: any[]): object | null;
    function has(target: object, propertyKey: PropertyKey, ...ignored: any[]): boolean;
    function isExtensible(target: object, ...ignored: any[]): boolean;
    function ownKeys(target: object, ...ignored: any[]): ArrayLike<PropertyKey>;
    function preventExtensions(target: object, ...ignored: any[]): boolean;
    function set(target: object, propertyKey: PropertyKey, value: any, receiver?: any, ...ignored: any[]): boolean;
    function setPrototypeOf(target: object, proto: object | null, ...ignored: any[]): boolean;
}

interface FinalizationRegistry<T> {
    register(target: object, heldValue: T, unregisterToken?: object, ...ignored: any[]): void;
    unregister(unregisterToken: object, ...ignored: any[]): boolean;
    toLocaleString(...ignored: any[]): string;
    toString(...ignored: any[]): string;
    valueOf(...ignored: any[]): FinalizationRegistry<T>;
}
interface FinalizationRegistryConstructor {
    new <T>(cleanupCallback: (heldValue: T) => void, ...ignored: any[]): FinalizationRegistry<T>;
}
declare var FinalizationRegistry: FinalizationRegistryConstructor;
interface ArrayBuffer {
    readonly byteLength: number;
}
interface ArrayBufferConstructor {
    new(byteLength?: number): ArrayBuffer;
}
declare var ArrayBuffer: ArrayBufferConstructor;
interface DataView {
    readonly buffer: ArrayBuffer;
    readonly byteLength: number;
    readonly byteOffset: number;
}
interface DataViewConstructor {
    new(buffer: ArrayBuffer, byteOffset?: number, byteLength?: number): DataView;
}
declare var DataView: DataViewConstructor;
interface Function {
    (...args: any[]): any;
    call(thisArg: any, ...args: any[]): any;
    apply(thisArg: any, args?: any[] | ArrayLike<any> | null, ...ignored: any[]): any;
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
    new(pattern: string, flags?: string, ...ignored: any[]): RegExp;
    (pattern: string, flags?: string, ...ignored: any[]): RegExp;
    escape(text: string, ...ignored: any[]): string;
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
interface SuppressedError extends Error {
    error: any;
    suppressed: any;
}
interface SuppressedErrorConstructor {
    new(error: any, suppressed: any, message?: string, ...ignored: any[]): SuppressedError;
    (error: any, suppressed: any, message?: string, ...ignored: any[]): SuppressedError;
}
declare var SuppressedError: SuppressedErrorConstructor;

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
interface ProcessMemoryUsageFn {
    (...ignored: any[]): any;
    rss(...ignored: any[]): number;
}
interface ProcessHrtime {
    (time?: number[], ...ignored: any[]): number[];
    bigint(...ignored: any[]): bigint;
}
interface ProcessReadableState {
    readonly highWaterMark: number;
    readonly length: number;
    readonly objectMode: boolean;
    readonly ended: boolean;
    readonly flowing: any;
    readonly destroyed: boolean;
    readonly errored: any;
}
interface ProcessWritableState {
    readonly highWaterMark: number;
    readonly length: number;
    readonly objectMode: boolean;
    readonly ended: boolean;
    readonly finished: boolean;
    readonly destroyed: boolean;
    readonly errored: any;
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
    readonly writableHighWaterMark: number;
    readonly writableLength: number;
    readonly writableNeedDrain: boolean;
    readonly columns: number;
    readonly rows: number;
    readonly _writableState: ProcessWritableState;
    addListener(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): void;
    cork(...ignored: any[]): void;
    destroy(error?: any, ...ignored: any[]): void;
    end(callback?: () => void, ...ignored: any[]): void;
    end(chunk: string | Buffer, callback?: () => void, ...ignored: any[]): void;
    end(chunk: string | Buffer, encoding?: string, callback?: () => void, ...ignored: any[]): void;
    off(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): void;
    on(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): void;
    once(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): void;
    removeAllListeners(eventName?: string, ...ignored: any[]): void;
    removeListener(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): void;
    setDefaultEncoding(encoding: string, ...ignored: any[]): void;
    uncork(...ignored: any[]): void;
    write(chunk: string | Buffer, callback?: () => void, ...ignored: any[]): boolean;
    write(chunk: string | Buffer, encoding?: string, callback?: () => void, ...ignored: any[]): boolean;
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
    readonly readableHighWaterMark: number;
    readonly readableLength: number;
    readonly _readableState: ProcessReadableState;
    addListener(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): void;
    destroy(error?: any, ...ignored: any[]): void;
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
    isReadable(stream: any, ...ignored: any[]): boolean | null;
    isWritable(stream: any, ...ignored: any[]): boolean | null;
    isErrored(stream: any, ...ignored: any[]): boolean;
    isDestroyed(stream: any, ...ignored: any[]): boolean | null;
    isDisturbed(stream: any, ...ignored: any[]): boolean;
}
type POSIXSignalName = "SIGHUP" | "SIGINT" | "SIGQUIT" | "SIGILL" | "SIGTRAP" | "SIGABRT" | "SIGBUS" | "SIGFPE" | "SIGKILL" | "SIGUSR1" | "SIGSEGV" | "SIGUSR2" | "SIGPIPE" | "SIGALRM" | "SIGTERM";
type POSIXSignalNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
type ProcessSignal = 0 | POSIXSignalName | POSIXSignalNumber;
type ChildProcessKillSignal = POSIXSignalName | POSIXSignalNumber;
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
    readonly allowedNodeEnvironmentFlags: Set<string>;
    argv: string[];
    argv0: string;
    execPath: string;
    execArgv: string[];
    env: ProcessEnv;
    readonly stdin: ProcessReadableStream;
    readonly stdout: ProcessWritableStream;
    readonly stderr: ProcessWritableStream;
    exit(code?: number, ...ignored: any[]): never;
    cwd(...ignored: any[]): string;
    chdir(directory: string, ...ignored: any[]): void;
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
    memoryUsage: ProcessMemoryUsageFn;
    cpuUsage(previousValue?: any, ...ignored: any[]): any;
    resourceUsage(...ignored: any[]): any;
    kill(pid: number, signal?: ProcessSignal, ...ignored: any[]): boolean;
}
declare const process: Process;
declare module "stream" {
    export function isReadable(stream: any, ...ignored: any[]): boolean | null;
    export function isWritable(stream: any, ...ignored: any[]): boolean | null;
    export function isErrored(stream: any, ...ignored: any[]): boolean;
    export function isDestroyed(stream: any, ...ignored: any[]): boolean | null;
    export function isDisturbed(stream: any, ...ignored: any[]): boolean;
    const defaultStream: StreamModule;
    export default defaultStream;
}
declare module "node:stream" {
    export function isReadable(stream: any, ...ignored: any[]): boolean | null;
    export function isWritable(stream: any, ...ignored: any[]): boolean | null;
    export function isErrored(stream: any, ...ignored: any[]): boolean;
    export function isDestroyed(stream: any, ...ignored: any[]): boolean | null;
    export function isDisturbed(stream: any, ...ignored: any[]): boolean;
    const defaultStream: StreamModule;
    export default defaultStream;
}
declare module "process" {
    export const allowedNodeEnvironmentFlags: Process["allowedNodeEnvironmentFlags"];
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
    export const allowedNodeEnvironmentFlags: Process["allowedNodeEnvironmentFlags"];
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
declare function structuredClone<T>(value: T, ...ignored: any[]): T;
declare function encodeURI(uri: string, ...ignored: any[]): string;
declare function encodeURIComponent(uriComponent: string | number | boolean, ...ignored: any[]): string;
declare function decodeURI(encodedURI: string, ...ignored: any[]): string;
declare function decodeURIComponent(encodedURIComponent: string, ...ignored: any[]): string;
declare function isNaN(value: any, ...ignored: any[]): boolean;
declare function isFinite(value: any, ...ignored: any[]): boolean;
declare function btoa(value: string, ...ignored: any[]): string;
declare function atob(value: string, ...ignored: any[]): string;
declare function queueMicrotask(callback: (this: any) => void, ...ignored: any[]): void;
declare function setTimeout(callback: (this: any) => void, delay?: number): number;
declare function setTimeout<A>(callback: (this: any, arg: A) => void, delay: number, arg: A): number;
declare function setTimeout<A, B>(callback: (this: any, arg1: A, arg2: B) => void, delay: number, arg1: A, arg2: B): number;
declare function setTimeout<A, B, C>(callback: (this: any, arg1: A, arg2: B, arg3: C) => void, delay: number, arg1: A, arg2: B, arg3: C): number;
declare function setTimeout<A, B, C, D>(callback: (this: any, arg1: A, arg2: B, arg3: C, arg4: D) => void, delay: number, arg1: A, arg2: B, arg3: C, arg4: D): number;
declare function setTimeout<A, B, C, D, E>(callback: (this: any, arg1: A, arg2: B, arg3: C, arg4: D, arg5: E) => void, delay: number, arg1: A, arg2: B, arg3: C, arg4: D, arg5: E): number;
declare function setTimeout<A, B, C, D, E, F>(callback: (this: any, arg1: A, arg2: B, arg3: C, arg4: D, arg5: E, arg6: F) => void, delay: number, arg1: A, arg2: B, arg3: C, arg4: D, arg5: E, arg6: F): number;
declare function setTimeout(callback: (this: any, ...args: any[]) => void, delay?: number, ...args: any[]): number;
declare function clearTimeout(handle?: number, ...ignored: any[]): void;
declare function setInterval(callback: (this: any) => void, delay?: number): number;
declare function setInterval<A>(callback: (this: any, arg: A) => void, delay: number, arg: A): number;
declare function setInterval<A, B>(callback: (this: any, arg1: A, arg2: B) => void, delay: number, arg1: A, arg2: B): number;
declare function setInterval<A, B, C>(callback: (this: any, arg1: A, arg2: B, arg3: C) => void, delay: number, arg1: A, arg2: B, arg3: C): number;
declare function setInterval<A, B, C, D>(callback: (this: any, arg1: A, arg2: B, arg3: C, arg4: D) => void, delay: number, arg1: A, arg2: B, arg3: C, arg4: D): number;
declare function setInterval<A, B, C, D, E>(callback: (this: any, arg1: A, arg2: B, arg3: C, arg4: D, arg5: E) => void, delay: number, arg1: A, arg2: B, arg3: C, arg4: D, arg5: E): number;
declare function setInterval<A, B, C, D, E, F>(callback: (this: any, arg1: A, arg2: B, arg3: C, arg4: D, arg5: E, arg6: F) => void, delay: number, arg1: A, arg2: B, arg3: C, arg4: D, arg5: E, arg6: F): number;
declare function setInterval(callback: (this: any, ...args: any[]) => void, delay?: number, ...args: any[]): number;
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
type SetIntervalFunction = typeof setInterval;
type ClearIntervalFunction = typeof clearInterval;
type SetImmediateFunction = typeof setImmediate;
type ClearImmediateFunction = typeof clearImmediate;
interface TimersModule {
    setTimeout: SetTimeoutFunction;
    clearTimeout: ClearTimeoutFunction;
    setInterval: SetIntervalFunction;
    clearInterval: ClearIntervalFunction;
    setImmediate: SetImmediateFunction;
    clearImmediate: ClearImmediateFunction;
}
interface TimersPromisesModule {
    setTimeout<T = void>(delay?: number, value?: T, options?: TimersPromisesOptions, ...ignored: any[]): Promise<T>;
    setInterval<T = void>(delay?: number, value?: T, options?: TimersPromisesOptions, ...ignored: any[]): any;
    setImmediate<T = void>(value?: T, options?: TimersPromisesOptions, ...ignored: any[]): Promise<T>;
    scheduler: TimersPromisesScheduler;
}
interface TimersPromisesOptions {
    ref?: boolean | undefined;
    signal?: any;
}
interface TimersPromisesScheduler {
    wait(delay?: number, options?: TimersPromisesOptions, ...ignored: any[]): Promise<void>;
    yield(...ignored: any[]): Promise<void>;
}
declare module "timers" {
    export const setTimeout: SetTimeoutFunction;
    export const clearTimeout: ClearTimeoutFunction;
    export const setInterval: SetIntervalFunction;
    export const clearInterval: ClearIntervalFunction;
    export const setImmediate: SetImmediateFunction;
    export const clearImmediate: ClearImmediateFunction;
    const defaultTimers: TimersModule;
    export default defaultTimers;
}
declare module "node:timers" {
    export const setTimeout: SetTimeoutFunction;
    export const clearTimeout: ClearTimeoutFunction;
    export const setInterval: SetIntervalFunction;
    export const clearInterval: ClearIntervalFunction;
    export const setImmediate: SetImmediateFunction;
    export const clearImmediate: ClearImmediateFunction;
    const defaultTimers: TimersModule;
    export default defaultTimers;
}
declare module "timers/promises" {
    export function setTimeout<T = void>(delay?: number, value?: T, options?: TimersPromisesOptions, ...ignored: any[]): Promise<T>;
    export function setInterval<T = void>(delay?: number, value?: T, options?: TimersPromisesOptions, ...ignored: any[]): any;
    export function setImmediate<T = void>(value?: T, options?: TimersPromisesOptions, ...ignored: any[]): Promise<T>;
    export const scheduler: TimersPromisesScheduler;
    const defaultTimersPromises: TimersPromisesModule;
    export default defaultTimersPromises;
}
declare module "node:timers/promises" {
    export function setTimeout<T = void>(delay?: number, value?: T, options?: TimersPromisesOptions, ...ignored: any[]): Promise<T>;
    export function setInterval<T = void>(delay?: number, value?: T, options?: TimersPromisesOptions, ...ignored: any[]): any;
    export function setImmediate<T = void>(value?: T, options?: TimersPromisesOptions, ...ignored: any[]): Promise<T>;
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
    f16round(x: number, ...ignored: any[]): number;
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
    stringify(value: unknown, replacer?: any, space?: any): string;
    parse(text: string, reviver?: any): unknown;
}
declare const JSON: JSON;

interface OSSignals {
    readonly SIGHUP: number;
    readonly SIGINT: number;
    readonly SIGQUIT: number;
    readonly SIGILL: number;
    readonly SIGTRAP: number;
    readonly SIGABRT: number;
    readonly SIGBUS: number;
    readonly SIGFPE: number;
    readonly SIGKILL: number;
    readonly SIGUSR1: number;
    readonly SIGSEGV: number;
    readonly SIGUSR2: number;
    readonly SIGPIPE: number;
    readonly SIGALRM: number;
    readonly SIGTERM: number;
}
interface OSPriority {
    readonly PRIORITY_LOW: number;
    readonly PRIORITY_BELOW_NORMAL: number;
    readonly PRIORITY_NORMAL: number;
    readonly PRIORITY_ABOVE_NORMAL: number;
    readonly PRIORITY_HIGH: number;
    readonly PRIORITY_HIGHEST: number;
}
interface OSConstants {
    readonly signals: OSSignals;
    readonly priority: OSPriority;
}
interface OS {
    readonly EOL: string;
    readonly devNull: string;
    readonly constants: OSConstants;
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
    userInfo(options?: OSUserInfoOptions, ...ignored: any[]): any;
    networkInterfaces(...ignored: any[]): any;
    getPriority(pid?: number, ...ignored: any[]): number;
    setPriority(pidOrPriority: number, priority?: number, ...ignored: any[]): void;
}
interface OSUserInfoOptions {
    encoding?: FSEncoding | FSBufferEncoding;
}
declare const os: OS;
declare module "os" {
    export const EOL: string;
    export const devNull: string;
    export const constants: OSConstants;
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
    export function userInfo(options?: OSUserInfoOptions, ...ignored: any[]): any;
    export function networkInterfaces(...ignored: any[]): any;
    export function getPriority(pid?: number, ...ignored: any[]): number;
    export function setPriority(pidOrPriority: number, priority?: number, ...ignored: any[]): void;
    const defaultOs: OS;
    export default defaultOs;
}
declare module "node:os" {
    export const EOL: string;
    export const devNull: string;
    export const constants: OSConstants;
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
    export function userInfo(options?: OSUserInfoOptions, ...ignored: any[]): any;
    export function networkInterfaces(...ignored: any[]): any;
    export function getPriority(pid?: number, ...ignored: any[]): number;
    export function setPriority(pidOrPriority: number, priority?: number, ...ignored: any[]): void;
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
    readonly parentPath: string;
    readonly path: string;
    isFile(...ignored: any[]): boolean;
    isDirectory(...ignored: any[]): boolean;
    isSymbolicLink(...ignored: any[]): boolean;
    isBlockDevice(...ignored: any[]): boolean;
    isCharacterDevice(...ignored: any[]): boolean;
    isFIFO(...ignored: any[]): boolean;
    isSocket(...ignored: any[]): boolean;
}
interface FSDirHandleEntry {
    readonly name: string | Buffer;
    readonly parentPath: string;
    readonly path: string;
    isFile(...ignored: any[]): boolean;
    isDirectory(...ignored: any[]): boolean;
    isSymbolicLink(...ignored: any[]): boolean;
    isBlockDevice(...ignored: any[]): boolean;
    isCharacterDevice(...ignored: any[]): boolean;
    isFIFO(...ignored: any[]): boolean;
    isSocket(...ignored: any[]): boolean;
}
interface FSDirOptions {
    recursive?: boolean;
    encoding?: "utf8" | "utf-8" | "hex" | "base64" | "buffer" | null;
    bufferSize?: number;
    signal?: any;
}
interface FSDir {
    readonly path: string;
    read(...ignored: any[]): Promise<FSDirHandleEntry | null>;
    readSync(...ignored: any[]): FSDirHandleEntry | null;
    close(...ignored: any[]): Promise<void>;
    closeSync(...ignored: any[]): void;
    [Symbol.dispose](...ignored: any[]): void;
    next(...ignored: any[]): Promise<IteratorResult<FSDirHandleEntry, void>>;
    return(value?: any, ...ignored: any[]): Promise<IteratorResult<FSDirHandleEntry, any>>;
    [Symbol.asyncIterator](...ignored: any[]): FSDir;
    [Symbol.asyncDispose](...ignored: any[]): Promise<void>;
}
interface FSStatFsOptions {
    bigint?: false;
}
interface FSPromisesStatFsOptions extends FSStatFsOptions {
    signal?: any;
}
interface FSPromisesAccessOptions {
    signal?: any;
}
interface FSStatFs {
    readonly bsize: number;
    readonly frsize: number;
    readonly blocks: number;
    readonly bfree: number;
    readonly bavail: number;
    readonly files: number;
    readonly ffree: number;
}
interface FSStatsOptions {
    bigint?: false;
    throwIfNoEntry?: boolean;
}
interface FSDescriptorStatsOptions {
    bigint?: false;
}
interface FSStatsNoEntryOptions {
    bigint?: false;
    throwIfNoEntry: false;
}
interface FSPromisesStatsOptions extends FSStatsOptions {
    signal?: any;
}
interface FSMkdirOptions {
    recursive?: boolean;
    mode?: number;
}
interface FSPromisesMkdirOptions extends FSMkdirOptions {
    signal?: any;
}
interface FSRmOptions {
    recursive?: boolean;
    force?: boolean;
    maxRetries?: number;
    retryDelay?: number;
}
interface FSPromisesRmOptions extends FSRmOptions {
    signal?: any;
}
interface FSRmdirOptions {
    recursive?: boolean;
    maxRetries?: number;
    retryDelay?: number;
}
interface FSPromisesRmdirOptions extends FSRmdirOptions {
    signal?: any;
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
type FSReadFileStringEncoding = FSEncoding | "hex" | "base64" | "latin1" | "binary" | "ascii";
type FSFileContentEncoding = FSEncoding | "hex" | "base64" | "latin1" | "binary" | "ascii";
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
interface FSPromisesPathResultEncodingOptions extends FSPathResultEncodingOptions {
    signal?: any;
}
type FSPathResultEncodingOption = FSPathResultEncoding | null | FSPathResultEncodingOptions;
type FSPromisesPathResultEncodingOption = FSPathResultEncoding | null | FSPromisesPathResultEncodingOptions;
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
interface FSPromisesReadFileOptions extends FSReadFileOptions {
    signal?: any;
}
interface FSPromisesReadFileBufferObjectOptions extends FSReadFileBufferObjectOptions {
    signal?: any;
}
type FSPromisesReadFileBufferOptions = FSBufferEncoding | null | FSPromisesReadFileBufferObjectOptions;
type FSPromisesReadFileStringOptions = FSReadFileStringEncoding | FSPromisesReadFileOptions;
type FSWriteFileFlag = "w" | "wx" | "w+" | "wx+" | "a" | "ax" | "a+" | "ax+" | "as" | "as+" | "r+" | "rs+";
interface FSWriteFileOptions {
    encoding?: FSFileContentEncoding | null;
    flag?: FSWriteFileFlag;
    mode?: number;
    flush?: boolean;
}
type FSWriteFileEncodingOptions = FSFileContentEncoding | null | FSWriteFileOptions;
interface FSFileHandleWriteFileOptions extends FSWriteFileOptions {
    signal?: any;
}
type FSFileHandleWriteFileEncodingOptions = FSFileContentEncoding | null | FSFileHandleWriteFileOptions;
interface FSPromisesWriteFileOptions extends FSWriteFileOptions {
    signal?: any;
}
type FSPromisesWriteFileEncodingOptions = FSFileContentEncoding | null | FSPromisesWriteFileOptions;
type FSAppendFileFlag = "a" | "ax" | "a+" | "ax+" | "as" | "as+";
interface FSAppendFileOptions {
    encoding?: FSFileContentEncoding | null;
    flag?: FSAppendFileFlag;
    mode?: number;
    flush?: boolean;
}
type FSAppendFileEncodingOptions = FSFileContentEncoding | null | FSAppendFileOptions;
interface FSFileHandleAppendFileOptions extends FSAppendFileOptions {
    signal?: any;
}
type FSFileHandleAppendFileEncodingOptions = FSFileContentEncoding | null | FSFileHandleAppendFileOptions;
interface FSPromisesAppendFileOptions extends FSAppendFileOptions {
    signal?: any;
}
type FSPromisesAppendFileEncodingOptions = FSFileContentEncoding | null | FSPromisesAppendFileOptions;
interface FSReaddirOptions {
    encoding?: FSReaddirStringEncoding | null;
    recursive?: boolean;
    withFileTypes?: false;
}
type FSReaddirStringOptions = FSReaddirStringEncoding | null | FSReaddirOptions;
interface FSPromisesReaddirOptions extends FSReaddirOptions {
    signal?: any;
}
type FSPromisesReaddirStringOptions = FSReaddirStringEncoding | null | FSPromisesReaddirOptions;
interface FSReaddirBufferOptions {
    encoding: FSBufferEncoding;
    recursive?: boolean;
    withFileTypes?: false;
}
interface FSPromisesReaddirBufferOptions extends FSReaddirBufferOptions {
    signal?: any;
}
interface FSReaddirDirentOptions {
    encoding?: FSReaddirStringEncoding;
    recursive?: boolean;
    withFileTypes: true;
}
interface FSPromisesReaddirDirentOptions extends FSReaddirDirentOptions {
    signal?: any;
}
type FSFileEncodingOptions = FSEncoding | FSEncodingOptions;
type FSFileBufferEncodingOptions = FSBufferEncoding | FSBufferEncodingOptions;
interface FSPromisesFileBufferEncodingOptions extends FSBufferEncodingOptions {
    signal?: any;
}
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
    openSync(path: FSPathLike, flags?: string | number, mode?: number, ...ignored: any[]): number;
    closeSync(fd: number, ...ignored: any[]): void;
    fsyncSync(fd: number, ...ignored: any[]): void;
    fdatasyncSync(fd: number, ...ignored: any[]): void;
    ftruncateSync(fd: number, len?: number, ...ignored: any[]): void;
    fstatSync(fd: number, options?: FSDescriptorStatsOptions, ...ignored: any[]): FSStats;
    fchmodSync(fd: number, mode: number, ...ignored: any[]): void;
    fchownSync(fd: number, uid: number, gid: number, ...ignored: any[]): void;
    futimesSync(fd: number, atime: FSFileTime, mtime: FSFileTime, ...ignored: any[]): void;
    readSync(fd: number, buffer: Buffer, offset?: number, length?: number, position?: number | null, ...ignored: any[]): number;
    readvSync(fd: number, buffers: Buffer[], position?: number | null, ...ignored: any[]): number;
    writeSync(fd: number, buffer: Buffer, offset?: number, length?: number, position?: number | null, ...ignored: any[]): number;
    writeSync(fd: number, string: string, position?: number | null, encoding?: string | null, ...ignored: any[]): number;
    writevSync(fd: number, buffers: Buffer[], position?: number | null, ...ignored: any[]): number;
    existsSync(path: FSPathLike, ...ignored: any[]): boolean;
    accessSync(path: FSPathLike, mode?: number, ...ignored: any[]): void;
    readdirSync(path: FSPathLike, options: FSBufferEncoding | FSReaddirBufferOptions, ...ignored: any[]): Buffer[];
    readdirSync(path: FSPathLike, options: FSReaddirDirentOptions, ...ignored: any[]): FSDirent[];
    readdirSync(path: FSPathLike, options?: FSReaddirStringOptions, ...ignored: any[]): string[];
    opendirSync(path: FSPathLike, options?: FSDirOptions | null, ...ignored: any[]): FSDir;
    statSync(path: FSPathLike, options: FSStatsNoEntryOptions, ...ignored: any[]): FSStats | undefined;
    statSync(path: FSPathLike, options?: FSStatsOptions, ...ignored: any[]): FSStats;
    lstatSync(path: FSPathLike, options: FSStatsNoEntryOptions, ...ignored: any[]): FSStats | undefined;
    lstatSync(path: FSPathLike, options?: FSStatsOptions, ...ignored: any[]): FSStats;
    statfsSync(path: FSPathLike, options?: FSStatFsOptions, ...ignored: any[]): FSStatFs;
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
    mkdirSync(path: FSPathLike, options?: number | FSMkdirOptions | null, ...ignored: any[]): void;
    unlinkSync(path: FSPathLike, ...ignored: any[]): void;
    rmSync(path: FSPathLike, options?: FSRmOptions, ...ignored: any[]): void;
    rmdirSync(path: FSPathLike, options?: FSRmdirOptions, ...ignored: any[]): void;
    cpSync(src: FSPathLike, dest: FSPathLike, options?: FSCpOptions, ...ignored: any[]): void;
    copyFileSync(src: FSPathLike, dest: FSPathLike, mode?: number, ...ignored: any[]): void;
    renameSync(oldPath: FSPathLike, newPath: FSPathLike, ...ignored: any[]): void;
    promises: FSPromises;
}
interface FSFileReadResult {
    readonly bytesRead: number;
    readonly buffer: Buffer;
}
interface FSFileWriteResult {
    readonly bytesWritten: number;
    readonly buffer: Buffer;
}
interface FSFileHandleIOOptions {
    offset?: number;
    length?: number;
    position?: number | null;
}
interface FSFileHandleReadOptions extends FSFileHandleIOOptions {
    buffer?: Buffer;
}
interface FSFileStringWriteResult {
    readonly bytesWritten: number;
    readonly buffer: string;
}
interface FSFileReadvResult {
    readonly bytesRead: number;
    readonly buffers: Buffer[];
}
interface FSFileWritevResult {
    readonly bytesWritten: number;
    readonly buffers: Buffer[];
}
interface FSFileHandleReadFileBufferOptions {
    encoding?: FSBufferEncoding | null;
    signal?: any;
}
interface FSFileHandleReadFileStringOptions {
    encoding: FSReadFileStringEncoding;
    signal?: any;
}
interface FSFileHandleReadLinesOptions {
    encoding?: BufferEncoding | null;
    autoClose?: boolean;
    emitClose?: boolean;
    highWaterMark?: number;
    start?: number;
    end?: number;
    signal?: any;
}
interface FSFileHandleReadLinesIterator extends EventEmitter {
    next(...ignored: any[]): Promise<IteratorResult<string, void>>;
    return(value?: any, ...ignored: any[]): Promise<IteratorResult<string, any>>;
    [Symbol.asyncIterator](...ignored: any[]): FSFileHandleReadLinesIterator;
}
interface FSFileHandle {
    readonly fd: number;
    read(buffer: Buffer, offset?: number, length?: number, position?: number | null, ...ignored: any[]): Promise<FSFileReadResult>;
    read(buffer: Buffer, options?: FSFileHandleIOOptions, ...ignored: any[]): Promise<FSFileReadResult>;
    read(options?: FSFileHandleReadOptions, ...ignored: any[]): Promise<FSFileReadResult>;
    write(buffer: Buffer, offset?: number, length?: number, position?: number | null, ...ignored: any[]): Promise<FSFileWriteResult>;
    write(buffer: Buffer, options?: FSFileHandleIOOptions, ...ignored: any[]): Promise<FSFileWriteResult>;
    write(string: string, position?: number | null, encoding?: BufferEncoding, ...ignored: any[]): Promise<FSFileStringWriteResult>;
    readv(buffers: Buffer[], position?: number | null, ...ignored: any[]): Promise<FSFileReadvResult>;
    writev(buffers: Buffer[], position?: number | null, ...ignored: any[]): Promise<FSFileWritevResult>;
    appendFile(data: string | Buffer, options?: FSFileHandleAppendFileEncodingOptions, ...ignored: any[]): Promise<void>;
    writeFile(data: string | Buffer, options?: FSFileHandleWriteFileEncodingOptions, ...ignored: any[]): Promise<void>;
    readFile(options?: FSBufferEncoding | null | FSFileHandleReadFileBufferOptions, ...ignored: any[]): Promise<Buffer>;
    readFile(options: FSReadFileStringEncoding | FSFileHandleReadFileStringOptions, ...ignored: any[]): Promise<string>;
    readLines(options?: FSFileHandleReadLinesOptions | null, ...ignored: any[]): FSFileHandleReadLinesIterator;
    chmod(mode: number, ...ignored: any[]): Promise<void>;
    chown(uid: number, gid: number, ...ignored: any[]): Promise<void>;
    utimes(atime: FSFileTime, mtime: FSFileTime, ...ignored: any[]): Promise<void>;
    stat(...ignored: any[]): Promise<FSStats>;
    truncate(len?: number, ...ignored: any[]): Promise<void>;
    sync(...ignored: any[]): Promise<void>;
    datasync(...ignored: any[]): Promise<void>;
    close(...ignored: any[]): Promise<void>;
    [Symbol.asyncDispose](...ignored: any[]): Promise<void>;
}
interface FSPromises {
    readFile(path: FSPathLike, options: FSPromisesReadFileBufferOptions, ...ignored: any[]): Promise<Buffer>;
    readFile(path: FSPathLike, options?: FSPromisesReadFileStringOptions, ...ignored: any[]): Promise<string>;
    open(path: FSPathLike, flags?: string | number, mode?: number, ...ignored: any[]): Promise<FSFileHandle>;
    opendir(path: FSPathLike, options?: FSDirOptions | null, ...ignored: any[]): Promise<FSDir>;
    writeFile(path: FSPathLike, data: string | Buffer, options?: FSPromisesWriteFileEncodingOptions, ...ignored: any[]): Promise<void>;
    appendFile(path: FSPathLike, data: string | Buffer, options?: FSPromisesAppendFileEncodingOptions, ...ignored: any[]): Promise<void>;
    readdir(path: FSPathLike, options: FSBufferEncoding | FSPromisesReaddirBufferOptions, ...ignored: any[]): Promise<Buffer[]>;
    readdir(path: FSPathLike, options: FSPromisesReaddirDirentOptions, ...ignored: any[]): Promise<FSDirent[]>;
    readdir(path: FSPathLike, options?: FSPromisesReaddirStringOptions, ...ignored: any[]): Promise<string[]>;
    statfs(path: FSPathLike, options?: FSPromisesStatFsOptions, ...ignored: any[]): Promise<FSStatFs>;
    stat(path: FSPathLike, options?: FSPromisesStatsOptions, ...ignored: any[]): Promise<FSStats>;
    lstat(path: FSPathLike, options?: FSPromisesStatsOptions, ...ignored: any[]): Promise<FSStats>;
    realpath(path: FSPathLike, options: FSBufferEncoding | FSPromisesFileBufferEncodingOptions, ...ignored: any[]): Promise<Buffer>;
    realpath(path: FSPathLike, options?: FSPromisesPathResultEncodingOption, ...ignored: any[]): Promise<string>;
    readlink(path: FSPathLike, options: FSBufferEncoding | FSPromisesFileBufferEncodingOptions, ...ignored: any[]): Promise<Buffer>;
    readlink(path: FSPathLike, options?: FSPromisesPathResultEncodingOption, ...ignored: any[]): Promise<string>;
    symlink(target: FSPathLike, path: FSPathLike, type?: FSSymlinkType, ...ignored: any[]): Promise<void>;
    link(existingPath: FSPathLike, newPath: FSPathLike, ...ignored: any[]): Promise<void>;
    mkdtemp(prefix: FSPathLike, options: FSBufferEncoding | FSPromisesFileBufferEncodingOptions, ...ignored: any[]): Promise<Buffer>;
    mkdtemp(prefix: FSPathLike, options?: FSPromisesPathResultEncodingOption, ...ignored: any[]): Promise<string>;
    truncate(path: FSPathLike, len?: number, ...ignored: any[]): Promise<void>;
    utimes(path: FSPathLike, atime: FSFileTime, mtime: FSFileTime, ...ignored: any[]): Promise<void>;
    lutimes(path: FSPathLike, atime: FSFileTime, mtime: FSFileTime, ...ignored: any[]): Promise<void>;
    chown(path: FSPathLike, uid: number, gid: number, ...ignored: any[]): Promise<void>;
    lchown(path: FSPathLike, uid: number, gid: number, ...ignored: any[]): Promise<void>;
    chmod(path: FSPathLike, mode: number, ...ignored: any[]): Promise<void>;
    access(path: FSPathLike, mode?: number | FSPromisesAccessOptions, ...ignored: any[]): Promise<void>;
    mkdir(path: FSPathLike, options?: number | FSPromisesMkdirOptions | null, ...ignored: any[]): Promise<void>;
    unlink(path: FSPathLike, ...ignored: any[]): Promise<void>;
    rm(path: FSPathLike, options?: FSPromisesRmOptions, ...ignored: any[]): Promise<void>;
    rmdir(path: FSPathLike, options?: FSPromisesRmdirOptions, ...ignored: any[]): Promise<void>;
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
    export function openSync(path: FSPathLike, flags?: string | number, mode?: number, ...ignored: any[]): number;
    export function closeSync(fd: number, ...ignored: any[]): void;
    export function fsyncSync(fd: number, ...ignored: any[]): void;
    export function fdatasyncSync(fd: number, ...ignored: any[]): void;
    export function ftruncateSync(fd: number, len?: number, ...ignored: any[]): void;
    export function fstatSync(fd: number, options?: FSDescriptorStatsOptions, ...ignored: any[]): FSStats;
    export function fchmodSync(fd: number, mode: number, ...ignored: any[]): void;
    export function fchownSync(fd: number, uid: number, gid: number, ...ignored: any[]): void;
    export function futimesSync(fd: number, atime: FSFileTime, mtime: FSFileTime, ...ignored: any[]): void;
    export function readSync(fd: number, buffer: Buffer, offset?: number, length?: number, position?: number | null, ...ignored: any[]): number;
    export function readvSync(fd: number, buffers: Buffer[], position?: number | null, ...ignored: any[]): number;
    export function writeSync(fd: number, buffer: Buffer, offset?: number, length?: number, position?: number | null, ...ignored: any[]): number;
    export function writeSync(fd: number, string: string, position?: number | null, encoding?: string | null, ...ignored: any[]): number;
    export function writevSync(fd: number, buffers: Buffer[], position?: number | null, ...ignored: any[]): number;
    export function existsSync(path: FSPathLike, ...ignored: any[]): boolean;
    export function accessSync(path: FSPathLike, mode?: number, ...ignored: any[]): void;
    export function readdirSync(path: FSPathLike, options: FSBufferEncoding | FSReaddirBufferOptions, ...ignored: any[]): Buffer[];
    export function readdirSync(path: FSPathLike, options: FSReaddirDirentOptions, ...ignored: any[]): FSDirent[];
    export function readdirSync(path: FSPathLike, options?: FSReaddirStringOptions, ...ignored: any[]): string[];
    export function opendirSync(path: FSPathLike, options?: FSDirOptions | null, ...ignored: any[]): FSDir;
    export function statSync(path: FSPathLike, options: FSStatsNoEntryOptions, ...ignored: any[]): FSStats | undefined;
    export function statSync(path: FSPathLike, options?: FSStatsOptions, ...ignored: any[]): FSStats;
    export function lstatSync(path: FSPathLike, options: FSStatsNoEntryOptions, ...ignored: any[]): FSStats | undefined;
    export function lstatSync(path: FSPathLike, options?: FSStatsOptions, ...ignored: any[]): FSStats;
    export function statfsSync(path: FSPathLike, options?: FSStatFsOptions, ...ignored: any[]): FSStatFs;
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
    export function mkdirSync(path: FSPathLike, options?: number | FSMkdirOptions | null, ...ignored: any[]): void;
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
    export function openSync(path: FSPathLike, flags?: string | number, mode?: number, ...ignored: any[]): number;
    export function closeSync(fd: number, ...ignored: any[]): void;
    export function fsyncSync(fd: number, ...ignored: any[]): void;
    export function fdatasyncSync(fd: number, ...ignored: any[]): void;
    export function ftruncateSync(fd: number, len?: number, ...ignored: any[]): void;
    export function fstatSync(fd: number, options?: FSDescriptorStatsOptions, ...ignored: any[]): FSStats;
    export function fchmodSync(fd: number, mode: number, ...ignored: any[]): void;
    export function fchownSync(fd: number, uid: number, gid: number, ...ignored: any[]): void;
    export function futimesSync(fd: number, atime: FSFileTime, mtime: FSFileTime, ...ignored: any[]): void;
    export function readSync(fd: number, buffer: Buffer, offset?: number, length?: number, position?: number | null, ...ignored: any[]): number;
    export function readvSync(fd: number, buffers: Buffer[], position?: number | null, ...ignored: any[]): number;
    export function writeSync(fd: number, buffer: Buffer, offset?: number, length?: number, position?: number | null, ...ignored: any[]): number;
    export function writeSync(fd: number, string: string, position?: number | null, encoding?: string | null, ...ignored: any[]): number;
    export function writevSync(fd: number, buffers: Buffer[], position?: number | null, ...ignored: any[]): number;
    export function existsSync(path: FSPathLike, ...ignored: any[]): boolean;
    export function accessSync(path: FSPathLike, mode?: number, ...ignored: any[]): void;
    export function readdirSync(path: FSPathLike, options: FSBufferEncoding | FSReaddirBufferOptions, ...ignored: any[]): Buffer[];
    export function readdirSync(path: FSPathLike, options: FSReaddirDirentOptions, ...ignored: any[]): FSDirent[];
    export function readdirSync(path: FSPathLike, options?: FSReaddirStringOptions, ...ignored: any[]): string[];
    export function opendirSync(path: FSPathLike, options?: FSDirOptions | null, ...ignored: any[]): FSDir;
    export function statSync(path: FSPathLike, options: FSStatsNoEntryOptions, ...ignored: any[]): FSStats | undefined;
    export function statSync(path: FSPathLike, options?: FSStatsOptions, ...ignored: any[]): FSStats;
    export function lstatSync(path: FSPathLike, options: FSStatsNoEntryOptions, ...ignored: any[]): FSStats | undefined;
    export function lstatSync(path: FSPathLike, options?: FSStatsOptions, ...ignored: any[]): FSStats;
    export function statfsSync(path: FSPathLike, options?: FSStatFsOptions, ...ignored: any[]): FSStatFs;
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
    export function mkdirSync(path: FSPathLike, options?: number | FSMkdirOptions | null, ...ignored: any[]): void;
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
    export const opendir: FSPromises["opendir"];
    export const readdir: FSPromises["readdir"];
    export const statfs: FSPromises["statfs"];
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
    export const opendir: FSPromises["opendir"];
    export const readdir: FSPromises["readdir"];
    export const statfs: FSPromises["statfs"];
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
    readonly win32: Path;
    join(...parts: string[]): string;
    resolve(...parts: string[]): string;
    normalize(p: string, ...ignored: any[]): string;
    isAbsolute(p: string, ...ignored: any[]): boolean;
    relative(from: string, to: string, ...ignored: any[]): string;
    toNamespacedPath(p: string, ...ignored: any[]): string;
    matchesGlob(p: string, pattern: string, ...ignored: any[]): boolean;
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
    export const win32: Path;
    export function join(...parts: string[]): string;
    export function resolve(...parts: string[]): string;
    export function normalize(p: string, ...ignored: any[]): string;
    export function isAbsolute(p: string, ...ignored: any[]): boolean;
    export function relative(from: string, to: string, ...ignored: any[]): string;
    export function toNamespacedPath(p: string, ...ignored: any[]): string;
    export function matchesGlob(p: string, pattern: string, ...ignored: any[]): boolean;
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
    export const win32: Path;
    export function join(...parts: string[]): string;
    export function resolve(...parts: string[]): string;
    export function normalize(p: string, ...ignored: any[]): string;
    export function isAbsolute(p: string, ...ignored: any[]): boolean;
    export function relative(from: string, to: string, ...ignored: any[]): string;
    export function toNamespacedPath(p: string, ...ignored: any[]): string;
    export function matchesGlob(p: string, pattern: string, ...ignored: any[]): boolean;
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
    export function matchesGlob(p: string, pattern: string, ...ignored: any[]): boolean;
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
    export function matchesGlob(p: string, pattern: string, ...ignored: any[]): boolean;
    export function basename(p: string, suffix?: string, ...ignored: any[]): string;
    export function dirname(p: string, ...ignored: any[]): string;
    export function extname(p: string, ...ignored: any[]): string;
    export function parse(p: string, ...ignored: any[]): any;
    export function format(pathObject: any, ...ignored: any[]): string;
    const defaultPath: Path;
    export default defaultPath;
}
declare module "path/win32" {
    export const sep: string;
    export const delimiter: string;
    export function join(...parts: string[]): string;
    export function resolve(...parts: string[]): string;
    export function normalize(p: string, ...ignored: any[]): string;
    export function isAbsolute(p: string, ...ignored: any[]): boolean;
    export function relative(from: string, to: string, ...ignored: any[]): string;
    export function toNamespacedPath(p: string, ...ignored: any[]): string;
    export function matchesGlob(p: string, pattern: string, ...ignored: any[]): boolean;
    export function basename(p: string, suffix?: string, ...ignored: any[]): string;
    export function dirname(p: string, ...ignored: any[]): string;
    export function extname(p: string, ...ignored: any[]): string;
    export function parse(p: string, ...ignored: any[]): any;
    export function format(pathObject: any, ...ignored: any[]): string;
    const defaultPath: Path;
    export default defaultPath;
}
declare module "node:path/win32" {
    export const sep: string;
    export const delimiter: string;
    export function join(...parts: string[]): string;
    export function resolve(...parts: string[]): string;
    export function normalize(p: string, ...ignored: any[]): string;
    export function isAbsolute(p: string, ...ignored: any[]): boolean;
    export function relative(from: string, to: string, ...ignored: any[]): string;
    export function toNamespacedPath(p: string, ...ignored: any[]): string;
    export function matchesGlob(p: string, pattern: string, ...ignored: any[]): boolean;
    export function basename(p: string, suffix?: string, ...ignored: any[]): string;
    export function dirname(p: string, ...ignored: any[]): string;
    export function extname(p: string, ...ignored: any[]): string;
    export function parse(p: string, ...ignored: any[]): any;
    export function format(pathObject: any, ...ignored: any[]): string;
    const defaultPath: Path;
    export default defaultPath;
}

type CryptoHashAlgorithm = "md5" | "sha1" | "sha224" | "sha256" | "sha384" | "sha512";
interface CryptoRandomUUIDOptions {
    disableEntropyCache?: boolean;
}
interface CryptoScryptOptions {
    N?: number;
    cost?: number;
    r?: number;
    blockSize?: number;
    p?: number;
    parallelization?: number;
    maxmem?: number;
}
interface CryptoHash {
    update(data: string | Buffer, ...ignored: any[]): CryptoHash;
    digest(encoding?: "hex" | "base64", ...ignored: any[]): string;
}
interface CryptoHmac {
    update(data: string | Buffer, ...ignored: any[]): CryptoHmac;
    digest(): string;
    digest(encoding: "hex" | "base64", ...ignored: any[]): string;
    digest(encoding: "buffer", ...ignored: any[]): Buffer;
    digest(encoding?: "hex" | "base64" | "buffer", ...ignored: any[]): string | Buffer;
}
interface Crypto {
    createHash(algorithm: CryptoHashAlgorithm, ...ignored: any[]): CryptoHash;
    createHmac(algorithm: CryptoHashAlgorithm, key: string | Buffer, ...ignored: any[]): CryptoHmac;
    getHashes(...ignored: any[]): string[];
    randomBytes(size: number, ...ignored: any[]): Buffer;
    randomFillSync(buffer: Buffer, offset?: number, size?: number, ...ignored: any[]): Buffer;
    randomUUID(options?: CryptoRandomUUIDOptions, ...ignored: any[]): string;
    timingSafeEqual(a: Buffer, b: Buffer, ...ignored: any[]): boolean;
    pbkdf2Sync(password: string | Buffer, salt: string | Buffer, iterations: number, keylen: number, digest: CryptoHashAlgorithm, ...ignored: any[]): Buffer;
    scryptSync(password: string | Buffer, salt: string | Buffer, keylen: number, options?: CryptoScryptOptions, ...ignored: any[]): Buffer;
}
declare const crypto: Crypto;
declare module "crypto" {
    export function createHash(algorithm: CryptoHashAlgorithm, ...ignored: any[]): CryptoHash;
    export function createHmac(algorithm: CryptoHashAlgorithm, key: string | Buffer, ...ignored: any[]): CryptoHmac;
    export function getHashes(...ignored: any[]): string[];
    export function randomBytes(size: number, ...ignored: any[]): Buffer;
    export function randomFillSync(buffer: Buffer, offset?: number, size?: number, ...ignored: any[]): Buffer;
    export function randomUUID(options?: CryptoRandomUUIDOptions, ...ignored: any[]): string;
    export function timingSafeEqual(a: Buffer, b: Buffer, ...ignored: any[]): boolean;
    export function pbkdf2Sync(password: string | Buffer, salt: string | Buffer, iterations: number, keylen: number, digest: CryptoHashAlgorithm, ...ignored: any[]): Buffer;
    export function scryptSync(password: string | Buffer, salt: string | Buffer, keylen: number, options?: CryptoScryptOptions, ...ignored: any[]): Buffer;
    const defaultCrypto: Crypto;
    export default defaultCrypto;
}
declare module "node:crypto" {
    export function createHash(algorithm: CryptoHashAlgorithm, ...ignored: any[]): CryptoHash;
    export function createHmac(algorithm: CryptoHashAlgorithm, key: string | Buffer, ...ignored: any[]): CryptoHmac;
    export function getHashes(...ignored: any[]): string[];
    export function randomBytes(size: number, ...ignored: any[]): Buffer;
    export function randomFillSync(buffer: Buffer, offset?: number, size?: number, ...ignored: any[]): Buffer;
    export function randomUUID(options?: CryptoRandomUUIDOptions, ...ignored: any[]): string;
    export function timingSafeEqual(a: Buffer, b: Buffer, ...ignored: any[]): boolean;
    export function pbkdf2Sync(password: string | Buffer, salt: string | Buffer, iterations: number, keylen: number, digest: CryptoHashAlgorithm, ...ignored: any[]): Buffer;
    export function scryptSync(password: string | Buffer, salt: string | Buffer, keylen: number, options?: CryptoScryptOptions, ...ignored: any[]): Buffer;
    const defaultCrypto: Crypto;
    export default defaultCrypto;
}

type BufferEncoding = "utf8" | "utf-8" | "hex" | "base64" | "latin1" | "binary" | "ascii";
interface Buffer {
    readonly length: number;
    [Symbol.iterator](): IterableIterator<number>;
    toLocaleString(...ignored: any[]): string;
    toJSON(...ignored: any[]): any;
    toString(encoding?: BufferEncoding, ...ignored: any[]): string;
    valueOf(...ignored: any[]): Buffer;
    slice(start?: number, end?: number, ...ignored: any[]): Buffer;
    subarray(start?: number, end?: number, ...ignored: any[]): Buffer;
    fill(value: number, start?: number, end?: number, ...ignored: any[]): Buffer;
    write(string: string, offset?: number, length?: number, encoding?: BufferEncoding, ...ignored: any[]): number;
    readUInt8(offset?: number, ...ignored: any[]): number;
    writeUInt8(value: number, offset?: number, ...ignored: any[]): number;
    readInt8(offset?: number, ...ignored: any[]): number;
    writeInt8(value: number, offset?: number, ...ignored: any[]): number;
    readUInt16LE(offset?: number, ...ignored: any[]): number;
    readUInt16BE(offset?: number, ...ignored: any[]): number;
    writeUInt16LE(value: number, offset?: number, ...ignored: any[]): number;
    writeUInt16BE(value: number, offset?: number, ...ignored: any[]): number;
    readInt16LE(offset?: number, ...ignored: any[]): number;
    readInt16BE(offset?: number, ...ignored: any[]): number;
    writeInt16LE(value: number, offset?: number, ...ignored: any[]): number;
    writeInt16BE(value: number, offset?: number, ...ignored: any[]): number;
    readUInt32LE(offset?: number, ...ignored: any[]): number;
    readUInt32BE(offset?: number, ...ignored: any[]): number;
    writeUInt32LE(value: number, offset?: number, ...ignored: any[]): number;
    writeUInt32BE(value: number, offset?: number, ...ignored: any[]): number;
    readInt32LE(offset?: number, ...ignored: any[]): number;
    readInt32BE(offset?: number, ...ignored: any[]): number;
    writeInt32LE(value: number, offset?: number, ...ignored: any[]): number;
    writeInt32BE(value: number, offset?: number, ...ignored: any[]): number;
    readFloatLE(offset?: number, ...ignored: any[]): number;
    readFloatBE(offset?: number, ...ignored: any[]): number;
    writeFloatLE(value: number, offset?: number, ...ignored: any[]): number;
    writeFloatBE(value: number, offset?: number, ...ignored: any[]): number;
    readDoubleLE(offset?: number, ...ignored: any[]): number;
    readDoubleBE(offset?: number, ...ignored: any[]): number;
    writeDoubleLE(value: number, offset?: number, ...ignored: any[]): number;
    writeDoubleBE(value: number, offset?: number, ...ignored: any[]): number;
    readUIntLE(offset: number, byteLength: number, ...ignored: any[]): number;
    readUIntBE(offset: number, byteLength: number, ...ignored: any[]): number;
    readIntLE(offset: number, byteLength: number, ...ignored: any[]): number;
    readIntBE(offset: number, byteLength: number, ...ignored: any[]): number;
    writeUIntLE(value: number, offset: number, byteLength: number, ...ignored: any[]): number;
    writeUIntBE(value: number, offset: number, byteLength: number, ...ignored: any[]): number;
    writeIntLE(value: number, offset: number, byteLength: number, ...ignored: any[]): number;
    writeIntBE(value: number, offset: number, byteLength: number, ...ignored: any[]): number;
    swap16(...ignored: any[]): Buffer;
    swap32(...ignored: any[]): Buffer;
    swap64(...ignored: any[]): Buffer;
    copy(target: Buffer, targetStart?: number, sourceStart?: number, sourceEnd?: number, ...ignored: any[]): number;
    indexOf(value: number | string | Buffer, byteOffset?: number, ...ignored: any[]): number;
    lastIndexOf(value: number | string | Buffer, byteOffset?: number, ...ignored: any[]): number;
    includes(value: number | string | Buffer, byteOffset?: number, ...ignored: any[]): boolean;
    equals(other: Buffer, ...ignored: any[]): boolean;
    compare(target: Buffer, targetStart?: number, targetEnd?: number, sourceStart?: number, sourceEnd?: number, ...ignored: any[]): number;
    [n: number]: number;
}
interface BufferConstructor {
    from(data: string, encoding?: BufferEncoding, ...ignored: any[]): Buffer;
    from(data: number[], ...ignored: any[]): Buffer;
    from(data: Buffer, ...ignored: any[]): Buffer;
    alloc(size: number, fill?: number, ...ignored: any[]): Buffer;
    allocUnsafe(size: number, ...ignored: any[]): Buffer;
    allocUnsafeSlow(size: number, ...ignored: any[]): Buffer;
    concat(list: Buffer[], totalLength?: number, ...ignored: any[]): Buffer;
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
    transcode(source: Buffer, fromEnc: string, toEnc: string, ...ignored: any[]): Buffer;
}
declare module "buffer" {
    export const Buffer: BufferConstructor;
    export function atob(value: string, ...ignored: any[]): string;
    export function btoa(value: string, ...ignored: any[]): string;
    export function transcode(source: Buffer, fromEnc: string, toEnc: string, ...ignored: any[]): Buffer;
    const defaultBuffer: BufferModule;
    export default defaultBuffer;
}
declare module "node:buffer" {
    export const Buffer: BufferConstructor;
    export function atob(value: string, ...ignored: any[]): string;
    export function btoa(value: string, ...ignored: any[]): string;
    export function transcode(source: Buffer, fromEnc: string, toEnc: string, ...ignored: any[]): Buffer;
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
    new(type: string, eventInitDict?: EventInit, ...ignored: any[]): Event;
}
declare var Event: EventConstructor;

interface EventTarget {
    addEventListener(type: string, listener: (this: EventTarget, event: Event) => void, options?: boolean | AddEventListenerOptions, ...ignored: any[]): void;
    removeEventListener(type: string, listener: (this: EventTarget, event: Event) => void, options?: boolean | EventListenerOptions, ...ignored: any[]): void;
    dispatchEvent(event: Event, ...ignored: any[]): boolean;
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
    on(eventName: string, listener: (this: EventEmitter, ...args: any[]) => void, ...ignored: any[]): this;
    addListener(eventName: string, listener: (this: EventEmitter, ...args: any[]) => void, ...ignored: any[]): this;
    prependListener(eventName: string, listener: (this: EventEmitter, ...args: any[]) => void, ...ignored: any[]): this;
    once(eventName: string, listener: (this: EventEmitter, ...args: any[]) => void, ...ignored: any[]): this;
    prependOnceListener(eventName: string, listener: (this: EventEmitter, ...args: any[]) => void, ...ignored: any[]): this;
    off(eventName: string, listener: (this: EventEmitter, ...args: any[]) => void, ...ignored: any[]): this;
    removeListener(eventName: string, listener: (this: EventEmitter, ...args: any[]) => void, ...ignored: any[]): this;
    removeAllListeners(eventName?: string, ...ignored: any[]): this;
    emit(eventName: string, ...args: any[]): boolean;
    listenerCount(eventName: string, listener?: (this: EventEmitter, ...args: any[]) => void, ...ignored: any[]): number;
    listeners(eventName: string, ...ignored: any[]): any[];
    rawListeners(eventName: string, ...ignored: any[]): any[];
    eventNames(...ignored: any[]): string[];
    setMaxListeners(n: number, ...ignored: any[]): this;
    getMaxListeners(...ignored: any[]): number;
    pause(...ignored: any[]): this;
    resume(...ignored: any[]): this;
    isPaused(...ignored: any[]): boolean;
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
interface EventEmitterOnOptions {
    signal?: any;
    close?: string[];
    highWaterMark?: number;
    lowWaterMark?: number;
}
interface EventsModule {
    EventEmitter: EventEmitterConstructor;
    defaultMaxListeners: number;
    listenerCount(emitter: EventEmitter, eventName: string, listener?: (this: EventEmitter, ...args: any[]) => void, ...ignored: any[]): number;
    getEventListeners(emitter: EventEmitter, eventName: string, ...ignored: any[]): any[];
    once(emitter: EventEmitter, eventName: string, options?: EventEmitterOnceOptions, ...ignored: any[]): Promise<any[]>;
    on(emitter: EventEmitter, eventName: string, options?: EventEmitterOnOptions, ...ignored: any[]): any;
    setMaxListeners(n: number, emitter: EventEmitter, ...emitters: EventEmitter[]): void;
    getMaxListeners(emitter: EventEmitter, ...ignored: any[]): number;
}
declare module "events" {
    export const EventEmitter: EventEmitterConstructor;
    export let defaultMaxListeners: number;
    export function listenerCount(emitter: EventEmitter, eventName: string, listener?: (this: EventEmitter, ...args: any[]) => void, ...ignored: any[]): number;
    export function getEventListeners(emitter: EventEmitter, eventName: string, ...ignored: any[]): any[];
    export function once(emitter: EventEmitter, eventName: string, options?: EventEmitterOnceOptions, ...ignored: any[]): Promise<any[]>;
    export function on(emitter: EventEmitter, eventName: string, options?: EventEmitterOnOptions, ...ignored: any[]): any;
    export function setMaxListeners(n: number, emitter: EventEmitter, ...emitters: EventEmitter[]): void;
    export function getMaxListeners(emitter: EventEmitter, ...ignored: any[]): number;
    const defaultEvents: EventsModule;
    export default defaultEvents;
}
declare module "node:events" {
    export const EventEmitter: EventEmitterConstructor;
    export let defaultMaxListeners: number;
    export function listenerCount(emitter: EventEmitter, eventName: string, listener?: (this: EventEmitter, ...args: any[]) => void, ...ignored: any[]): number;
    export function getEventListeners(emitter: EventEmitter, eventName: string, ...ignored: any[]): any[];
    export function once(emitter: EventEmitter, eventName: string, options?: EventEmitterOnceOptions, ...ignored: any[]): Promise<any[]>;
    export function on(emitter: EventEmitter, eventName: string, options?: EventEmitterOnOptions, ...ignored: any[]): any;
    export function setMaxListeners(n: number, emitter: EventEmitter, ...emitters: EventEmitter[]): void;
    export function getMaxListeners(emitter: EventEmitter, ...ignored: any[]): number;
    const defaultEvents: EventsModule;
    export default defaultEvents;
}

type DnsLookupCallback = (err: any, address: string, family: number) => void;
type DnsLookupAllCallback = (err: any, addresses: any[]) => void;
type DnsLookupFamily = 0 | 4 | 6;
type DnsResolveCallback = (err: any, addresses: string[]) => void;
type DnsResolveAnyCallback = (err: any, records: any[]) => void;
type DnsResolveType = "A" | "AAAA" | "PTR" | "CNAME";
type DnsLookupServiceCallback = (err: any, hostname: string, service: string) => void;
interface DnsResolveRecord {
    address: string;
    ttl: number;
}
type DnsResolveTtlCallback = (err: any, addresses: DnsResolveRecord[]) => void;
interface DnsResolveOptions {
    ttl?: boolean;
}
interface DnsResolveWithTtlOptions {
    ttl: true;
}
interface DnsLookupOptions {
    family?: DnsLookupFamily;
    all?: boolean;
    hints?: number;
    verbatim?: boolean;
    order?: "verbatim" | "ipv4first" | "ipv6first";
}
interface DnsPromises {
    lookup(hostname: string): Promise<any>;
    lookup(hostname: string, options: DnsLookupOptions | DnsLookupFamily | undefined | null, ...ignored: any[]): Promise<any>;
    resolve(hostname: string): Promise<string[]>;
    resolve(hostname: string, rrtype: DnsResolveType, ...ignored: any[]): Promise<string[]>;
    resolveAny(hostname: string, ...ignored: any[]): Promise<any[]>;
    reverse(hostname: string, ...ignored: any[]): Promise<string[]>;
    resolveCname(hostname: string, ...ignored: any[]): Promise<string[]>;
    resolve4(hostname: string): Promise<string[]>;
    resolve4(hostname: string, options: DnsResolveWithTtlOptions, ...ignored: any[]): Promise<DnsResolveRecord[]>;
    resolve4(hostname: string, options: DnsResolveOptions | undefined, ...ignored: any[]): Promise<string[]>;
    resolve6(hostname: string): Promise<string[]>;
    resolve6(hostname: string, options: DnsResolveWithTtlOptions, ...ignored: any[]): Promise<DnsResolveRecord[]>;
    resolve6(hostname: string, options: DnsResolveOptions | undefined, ...ignored: any[]): Promise<string[]>;
    lookupService(address: string, port: number): Promise<{ hostname: string; service: string }>;
    getDefaultResultOrder(...ignored: any[]): "ipv4first" | "ipv6first" | "verbatim";
    setDefaultResultOrder(order: "ipv4first" | "ipv6first" | "verbatim", ...ignored: any[]): void;
}
interface DNS {
    readonly ADDRCONFIG: number;
    readonly V4MAPPED: number;
    readonly ALL: number;
    promises: DnsPromises;
    lookup(hostname: string, callback: DnsLookupCallback, ...ignored: any[]): void;
    lookup(hostname: string, options: DnsLookupOptions | DnsLookupFamily | undefined | null, callback: DnsLookupCallback, ...ignored: any[]): void;
    lookup(hostname: string, options: DnsLookupOptions | DnsLookupFamily | undefined | null, callback: DnsLookupAllCallback, ...ignored: any[]): void;
    resolve(hostname: string, callback: DnsResolveCallback, ...ignored: any[]): void;
    resolve(hostname: string, rrtype: DnsResolveType, callback: DnsResolveCallback, ...ignored: any[]): void;
    resolveAny(hostname: string, callback: DnsResolveAnyCallback, ...ignored: any[]): void;
    reverse(hostname: string, callback: DnsResolveCallback, ...ignored: any[]): void;
    resolveCname(hostname: string, callback: DnsResolveCallback, ...ignored: any[]): void;
    resolve4(hostname: string, callback: DnsResolveCallback, ...ignored: any[]): void;
    resolve4(hostname: string, options: DnsResolveWithTtlOptions, callback: DnsResolveTtlCallback, ...ignored: any[]): void;
    resolve4(hostname: string, options: DnsResolveOptions | undefined, callback: DnsResolveCallback, ...ignored: any[]): void;
    resolve6(hostname: string, callback: DnsResolveCallback, ...ignored: any[]): void;
    resolve6(hostname: string, options: DnsResolveWithTtlOptions, callback: DnsResolveTtlCallback, ...ignored: any[]): void;
    resolve6(hostname: string, options: DnsResolveOptions | undefined, callback: DnsResolveCallback, ...ignored: any[]): void;
    lookupService(address: string, port: number, callback: DnsLookupServiceCallback, ...ignored: any[]): void;
    getDefaultResultOrder(...ignored: any[]): "ipv4first" | "ipv6first" | "verbatim";
    setDefaultResultOrder(order: "ipv4first" | "ipv6first" | "verbatim", ...ignored: any[]): void;
}
declare const dns: DNS;
declare module "dns" {
    export const ADDRCONFIG: number;
    export const V4MAPPED: number;
    export const ALL: number;
    export const promises: DnsPromises;
    export function lookup(hostname: string, callback: DnsLookupCallback, ...ignored: any[]): void;
    export function lookup(hostname: string, options: DnsLookupOptions | DnsLookupFamily | undefined | null, callback: DnsLookupCallback, ...ignored: any[]): void;
    export function lookup(hostname: string, options: DnsLookupOptions | DnsLookupFamily | undefined | null, callback: DnsLookupAllCallback, ...ignored: any[]): void;
    export function resolve(hostname: string, callback: DnsResolveCallback, ...ignored: any[]): void;
    export function resolve(hostname: string, rrtype: DnsResolveType, callback: DnsResolveCallback, ...ignored: any[]): void;
    export function resolveAny(hostname: string, callback: DnsResolveAnyCallback, ...ignored: any[]): void;
    export function reverse(hostname: string, callback: DnsResolveCallback, ...ignored: any[]): void;
    export function resolveCname(hostname: string, callback: DnsResolveCallback, ...ignored: any[]): void;
    export function resolve4(hostname: string, callback: DnsResolveCallback, ...ignored: any[]): void;
    export function resolve4(hostname: string, options: DnsResolveWithTtlOptions, callback: DnsResolveTtlCallback, ...ignored: any[]): void;
    export function resolve4(hostname: string, options: DnsResolveOptions | undefined, callback: DnsResolveCallback, ...ignored: any[]): void;
    export function resolve6(hostname: string, callback: DnsResolveCallback, ...ignored: any[]): void;
    export function resolve6(hostname: string, options: DnsResolveWithTtlOptions, callback: DnsResolveTtlCallback, ...ignored: any[]): void;
    export function resolve6(hostname: string, options: DnsResolveOptions | undefined, callback: DnsResolveCallback, ...ignored: any[]): void;
    export function lookupService(address: string, port: number, callback: DnsLookupServiceCallback, ...ignored: any[]): void;
    export function getDefaultResultOrder(...ignored: any[]): "ipv4first" | "ipv6first" | "verbatim";
    export function setDefaultResultOrder(order: "ipv4first" | "ipv6first" | "verbatim", ...ignored: any[]): void;
    const defaultDns: DNS;
    export default defaultDns;
}
declare module "node:dns" {
    export const ADDRCONFIG: number;
    export const V4MAPPED: number;
    export const ALL: number;
    export const promises: DnsPromises;
    export function lookup(hostname: string, callback: DnsLookupCallback, ...ignored: any[]): void;
    export function lookup(hostname: string, options: DnsLookupOptions | DnsLookupFamily | undefined | null, callback: DnsLookupCallback, ...ignored: any[]): void;
    export function lookup(hostname: string, options: DnsLookupOptions | DnsLookupFamily | undefined | null, callback: DnsLookupAllCallback, ...ignored: any[]): void;
    export function resolve(hostname: string, callback: DnsResolveCallback, ...ignored: any[]): void;
    export function resolve(hostname: string, rrtype: DnsResolveType, callback: DnsResolveCallback, ...ignored: any[]): void;
    export function resolveAny(hostname: string, callback: DnsResolveAnyCallback, ...ignored: any[]): void;
    export function reverse(hostname: string, callback: DnsResolveCallback, ...ignored: any[]): void;
    export function resolveCname(hostname: string, callback: DnsResolveCallback, ...ignored: any[]): void;
    export function resolve4(hostname: string, callback: DnsResolveCallback, ...ignored: any[]): void;
    export function resolve4(hostname: string, options: DnsResolveWithTtlOptions, callback: DnsResolveTtlCallback, ...ignored: any[]): void;
    export function resolve4(hostname: string, options: DnsResolveOptions | undefined, callback: DnsResolveCallback, ...ignored: any[]): void;
    export function resolve6(hostname: string, callback: DnsResolveCallback, ...ignored: any[]): void;
    export function resolve6(hostname: string, options: DnsResolveWithTtlOptions, callback: DnsResolveTtlCallback, ...ignored: any[]): void;
    export function resolve6(hostname: string, options: DnsResolveOptions | undefined, callback: DnsResolveCallback, ...ignored: any[]): void;
    export function lookupService(address: string, port: number, callback: DnsLookupServiceCallback, ...ignored: any[]): void;
    export function getDefaultResultOrder(...ignored: any[]): "ipv4first" | "ipv6first" | "verbatim";
    export function setDefaultResultOrder(order: "ipv4first" | "ipv6first" | "verbatim", ...ignored: any[]): void;
    const defaultDns: DNS;
    export default defaultDns;
}
declare module "dns/promises" {
    export const lookup: DnsPromises["lookup"];
    export const resolve: DnsPromises["resolve"];
    export const resolveAny: DnsPromises["resolveAny"];
    export const reverse: DnsPromises["reverse"];
    export const resolveCname: DnsPromises["resolveCname"];
    export const resolve4: DnsPromises["resolve4"];
    export const resolve6: DnsPromises["resolve6"];
    export const lookupService: DnsPromises["lookupService"];
    export const getDefaultResultOrder: DnsPromises["getDefaultResultOrder"];
    export const setDefaultResultOrder: DnsPromises["setDefaultResultOrder"];
    const defaultDnsPromises: DnsPromises;
    export default defaultDnsPromises;
}
declare module "node:dns/promises" {
    export const lookup: DnsPromises["lookup"];
    export const resolve: DnsPromises["resolve"];
    export const resolveAny: DnsPromises["resolveAny"];
    export const reverse: DnsPromises["reverse"];
    export const resolveCname: DnsPromises["resolveCname"];
    export const resolve4: DnsPromises["resolve4"];
    export const resolve6: DnsPromises["resolve6"];
    export const lookupService: DnsPromises["lookupService"];
    export const getDefaultResultOrder: DnsPromises["getDefaultResultOrder"];
    export const setDefaultResultOrder: DnsPromises["setDefaultResultOrder"];
    const defaultDnsPromises: DnsPromises;
    export default defaultDnsPromises;
}

interface SocketAddressInitOptions {
    address?: string;
    family?: "ipv4" | "ipv6";
    flowlabel?: number;
    port?: number;
}
interface SocketAddress {
    readonly address: string;
    readonly family: "ipv4" | "ipv6";
    readonly flowlabel: number;
    readonly port: number;
}
interface SocketAddressConstructor {
    new(options?: SocketAddressInitOptions): SocketAddress;
    parse(input: string): SocketAddress | undefined;
}
declare var SocketAddress: SocketAddressConstructor;

interface HttpIncomingMessage {
    readonly method: string;
    readonly url: string;
    readonly httpVersion: string;
    readonly statusCode?: number;
    readonly statusMessage?: string;
    readonly headers: any;
    readonly body: string;
    on(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): this;
    once(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): this;
    off(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): this;
}
interface HttpRequestOptions {
    hostname?: string;
    host?: string;
    port?: number;
    path?: string;
    method?: string;
    headers?: any;
}
interface HttpServerResponse {
    readonly writableHighWaterMark: number;
    readonly writableLength: number;
    readonly writableNeedDrain: boolean;
    statusCode: number;
    on(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): this;
    once(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): this;
    off(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): this;
    setHeader(name: string, value: string, ...ignored: any[]): this;
    writeHead(statusCode: number, headers?: any, ...ignored: any[]): this;
    write(data: string | Buffer, ...ignored: any[]): boolean;
    end(data?: string | Buffer, ...ignored: any[]): this;
}
interface HttpClientRequest {
    readonly writableHighWaterMark: number;
    readonly writableLength: number;
    readonly writableNeedDrain: boolean;
    on(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): this;
    once(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): this;
    off(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): this;
    write(data: string | Buffer, ...ignored: any[]): boolean;
    end(data?: string | Buffer, ...ignored: any[]): this;
    destroy(...ignored: any[]): this;
}
interface HttpServer {
    on(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): this;
    once(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): this;
    off(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): this;
    listen(port: number, callback?: () => void, ...ignored: any[]): this;
    listen(port: number, host: string, callback?: () => void, ...ignored: any[]): this;
    close(callback?: () => void, ...ignored: any[]): this;
    address(...ignored: any[]): SocketAddress | null;
}
interface HttpModule {
    readonly METHODS: string[];
    readonly STATUS_CODES: any;
    readonly maxHeaderSize: number;
    validateHeaderName(name: string, label?: string, ...ignored: any[]): void;
    validateHeaderValue(name: string, value: string, ...ignored: any[]): void;
    createServer(requestListener?: (request: HttpIncomingMessage, response: HttpServerResponse) => void, ...ignored: any[]): HttpServer;
    request(options: HttpRequestOptions, callback?: (response: HttpIncomingMessage) => void, ...ignored: any[]): HttpClientRequest;
    get(options: HttpRequestOptions, callback?: (response: HttpIncomingMessage) => void, ...ignored: any[]): HttpClientRequest;
}
declare const http: HttpModule;
declare module "http" {
    export const METHODS: string[];
    export const STATUS_CODES: any;
    export const maxHeaderSize: number;
    export function validateHeaderName(name: string, label?: string, ...ignored: any[]): void;
    export function validateHeaderValue(name: string, value: string, ...ignored: any[]): void;
    export function createServer(requestListener?: (request: HttpIncomingMessage, response: HttpServerResponse) => void, ...ignored: any[]): HttpServer;
    export function request(options: HttpRequestOptions, callback?: (response: HttpIncomingMessage) => void, ...ignored: any[]): HttpClientRequest;
    export function get(options: HttpRequestOptions, callback?: (response: HttpIncomingMessage) => void, ...ignored: any[]): HttpClientRequest;
    const defaultHttp: HttpModule;
    export default defaultHttp;
}
declare module "node:http" {
    export const METHODS: string[];
    export const STATUS_CODES: any;
    export const maxHeaderSize: number;
    export function validateHeaderName(name: string, label?: string, ...ignored: any[]): void;
    export function validateHeaderValue(name: string, value: string, ...ignored: any[]): void;
    export function createServer(requestListener?: (request: HttpIncomingMessage, response: HttpServerResponse) => void, ...ignored: any[]): HttpServer;
    export function request(options: HttpRequestOptions, callback?: (response: HttpIncomingMessage) => void, ...ignored: any[]): HttpClientRequest;
    export function get(options: HttpRequestOptions, callback?: (response: HttpIncomingMessage) => void, ...ignored: any[]): HttpClientRequest;
    const defaultHttp: HttpModule;
    export default defaultHttp;
}

interface HttpsRequestOptions extends HttpRequestOptions {
    rejectUnauthorized?: boolean;
    servername?: string;
}
interface HttpsServerOptions {
    key: string;
    cert: string;
}
interface HttpsModule {
    createServer(options: HttpsServerOptions, requestListener?: (request: HttpIncomingMessage, response: HttpServerResponse) => void, ...ignored: any[]): HttpServer;
    request(options: HttpsRequestOptions, callback?: (response: HttpIncomingMessage) => void, ...ignored: any[]): HttpClientRequest;
    get(options: HttpsRequestOptions, callback?: (response: HttpIncomingMessage) => void, ...ignored: any[]): HttpClientRequest;
}
declare module "https" {
    export function createServer(options: HttpsServerOptions, requestListener?: (request: HttpIncomingMessage, response: HttpServerResponse) => void, ...ignored: any[]): HttpServer;
    export function request(options: HttpsRequestOptions, callback?: (response: HttpIncomingMessage) => void, ...ignored: any[]): HttpClientRequest;
    export function get(options: HttpsRequestOptions, callback?: (response: HttpIncomingMessage) => void, ...ignored: any[]): HttpClientRequest;
    const defaultHttps: HttpsModule;
    export default defaultHttps;
}
declare module "node:https" {
    export function createServer(options: HttpsServerOptions, requestListener?: (request: HttpIncomingMessage, response: HttpServerResponse) => void, ...ignored: any[]): HttpServer;
    export function request(options: HttpsRequestOptions, callback?: (response: HttpIncomingMessage) => void, ...ignored: any[]): HttpClientRequest;
    export function get(options: HttpsRequestOptions, callback?: (response: HttpIncomingMessage) => void, ...ignored: any[]): HttpClientRequest;
    const defaultHttps: HttpsModule;
    export default defaultHttps;
}

interface NetSocket {
    readonly connecting: boolean;
    readonly destroyed: boolean;
    readonly readyState: string;
    readonly bytesRead: number;
    readonly bytesWritten: number;
    readonly writableHighWaterMark: number;
    readonly writableLength: number;
    readonly writableNeedDrain: boolean;
    readonly localAddress?: string;
    readonly localPort?: number;
    readonly remoteAddress?: string;
    readonly remotePort?: number;
    readonly localFamily?: string;
    readonly remoteFamily?: string;
    readonly readable: boolean;
    readonly writable: boolean;
    readonly readableEnded: boolean;
    readonly writableEnded: boolean;
    on(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): this;
    once(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): this;
    off(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): this;
    removeListener(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): this;
    setEncoding(encoding: "utf8" | "utf-8", ...ignored: any[]): this;
    setNoDelay(noDelay?: boolean, ...ignored: any[]): this;
    setKeepAlive(enable?: boolean, initialDelay?: number, ...ignored: any[]): this;
    setTimeout(timeout: number, callback?: () => void, ...ignored: any[]): this;
    pause(...ignored: any[]): this;
    resume(...ignored: any[]): this;
    write(data: string | Buffer, callback?: () => void, ...ignored: any[]): boolean;
    end(callback?: () => void, ...ignored: any[]): this;
    end(data: string | Buffer, callback?: () => void, ...ignored: any[]): this;
    destroy(callback?: () => void, ...ignored: any[]): this;
    destroy(error: any, callback?: () => void, ...ignored: any[]): this;
    address(...ignored: any[]): SocketAddress | null;
    ref(...ignored: any[]): this;
    unref(...ignored: any[]): this;
}
interface NetConnectOptions {
    port: number;
    host?: string;
}
interface NetListenOptions {
    port: number;
    host?: string;
    backlog?: number;
}
interface NetServer {
    readonly listening: boolean;
    readonly connections: number;
    maxConnections: number;
    getConnections(callback: (error: any, count: number) => void, ...ignored: any[]): void;
    on(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): this;
    once(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): this;
    off(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): this;
    removeListener(eventName: string, listener: (...args: any[]) => void, ...ignored: any[]): this;
    listen(options: NetListenOptions, callback?: () => void, ...ignored: any[]): this;
    listen(port: number, callback?: () => void, ...ignored: any[]): this;
    listen(port: number, host: string, callback?: () => void, ...ignored: any[]): this;
    close(callback?: () => void, ...ignored: any[]): this;
    address(...ignored: any[]): SocketAddress | null;
    ref(...ignored: any[]): this;
    unref(...ignored: any[]): this;
}
interface Net {
    isIP(input: string, ...ignored: any[]): number;
    isIPv4(input: string, ...ignored: any[]): boolean;
    isIPv6(input: string, ...ignored: any[]): boolean;
    SocketAddress: SocketAddressConstructor;
    createServer(connectionListener?: (socket: NetSocket) => void, ...ignored: any[]): NetServer;
    connect(options: NetConnectOptions, callback?: () => void, ...ignored: any[]): NetSocket;
    connect(port: number, callback?: () => void, ...ignored: any[]): NetSocket;
    connect(port: number, host: string, callback?: () => void, ...ignored: any[]): NetSocket;
    createConnection(options: NetConnectOptions, callback?: () => void, ...ignored: any[]): NetSocket;
    createConnection(port: number, callback?: () => void, ...ignored: any[]): NetSocket;
    createConnection(port: number, host: string, callback?: () => void, ...ignored: any[]): NetSocket;
}
declare const net: Net;
declare module "net" {
    export function isIP(input: string, ...ignored: any[]): number;
    export function isIPv4(input: string, ...ignored: any[]): boolean;
    export function isIPv6(input: string, ...ignored: any[]): boolean;
    export const SocketAddress: SocketAddressConstructor;
    export function createServer(connectionListener?: (socket: NetSocket) => void, ...ignored: any[]): NetServer;
    export function connect(options: NetConnectOptions, callback?: () => void, ...ignored: any[]): NetSocket;
    export function connect(port: number, callback?: () => void, ...ignored: any[]): NetSocket;
    export function connect(port: number, host: string, callback?: () => void, ...ignored: any[]): NetSocket;
    export function createConnection(options: NetConnectOptions, callback?: () => void, ...ignored: any[]): NetSocket;
    export function createConnection(port: number, callback?: () => void, ...ignored: any[]): NetSocket;
    export function createConnection(port: number, host: string, callback?: () => void, ...ignored: any[]): NetSocket;
    const defaultNet: Net;
    export default defaultNet;
}
declare module "node:net" {
    export function isIP(input: string, ...ignored: any[]): number;
    export function isIPv4(input: string, ...ignored: any[]): boolean;
    export function isIPv6(input: string, ...ignored: any[]): boolean;
    export const SocketAddress: SocketAddressConstructor;
    export function createServer(connectionListener?: (socket: NetSocket) => void, ...ignored: any[]): NetServer;
    export function connect(options: NetConnectOptions, callback?: () => void, ...ignored: any[]): NetSocket;
    export function connect(port: number, callback?: () => void, ...ignored: any[]): NetSocket;
    export function connect(port: number, host: string, callback?: () => void, ...ignored: any[]): NetSocket;
    export function createConnection(options: NetConnectOptions, callback?: () => void, ...ignored: any[]): NetSocket;
    export function createConnection(port: number, callback?: () => void, ...ignored: any[]): NetSocket;
    export function createConnection(port: number, host: string, callback?: () => void, ...ignored: any[]): NetSocket;
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
    killSignal?: ChildProcessKillSignal;
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
    killSignal?: ChildProcessKillSignal;
}
interface ChildProcessSpawnSyncOptions {
    encoding?: "utf8" | "utf-8" | "buffer";
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
    killSignal?: ChildProcessKillSignal;
}
interface ChildProcessSpawnSyncUtf8Options extends ChildProcessSpawnSyncOptions {
    encoding: "utf8" | "utf-8";
}
interface ChildProcessSpawnSyncBufferOptions extends ChildProcessSpawnSyncOptions {
    encoding?: "buffer";
}
interface ChildProcessSpawnOptions {
    cwd?: string;
    env?: any;
    shell?: boolean | string;
    stdio?: ChildProcessSpawnSyncStdio;
    argv0?: string;
    detached?: boolean;
    windowsHide?: boolean;
    windowsVerbatimArguments?: boolean;
    uid?: number;
    gid?: number;
    timeout?: number;
    killSignal?: ChildProcessKillSignal;
    signal?: any;
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
    killSignal?: ChildProcessKillSignal;
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
    killSignal?: ChildProcessKillSignal;
}
interface ChildProcessExecSyncStringOptions extends ChildProcessExecSyncOptions {
    encoding: "utf8" | "utf-8";
}
interface ChildProcessExecSyncBufferOptions extends ChildProcessExecSyncOptions {
    encoding: "buffer";
}
interface ChildProcessModule {
    exec(command: string, callback: ChildProcessExecCallback, ...ignored: any[]): void;
    exec(command: string, options: ChildProcessExecOptions | undefined, callback: ChildProcessExecCallback, ...ignored: any[]): void;
    execFile(file: string, callback: ChildProcessExecCallback, ...ignored: any[]): void;
    execFile(file: string, options: ChildProcessExecFileOptions | undefined, callback: ChildProcessExecCallback, ...ignored: any[]): void;
    execFile(file: string, args: string[], callback: ChildProcessExecCallback, ...ignored: any[]): void;
    execFile(file: string, args: string[], options: ChildProcessExecFileOptions | undefined, callback: ChildProcessExecCallback, ...ignored: any[]): void;
    execSync(command: string, options: ChildProcessExecSyncStringOptions, ...ignored: any[]): string;
    execSync(command: string, options: ChildProcessExecSyncBufferOptions, ...ignored: any[]): Buffer;
    execSync(command: string, options?: ChildProcessExecSyncOptions, ...ignored: any[]): Buffer;
    execFileSync(file: string, options: ChildProcessExecFileSyncStringOptions, ...ignored: any[]): string;
    execFileSync(file: string, options: ChildProcessExecFileSyncBufferOptions, ...ignored: any[]): Buffer;
    execFileSync(file: string, options: ChildProcessExecFileSyncOptions | undefined, ...ignored: any[]): Buffer;
    execFileSync(file: string, args: string[], options: ChildProcessExecFileSyncStringOptions, ...ignored: any[]): string;
    execFileSync(file: string, args: string[], options: ChildProcessExecFileSyncBufferOptions, ...ignored: any[]): Buffer;
    execFileSync(file: string, args?: string[], options?: ChildProcessExecFileSyncOptions | undefined, ...ignored: any[]): Buffer;
    spawnSync(file: string, options: ChildProcessSpawnSyncUtf8Options, ...ignored: any[]): any;
    spawnSync(file: string, options?: ChildProcessSpawnSyncBufferOptions, ...ignored: any[]): any;
    spawnSync(file: string, args: string[], options: ChildProcessSpawnSyncUtf8Options, ...ignored: any[]): any;
    spawnSync(file: string, args?: string[], options?: ChildProcessSpawnSyncBufferOptions, ...ignored: any[]): any;
    spawn(file: string, args?: string[], options?: ChildProcessSpawnOptions): any;
    fork(...args: any[]): any;
}
declare module "child_process" {
    export function exec(command: string, callback: ChildProcessExecCallback, ...ignored: any[]): void;
    export function exec(command: string, options: ChildProcessExecOptions | undefined, callback: ChildProcessExecCallback, ...ignored: any[]): void;
    export function execFile(file: string, callback: ChildProcessExecCallback, ...ignored: any[]): void;
    export function execFile(file: string, options: ChildProcessExecFileOptions | undefined, callback: ChildProcessExecCallback, ...ignored: any[]): void;
    export function execFile(file: string, args: string[], callback: ChildProcessExecCallback, ...ignored: any[]): void;
    export function execFile(file: string, args: string[], options: ChildProcessExecFileOptions | undefined, callback: ChildProcessExecCallback, ...ignored: any[]): void;
    export function execSync(command: string, options: ChildProcessExecSyncStringOptions, ...ignored: any[]): string;
    export function execSync(command: string, options: ChildProcessExecSyncBufferOptions, ...ignored: any[]): Buffer;
    export function execSync(command: string, options?: ChildProcessExecSyncOptions, ...ignored: any[]): Buffer;
    export function execFileSync(file: string, options: ChildProcessExecFileSyncStringOptions, ...ignored: any[]): string;
    export function execFileSync(file: string, options: ChildProcessExecFileSyncBufferOptions, ...ignored: any[]): Buffer;
    export function execFileSync(file: string, options: ChildProcessExecFileSyncOptions | undefined, ...ignored: any[]): Buffer;
    export function execFileSync(file: string, args: string[], options: ChildProcessExecFileSyncStringOptions, ...ignored: any[]): string;
    export function execFileSync(file: string, args: string[], options: ChildProcessExecFileSyncBufferOptions, ...ignored: any[]): Buffer;
    export function execFileSync(file: string, args?: string[], options?: ChildProcessExecFileSyncOptions | undefined, ...ignored: any[]): Buffer;
    export function spawnSync(file: string, options: ChildProcessSpawnSyncUtf8Options, ...ignored: any[]): any;
    export function spawnSync(file: string, options?: ChildProcessSpawnSyncBufferOptions, ...ignored: any[]): any;
    export function spawnSync(file: string, args: string[], options: ChildProcessSpawnSyncUtf8Options, ...ignored: any[]): any;
    export function spawnSync(file: string, args?: string[], options?: ChildProcessSpawnSyncBufferOptions, ...ignored: any[]): any;
    export function spawn(file: string, args?: string[], options?: ChildProcessSpawnOptions): any;
    export function fork(...args: any[]): any;
    const defaultChildProcess: ChildProcessModule;
    export default defaultChildProcess;
}
declare module "node:child_process" {
    export function exec(command: string, callback: ChildProcessExecCallback, ...ignored: any[]): void;
    export function exec(command: string, options: ChildProcessExecOptions | undefined, callback: ChildProcessExecCallback, ...ignored: any[]): void;
    export function execFile(file: string, callback: ChildProcessExecCallback, ...ignored: any[]): void;
    export function execFile(file: string, options: ChildProcessExecFileOptions | undefined, callback: ChildProcessExecCallback, ...ignored: any[]): void;
    export function execFile(file: string, args: string[], callback: ChildProcessExecCallback, ...ignored: any[]): void;
    export function execFile(file: string, args: string[], options: ChildProcessExecFileOptions | undefined, callback: ChildProcessExecCallback, ...ignored: any[]): void;
    export function execSync(command: string, options: ChildProcessExecSyncStringOptions, ...ignored: any[]): string;
    export function execSync(command: string, options: ChildProcessExecSyncBufferOptions, ...ignored: any[]): Buffer;
    export function execSync(command: string, options?: ChildProcessExecSyncOptions, ...ignored: any[]): Buffer;
    export function execFileSync(file: string, options: ChildProcessExecFileSyncStringOptions, ...ignored: any[]): string;
    export function execFileSync(file: string, options: ChildProcessExecFileSyncBufferOptions, ...ignored: any[]): Buffer;
    export function execFileSync(file: string, options: ChildProcessExecFileSyncOptions | undefined, ...ignored: any[]): Buffer;
    export function execFileSync(file: string, args: string[], options: ChildProcessExecFileSyncStringOptions, ...ignored: any[]): string;
    export function execFileSync(file: string, args: string[], options: ChildProcessExecFileSyncBufferOptions, ...ignored: any[]): Buffer;
    export function execFileSync(file: string, args?: string[], options?: ChildProcessExecFileSyncOptions | undefined, ...ignored: any[]): Buffer;
    export function spawnSync(file: string, options: ChildProcessSpawnSyncUtf8Options, ...ignored: any[]): any;
    export function spawnSync(file: string, options?: ChildProcessSpawnSyncBufferOptions, ...ignored: any[]): any;
    export function spawnSync(file: string, args: string[], options: ChildProcessSpawnSyncUtf8Options, ...ignored: any[]): any;
    export function spawnSync(file: string, args?: string[], options?: ChildProcessSpawnSyncBufferOptions, ...ignored: any[]): any;
    export function spawn(file: string, args?: string[], options?: ChildProcessSpawnOptions): any;
    export function fork(...args: any[]): any;
    const defaultChildProcess: ChildProcessModule;
    export default defaultChildProcess;
}

interface URL {
    readonly href: string;
    readonly protocol: string;
    readonly host: string;
    readonly hostname: string;
    readonly username: string;
    readonly password: string;
    readonly port: string;
    readonly pathname: string;
    readonly search: string;
    readonly searchParams: URLSearchParams;
    readonly hash: string;
    readonly origin: string;
    toJSON(...ignored: any[]): string;
    toLocaleString(...ignored: any[]): string;
    toString(...ignored: any[]): string;
    valueOf(...ignored: any[]): URL;
}
interface URLConstructor {
    new (input: string, base?: string, ...ignored: any[]): URL;
    canParse(input: string, base?: string, ...ignored: any[]): boolean;
}
declare var URL: URLConstructor;
interface URLSearchParams {
    readonly size: number;
    append(name: string, value: string, ...ignored: any[]): void;
    delete(name: string, value?: string, ...ignored: any[]): void;
    get(name: string, ...ignored: any[]): string | null;
    getAll(name: string, ...ignored: any[]): string[];
    has(name: string, value?: string, ...ignored: any[]): boolean;
    set(name: string, value: string, ...ignored: any[]): void;
    toString(...ignored: any[]): string;
    toLocaleString(...ignored: any[]): string;
    valueOf(...ignored: any[]): URLSearchParams;
    sort(...ignored: any[]): void;
    keys(...ignored: any[]): string[];
    values(...ignored: any[]): string[];
    entries(...ignored: any[]): ObjectEntry<string, string>[];
    forEach(callback: (value: string, key: string, parent: URLSearchParams) => void, thisArg?: any, ...ignored: any[]): void;
    [Symbol.iterator](): IterableIterator<[string, string]>;
}
interface URLSearchParamsConstructor {
    new (init?: string, ...ignored: any[]): URLSearchParams;
}
declare var URLSearchParams: URLSearchParamsConstructor;
type URLPathLike = string | URL;
interface UrlModule {
    URL: URLConstructor;
    URLSearchParams: URLSearchParamsConstructor;
    fileURLToPath(url: URLPathLike, ...ignored: any[]): string;
    pathToFileURL(path: string, ...ignored: any[]): URL;
}
declare module "url" {
    export const URL: URLConstructor;
    export const URLSearchParams: URLSearchParamsConstructor;
    export function fileURLToPath(url: URLPathLike, ...ignored: any[]): string;
    export function pathToFileURL(path: string, ...ignored: any[]): URL;
    const defaultUrl: UrlModule;
    export default defaultUrl;
}
declare module "node:url" {
    export const URL: URLConstructor;
    export const URLSearchParams: URLSearchParamsConstructor;
    export function fileURLToPath(url: URLPathLike, ...ignored: any[]): string;
    export function pathToFileURL(path: string, ...ignored: any[]): URL;
    const defaultUrl: UrlModule;
    export default defaultUrl;
}

interface TextEncoder {
    encode(input?: string, ...ignored: any[]): Buffer;
}
interface TextEncoderConstructor {
    new (): TextEncoder;
}
declare var TextEncoder: TextEncoderConstructor;

interface TextDecoder {
    decode(input?: Buffer, ...ignored: any[]): string;
}
interface TextDecoderConstructor {
    new (label?: string, ...ignored: any[]): TextDecoder;
}
declare var TextDecoder: TextDecoderConstructor;

/** Optional GCD-style explicit concurrency (requires libdispatch when used). */
interface DispatchQueue {
    readonly label: string;
}
interface DispatchQueueConstructor {
    /** Creates a serial queue: tasks run one at a time, in FIFO order. */
    new (label: string): DispatchQueue;
    /** The shared concurrent worker pool. */
    concurrent(): DispatchQueue;
}
declare var DispatchQueue: DispatchQueueConstructor;
declare namespace dispatch {
    /**
     * Runs `task` on `queue` on a worker thread. Resolves with the task's
     * return value on the main event loop. Task captures must be `const`
     * primitives (number/string/boolean) or DispatchQueue references, and the
     * task body may not use `await` or `this`.
     */
    function async<T>(queue: DispatchQueue, task: () => T): Promise<T>;
    /** Runs `task` on `queue` after a bounded millisecond delay. */
    function after<T>(delay: number, queue: DispatchQueue, task: () => T): Promise<T>;
    /** Runs `task` on `queue` and blocks the caller until it completes. */
    function sync<T>(queue: DispatchQueue, task: () => T): T;
    /** Runs an inline task list on `queue` and resolves when every task completes. */
    function group<T>(queue: DispatchQueue, tasks: readonly (() => T)[]): Promise<T[]>;
    /** Runs a task exclusively after earlier work on a concurrent queue completes. */
    function barrier<T>(queue: DispatchQueue, task: () => T): Promise<T>;
}

interface UtilTypes {
    isDate(object: any): object is Date;
    isRegExp(object: any): object is RegExp;
    isNativeError(object: any): object is Error;
    isPromise(object: any): object is Promise<any>;
    isMap(object: any): object is Map<any, any>;
    isSet(object: any): object is Set<any>;
    isTypedArray(object: any): boolean;
    isAnyArrayBuffer(object: any): boolean;
    isArrayBufferView(object: any): boolean;
}

interface UtilModule {
    format(format?: any, ...args: any[]): string;
    types: UtilTypes;
    TextEncoder: TextEncoderConstructor;
    TextDecoder: TextDecoderConstructor;
}
declare module "util" {
    export function format(format?: any, ...args: any[]): string;
    export const types: UtilTypes;
    export const TextEncoder: TextEncoderConstructor;
    export const TextDecoder: TextDecoderConstructor;
    const defaultUtil: UtilModule;
    export default defaultUtil;
}
declare module "node:util" {
    export function format(format?: any, ...args: any[]): string;
    export const types: UtilTypes;
    export const TextEncoder: TextEncoderConstructor;
    export const TextDecoder: TextDecoderConstructor;
    const defaultUtil: UtilModule;
    export default defaultUtil;
}

interface QueryStringModule {
    parse(str: string, sep?: string, eq?: string, options?: any, ...ignored: any[]): any;
    stringify(obj: any, sep?: string, eq?: string, options?: any, ...ignored: any[]): string;
    escape(str: string, ...ignored: any[]): string;
    unescape(str: string, ...ignored: any[]): string;
}
declare const querystring: QueryStringModule;
declare module "querystring" {
    export function parse(str: string, sep?: string, eq?: string, options?: any, ...ignored: any[]): any;
    export function stringify(obj: any, sep?: string, eq?: string, options?: any, ...ignored: any[]): string;
    export function escape(str: string, ...ignored: any[]): string;
    export function unescape(str: string, ...ignored: any[]): string;
    const defaultQueryString: QueryStringModule;
    export default defaultQueryString;
}
declare module "node:querystring" {
    export function parse(str: string, sep?: string, eq?: string, options?: any, ...ignored: any[]): any;
    export function stringify(obj: any, sep?: string, eq?: string, options?: any, ...ignored: any[]): string;
    export function escape(str: string, ...ignored: any[]): string;
    export function unescape(str: string, ...ignored: any[]): string;
    const defaultQueryString: QueryStringModule;
    export default defaultQueryString;
}
