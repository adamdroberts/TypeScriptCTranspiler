function pushNestedTemplateConditionalLogicalArmCallback(value: any): any {
    return "push-graph-" + value;
}

function unshiftNestedTemplateConditionalLogicalArmCallback(value: any): any {
    return "unshift-graph-" + value;
}

function* multiYieldPushNestedTemplateConditionalLogicalArmArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "push-receiver").push(
            pushNestedTemplateConditionalLogicalArmCallback?.(`push-${((yield "push-outer-condition") ? (((yield "push-inner-left") && (yield "push-inner-right")) ? (yield "push-inner-true") : "push-inner-false") : "push-outer-false")}-${yield "push-tail"}`),
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

function* multiYieldUnshiftNestedTemplateConditionalLogicalArmArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "unshift-receiver").unshift(
            unshiftNestedTemplateConditionalLogicalArmCallback?.(String.raw`unshift-${((yield "unshift-outer-condition") ? "unshift-true" : (((yield "unshift-inner-left") || (yield "unshift-inner-right")) ? (yield "unshift-inner-true") : "unshift-inner-false"))}-${yield "unshift-tail"}`),
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
const pushIterator = multiYieldPushNestedTemplateConditionalLogicalArmArgumentAccessDeclarationInitializer();
const pushFirst: any = pushIterator.next();
console.log("push-first", pushReceiver.join(","), pushFirst.done, pushFirst.value);
const pushSecond: any = pushIterator.next(pushReceiver);
console.log("push-second", pushReceiver.join(","), pushSecond.done, pushSecond.value);
const pushThird: any = pushIterator.next(true);
console.log("push-third", pushReceiver.join(","), pushThird.done, pushThird.value);
const pushFourth: any = pushIterator.next(true);
console.log("push-fourth", pushReceiver.join(","), pushFourth.done, pushFourth.value);
const pushFifth: any = pushIterator.next(true);
console.log("push-fifth", pushReceiver.join(","), pushFifth.done, pushFifth.value);
const pushSixth: any = pushIterator.next("push-inner-true-value");
console.log("push-sixth", pushReceiver.join(","), pushSixth.done, pushSixth.value);
const pushSeventh: any = pushIterator.next("push-tail-value");
console.log("push-seventh", pushReceiver.join(","), pushSeventh.done, pushSeventh.value);
const pushEighth: any = pushIterator.next("push-direct");
console.log("push-eighth", pushReceiver.join(","), pushEighth.done, pushEighth.value);
const pushNinth: any = pushIterator.next(pushSpread);
console.log("push-ninth", pushReceiver.join(","), pushNinth.done, pushNinth.value);
const pushTenth: any = pushIterator.next("push-missing");
console.log("push-tenth", pushReceiver.join(","), pushTenth.done, pushTenth.value);
const pushDone: any = pushIterator.next();
console.log("push-done", pushReceiver.join(","), pushDone.done, pushDone.value);

const unshiftReceiver: any = ["unshift-first"];
const unshiftSpread: any = ["unshift-spread-one", "unshift-spread-two"];
const unshiftIterator = multiYieldUnshiftNestedTemplateConditionalLogicalArmArgumentAccessDeclarationInitializer();
const unshiftFirst: any = unshiftIterator.next();
console.log("unshift-first", unshiftReceiver.join(","), unshiftFirst.done, unshiftFirst.value);
const unshiftSecond: any = unshiftIterator.next(unshiftReceiver);
console.log("unshift-second", unshiftReceiver.join(","), unshiftSecond.done, unshiftSecond.value);
const unshiftThird: any = unshiftIterator.next(false);
console.log("unshift-third", unshiftReceiver.join(","), unshiftThird.done, unshiftThird.value);
const unshiftFourth: any = unshiftIterator.next(false);
console.log("unshift-fourth", unshiftReceiver.join(","), unshiftFourth.done, unshiftFourth.value);
const unshiftFifth: any = unshiftIterator.next(true);
console.log("unshift-fifth", unshiftReceiver.join(","), unshiftFifth.done, unshiftFifth.value);
const unshiftSixth: any = unshiftIterator.next("unshift-inner-true-value");
console.log("unshift-sixth", unshiftReceiver.join(","), unshiftSixth.done, unshiftSixth.value);
const unshiftSeventh: any = unshiftIterator.next("unshift-tail-value");
console.log("unshift-seventh", unshiftReceiver.join(","), unshiftSeventh.done, unshiftSeventh.value);
const unshiftEighth: any = unshiftIterator.next("unshift-direct");
console.log("unshift-eighth", unshiftReceiver.join(","), unshiftEighth.done, unshiftEighth.value);
const unshiftNinth: any = unshiftIterator.next(unshiftSpread);
console.log("unshift-ninth", unshiftReceiver.join(","), unshiftNinth.done, unshiftNinth.value);
const unshiftTenth: any = unshiftIterator.next("unshift-missing");
console.log("unshift-tenth", unshiftReceiver.join(","), unshiftTenth.done, unshiftTenth.value);
const unshiftDone: any = unshiftIterator.next();
console.log("unshift-done", unshiftReceiver.join(","), unshiftDone.done, unshiftDone.value);
