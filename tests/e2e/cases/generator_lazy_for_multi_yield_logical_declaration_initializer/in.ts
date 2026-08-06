function* multiYieldLogicalDeclarationInitializer(): Generator<string, string, number> {
    for (
        let i: any = (yield "i-a") && (yield "i-b"),
        j: any = (yield "j-a") || (yield "j-b"),
        k: any = (yield "k-a") ?? (yield "k-b");
        i + j + k < 6;
        i++, j++, k++
    ) {
        yield "body-" + i + ":" + j + ":" + k;
    }
    return "done";
}

let sideEffectingLogicalInitializerCallCount = 0;
function sideEffectingLogicalInitializerCall(value: any): any {
    sideEffectingLogicalInitializerCallCount++;
    return value;
}

function* sideEffectingLogicalDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "side-effecting-left") && sideEffectingLogicalInitializerCall(yield "side-effecting-argument");
        value;
    ) {
        return "side-effecting-true-" + sideEffectingLogicalInitializerCallCount + "-" + value;
    }
    return "side-effecting-false-" + sideEffectingLogicalInitializerCallCount;
}

const iterator = multiYieldLogicalDeclarationInitializer();
const first: any = iterator.next();
console.log("first", first.done, first.value);
const second: any = iterator.next(1);
console.log("second", second.done, second.value);
const third: any = iterator.next(2);
console.log("third", third.done, third.value);
const fourth: any = iterator.next(0);
console.log("fourth", fourth.done, fourth.value);
const fifth: any = iterator.next(3);
console.log("fifth", fifth.done, fifth.value);
const sixth: any = iterator.next(0);
console.log("sixth", sixth.done, sixth.value);
const seventh: any = iterator.next();
console.log("seventh", seventh.done, seventh.value);

const sideEffectingFalse = sideEffectingLogicalDeclarationInitializer();
const sideEffectingFalseFirst: any = sideEffectingFalse.next();
const sideEffectingFalseDone: any = sideEffectingFalse.next(0);
console.log(
    "side-effecting-false",
    sideEffectingFalseFirst.done,
    sideEffectingFalseFirst.value,
    sideEffectingFalseDone.done,
    sideEffectingFalseDone.value,
);

const sideEffectingTrue = sideEffectingLogicalDeclarationInitializer();
const sideEffectingTrueFirst: any = sideEffectingTrue.next();
const sideEffectingTrueSecond: any = sideEffectingTrue.next(1);
const sideEffectingTrueDone: any = sideEffectingTrue.next("value");
console.log(
    "side-effecting-true",
    sideEffectingTrueFirst.done,
    sideEffectingTrueFirst.value,
    sideEffectingTrueSecond.done,
    sideEffectingTrueSecond.value,
    sideEffectingTrueDone.done,
    sideEffectingTrueDone.value,
);
