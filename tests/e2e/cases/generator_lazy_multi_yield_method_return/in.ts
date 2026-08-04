interface TypedMethodResult {
    first: number;
    final: number;
    add: any;
}

function* dynamicObject(): Generator<any, any, any> {
    return {
        first: yield "dynamic-first",
        add(value: any) {
            return "dynamic-method:" + value;
        },
        final: yield "dynamic-final",
    };
}

function* typedObject(): Generator<number, TypedMethodResult, number> {
    return {
        first: yield 2,
        add(value: number) {
            return value + 7;
        },
        final: yield 5,
    };
}

const dynamicIterator = dynamicObject();
const dynamicFirst: any = dynamicIterator.next();
const dynamicSecond: any = dynamicIterator.next("unused");
const dynamicDone: any = dynamicIterator.next("ignored");
const dynamicResult = dynamicDone.value as any;
console.log("dynamic", dynamicFirst.done, dynamicFirst.value, dynamicSecond.done, dynamicSecond.value, dynamicDone.done, dynamicResult.add("done"));

const typedIterator = typedObject();
const typedFirst: any = typedIterator.next();
const typedSecond: any = typedIterator.next(3);
const typedDone: any = typedIterator.next(7);
const typedResult = typedDone.value as TypedMethodResult;
console.log("typed", typedFirst.done, typedFirst.value, typedSecond.done, typedSecond.value, typedDone.done, typedResult.first, typedResult.final, typedResult.add !== undefined);
