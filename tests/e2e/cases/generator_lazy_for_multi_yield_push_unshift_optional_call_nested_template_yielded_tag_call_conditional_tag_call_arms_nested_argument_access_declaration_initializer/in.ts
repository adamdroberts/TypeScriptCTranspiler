const pushTagEvents: any[] = [];
const unshiftTagEvents: any[] = [];

function pushConditionalArmsNestedOuter(strings: TemplateStringsArray, value: any): any {
    return "push-outer-" + strings[0] + value + strings[1];
}

function unshiftConditionalArmsNestedOuter(strings: TemplateStringsArray, value: any): any {
    return "unshift-outer-" + strings[0] + value + strings[1];
}

function getPushConditionalArmsNestedOuter(seed: any): any {
    pushTagEvents.push("outer-" + seed);
    return pushConditionalArmsNestedOuter;
}

function getUnshiftConditionalArmsNestedOuter(seed: any): any {
    unshiftTagEvents.push("outer-" + seed);
    return unshiftConditionalArmsNestedOuter;
}

function pushConditionalArmsNestedTrue(strings: TemplateStringsArray, value: any): any {
    return "push-true-arm-" + strings[0] + value + strings[1];
}

function pushConditionalArmsNestedFalse(strings: TemplateStringsArray, value: any): any {
    return "push-false-arm-" + strings[0] + value + strings[1];
}

function unshiftConditionalArmsNestedTrue(strings: TemplateStringsArray, value: any): any {
    return "unshift-true-arm-" + strings[0] + value + strings[1];
}

function unshiftConditionalArmsNestedFalse(strings: TemplateStringsArray, value: any): any {
    return "unshift-false-arm-" + strings[0] + value + strings[1];
}

function getPushConditionalArmsNestedTrue(seed: any): any {
    pushTagEvents.push("true-arm-" + seed);
    return pushConditionalArmsNestedTrue;
}

function getPushConditionalArmsNestedFalse(seed: any): any {
    pushTagEvents.push("false-arm-" + seed);
    return pushConditionalArmsNestedFalse;
}

function getUnshiftConditionalArmsNestedTrue(seed: any): any {
    unshiftTagEvents.push("true-arm-" + seed);
    return unshiftConditionalArmsNestedTrue;
}

function getUnshiftConditionalArmsNestedFalse(seed: any): any {
    unshiftTagEvents.push("false-arm-" + seed);
    return unshiftConditionalArmsNestedFalse;
}

function pushConditionalArmsNestedTrueTag(strings: TemplateStringsArray, value: any): any {
    return "push-true-nested-" + strings[0] + value + strings[1];
}

function pushConditionalArmsNestedFalseTag(strings: TemplateStringsArray, value: any): any {
    return "push-false-nested-" + strings[0] + value + strings[1];
}

function unshiftConditionalArmsNestedTrueTag(strings: TemplateStringsArray, value: any): any {
    return "unshift-true-nested-" + strings[0] + value + strings[1];
}

function unshiftConditionalArmsNestedFalseTag(strings: TemplateStringsArray, value: any): any {
    return "unshift-false-nested-" + strings[0] + value + strings[1];
}

function getPushConditionalArmsNestedTrueTag(seed: any): any {
    pushTagEvents.push("true-nested-" + seed);
    return pushConditionalArmsNestedTrueTag;
}

function getPushConditionalArmsNestedFalseTag(seed: any): any {
    pushTagEvents.push("false-nested-" + seed);
    return pushConditionalArmsNestedFalseTag;
}

function getUnshiftConditionalArmsNestedTrueTag(seed: any): any {
    unshiftTagEvents.push("true-nested-" + seed);
    return unshiftConditionalArmsNestedTrueTag;
}

function getUnshiftConditionalArmsNestedFalseTag(seed: any): any {
    unshiftTagEvents.push("false-nested-" + seed);
    return unshiftConditionalArmsNestedFalseTag;
}

function pushConditionalArmsNestedCallback(value: any): any {
    return "push-tagged-" + value;
}

function unshiftConditionalArmsNestedCallback(value: any): any {
    return "unshift-tagged-" + value;
}

function* multiYieldPushConditionalTagCallArmsNestedArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "push-receiver").push(
            pushConditionalArmsNestedCallback?.(`push-${getPushConditionalArmsNestedOuter(
                (yield "push-selector")
                    ? getPushConditionalArmsNestedTrue(
                        (yield "push-true-selector")
                            ? getPushConditionalArmsNestedTrueTag((yield "push-true-nested-seed"))`nested-${yield "push-true-nested-value"}`
                            : "push-true-nested-fallback"
                    )`arm-${yield "push-true-arm-value"}`
                    : getPushConditionalArmsNestedFalse(
                        (yield "push-false-selector")
                            ? getPushConditionalArmsNestedFalseTag((yield "push-false-nested-seed"))`nested-${yield "push-false-nested-value"}`
                            : "push-false-nested-fallback"
                    )`arm-${yield "push-false-arm-value"}`
            )`inner-${yield "push-inner"}`}-${yield "push-outer"}`),
            yield "push-item"
        )[yield "push-key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "push-body-" + typeof value;
    }
    return "push-done";
}

function* multiYieldUnshiftConditionalTagCallArmsNestedArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "unshift-receiver").unshift(
            unshiftConditionalArmsNestedCallback?.(String.raw`unshift-${getUnshiftConditionalArmsNestedOuter(
                (yield "unshift-selector")
                    ? getUnshiftConditionalArmsNestedTrue(
                        (yield "unshift-true-selector")
                            ? getUnshiftConditionalArmsNestedTrueTag((yield "unshift-true-nested-seed"))`nested-${yield "unshift-true-nested-value"}`
                            : "unshift-true-nested-fallback"
                    )`arm-${yield "unshift-true-arm-value"}`
                    : getUnshiftConditionalArmsNestedFalse(
                        (yield "unshift-false-selector")
                            ? getUnshiftConditionalArmsNestedFalseTag((yield "unshift-false-nested-seed"))`nested-${yield "unshift-false-nested-value"}`
                            : "unshift-false-nested-fallback"
                    )`arm-${yield "unshift-false-arm-value"}`
            )`inner-${yield "unshift-inner"}`}-${yield "unshift-outer"}`),
            yield "unshift-item"
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
const pushIterator = multiYieldPushConditionalTagCallArmsNestedArgumentAccessDeclarationInitializer();
const pushFirst: any = pushIterator.next();
console.log("push-first", pushTagEvents.join(","), pushReceiver.join(","), pushFirst.done, pushFirst.value);
const pushSecond: any = pushIterator.next(pushReceiver);
console.log("push-second", pushTagEvents.join(","), pushReceiver.join(","), pushSecond.done, pushSecond.value);
const pushThird: any = pushIterator.next(true);
console.log("push-third", pushTagEvents.join(","), pushReceiver.join(","), pushThird.done, pushThird.value);
const pushFourth: any = pushIterator.next(true);
console.log("push-fourth", pushTagEvents.join(","), pushReceiver.join(","), pushFourth.done, pushFourth.value);
const pushFifth: any = pushIterator.next("push-true-nested-seed-value");
console.log("push-fifth", pushTagEvents.join(","), pushReceiver.join(","), pushFifth.done, pushFifth.value);
const pushSixth: any = pushIterator.next("push-true-nested-value");
console.log("push-sixth", pushTagEvents.join(","), pushReceiver.join(","), pushSixth.done, pushSixth.value);
const pushSeventh: any = pushIterator.next("push-true-arm-value");
console.log("push-seventh", pushTagEvents.join(","), pushReceiver.join(","), pushSeventh.done, pushSeventh.value);
const pushEighth: any = pushIterator.next("push-inner-value");
console.log("push-eighth", pushTagEvents.join(","), pushReceiver.join(","), pushEighth.done, pushEighth.value);
const pushNinth: any = pushIterator.next("push-outer-value");
console.log("push-ninth", pushTagEvents.join(","), pushReceiver.join(","), pushNinth.done, pushNinth.value);
const pushTenth: any = pushIterator.next("push-item-value");
console.log("push-tenth", pushTagEvents.join(","), pushReceiver.join(","), pushTenth.done, pushTenth.value);
const pushEleventh: any = pushIterator.next("push-key-value");
console.log("push-eleventh", pushTagEvents.join(","), pushReceiver.join(","), pushEleventh.done, pushEleventh.value);
const pushDone: any = pushIterator.next();
console.log("push-done", pushTagEvents.join(","), pushReceiver.join(","), pushDone.done, pushDone.value);

const unshiftReceiver: any = ["unshift-first"];
const unshiftIterator = multiYieldUnshiftConditionalTagCallArmsNestedArgumentAccessDeclarationInitializer();
const unshiftFirst: any = unshiftIterator.next();
console.log("unshift-first", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftFirst.done, unshiftFirst.value);
const unshiftSecond: any = unshiftIterator.next(unshiftReceiver);
console.log("unshift-second", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftSecond.done, unshiftSecond.value);
const unshiftThird: any = unshiftIterator.next(false);
console.log("unshift-third", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftThird.done, unshiftThird.value);
const unshiftFourth: any = unshiftIterator.next(true);
console.log("unshift-fourth", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftFourth.done, unshiftFourth.value);
const unshiftFifth: any = unshiftIterator.next("unshift-false-nested-seed-value");
console.log("unshift-fifth", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftFifth.done, unshiftFifth.value);
const unshiftSixth: any = unshiftIterator.next("unshift-false-nested-value");
console.log("unshift-sixth", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftSixth.done, unshiftSixth.value);
const unshiftSeventh: any = unshiftIterator.next("unshift-false-arm-value");
console.log("unshift-seventh", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftSeventh.done, unshiftSeventh.value);
const unshiftEighth: any = unshiftIterator.next("unshift-inner-value");
console.log("unshift-eighth", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftEighth.done, unshiftEighth.value);
const unshiftNinth: any = unshiftIterator.next("unshift-outer-value");
console.log("unshift-ninth", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftNinth.done, unshiftNinth.value);
const unshiftTenth: any = unshiftIterator.next("unshift-item-value");
console.log("unshift-tenth", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftTenth.done, unshiftTenth.value);
const unshiftEleventh: any = unshiftIterator.next("unshift-key-value");
console.log("unshift-eleventh", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftEleventh.done, unshiftEleventh.value);
const unshiftDone: any = unshiftIterator.next();
console.log("unshift-done", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftDone.done, unshiftDone.value);
