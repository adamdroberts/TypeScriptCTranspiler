let pushSelector: any = false;
let pushTrueValue: any = "push-true-before";
let pushFalseValue: any = "push-false-before";
let unshiftSelector: any = true;
let unshiftTrueValue: any = "unshift-true-before";
let unshiftFalseValue: any = "unshift-false-before";

function* multiYieldPushConditionalArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "push-receiver").push(pushSelector ? pushTrueValue : pushFalseValue, yield "push-item", ...(yield "push-spread"))[yield "push-key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "push-body-" + typeof value;
    }
    return "push-done";
}

function* multiYieldUnshiftConditionalArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "unshift-receiver").unshift(unshiftSelector ? unshiftTrueValue : unshiftFalseValue, yield "unshift-item", ...(yield "unshift-spread"))[yield "unshift-key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "unshift-body-" + typeof value;
    }
    return "unshift-done";
}

const pushReceiver: any = ["push-first"];
const pushSpread: any = ["push-spread-one", "push-spread-two"];
const pushIterator = multiYieldPushConditionalArgumentAccessDeclarationInitializer();
const pushFirst: any = pushIterator.next();
console.log("push-first", pushReceiver.join(","), pushFirst.done, pushFirst.value);
const pushSecond: any = pushIterator.next(pushReceiver);
console.log("push-second", pushReceiver.join(","), pushSecond.done, pushSecond.value);
pushSelector = true;
pushTrueValue = "push-true-after";
pushFalseValue = "push-false-after";
const pushThird: any = pushIterator.next("push-direct");
console.log("push-third", pushReceiver.join(","), pushThird.done, pushThird.value);
const pushFourth: any = pushIterator.next(pushSpread);
console.log("push-fourth", pushReceiver.join(","), pushFourth.done, pushFourth.value);
const pushFifth: any = pushIterator.next("push-missing");
console.log("push-fifth", pushReceiver.join(","), pushFifth.done, pushFifth.value);
const pushDone: any = pushIterator.next();
console.log("push-done", pushReceiver.join(","), pushDone.done, pushDone.value);

const unshiftReceiver: any = ["unshift-first"];
const unshiftSpread: any = ["unshift-spread-one", "unshift-spread-two"];
const unshiftIterator = multiYieldUnshiftConditionalArgumentAccessDeclarationInitializer();
const unshiftFirst: any = unshiftIterator.next();
console.log("unshift-first", unshiftReceiver.join(","), unshiftFirst.done, unshiftFirst.value);
const unshiftSecond: any = unshiftIterator.next(unshiftReceiver);
console.log("unshift-second", unshiftReceiver.join(","), unshiftSecond.done, unshiftSecond.value);
unshiftSelector = false;
unshiftTrueValue = "unshift-true-after";
unshiftFalseValue = "unshift-false-after";
const unshiftThird: any = unshiftIterator.next("unshift-direct");
console.log("unshift-third", unshiftReceiver.join(","), unshiftThird.done, unshiftThird.value);
const unshiftFourth: any = unshiftIterator.next(unshiftSpread);
console.log("unshift-fourth", unshiftReceiver.join(","), unshiftFourth.done, unshiftFourth.value);
const unshiftFifth: any = unshiftIterator.next("unshift-missing");
console.log("unshift-fifth", unshiftReceiver.join(","), unshiftFifth.done, unshiftFifth.value);
const unshiftDone: any = unshiftIterator.next();
console.log("unshift-done", unshiftReceiver.join(","), unshiftDone.done, unshiftDone.value);
