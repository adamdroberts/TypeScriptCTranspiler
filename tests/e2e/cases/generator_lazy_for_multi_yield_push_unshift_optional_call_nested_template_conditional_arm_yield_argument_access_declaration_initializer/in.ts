function pushNestedTemplateConditionalArmCallback(value: any): any {
    return "push-arm-" + value;
}

function unshiftNestedTemplateConditionalArmCallback(value: any): any {
    return "unshift-arm-" + value;
}

function* multiYieldPushNestedTemplateConditionalArmArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "push-receiver").push(
            pushNestedTemplateConditionalArmCallback?.(`push-${((yield "push-condition") ? (yield "push-true-arm") : "push-false-arm")}-${yield "push-tail"}`),
            yield "push-item",
            ...(yield "push-spread")
        )[yield "push-key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "push-body-" + typeof value;
    }
    return "push-done";
}

function* multiYieldUnshiftNestedTemplateConditionalArmArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "unshift-receiver").unshift(
            unshiftNestedTemplateConditionalArmCallback?.(String.raw`unshift-${((yield "unshift-condition") ? "unshift-true-arm" : (yield "unshift-false-arm"))}-${yield "unshift-tail"}`),
            yield "unshift-item",
            ...(yield "unshift-spread")
        )[yield "unshift-key"],
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
const pushIterator = multiYieldPushNestedTemplateConditionalArmArgumentAccessDeclarationInitializer();
const pushFirst: any = pushIterator.next();
console.log("push-first", pushReceiver.join(","), pushFirst.done, pushFirst.value);
const pushSecond: any = pushIterator.next(pushReceiver);
console.log("push-second", pushReceiver.join(","), pushSecond.done, pushSecond.value);
const pushThird: any = pushIterator.next(true);
console.log("push-third", pushReceiver.join(","), pushThird.done, pushThird.value);
const pushFourth: any = pushIterator.next("push-true-arm-value");
console.log("push-fourth", pushReceiver.join(","), pushFourth.done, pushFourth.value);
const pushFifth: any = pushIterator.next("push-tail-value");
console.log("push-fifth", pushReceiver.join(","), pushFifth.done, pushFifth.value);
const pushSixth: any = pushIterator.next("push-direct");
console.log("push-sixth", pushReceiver.join(","), pushSixth.done, pushSixth.value);
const pushSeventh: any = pushIterator.next(pushSpread);
console.log("push-seventh", pushReceiver.join(","), pushSeventh.done, pushSeventh.value);
const pushEighth: any = pushIterator.next("push-missing");
console.log("push-eighth", pushReceiver.join(","), pushEighth.done, pushEighth.value);
const pushDone: any = pushIterator.next();
console.log("push-done", pushReceiver.join(","), pushDone.done, pushDone.value);

const unshiftReceiver: any = ["unshift-first"];
const unshiftSpread: any = ["unshift-spread-one", "unshift-spread-two"];
const unshiftIterator = multiYieldUnshiftNestedTemplateConditionalArmArgumentAccessDeclarationInitializer();
const unshiftFirst: any = unshiftIterator.next();
console.log("unshift-first", unshiftReceiver.join(","), unshiftFirst.done, unshiftFirst.value);
const unshiftSecond: any = unshiftIterator.next(unshiftReceiver);
console.log("unshift-second", unshiftReceiver.join(","), unshiftSecond.done, unshiftSecond.value);
const unshiftThird: any = unshiftIterator.next(false);
console.log("unshift-third", unshiftReceiver.join(","), unshiftThird.done, unshiftThird.value);
const unshiftFourth: any = unshiftIterator.next("unshift-false-arm-value");
console.log("unshift-fourth", unshiftReceiver.join(","), unshiftFourth.done, unshiftFourth.value);
const unshiftFifth: any = unshiftIterator.next("unshift-tail-value");
console.log("unshift-fifth", unshiftReceiver.join(","), unshiftFifth.done, unshiftFifth.value);
const unshiftSixth: any = unshiftIterator.next("unshift-direct");
console.log("unshift-sixth", unshiftReceiver.join(","), unshiftSixth.done, unshiftSixth.value);
const unshiftSeventh: any = unshiftIterator.next(unshiftSpread);
console.log("unshift-seventh", unshiftReceiver.join(","), unshiftSeventh.done, unshiftSeventh.value);
const unshiftEighth: any = unshiftIterator.next("unshift-missing");
console.log("unshift-eighth", unshiftReceiver.join(","), unshiftEighth.done, unshiftEighth.value);
const unshiftDone: any = unshiftIterator.next();
console.log("unshift-done", unshiftReceiver.join(","), unshiftDone.done, unshiftDone.value);
