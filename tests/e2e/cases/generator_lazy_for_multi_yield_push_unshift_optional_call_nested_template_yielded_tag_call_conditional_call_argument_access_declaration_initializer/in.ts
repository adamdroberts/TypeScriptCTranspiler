const pushTagEvents: any[] = [];
const unshiftTagEvents: any[] = [];

function pushConditionalCallTag(strings: TemplateStringsArray, value: any): any {
    return "push-conditional-call-" + strings[0] + value + strings[1];
}

function unshiftConditionalCallTag(strings: TemplateStringsArray, value: any): any {
    return "unshift-conditional-call-" + strings[0] + value + strings[1];
}

function getPushConditionalCallTag(seed: any): any {
    pushTagEvents.push("tag-" + seed);
    return pushConditionalCallTag;
}

function getUnshiftConditionalCallTag(seed: any): any {
    unshiftTagEvents.push("tag-" + seed);
    return unshiftConditionalCallTag;
}

function pushConditionalCallArm(value: any): any {
    return "push-arm-" + value;
}

function unshiftConditionalCallArm(value: any): any {
    return "unshift-arm-" + value;
}

function pushConditionalCallCallback(value: any): any {
    return "push-tagged-" + value;
}

function unshiftConditionalCallCallback(value: any): any {
    return "unshift-tagged-" + value;
}

function* multiYieldPushConditionalCallTagArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "push-receiver").push(
            pushConditionalCallCallback?.(`push-${getPushConditionalCallTag((yield "push-selector") ? pushConditionalCallArm?.(yield "push-selected") : "push-fallback")`inner-${yield "push-inner"}`}-${yield "push-outer"}`),
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

function* multiYieldUnshiftConditionalCallTagArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "unshift-receiver").unshift(
            unshiftConditionalCallCallback?.(String.raw`unshift-${getUnshiftConditionalCallTag((yield "unshift-selector") ? unshiftConditionalCallArm?.(yield "unshift-selected") : "unshift-fallback")`inner-${yield "unshift-inner"}`}-${yield "unshift-outer"}`),
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
const pushIterator = multiYieldPushConditionalCallTagArgumentAccessDeclarationInitializer();
const pushFirst: any = pushIterator.next();
console.log("push-first", pushTagEvents.join(","), pushReceiver.join(","), pushFirst.done, pushFirst.value);
const pushSecond: any = pushIterator.next(pushReceiver);
console.log("push-second", pushTagEvents.join(","), pushReceiver.join(","), pushSecond.done, pushSecond.value);
const pushThird: any = pushIterator.next(true);
console.log("push-third", pushTagEvents.join(","), pushReceiver.join(","), pushThird.done, pushThird.value);
const pushFourth: any = pushIterator.next("push-selected-value");
console.log("push-fourth", pushTagEvents.join(","), pushReceiver.join(","), pushFourth.done, pushFourth.value);
const pushFifth: any = pushIterator.next("push-inner-value");
console.log("push-fifth", pushTagEvents.join(","), pushReceiver.join(","), pushFifth.done, pushFifth.value);
const pushSixth: any = pushIterator.next("push-outer-value");
console.log("push-sixth", pushTagEvents.join(","), pushReceiver.join(","), pushSixth.done, pushSixth.value);
const pushSeventh: any = pushIterator.next("push-item-value");
console.log("push-seventh", pushTagEvents.join(","), pushReceiver.join(","), pushSeventh.done, pushSeventh.value);
const pushEighth: any = pushIterator.next("push-key-value");
console.log("push-eighth", pushTagEvents.join(","), pushReceiver.join(","), pushEighth.done, pushEighth.value);
const pushDone: any = pushIterator.next();
console.log("push-done", pushTagEvents.join(","), pushReceiver.join(","), pushDone.done, pushDone.value);

const unshiftReceiver: any = ["unshift-first"];
const unshiftIterator = multiYieldUnshiftConditionalCallTagArgumentAccessDeclarationInitializer();
const unshiftFirst: any = unshiftIterator.next();
console.log("unshift-first", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftFirst.done, unshiftFirst.value);
const unshiftSecond: any = unshiftIterator.next(unshiftReceiver);
console.log("unshift-second", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftSecond.done, unshiftSecond.value);
const unshiftThird: any = unshiftIterator.next(false);
console.log("unshift-third", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftThird.done, unshiftThird.value);
const unshiftFourth: any = unshiftIterator.next("unshift-inner-value");
console.log("unshift-fourth", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftFourth.done, unshiftFourth.value);
const unshiftFifth: any = unshiftIterator.next("unshift-outer-value");
console.log("unshift-fifth", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftFifth.done, unshiftFifth.value);
const unshiftSixth: any = unshiftIterator.next("unshift-item-value");
console.log("unshift-sixth", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftSixth.done, unshiftSixth.value);
const unshiftSeventh: any = unshiftIterator.next("unshift-key-value");
console.log("unshift-seventh", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftSeventh.done, unshiftSeventh.value);
const unshiftDone: any = unshiftIterator.next();
console.log("unshift-done", unshiftTagEvents.join(","), unshiftReceiver.join(","), unshiftDone.done, unshiftDone.value);
