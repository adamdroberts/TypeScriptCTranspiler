interface TypedMethodResult {
    first: number;
    final: number;
    add: any;
}

const accessorEvents: string[] = [];

function* dynamicObject(): Generator<any, any, any> {
    return {
        first: yield "dynamic-first",
        add(value: any) {
            return "dynamic-method:" + value;
        },
        final: yield "dynamic-final",
    };
}

function* dynamicAccessorObject(): Generator<any, any, any> {
    return {
        first: yield "dynamic-accessor-first",
        get score() {
            accessorEvents.push("get");
            return "dynamic-accessor";
        },
        set score(value: any) {
            accessorEvents.push("set:" + value);
        },
        final: yield "dynamic-accessor-final",
    };
}

function* dynamicGeneratorMethodObject(): Generator<any, any, any> {
    return {
        first: yield "dynamic-generator-method-first",
        *nested(): Generator<string, string, any> {
            yield "generator-method-yield";
            return "generator-method-done";
        },
        *recovered(): Generator<string, string, any> {
            try {
                throw "generator-method-control-flow-error";
            } catch (_error) {
                yield "generator-method-control-flow-yield";
            }
            return "generator-method-control-flow-done";
        },
        final: yield "dynamic-generator-method-final",
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

const accessorIterator = dynamicAccessorObject();
const accessorFirst: any = accessorIterator.next();
const accessorSecond: any = accessorIterator.next(3);
const accessorDone: any = accessorIterator.next(7);
const accessorResult: any = accessorDone.value;
const accessorDescriptor: any = Object.getOwnPropertyDescriptor(accessorResult, "score");
const accessorEventsBeforeAccess = accessorEvents.join(",");
const accessorRead: any = accessorResult.score;
accessorResult.score = "value";
console.log("accessor", accessorFirst.done, accessorFirst.value, accessorSecond.done, accessorSecond.value, accessorDone.done, accessorEventsBeforeAccess, accessorDescriptor.enumerable, accessorDescriptor.configurable, typeof accessorDescriptor.get, typeof accessorDescriptor.set, accessorRead, accessorEvents.join(","));

const generatorMethodIterator = dynamicGeneratorMethodObject();
const generatorMethodFirst: any = generatorMethodIterator.next();
const generatorMethodSecond: any = generatorMethodIterator.next(3);
const generatorMethodDone: any = generatorMethodIterator.next(7);
const generatorMethodResult: any = generatorMethodDone.value;
const nestedMethodIterator: any = generatorMethodResult.nested();
const nestedMethodFirst: any = nestedMethodIterator.next();
const nestedMethodDone: any = nestedMethodIterator.next("unused");
const recoveredMethodIterator: any = generatorMethodResult.recovered();
const recoveredMethodFirst: any = recoveredMethodIterator.next();
const recoveredMethodDone: any = recoveredMethodIterator.next("unused");
console.log("generator-method", generatorMethodFirst.done, generatorMethodFirst.value, generatorMethodSecond.done, generatorMethodSecond.value, generatorMethodDone.done, nestedMethodFirst.done, nestedMethodFirst.value, nestedMethodDone.done, nestedMethodDone.value, recoveredMethodFirst.done, recoveredMethodFirst.value, recoveredMethodDone.done, recoveredMethodDone.value);

const typedIterator = typedObject();
const typedFirst: any = typedIterator.next();
const typedSecond: any = typedIterator.next(3);
const typedDone: any = typedIterator.next(7);
const typedResult = typedDone.value as TypedMethodResult;
console.log("typed", typedFirst.done, typedFirst.value, typedSecond.done, typedSecond.value, typedDone.done, typedResult.first, typedResult.final, typedResult.add !== undefined);
