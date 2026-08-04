class NumberBag {
    items: number[];

    constructor(items: number[]) {
        this.items = items;
    }

    [Symbol.iterator](): IterableIterator<number> {
        return this.items as unknown as IterableIterator<number>;
    }
}

const mapValues = new Map<string, number>();
mapValues.set("map-one", 1);
mapValues.set("map-two", 2);

const setValues = new Set<string>();
setValues.add("set-one");
setValues.add("set-two");

const customValues = new NumberBag([30, 40]);
const params = new URLSearchParams("url-one=1&url-two=2");
const bufferValues = Buffer.from([50, 60]);
const dynamicArray: any = ["dynamic-one", "dynamic-two"];
const dynamicString: any = "ab";

function* caughtMap(): Generator<any, string, any> {
    try {
        yield "map-source";
    } catch {
        yield* mapValues;
        return "map-done";
    }
    return "map-normal";
}

function* caughtSet(): Generator<any, string, any> {
    try {
        yield "set-source";
    } catch {
        yield* setValues;
        return "set-done";
    }
    return "set-normal";
}

function* caughtString(): Generator<any, string, any> {
    try {
        yield "string-source";
    } catch {
        yield* "ab";
        return "string-done";
    }
    return "string-normal";
}

function* caughtCustom(): Generator<any, string, any> {
    try {
        yield "custom-source";
    } catch {
        yield* customValues;
        return "custom-done";
    }
    return "custom-normal";
}

function* caughtUrl(): Generator<any, string, any> {
    try {
        yield "url-source";
    } catch {
        yield* params;
        return "url-done";
    }
    return "url-normal";
}

function* caughtBuffer(): Generator<any, string, any> {
    try {
        yield "buffer-source";
    } catch {
        yield* bufferValues;
        return "buffer-done";
    }
    return "buffer-normal";
}

function* caughtDynamicArray(): Generator<any, string, any> {
    try {
        yield "dynamic-array-source";
    } catch {
        yield* dynamicArray;
        return "dynamic-array-done";
    }
    return "dynamic-array-normal";
}

function* caughtDynamicString(): Generator<any, string, any> {
    try {
        yield "dynamic-string-source";
    } catch {
        yield* dynamicString;
        return "dynamic-string-done";
    }
    return "dynamic-string-normal";
}

const map = caughtMap();
const mapFirst: any = map.next();
const mapSecond: any = map.throw("map-error");
const mapThird: any = map.next("map-resume-one");
const mapDone: any = map.next("map-resume-two");
console.log("map", mapFirst.value, mapSecond.value[0], mapSecond.value[1], mapThird.value[0], mapThird.value[1], mapDone.done, mapDone.value);

const set = caughtSet();
const setFirst: any = set.next();
const setSecond: any = set.throw("set-error");
const setThird: any = set.next("set-resume-one");
const setDone: any = set.next("set-resume-two");
console.log("set", setFirst.value, setSecond.value, setThird.value, setDone.done, setDone.value);

const string = caughtString();
const stringFirst: any = string.next();
const stringSecond: any = string.throw("string-error");
const stringThird: any = string.next("string-resume-one");
const stringDone: any = string.next("string-resume-two");
console.log("string", stringFirst.value, stringSecond.value, stringThird.value, stringDone.done, stringDone.value);

const custom = caughtCustom();
const customFirst: any = custom.next();
const customSecond: any = custom.throw("custom-error");
const customThird: any = custom.next("custom-resume-one");
const customDone: any = custom.next("custom-resume-two");
console.log("custom", customFirst.value, customSecond.value, customThird.value, customDone.done, customDone.value);

const url = caughtUrl();
const urlFirst: any = url.next();
const urlSecond: any = url.throw("url-error");
const urlThird: any = url.next("url-resume-one");
const urlDone: any = url.next("url-resume-two");
console.log("url", urlFirst.value, urlSecond.value[0], urlSecond.value[1], urlThird.value[0], urlThird.value[1], urlDone.done, urlDone.value);

const buffer = caughtBuffer();
const bufferFirst: any = buffer.next();
const bufferSecond: any = buffer.throw("buffer-error");
const bufferThird: any = buffer.next("buffer-resume-one");
const bufferDone: any = buffer.next("buffer-resume-two");
console.log("buffer", bufferFirst.value, bufferSecond.value, bufferThird.value, bufferDone.done, bufferDone.value);

const dynamicArrayIter = caughtDynamicArray();
const dynamicArrayFirst: any = dynamicArrayIter.next();
const dynamicArraySecond: any = dynamicArrayIter.throw("dynamic-array-error");
const dynamicArrayThird: any = dynamicArrayIter.next("dynamic-array-resume-one");
const dynamicArrayDone: any = dynamicArrayIter.next("dynamic-array-resume-two");
console.log("dynamic-array", dynamicArrayFirst.value, dynamicArraySecond.value, dynamicArrayThird.value, dynamicArrayDone.done, dynamicArrayDone.value);

const dynamicStringIter = caughtDynamicString();
const dynamicStringFirst: any = dynamicStringIter.next();
const dynamicStringSecond: any = dynamicStringIter.throw("dynamic-string-error");
const dynamicStringThird: any = dynamicStringIter.next("dynamic-string-resume-one");
const dynamicStringDone: any = dynamicStringIter.next("dynamic-string-resume-two");
console.log("dynamic-string", dynamicStringFirst.value, dynamicStringSecond.value, dynamicStringThird.value, dynamicStringDone.done, dynamicStringDone.value);

const mapClosed = caughtMap();
const mapClosedFirst: any = mapClosed.next();
const mapClosedSecond: any = mapClosed.throw("map-close-error");
const mapClosedDone: any = mapClosed.return("map-closed");
console.log("map-close", mapClosedFirst.value, mapClosedSecond.value[0], mapClosedDone.done, mapClosedDone.value);
