class Box {
    *items(): Generator<string, string, undefined> {
        yield "class-a";
        yield "class-b";
        return "class-done";
    }
}

const boxIter = new Box().items();
const boxFirst: any = boxIter.next();
const boxSecond: any = boxIter.next();
const boxDone: any = boxIter.next();
console.log("class:", boxFirst.value, boxSecond.value, boxDone.done, boxDone.value);

const obj: any = {
    *genMethod(): Generator<string, string, undefined> {
        yield "object-a";
        return "ended";
    },
};

const objIter = obj.genMethod();
const objFirst: any = objIter.next();
const objDone: any = objIter.next();
const objAfter: any = objIter.next();
console.log("object:", objFirst.value, objDone.done, objDone.value, objAfter.done, String(objAfter.value));

const make = function* (prefix: string): Generator<string, string, undefined> {
    yield prefix + "-one";
    return prefix + "-done";
};

const fnIter = make("fn");
const fnFirst: any = fnIter.next();
const fnDone: any = fnIter.next();
console.log("fn:", fnFirst.value, fnDone.done, fnDone.value);

try {
    make("throw").throw("boom");
} catch (e) {
    console.log("throw:", e);
}

const closeIter = make("close");
console.log("return first:", closeIter.next().value);
const forced: any = closeIter.return("forced");
const forcedAfter: any = closeIter.next();
console.log("return:", forced.done, forced.value, forcedAfter.done, String(forcedAfter.value));
